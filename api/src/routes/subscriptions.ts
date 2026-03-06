import { Router } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import { encryptCode, decryptCode, isEncrypted } from '../utils/crypto';
import { isSeamConfigured, isSeamMockMode, createOfflineAccessCode, deleteAccessCode } from '../utils/seam';
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
// subscriptionEndDate: optional end date for the subscription period (used for Seam algoPIN time-bound)
export async function activateMemberAccess(memberId: string, subscriptionEndDate?: Date): Promise<string | null> {
  const memberResult = await pool.query(
    `SELECT m.*, g.access_type, g.shared_pin, g.name as gym_name,
            g.seam_device_id, g.seam_connected_account_id
     FROM members m
     JOIN gyms g ON m.gym_id = g.gym_id
     WHERE m.member_id = $1`,
    [memberId]
  );
  if (memberResult.rows.length === 0) return null;

  const member = memberResult.rows[0];
  const codeLength = parseInt(process.env.ACCESS_CODE_LENGTH || '4');
  const useSeam = (isSeamConfigured() || isSeamMockMode()) && !!member.seam_device_id;

  let code: string;
  let seamAccessCodeId: string | null = null;
  let seamError: string | null = null;

  if (useSeam) {
    // Create igloohome algoPIN via Seam
    const startsAt = new Date();
    const endsAt = subscriptionEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days
    try {
      const result = await createOfflineAccessCode(member.seam_device_id, member.name, startsAt, endsAt);
      if (result) {
        code = result.code;
        seamAccessCodeId = result.access_code_id;
      } else {
        seamError = 'Seam PIN creation returned null';
        code = generatePin(codeLength);
      }
    } catch (err: any) {
      seamError = String(err?.message || err);
      console.error('Seam PIN creation failed, falling back to internal PIN:', seamError);
      code = generatePin(codeLength);
    }
  } else if (member.access_type === 'shared_pin') {
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

  // Revoke existing codes (also delete from Seam if applicable)
  const existingCodes = await pool.query(
    "SELECT provider_code_id, source FROM access_codes WHERE member_id = $1 AND valid_to IS NULL",
    [memberId]
  );
  for (const existing of existingCodes.rows) {
    if (existing.source === 'igloohome' && existing.provider_code_id) {
      await deleteAccessCode(existing.provider_code_id).catch(err =>
        console.error('Failed to delete Seam access code on revoke:', err)
      );
    }
  }

  await pool.query(
    "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
    [memberId]
  );

  // Store encrypted code with source and provider_code_id
  const source = useSeam && !seamError ? 'igloohome' : 'internal';
  await pool.query(
    "INSERT INTO access_codes (member_id, code, valid_from, source, provider_code_id) VALUES ($1, $2, NOW(), $3, $4)",
    [memberId, encryptCode(code), source, seamAccessCodeId]
  );

  // Build welcome notification body
  let codeDisplay = code;
  let emailBody: string;
  if (useSeam && !seamError) {
    emailBody = `Hi ${member.name},\n\nWelcome to ${member.gym_name}! Your membership is now active.\n\nYour igloohome keybox access PIN: ${codeDisplay}\n\nUse this code on the Keybox 3 at the gym entrance. The code is time-bound to your membership period.\n\nBest regards,\n${member.gym_name}`;
  } else if (seamError) {
    emailBody = `Hi ${member.name},\n\nWelcome to ${member.gym_name}! Your membership is now active.\n\nYour access code will be provided separately by your gym administrator.\n\nBest regards,\n${member.gym_name}`;
    console.error(`Seam error for member ${memberId}: ${seamError}`);
  } else {
    emailBody = `Hi ${member.name},\n\nWelcome to ${member.gym_name}! Your membership is now active.\n\nYour access code: ${codeDisplay}\n\nBest regards,\n${member.gym_name}`;
  }

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
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '0');
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
