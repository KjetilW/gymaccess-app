import { Router } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import { encryptCode, decryptCode, isEncrypted } from '../utils/crypto';
import { isIgloohomeConfigured } from '../utils/igloohome';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_API_KEY
  ? new Stripe(process.env.STRIPE_API_KEY, { apiVersion: '2024-06-20' as any })
  : null;

export const subscriptionRoutes = Router();

function generatePin(length: number = 4): string {
  const max = Math.pow(10, length);
  return crypto.randomInt(0, max).toString().padStart(length, '0');
}

// Generate access code and queue welcome notification for a newly activated member
// For igloohome gyms: no PIN is created on activation — members request on-demand PINs themselves.
export async function activateMemberAccess(memberId: string, subscriptionEndDate?: Date): Promise<string | null> {
  const memberResult = await pool.query(
    `SELECT m.*, g.access_type, g.shared_pin, g.name as gym_name,
            g.igloohome_lock_id, g.igloohome_client_id, g.igloohome_client_secret
     FROM members m
     JOIN gyms g ON m.gym_id = g.gym_id
     WHERE m.member_id = $1`,
    [memberId]
  );
  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (memberResult.rows.length === 0) return null;

  const member = memberResult.rows[0];
  const codeLength = parseInt(process.env.ACCESS_CODE_LENGTH || '4');

  const useIgloohomeDirect = isIgloohomeConfigured(member.igloohome_client_id, member.igloohome_client_secret) && !!member.igloohome_lock_id;
  const manageLink = member.manage_token ? `${frontendUrl}/manage/${member.manage_token}` : null;

  if (useIgloohomeDirect) {
    // igloohome gym: PINs are on-demand; do NOT create an AlgoPIN on activation.
    // Revoke any stale codes from previous activations.
    await pool.query(
      "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
      [memberId]
    );

    // Welcome email directs member to their personal management page for access
    const manageLinkText = manageLink ? `\n\nAccess the gym:\n${manageLink}\n\nFrom your personal page you can:\n- Set up Bluetooth access (primary) via the igloohome app\n- Request a door PIN (backup)` : '';
    const emailBody = `Hi ${member.name},\n\nWelcome to ${member.gym_name}! Your membership is now active.\n\nTo access the gym, visit your personal membership page:${manageLinkText}\n\nBest regards,\n${member.gym_name}`;

    await pool.query(
      `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
       VALUES ($1, 'welcome', 'email', $2, $3, $4, 'pending')`,
      [memberId, member.email, `Welcome to ${member.gym_name}!`, emailBody]
    );
    return null;
  }

  // Non-igloohome gym: generate internal PIN as before
  let code: string;

  if (member.access_type === 'shared_pin') {
    code = member.shared_pin || generatePin(codeLength);
    if (!member.shared_pin) {
      await pool.query('UPDATE gyms SET shared_pin = $1 WHERE gym_id = $2', [code, member.gym_id]);
    }
  } else {
    // Individual PIN - ensure uniqueness
    const existing = await pool.query(
      `SELECT ac.code FROM access_codes ac
       JOIN members m ON ac.member_id = m.member_id
       WHERE m.gym_id = $1 AND ac.valid_to IS NULL`,
      [member.gym_id]
    );
    const usedCodes = new Set(
      existing.rows.map((r: { code: string }) => isEncrypted(r.code) ? decryptCode(r.code) : r.code)
    );
    code = generatePin(codeLength);
    let attempts = 0;
    while (usedCodes.has(code) && attempts < 100) {
      code = generatePin(codeLength);
      attempts++;
    }
  }

  // Revoke existing codes
  await pool.query(
    "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
    [memberId]
  );

  // Store encrypted code
  await pool.query(
    "INSERT INTO access_codes (member_id, code, valid_from, source, provider_code_id) VALUES ($1, $2, NOW(), $3, $4)",
    [memberId, encryptCode(code!), 'internal', null]
  );

  // Welcome email with PIN
  const manageLinkLine = manageLink ? `\n\nManage your subscription: ${manageLink}` : '';
  const emailBody = `Hi ${member.name},\n\nWelcome to ${member.gym_name}! Your membership is now active.\n\nYour access code: ${code}\n\nBest regards,\n${member.gym_name}${manageLinkLine}`;

  await pool.query(
    `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
     VALUES ($1, 'welcome', 'email', $2, $3, $4, 'pending')`,
    [memberId, member.email, `Welcome to ${member.gym_name}!`, emailBody]
  );

  return code;
}

// Create Stripe checkout session for a member
subscriptionRoutes.post('/checkout', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ error: 'memberId is required' });
    }

    const result = await pool.query(
      `SELECT m.*, g.name as gym_name, g.membership_price, g.billing_interval, g.gym_id as gid,
              g.stripe_connect_account_id, g.stripe_connect_status
       FROM members m JOIN gyms g ON m.gym_id = g.gym_id WHERE m.member_id = $1`,
      [memberId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = result.rows[0];

    // Require active Stripe Connect account
    if (!member.stripe_connect_account_id || member.stripe_connect_status !== 'active') {
      return res.status(400).json({
        error: 'The gym owner must connect their Stripe account before accepting payments. Please contact your gym administrator.',
      });
    }

    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const unitAmount = Math.round(member.membership_price) * 100;

    // Look up gym's plan to determine platform fee
    const gymPlanResult = await pool.query('SELECT saas_plan FROM gyms WHERE gym_id = $1', [member.gid]);
    const gymPlan = gymPlanResult.rows[0]?.saas_plan || 'starter';
    const platformFeePercent = gymPlan === 'pro'
      ? parseFloat(process.env.PRO_FEE_PERCENT || '1')
      : parseFloat(process.env.STARTER_FEE_PERCENT || '3');
    const applicationFeeAmount = platformFeePercent > 0
      ? Math.round(unitAmount * platformFeePercent / 100)
      : 0;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'nok',
          product_data: { name: `${member.gym_name} Membership` },
          unit_amount: unitAmount,
          recurring: {
            interval: member.billing_interval === 'yearly' ? 'year' : 'month',
          },
        },
        quantity: 1,
      }],
      customer_email: member.email,
      metadata: { memberId },
      success_url: `${frontendUrl}/join/${member.gid}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/join/${member.gid}/payment?memberId=${memberId}`,
      subscription_data: {
        transfer_data: { destination: member.stripe_connect_account_id },
        ...(applicationFeeAmount > 0 && { application_fee_percent: platformFeePercent }),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Verify a Stripe checkout session and activate the member if payment succeeded.
// Fallback for when webhooks are delayed or unavailable (e.g. local dev without stripe listen).
subscriptionRoutes.post('/verify-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.json({ status: 'pending' });
    }

    const memberId = session.metadata?.memberId;
    if (!memberId) {
      return res.status(400).json({ error: 'No memberId in session metadata' });
    }

    const member = await pool.query('SELECT member_id FROM members WHERE member_id = $1', [memberId]);
    if (member.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Atomic update: only succeeds if status is not already 'active'.
    // This prevents double-activation when both verify-session and the webhook run concurrently.
    const updateResult = await pool.query(
      "UPDATE members SET status = 'active', stripe_customer_id = $1, updated_at = NOW() WHERE member_id = $2 AND status != 'active' RETURNING member_id",
      [session.customer, memberId]
    );

    if (updateResult.rows.length === 0) {
      // Another process (webhook) already activated this member — return success
      return res.json({ status: 'active', alreadyActivated: true });
    }

    const existingSub = session.subscription ? await pool.query(
      'SELECT subscription_id FROM subscriptions WHERE provider_subscription_id = $1',
      [session.subscription]
    ) : { rows: [] };

    if (existingSub.rows.length === 0) {
      await pool.query(
        `INSERT INTO subscriptions (member_id, provider, provider_subscription_id, status, start_date)
         VALUES ($1, 'stripe', $2, 'active', NOW())`,
        [memberId, session.subscription]
      );
    }

    await activateMemberAccess(memberId);

    res.json({ status: 'active' });
  } catch (err) {
    console.error('Verify session error:', err);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// Get member subscription info by manage token (no auth — token is the credential)
subscriptionRoutes.get('/manage/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT m.name, m.email, m.status, m.manage_token,
              g.name as gym_name, g.membership_price, g.billing_interval,
              g.igloohome_client_id, g.igloohome_client_secret, g.igloohome_lock_id,
              s.provider_subscription_id
       FROM members m
       JOIN gyms g ON m.gym_id = g.gym_id
       LEFT JOIN subscriptions s ON s.subscription_id = (
         SELECT s2.subscription_id FROM subscriptions s2
         WHERE s2.member_id = m.member_id ORDER BY s2.created_at DESC LIMIT 1
       )
       WHERE m.manage_token = $1`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or unknown token' });
    }
    const row = result.rows[0];
    const igloohome_configured = !!(row.igloohome_client_id && row.igloohome_client_secret && row.igloohome_lock_id);
    res.json({
      name: row.name,
      email: row.email,
      status: row.status,
      gym_name: row.gym_name,
      membership_price: row.membership_price,
      billing_interval: row.billing_interval,
      igloohome_configured,
    });
  } catch (err) {
    console.error('Manage GET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Stripe Customer Portal session for member (no auth — token is the credential)
subscriptionRoutes.post('/manage/:token/portal', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }
    const { token } = req.params;
    const result = await pool.query(
      `SELECT m.member_id, m.stripe_customer_id
       FROM members m
       WHERE m.manage_token = $1`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or unknown token' });
    }
    const member = result.rows[0];
    if (!member.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer associated with this membership' });
    }
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portal = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: `${frontendUrl}/manage/${token}`,
    });
    res.json({ url: portal.url });
  } catch (err) {
    console.error('Manage portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Activate subscription (called internally or via webhook)
subscriptionRoutes.post('/activate', async (req, res) => {
  try {
    const { memberId, provider, providerSubscriptionId } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: 'memberId is required' });
    }

    // Check member exists
    const memberResult = await pool.query('SELECT * FROM members WHERE member_id = $1', [memberId]);
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Default subscription period: 30 days
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create subscription
    const subResult = await pool.query(
      `INSERT INTO subscriptions (member_id, provider, provider_subscription_id, status, start_date, end_date)
       VALUES ($1, $2, $3, 'active', NOW(), $4) RETURNING *`,
      [memberId, provider || 'manual', providerSubscriptionId || null, endDate]
    );

    // Update member status to active
    await pool.query(
      "UPDATE members SET status = 'active', updated_at = NOW() WHERE member_id = $1",
      [memberId]
    );

    // Generate access code and queue welcome email
    const code = await activateMemberAccess(memberId, endDate);

    res.status(201).json({ ...subResult.rows[0], accessCode: code });
  } catch (err) {
    console.error('Activate subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
