import { Router } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import { encryptCode, decryptCode, isEncrypted } from '../utils/crypto';

export const subscriptionRoutes = Router();

function generatePin(length: number = 4): string {
  const max = Math.pow(10, length);
  return crypto.randomInt(0, max).toString().padStart(length, '0');
}

// Generate access code and queue welcome notification for a newly activated member
export async function activateMemberAccess(memberId: string): Promise<string | null> {
  const memberResult = await pool.query(
    `SELECT m.*, g.access_type, g.shared_pin, g.name as gym_name FROM members m
     JOIN gyms g ON m.gym_id = g.gym_id
     WHERE m.member_id = $1`,
    [memberId]
  );
  if (memberResult.rows.length === 0) return null;

  const member = memberResult.rows[0];
  const codeLength = parseInt(process.env.ACCESS_CODE_LENGTH || '4');
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
    "INSERT INTO access_codes (member_id, code, valid_from) VALUES ($1, $2, NOW())",
    [memberId, encryptCode(code)]
  );

  // Queue welcome notification with gym name and access code
  await pool.query(
    `INSERT INTO notifications (member_id, type, channel, recipient, subject, body, status)
     VALUES ($1, 'welcome', 'email', $2, $3, $4, 'pending')`,
    [
      memberId,
      member.email,
      `Welcome to ${member.gym_name}!`,
      `Hi ${member.name},\n\nWelcome to ${member.gym_name}! Your membership is now active.\n\nYour access code: ${code}\n\nBest regards,\n${member.gym_name}`
    ]
  );

  return code;
}

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
      [memberId, provider || 'manual', providerSubscriptionId || null]
    );

    // Update member status to active
    await pool.query(
      "UPDATE members SET status = 'active', updated_at = NOW() WHERE member_id = $1",
      [memberId]
    );

    // Generate access code and queue welcome email
    const code = await activateMemberAccess(memberId);

    res.status(201).json({ ...subResult.rows[0], accessCode: code });
  } catch (err) {
    console.error('Activate subscription error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
