import { Router } from 'express';
import { pool } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const adminRoutes = Router();

// All admin routes require authentication
adminRoutes.use(requireAuth);

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
    const { status, search } = req.query;
    let query = `
      SELECT m.*, ac.code as access_code, s.status as subscription_status
      FROM members m
      LEFT JOIN access_codes ac ON m.member_id = ac.member_id AND ac.valid_to IS NULL
      LEFT JOIN subscriptions s ON m.member_id = s.member_id AND s.status = 'active'
      WHERE m.gym_id = $1
    `;
    const params: any[] = [req.gymId];

    if (status) {
      params.push(status);
      query += ` AND m.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (m.name ILIKE $${params.length} OR m.email ILIKE $${params.length})`;
    }

    query += ' ORDER BY m.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List members error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get member detail
adminRoutes.get('/members/:memberId', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, ac.code as access_code, s.provider, s.provider_subscription_id, s.start_date, s.status as subscription_status
       FROM members m
       LEFT JOIN access_codes ac ON m.member_id = ac.member_id AND ac.valid_to IS NULL
       LEFT JOIN subscriptions s ON m.member_id = s.member_id
       WHERE m.member_id = $1 AND m.gym_id = $2`,
      [req.params.memberId, req.gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(result.rows[0]);
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
    await pool.query(
      `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
       VALUES ($1, 'access_info', 'email', $2, 'Your Access Information', $3, 'pending')`,
      [member.member_id, member.email, `Your access code is: ${member.access_code}`]
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
      codes: codes.rows
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
        [member.member_id, newPin]
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

// Update gym settings
adminRoutes.put('/settings', async (req: AuthRequest, res) => {
  try {
    const { membershipPrice, billingInterval, accessType } = req.body;

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
