import { Router } from 'express';
import { pool } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { encryptCode, decryptCode, isEncrypted } from '../utils/crypto';
import { isIgloohomeConfigured, createAlgoPin, deleteAlgoPin } from '../utils/igloohome';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_API_KEY
  ? new Stripe(process.env.STRIPE_API_KEY, { apiVersion: '2024-06-20' as any })
  : null;

function safeDecrypt(code: string | null): string | null {
  if (!code) return null;
  return isEncrypted(code) ? decryptCode(code) : code;
}

export const adminRoutes = Router();

// All admin routes require authentication
adminRoutes.use(requireAuth);

// Delete gym (cascade deletes all members, admins, etc.)
adminRoutes.delete('/gym', async (req: AuthRequest, res) => {
  try {
    // Break circular FK: set admin_user to NULL before delete
    await pool.query('UPDATE gyms SET admin_user = NULL WHERE gym_id = $1', [req.gymId]);
    const result = await pool.query('DELETE FROM gyms WHERE gym_id = $1 RETURNING gym_id', [req.gymId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Gym not found' });
    }
    res.json({ deleted: true, gym_id: req.gymId });
  } catch (err) {
    console.error('Delete gym error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get gym details for admin
adminRoutes.get('/gym', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM gyms WHERE gym_id = $1', [req.gymId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gym not found' });
    }
    const gym = result.rows[0];
    // Never expose igloohome_client_secret; replace with a configured flag
    const igloohome_configured = !!(gym.igloohome_client_id && gym.igloohome_client_secret);
    const { igloohome_client_secret: _secret, ...gymWithoutSecret } = gym;
    res.json({ ...gymWithoutSecret, igloohome_configured });
  } catch (err) {
    console.error('Get gym error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List members for admin's gym
adminRoutes.get('/members', async (req: AuthRequest, res) => {
  try {
    const { status, search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `
      FROM members m
      LEFT JOIN access_codes ac ON ac.code_id = (
        SELECT code_id FROM access_codes
        WHERE member_id = m.member_id AND valid_to IS NULL
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN subscriptions s ON s.subscription_id = (
        SELECT subscription_id FROM subscriptions
        WHERE member_id = m.member_id AND status = 'active'
        ORDER BY created_at DESC LIMIT 1
      )
      WHERE m.gym_id = $1
    `;
    const params: any[] = [req.gymId];

    if (status) {
      params.push(status);
      baseQuery += ` AND m.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      baseQuery += ` AND (m.name ILIKE $${params.length} OR m.email ILIKE $${params.length})`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limitNum, offset];
    const result = await pool.query(
      `SELECT m.*, ac.code as access_code, s.status as subscription_status ${baseQuery} ORDER BY m.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    const members = result.rows.map(m => ({
      ...m,
      access_code: safeDecrypt(m.access_code),
    }));

    res.json({
      members,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('List members error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get member detail
adminRoutes.get('/members/:memberId', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, ac.code as access_code, ac.source as access_source,
              ac.provider_code_id, ac.valid_from as access_valid_from,
              ac.valid_to as access_valid_to,
              s.provider, s.provider_subscription_id, s.start_date, s.end_date as subscription_end_date,
              s.status as subscription_status,
              g.igloohome_lock_id, g.igloohome_client_id, g.igloohome_client_secret
       FROM members m
       LEFT JOIN access_codes ac ON m.member_id = ac.member_id AND ac.valid_to IS NULL
       LEFT JOIN subscriptions s ON s.subscription_id = (
         SELECT s2.subscription_id FROM subscriptions s2
         WHERE s2.member_id = m.member_id
         ORDER BY s2.created_at DESC LIMIT 1
       )
       JOIN gyms g ON m.gym_id = g.gym_id
       WHERE m.member_id = $1 AND m.gym_id = $2`,
      [req.params.memberId, req.gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = result.rows[0];
    const igloohomeConfigured = isIgloohomeConfigured(member.igloohome_client_id, member.igloohome_client_secret) && !!member.igloohome_lock_id;

    // Strip sensitive fields before returning
    const { igloohome_client_secret: _s, igloohome_client_id: _cid, ...memberSafe } = member;
    res.json({
      ...memberSafe,
      access_code: safeDecrypt(member.access_code),
      igloohome_configured: igloohomeConfigured,
    });
  } catch (err) {
    console.error('Get member detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Suspend member
adminRoutes.post('/members/:memberId/suspend', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "UPDATE members SET status = 'suspended', updated_at = NOW() WHERE member_id = $1 AND gym_id = $2 RETURNING *",
      [req.params.memberId, req.gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Revoke access code
    await pool.query(
      "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
      [req.params.memberId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Suspend member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel member
adminRoutes.post('/members/:memberId/cancel', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "UPDATE members SET status = 'cancelled', updated_at = NOW() WHERE member_id = $1 AND gym_id = $2 RETURNING *",
      [req.params.memberId, req.gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Revoke access and cancel subscription
    await pool.query(
      "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
      [req.params.memberId]
    );
    await pool.query(
      "UPDATE subscriptions SET status = 'cancelled', end_date = NOW() WHERE member_id = $1 AND status = 'active'",
      [req.params.memberId]
    );

    // Queue cancellation notification
    const member = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
       VALUES ($1, 'cancellation', 'email', $2, 'Your membership has been cancelled', $3, 'pending')`,
      [member.member_id, member.email, `Hi ${member.name}, your membership has been cancelled. Your access code has been revoked.`]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Cancel member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend access info
adminRoutes.post('/members/:memberId/resend', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, ac.code as access_code FROM members m
       LEFT JOIN access_codes ac ON ac.code_id = (
         SELECT code_id FROM access_codes
         WHERE member_id = m.member_id
         AND (valid_to IS NULL OR valid_to > NOW())
         ORDER BY created_at DESC LIMIT 1
       )
       WHERE m.member_id = $1 AND m.gym_id = $2`,
      [req.params.memberId, req.gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = result.rows[0];
    const plainCode = safeDecrypt(member.access_code);
    if (!plainCode) {
      return res.status(400).json({ error: 'No active access code found for this member' });
    }
    await pool.query(
      `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
       VALUES ($1, 'access_info', 'email', $2, 'Your Access Information', $3, 'pending')`,
      [member.member_id, member.email, `Your access code is: ${plainCode}`]
    );

    res.json({ message: 'Access info resend queued' });
  } catch (err) {
    console.error('Resend access info error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get access codes for gym
adminRoutes.get('/access', async (req: AuthRequest, res) => {
  try {
    const gym = await pool.query('SELECT access_type, shared_pin FROM gyms WHERE gym_id = $1', [req.gymId]);
    const codes = await pool.query(
      `SELECT ac.*, m.name as member_name FROM access_codes ac
       JOIN members m ON ac.member_id = m.member_id
       WHERE m.gym_id = $1 AND ac.valid_to IS NULL
       ORDER BY m.name`,
      [req.gymId]
    );

    res.json({
      accessType: gym.rows[0]?.access_type,
      sharedPin: gym.rows[0]?.shared_pin,
      codes: codes.rows.map((c: { code: string; [key: string]: unknown }) => ({
        ...c,
        code: safeDecrypt(c.code),
      })),
    });
  } catch (err) {
    console.error('Get access codes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rotate shared PIN
adminRoutes.post('/access/rotate', async (req: AuthRequest, res) => {
  try {
    const crypto = await import('crypto');
    const length = parseInt(process.env.ACCESS_CODE_LENGTH || '4');
    const newPin = crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, '0');

    await pool.query('UPDATE gyms SET shared_pin = $1, updated_at = NOW() WHERE gym_id = $2', [newPin, req.gymId]);

    // Update all active member access codes
    const members = await pool.query(
      "SELECT member_id, email FROM members WHERE gym_id = $1 AND status = 'active'",
      [req.gymId]
    );

    for (const member of members.rows) {
      await pool.query(
        "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
        [member.member_id]
      );
      await pool.query(
        "INSERT INTO access_codes (member_id, code, valid_from) VALUES ($1, $2, NOW())",
        [member.member_id, encryptCode(newPin)]
      );
      // Queue notification
      await pool.query(
        `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
         VALUES ($1, 'pin_rotated', 'email', $2, 'New Access Code', $3, 'pending')`,
        [member.member_id, member.email, `Your new access code is: ${newPin}`]
      );
    }

    res.json({ newPin });
  } catch (err) {
    console.error('Rotate PIN error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payments overview
adminRoutes.get('/payments', async (req: AuthRequest, res) => {
  try {
    const gym = await pool.query('SELECT membership_price FROM gyms WHERE gym_id = $1', [req.gymId]);
    const price = gym.rows[0]?.membership_price || 0;

    const active = await pool.query(
      "SELECT COUNT(*) FROM members WHERE gym_id = $1 AND status = 'active'",
      [req.gymId]
    );
    const pastDue = await pool.query(
      "SELECT COUNT(*) FROM members WHERE gym_id = $1 AND status = 'past_due'",
      [req.gymId]
    );
    const cancelled = await pool.query(
      "SELECT COUNT(*) FROM members WHERE gym_id = $1 AND status = 'cancelled'",
      [req.gymId]
    );

    const activeCount = parseInt(active.rows[0].count);

    res.json({
      monthlyRevenue: activeCount * price,
      activeSubscriptions: activeCount,
      failedPayments: parseInt(pastDue.rows[0].count),
      cancelledSubscriptions: parseInt(cancelled.rows[0].count)
    });
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification templates
adminRoutes.get('/notification-templates', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT type, subject, body FROM notification_templates WHERE gym_id = $1 ORDER BY type',
      [req.gymId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get notification templates error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a notification template
adminRoutes.put('/notification-templates/:type', async (req: AuthRequest, res) => {
  try {
    const { type } = req.params;
    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Subject and body required' });

    await pool.query(
      `INSERT INTO notification_templates (gym_id, type, subject, body, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (gym_id, type) DO UPDATE SET subject = $3, body = $4, updated_at = NOW()`,
      [req.gymId, type, subject, body]
    );

    res.json({ type, subject, body });
  } catch (err) {
    console.error('Update notification template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/stripe/connect — create Stripe Express connected account and return onboarding URL
adminRoutes.post('/stripe/connect', async (req: AuthRequest, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const gymResult = await pool.query(
      'SELECT stripe_connect_account_id, stripe_connect_status FROM gyms WHERE gym_id = $1',
      [req.gymId]
    );
    if (gymResult.rows.length === 0) return res.status(404).json({ error: 'Gym not found' });

    const gym = gymResult.rows[0];
    let accountId = gym.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express' });
      accountId = account.id;
      await pool.query(
        "UPDATE gyms SET stripe_connect_account_id = $1, stripe_connect_status = 'pending' WHERE gym_id = $2",
        [accountId, req.gymId]
      );
    } else if (gym.stripe_connect_status !== 'active') {
      await pool.query(
        "UPDATE gyms SET stripe_connect_status = 'pending' WHERE gym_id = $1",
        [req.gymId]
      );
    }

    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl}/admin/settings`,
      return_url: `${frontendUrl}/admin/settings`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url, accountId });
  } catch (err) {
    console.error('Stripe connect error:', err);
    res.status(500).json({ error: 'Failed to create Stripe Connect account' });
  }
});

// POST /admin/saas/checkout — create Stripe Checkout session for GymAccess SaaS subscription
adminRoutes.post('/saas/checkout', async (req: AuthRequest, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const { plan } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'plan must be monthly or yearly' });
    }

    const adminResult = await pool.query(
      'SELECT email FROM admins WHERE gym_id = $1 LIMIT 1',
      [req.gymId]
    );
    if (adminResult.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    const monthlyPrice = parseInt(process.env.SAAS_MONTHLY_PRICE || '299');
    const yearlyPrice = parseInt(process.env.SAAS_YEARLY_PRICE || '2490');
    const price = plan === 'yearly' ? yearlyPrice : monthlyPrice;
    const interval = plan === 'yearly' ? 'year' : 'month';

    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'nok',
          product_data: { name: 'GymAccess Platform Subscription' },
          unit_amount: price * 100,
          recurring: { interval },
        },
        quantity: 1,
      }],
      customer_email: adminResult.rows[0].email,
      metadata: { gymId: req.gymId },
      success_url: `${frontendUrl}/admin/settings`,
      cancel_url: `${frontendUrl}/admin/settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('SaaS checkout error:', err);
    res.status(500).json({ error: 'Failed to create SaaS checkout session' });
  }
});

// POST /admin/saas/portal — return Stripe Customer Portal URL for managing SaaS subscription
adminRoutes.post('/saas/portal', async (req: AuthRequest, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const gymResult = await pool.query(
      'SELECT saas_stripe_customer_id FROM gyms WHERE gym_id = $1',
      [req.gymId]
    );
    if (gymResult.rows.length === 0) return res.status(404).json({ error: 'Gym not found' });

    const customerId = gymResult.rows[0].saas_stripe_customer_id;
    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer found. Please subscribe first.' });
    }

    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontendUrl}/admin/settings`,
    });

    res.json({ url: portal.url });
  } catch (err) {
    console.error('SaaS portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Update gym settings
adminRoutes.put('/settings', async (req: AuthRequest, res) => {
  try {
    const { membershipPrice, billingInterval, accessType, igloohome_lock_id, igloohome_client_id, igloohome_client_secret } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (membershipPrice !== undefined) {
      updates.push(`membership_price = $${paramCount++}`);
      values.push(membershipPrice);
    }
    if (billingInterval) {
      updates.push(`billing_interval = $${paramCount++}`);
      values.push(billingInterval);
    }
    if (accessType) {
      updates.push(`access_type = $${paramCount++}`);
      values.push(accessType);
    }
    if (igloohome_lock_id !== undefined) {
      // Allow setting to null (empty string -> null) to clear the lock ID
      updates.push(`igloohome_lock_id = $${paramCount++}`);
      values.push(igloohome_lock_id === '' ? null : igloohome_lock_id);
    }
    if (igloohome_client_id !== undefined) {
      updates.push(`igloohome_client_id = $${paramCount++}`);
      values.push(igloohome_client_id === '' ? null : igloohome_client_id);
    }
    // Only update client_secret if a non-empty string is provided (empty string = keep existing)
    if (igloohome_client_secret && typeof igloohome_client_secret === 'string') {
      updates.push(`igloohome_client_secret = $${paramCount++}`);
      values.push(igloohome_client_secret);
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.gymId);

    const result = await pool.query(
      `UPDATE gyms SET ${updates.join(', ')} WHERE gym_id = $${paramCount} RETURNING *`,
      values
    );

    const gym = result.rows[0];
    const igloohome_configured = !!(gym.igloohome_client_id && gym.igloohome_client_secret);
    const { igloohome_client_secret: _secret, ...gymWithoutSecret } = gym;
    res.json({ ...gymWithoutSecret, igloohome_configured });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Igloohome Integration Routes ─────────────────────────────────────

// POST /admin/members/:memberId/igloohome/regenerate — regenerate algoPIN for a member
adminRoutes.post('/members/:memberId/igloohome/regenerate', async (req: AuthRequest, res) => {
  try {
    const { memberId } = req.params;

    const result = await pool.query(
      `SELECT m.*, g.igloohome_lock_id,
              g.igloohome_client_id, g.igloohome_client_secret, g.name as gym_name,
              s.end_date
       FROM members m
       JOIN gyms g ON m.gym_id = g.gym_id
       LEFT JOIN subscriptions s ON s.subscription_id = (
         SELECT s2.subscription_id FROM subscriptions s2
         WHERE s2.member_id = m.member_id ORDER BY s2.created_at DESC LIMIT 1
       )
       WHERE m.member_id = $1 AND m.gym_id = $2`,
      [memberId, req.gymId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    const member = result.rows[0];

    const useIgloohomeDirect = isIgloohomeConfigured(member.igloohome_client_id, member.igloohome_client_secret) && !!member.igloohome_lock_id;

    if (!useIgloohomeDirect) {
      return res.status(400).json({ error: 'No igloohome integration configured for this gym' });
    }

    const startsAt = new Date();
    const endsAt = member.end_date ? new Date(member.end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Delete existing provider codes
    const existingCodes = await pool.query(
      "SELECT provider_code_id, source FROM access_codes WHERE member_id = $1 AND valid_to IS NULL",
      [memberId]
    );
    for (const row of existingCodes.rows) {
      if (row.source === 'igloohome_direct' && row.provider_code_id && member.igloohome_lock_id) {
        await deleteAlgoPin(member.igloohome_client_id, member.igloohome_client_secret, member.igloohome_lock_id, row.provider_code_id).catch(err =>
          console.error('Failed to delete old igloohome direct PIN on regenerate:', err)
        );
      }
    }

    // Revoke all existing codes
    await pool.query(
      "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
      [memberId]
    );

    let newCode: string;
    let newProviderCodeId: string | null = null;
    let newSource: string;

    const igResult = await createAlgoPin(
      member.igloohome_client_id,
      member.igloohome_client_secret,
      member.igloohome_lock_id,
      startsAt,
      endsAt,
      `GymAccess - ${member.name}`
    );
    if (!igResult) {
      return res.status(500).json({ error: 'Failed to create new igloohome direct algoPIN' });
    }
    newCode = igResult.pin;
    newProviderCodeId = igResult.pinId;
    newSource = 'igloohome_direct';

    await pool.query(
      "INSERT INTO access_codes (member_id, code, valid_from, source, provider_code_id) VALUES ($1, $2, NOW(), $3, $4)",
      [memberId, encryptCode(newCode), newSource, newProviderCodeId]
    );

    res.json({ code: newCode, provider_code_id: newProviderCodeId, source: newSource });
  } catch (err) {
    console.error('Igloohome regenerate error:', err);
    res.status(500).json({ error: 'Failed to regenerate igloohome PIN' });
  }
});
