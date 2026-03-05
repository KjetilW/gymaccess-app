import { Router } from 'express';
import { pool } from '../db';

export const subscriptionRoutes = Router();

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

    // Create subscription
    const subResult = await pool.query(
      `INSERT INTO subscriptions (member_id, provider, provider_subscription_id, status, start_date)
       VALUES ($1, $2, $3, 'active', NOW()) RETURNING *`,
      [memberId, provider || 'stripe', providerSubscriptionId || null]
    );

    // Update member status to active
    await pool.query(
      "UPDATE members SET status = 'active', updated_at = NOW() WHERE member_id = $1",
      [memberId]
    );

    res.status(201).json(subResult.rows[0]);
  } catch (err) {
    console.error('Activate subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
