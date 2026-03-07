import { Router } from 'express';
import { pool } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { encryptCode, decryptCode, isEncrypted } from '../utils/crypto';
import {
  isSeamConfigured, isSeamMockMode,
  createConnectWebview, getConnectWebviewStatus,
  listDevices, createOfflineAccessCode, deleteAccessCode,
} from '../utils/seam';
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
    res.json(result.rows[0]);
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
      LEFT JOIN access_codes ac ON m.member_id = ac.member_id AND ac.valid_to IS NULL
      LEFT JOIN subscriptions s ON m.member_id = s.member_id AND s.status = 'active'
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
              g.seam_device_id, g.seam_connected_account_id, g.seam_tier,
              g.igloohome_lock_id
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
    const igloohomeDirectConfigured = isIgloohomeConfigured() && !!member.igloohome_lock_id;
    const igloohomeSeamConfigured = !!(member.seam_device_id && (isSeamConfigured() || isSeamMockMode()) && member.seam_tier === 'active');
    const igloohomeConfigured = igloohomeDirectConfigured || igloohomeSeamConfigured;

    res.json({
      ...member,
      access_code: safeDecrypt(member.access_code),
      igloohome_configured: igloohomeConfigured,
      igloohome_direct_configured: igloohomeDirectConfigured,
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
       LEFT JOIN access_codes ac ON m.member_id = ac.member_id AND ac.valid_to IS NULL
       WHERE m.member_id = $1 AND m.gym_id = $2`,
      [req.params.memberId, req.gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // TODO: Queue notification via worker
    const member = result.rows[0];
    const plainCode = safeDecrypt(member.access_code);
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
    const { membershipPrice, billingInterval, accessType, igloohome_lock_id } = req.body;

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

    updates.push(`updated_at = NOW()`);
    values.push(req.gymId);

    const result = await pool.query(
      `UPDATE gyms SET ${updates.join(', ')} WHERE gym_id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Igloohome / Seam Integration Routes ─────────────────────────────────────

async function seamRequired(req: AuthRequest, res: any): Promise<boolean> {
  if (!isSeamConfigured() && !isSeamMockMode()) {
    res.status(503).json({ error: 'Seam not configured. Set SEAM_API_KEY environment variable.' });
    return false;
  }
  // Check that the gym has an active Seam tier subscription
  const gymResult = await pool.query('SELECT seam_tier FROM gyms WHERE gym_id = $1', [req.gymId]);
  if (gymResult.rows.length > 0 && gymResult.rows[0].seam_tier !== 'active') {
    res.status(402).json({
      error: 'Seam integration requires upgrade',
      upgradeUrl: '/admin/settings',
    });
    return false;
  }
  return true;
}

// POST /admin/igloohome/connect — create Seam Connect Webview and return URL
adminRoutes.post('/igloohome/connect', async (req: AuthRequest, res) => {
  if (!await seamRequired(req, res)) return;
  try {
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    // Placeholder; Seam/mock will return the actual URL with the webview ID embedded
    const redirectBase = `${frontendUrl}/admin/settings`;
    const result = await createConnectWebview(redirectBase);
    if (!result) return res.status(500).json({ error: 'Failed to create Connect Webview' });

    // Store a pending marker with the webview ID
    await pool.query(
      'UPDATE gyms SET seam_connected_account_id = $1 WHERE gym_id = $2',
      [`pending:${result.connect_webview_id}`, req.gymId]
    );

    res.json({ url: result.url, connect_webview_id: result.connect_webview_id });
  } catch (err) {
    console.error('Igloohome connect error:', err);
    res.status(500).json({ error: 'Failed to initiate igloohome connection' });
  }
});

// GET /admin/igloohome/status?connect_webview_id=... — check webview status and save connected_account_id
adminRoutes.get('/igloohome/status', async (req: AuthRequest, res) => {
  if (!await seamRequired(req, res)) return;
  try {
    const { connect_webview_id } = req.query as { connect_webview_id?: string };
    if (!connect_webview_id) return res.status(400).json({ error: 'connect_webview_id required' });

    const status = await getConnectWebviewStatus(connect_webview_id);
    if (!status) return res.status(500).json({ error: 'Failed to get webview status' });

    if (status.status === 'authorized' && status.connected_account_id) {
      await pool.query(
        'UPDATE gyms SET seam_connected_account_id = $1, updated_at = NOW() WHERE gym_id = $2',
        [status.connected_account_id, req.gymId]
      );
    }

    res.json(status);
  } catch (err) {
    console.error('Igloohome status error:', err);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

// GET /admin/igloohome/devices — list igloohome devices for the connected account
adminRoutes.get('/igloohome/devices', async (req: AuthRequest, res) => {
  if (!await seamRequired(req, res)) return;
  try {
    const gymResult = await pool.query(
      'SELECT seam_connected_account_id FROM gyms WHERE gym_id = $1',
      [req.gymId]
    );
    const connectedAccountId = gymResult.rows[0]?.seam_connected_account_id;
    if (!connectedAccountId || connectedAccountId.startsWith('pending:')) {
      return res.status(400).json({ error: 'igloohome account not connected' });
    }

    const devices = await listDevices(connectedAccountId);
    res.json({ devices });
  } catch (err) {
    console.error('Igloohome devices error:', err);
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

// PUT /admin/settings/igloohome — save selected device_id
adminRoutes.put('/settings/igloohome', async (req: AuthRequest, res) => {
  if (!await seamRequired(req, res)) return;
  try {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id required' });

    await pool.query(
      'UPDATE gyms SET seam_device_id = $1, updated_at = NOW() WHERE gym_id = $2',
      [device_id, req.gymId]
    );

    res.json({ device_id });
  } catch (err) {
    console.error('Igloohome settings error:', err);
    res.status(500).json({ error: 'Failed to save igloohome settings' });
  }
});

// DELETE /admin/igloohome/connect — disconnect igloohome account
adminRoutes.delete('/igloohome/connect', async (req: AuthRequest, res) => {
  if (!await seamRequired(req, res)) return;
  try {
    await pool.query(
      'UPDATE gyms SET seam_connected_account_id = NULL, seam_device_id = NULL, updated_at = NOW() WHERE gym_id = $1',
      [req.gymId]
    );
    res.json({ disconnected: true });
  } catch (err) {
    console.error('Igloohome disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect igloohome' });
  }
});

// POST /admin/members/:memberId/igloohome/regenerate — regenerate algoPIN for a member
adminRoutes.post('/members/:memberId/igloohome/regenerate', async (req: AuthRequest, res) => {
  try {
    const { memberId } = req.params;

    const result = await pool.query(
      `SELECT m.*, g.seam_device_id, g.seam_tier, g.igloohome_lock_id, g.name as gym_name,
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

    const useIgloohomeDirect = isIgloohomeConfigured() && !!member.igloohome_lock_id;
    const useSeam = !useIgloohomeDirect && (isSeamConfigured() || isSeamMockMode()) &&
                    !!member.seam_device_id && member.seam_tier === 'active';

    if (!useIgloohomeDirect && !useSeam) {
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
      if (row.source === 'igloohome' && row.provider_code_id) {
        await deleteAccessCode(row.provider_code_id).catch(err =>
          console.error('Failed to delete old Seam code on regenerate:', err)
        );
      } else if (row.source === 'igloohome_direct' && row.provider_code_id && member.igloohome_lock_id) {
        await deleteAlgoPin(member.igloohome_lock_id, row.provider_code_id).catch(err =>
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

    if (useIgloohomeDirect) {
      const igResult = await createAlgoPin(
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
    } else {
      const seamResult = await createOfflineAccessCode(member.seam_device_id, member.name, startsAt, endsAt);
      if (!seamResult) {
        return res.status(500).json({ error: 'Failed to create new igloohome PIN via Seam' });
      }
      newCode = seamResult.code;
      newProviderCodeId = seamResult.access_code_id;
      newSource = 'igloohome';
    }

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

// POST /admin/saas/seam-addon — create Stripe checkout for Seam add-on subscription
adminRoutes.post('/saas/seam-addon', async (req: AuthRequest, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const addonPrice = parseInt(process.env.SEAM_ADDON_PRICE || '14900');
    const adminResult = await pool.query(
      'SELECT email FROM admins WHERE gym_id = $1 LIMIT 1',
      [req.gymId]
    );
    if (adminResult.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'nok',
          product_data: { name: 'GymAccess Seam Smart Lock Integration' },
          unit_amount: addonPrice,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      customer_email: adminResult.rows[0].email,
      metadata: { gymId: req.gymId, addon: 'seam' },
      success_url: `${frontendUrl}/admin/settings`,
      cancel_url: `${frontendUrl}/admin/settings`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Seam addon checkout error:', err);
    res.status(500).json({ error: 'Failed to create Seam addon checkout session' });
  }
});
