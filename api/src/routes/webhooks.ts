import { Router } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import { activateMemberAccess } from './subscriptions';

export const webhookRoutes = Router();

const PLACEHOLDER_SECRETS = ['whsec_your_webhook_secret_here', '', undefined];

function verifyStripeSignature(payload: Buffer | string, sigHeader: string, secret: string): boolean {
  const parts: Record<string, string> = {};
  for (const part of sigHeader.split(',')) {
    const [key, val] = part.split('=');
    parts[key] = val;
  }
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${payload.toString()}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// Handle member payment events (checkout, invoices, cancellations)
async function handleMemberEvent(event: any) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const memberId = session.metadata?.memberId;
      if (memberId) {
        const member = await pool.query(
          'SELECT status FROM members WHERE member_id = $1',
          [memberId]
        );
        if (member.rows.length > 0 && member.rows[0].status !== 'active') {
          await pool.query(
            "UPDATE members SET status = 'active', stripe_customer_id = $1, updated_at = NOW() WHERE member_id = $2",
            [session.customer, memberId]
          );
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
        }
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (subscriptionId) {
        const sub = await pool.query(
          'SELECT member_id FROM subscriptions WHERE provider_subscription_id = $1',
          [subscriptionId]
        );
        if (sub.rows.length > 0) {
          const memberId = sub.rows[0].member_id;
          const memberData = await pool.query(
            `SELECT m.name, m.email, g.name as gym_name, g.membership_price
             FROM members m JOIN gyms g ON m.gym_id = g.gym_id WHERE m.member_id = $1`,
            [memberId]
          );
          await pool.query(
            "UPDATE members SET status = 'active', updated_at = NOW() WHERE member_id = $1",
            [memberId]
          );
          const activeCode = await pool.query(
            "SELECT code_id FROM access_codes WHERE member_id = $1 AND valid_to IS NULL",
            [memberId]
          );
          if (activeCode.rows.length === 0) {
            await activateMemberAccess(memberId);
          }
          if (memberData.rows.length > 0) {
            const m = memberData.rows[0];
            await pool.query(
              `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
               VALUES ($1, 'payment_receipt', 'email', $2, $3, $4, 'pending')`,
              [
                memberId, m.email,
                `Payment received – ${m.gym_name}`,
                `Hi ${m.name},\n\nThank you for your payment of NOK ${m.membership_price}. Your membership at ${m.gym_name} is active.\n\nBest regards,\n${m.gym_name}`
              ]
            );
          }
        }
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (subscriptionId) {
        const sub = await pool.query(
          'SELECT member_id FROM subscriptions WHERE provider_subscription_id = $1',
          [subscriptionId]
        );
        if (sub.rows.length > 0) {
          const memberId = sub.rows[0].member_id;
          const memberData = await pool.query(
            `SELECT m.name, m.email, g.name as gym_name
             FROM members m JOIN gyms g ON m.gym_id = g.gym_id WHERE m.member_id = $1`,
            [memberId]
          );
          await pool.query(
            "UPDATE members SET status = 'past_due', updated_at = NOW() WHERE member_id = $1",
            [memberId]
          );
          await pool.query(
            "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
            [memberId]
          );
          if (memberData.rows.length > 0) {
            const m = memberData.rows[0];
            await pool.query(
              `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
               VALUES ($1, 'payment_failed', 'email', $2, $3, $4, 'pending')`,
              [
                memberId, m.email,
                `Payment issue – ${m.gym_name}`,
                `Hi ${m.name},\n\nWe had trouble processing your payment for ${m.gym_name}. Please update your payment method to keep your access.\n\nBest regards,\n${m.gym_name}`
              ]
            );
          }
        }
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const sub = await pool.query(
        'SELECT member_id FROM subscriptions WHERE provider_subscription_id = $1',
        [subscription.id]
      );
      if (sub.rows.length > 0) {
        const memberId = sub.rows[0].member_id;
        await pool.query(
          "UPDATE members SET status = 'cancelled', updated_at = NOW() WHERE member_id = $1",
          [memberId]
        );
        await pool.query(
          "UPDATE subscriptions SET status = 'cancelled', end_date = NOW() WHERE provider_subscription_id = $1",
          [subscription.id]
        );
        await pool.query(
          "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
          [memberId]
        );
        const memberData = await pool.query(
          `SELECT m.name, m.email, g.name as gym_name
           FROM members m JOIN gyms g ON m.gym_id = g.gym_id WHERE m.member_id = $1`,
          [memberId]
        );
        if (memberData.rows.length > 0) {
          const m = memberData.rows[0];
          await pool.query(
            `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
             VALUES ($1, 'cancellation', 'email', $2, $3, $4, 'pending')`,
            [
              memberId, m.email,
              `Membership cancelled – ${m.gym_name}`,
              `Hi ${m.name},\n\nYour membership at ${m.gym_name} has been cancelled. Your access code has been deactivated and your access will expire immediately.\n\nBest regards,\n${m.gym_name}`
            ]
          );
        }
      }
      break;
    }
  }
}

// Handle SaaS platform billing events (gym owner subscription to GymAccess)
async function handleSaasEvent(event: any) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const gymId = session.metadata?.gymId;
      if (gymId) {
        await pool.query(
          `UPDATE gyms SET saas_status = 'active', saas_subscription_id = $1, saas_stripe_customer_id = $2
           WHERE gym_id = $3`,
          [session.subscription, session.customer, gymId]
        );
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (subscriptionId) {
        await pool.query(
          "UPDATE gyms SET saas_status = 'active' WHERE saas_subscription_id = $1",
          [subscriptionId]
        );
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (subscriptionId) {
        await pool.query(
          "UPDATE gyms SET saas_status = 'past_due' WHERE saas_subscription_id = $1",
          [subscriptionId]
        );
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await pool.query(
        "UPDATE gyms SET saas_status = 'cancelled' WHERE saas_subscription_id = $1",
        [subscription.id]
      );
      break;
    }
  }
}

// Handle connected account status updates (Stripe Connect onboarding)
async function handleAccountUpdated(event: any) {
  const connectedAccountId = event.account;
  if (!connectedAccountId) return;

  const accountObj = event.data.object;
  const gym = await pool.query(
    'SELECT gym_id FROM gyms WHERE stripe_connect_account_id = $1',
    [connectedAccountId]
  );
  if (gym.rows.length === 0) return;

  if (accountObj.charges_enabled && accountObj.payouts_enabled) {
    await pool.query(
      "UPDATE gyms SET stripe_connect_status = 'active' WHERE gym_id = $1",
      [gym.rows[0].gym_id]
    );
  }
  // If not both enabled, leave as 'pending'
}

// Stripe webhook handler
webhookRoutes.post('/stripe', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify Stripe signature if secret is configured (not a placeholder)
    if (sig && webhookSecret && !PLACEHOLDER_SECRETS.includes(webhookSecret)) {
      const rawBody = typeof req.body === 'string' ? req.body : req.body.toString();
      if (!verifyStripeSignature(rawBody, sig, webhookSecret)) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    } else if (sig && webhookSecret && !PLACEHOLDER_SECRETS.includes(webhookSecret) && !sig) {
      return res.status(400).json({ error: 'Missing webhook signature' });
    }

    // Parse body
    let event;
    try {
      const body = typeof req.body === 'string' ? req.body : req.body.toString();
      event = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Route: account.updated always goes to connect status handler
    if (event.type === 'account.updated') {
      await handleAccountUpdated(event);
    } else if (event.account) {
      // Has 'account' field = connected account event (gym member payments)
      await handleMemberEvent(event);
    } else {
      // No 'account' field = platform event
      // Distinguish SaaS vs member by metadata or subscription ID lookup
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        if (session.metadata?.gymId && !session.metadata?.memberId) {
          await handleSaasEvent(event);
        } else {
          await handleMemberEvent(event);
        }
      } else {
        // For invoice/subscription events: check if subscription belongs to SaaS or member
        const subscriptionId = event.data.object?.subscription || event.data.object?.id;
        const saasMatch = subscriptionId ? await pool.query(
          'SELECT gym_id FROM gyms WHERE saas_subscription_id = $1',
          [subscriptionId]
        ) : { rows: [] };

        if (saasMatch.rows.length > 0) {
          await handleSaasEvent(event);
        } else {
          // Default: member event (backward compatibility)
          await handleMemberEvent(event);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
