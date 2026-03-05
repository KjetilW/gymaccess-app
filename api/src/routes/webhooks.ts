import { Router } from 'express';
import { pool } from '../db';

export const webhookRoutes = Router();

// Stripe webhook handler
webhookRoutes.post('/stripe', async (req, res) => {
  try {
    // In production, verify Stripe signature
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // For development, parse the raw body
    let event;
    try {
      const body = typeof req.body === 'string' ? req.body : req.body.toString();
      event = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // TODO: In production, verify signature with Stripe SDK
    // const stripe = new Stripe(process.env.STRIPE_API_KEY);
    // event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const memberId = session.metadata?.memberId;
        if (memberId) {
          // Check idempotency - don't activate if already active
          const member = await pool.query('SELECT status FROM members WHERE member_id = $1', [memberId]);
          if (member.rows.length > 0 && member.rows[0].status !== 'active') {
            await pool.query(
              "UPDATE members SET status = 'active', stripe_customer_id = $1, updated_at = NOW() WHERE member_id = $2",
              [session.customer, memberId]
            );
            await pool.query(
              `INSERT INTO subscriptions (member_id, provider, provider_subscription_id, status, start_date)
               VALUES ($1, 'stripe', $2, 'active', NOW())`,
              [memberId, session.subscription]
            );
            // TODO: Generate access code and send notification via worker
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
            await pool.query(
              "UPDATE members SET status = 'active', updated_at = NOW() WHERE member_id = $1",
              [sub.rows[0].member_id]
            );
            // TODO: Send receipt notification
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
            await pool.query(
              "UPDATE members SET status = 'past_due', updated_at = NOW() WHERE member_id = $1",
              [sub.rows[0].member_id]
            );
            // TODO: Send payment failure notification
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
          await pool.query(
            "UPDATE members SET status = 'cancelled', updated_at = NOW() WHERE member_id = $1",
            [sub.rows[0].member_id]
          );
          await pool.query(
            "UPDATE subscriptions SET status = 'cancelled', end_date = NOW() WHERE provider_subscription_id = $1",
            [subscription.id]
          );
          // TODO: Revoke access code and send notification
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
