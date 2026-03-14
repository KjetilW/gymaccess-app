import { Router } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import { encryptCode, decryptCode, isEncrypted } from '../utils/crypto';
import { isIgloohomeConfigured, createAlgoPin, createBluetoothGuestKey } from '../utils/igloohome';

export const accessRoutes = Router();

function generatePin(length: number = 4): string {
  const max = Math.pow(10, length);
  const pin = crypto.randomInt(0, max);
  return pin.toString().padStart(length, '0');
}

// Generate access code for a member
accessRoutes.post('/generate', async (req, res) => {
  try {
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: 'memberId is required' });
    }

    const memberResult = await pool.query(
      `SELECT m.*, g.access_type, g.shared_pin FROM members m
       JOIN gyms g ON m.gym_id = g.gym_id
       WHERE m.member_id = $1`,
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = memberResult.rows[0];
    const codeLength = parseInt(process.env.ACCESS_CODE_LENGTH || '4');
    let code: string;

    if (member.access_type === 'shared_pin') {
      // Use gym's shared PIN
      code = member.shared_pin || generatePin(codeLength);
      if (!member.shared_pin) {
        await pool.query('UPDATE gyms SET shared_pin = $1 WHERE gym_id = $2', [code, member.gym_id]);
      }
    } else {
      // Generate individual PIN, ensure uniqueness within gym
      // Fetch all current active codes for this gym and decrypt them for comparison
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

    // Revoke any existing codes for this member
    await pool.query(
      "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
      [memberId]
    );

    // Encrypt and store new code
    const encryptedCode = encryptCode(code);
    const result = await pool.query(
      `INSERT INTO access_codes (member_id, code, valid_from)
       VALUES ($1, $2, NOW()) RETURNING *`,
      [memberId, encryptedCode]
    );

    // Return with plaintext code for the caller
    res.status(201).json({ ...result.rows[0], code });
  } catch (err) {
    console.error('Generate access code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke access code
accessRoutes.post('/revoke', async (req, res) => {
  try {
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: 'memberId is required' });
    }

    const result = await pool.query(
      "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL RETURNING *",
      [memberId]
    );

    res.json({ revoked: result.rowCount, codes: result.rows });
  } catch (err) {
    console.error('Revoke access code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /access/request-pin — on-demand igloohome AlgoPIN for an active member
// Authenticated via manage_token (same token used for /manage/[token] page)
accessRoutes.post('/request-pin', async (req, res) => {
  try {
    const { manage_token } = req.body;
    if (!manage_token) {
      return res.status(401).json({ error: 'manage_token is required' });
    }

    // Look up member + gym credentials via manage_token
    const memberResult = await pool.query(
      `SELECT m.member_id, m.name, m.status,
              g.igloohome_client_id, g.igloohome_client_secret, g.igloohome_lock_id
       FROM members m
       JOIN gyms g ON m.gym_id = g.gym_id
       WHERE m.manage_token = $1`,
      [manage_token]
    );

    if (memberResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or unknown token' });
    }

    const member = memberResult.rows[0];

    if (member.status !== 'active') {
      return res.status(403).json({ error: 'Membership must be active to request a door PIN' });
    }

    if (!isIgloohomeConfigured(member.igloohome_client_id, member.igloohome_client_secret) || !member.igloohome_lock_id) {
      return res.status(404).json({ error: 'This gym does not have igloohome configured' });
    }

    // Reuse check: if a PIN was generated less than 2 hours ago and is still valid, return it
    const recentPin = await pool.query(
      `SELECT code, valid_to FROM access_codes
       WHERE member_id = $1 AND source = 'igloohome_direct'
         AND valid_to > NOW()
         AND valid_from > NOW() - INTERVAL '2 hours'
       ORDER BY valid_from DESC LIMIT 1`,
      [member.member_id]
    );

    if (recentPin.rows.length > 0) {
      const existing = recentPin.rows[0];
      const pin = isEncrypted(existing.code) ? decryptCode(existing.code) : existing.code;
      return res.json({ pin, valid_until: existing.valid_to });
    }

    // Rate limit: max 3 new PIN generations per hour per member
    const rateCheck = await pool.query(
      `SELECT COUNT(*) as count FROM access_codes
       WHERE member_id = $1 AND source = 'igloohome_direct'
         AND valid_from > NOW() - INTERVAL '1 hour'`,
      [member.member_id]
    );
    const newPinsThisHour = parseInt(rateCheck.rows[0].count, 10);

    if (newPinsThisHour >= 3) {
      // Find when the oldest of those 3 was created so we can tell the member when to retry
      const oldest = await pool.query(
        `SELECT valid_from FROM access_codes
         WHERE member_id = $1 AND source = 'igloohome_direct'
           AND valid_from > NOW() - INTERVAL '1 hour'
         ORDER BY valid_from ASC LIMIT 1`,
        [member.member_id]
      );
      const retryAfter = oldest.rows[0]
        ? new Date(new Date(oldest.rows[0].valid_from).getTime() + 60 * 60 * 1000)
        : new Date(Date.now() + 60 * 60 * 1000);
      return res.status(429).json({
        error: `Rate limit exceeded. You can request a new PIN after ${retryAfter.toISOString()}`,
        retry_after: retryAfter,
      });
    }

    // Generate 2-hour AlgoPIN via igloohome API
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

    let igResult: { pin: string; pinId: string } | null = null;
    try {
      igResult = await createAlgoPin(
        member.igloohome_client_id,
        member.igloohome_client_secret,
        member.igloohome_lock_id,
        startsAt,
        endsAt,
        `GymAccess On-Demand`
      );
    } catch (err: any) {
      console.error('igloohome createAlgoPin error in request-pin:', err);
      return res.status(502).json({ error: 'Failed to generate PIN. Please try again or contact your gym.' });
    }

    if (!igResult) {
      console.error('igloohome createAlgoPin returned null for member', member.member_id);
      return res.status(502).json({ error: 'Failed to generate PIN. Please try again or contact your gym.' });
    }

    // Store encrypted PIN in access_codes with explicit valid_to (2 hours)
    await pool.query(
      `INSERT INTO access_codes (member_id, code, valid_from, valid_to, source, provider_code_id)
       VALUES ($1, $2, $3, $4, 'igloohome_direct', $5)`,
      [member.member_id, encryptCode(igResult.pin), startsAt, endsAt, igResult.pinId]
    );

    res.json({ pin: igResult.pin, valid_until: endsAt });
  } catch (err) {
    console.error('Request PIN error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /access/request-bluetooth — generate igloohome Bluetooth guest key for an active member
accessRoutes.post('/request-bluetooth', async (req, res) => {
  try {
    const { manage_token } = req.body;
    if (!manage_token) {
      return res.status(401).json({ error: 'manage_token is required' });
    }

    const memberResult = await pool.query(
      `SELECT m.member_id, m.name, m.status,
              g.name as gym_name, g.igloohome_client_id, g.igloohome_client_secret, g.igloohome_lock_id
       FROM members m
       JOIN gyms g ON m.gym_id = g.gym_id
       WHERE m.manage_token = $1`,
      [manage_token]
    );

    if (memberResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or unknown token' });
    }

    const member = memberResult.rows[0];

    if (member.status !== 'active') {
      return res.status(403).json({ error: 'Membership must be active to set up Bluetooth access' });
    }

    if (!isIgloohomeConfigured(member.igloohome_client_id, member.igloohome_client_secret) || !member.igloohome_lock_id) {
      return res.status(404).json({ error: 'This gym does not have igloohome configured' });
    }

    // Reuse an existing valid bluetooth key (valid for more than 1 day remaining)
    const existing = await pool.query(
      `SELECT code, provider_code_id, valid_to FROM access_codes
       WHERE member_id = $1 AND source = 'igloohome_bluetooth'
         AND valid_to > NOW() + INTERVAL '1 day'
       ORDER BY valid_from DESC LIMIT 1`,
      [member.member_id]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const key = isEncrypted(row.code) ? decryptCode(row.code) : row.code;
      return res.json({ keyId: row.provider_code_id, bluetoothGuestKey: key, valid_until: row.valid_to });
    }

    // Generate a new Bluetooth guest key valid for 30 days
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const igResult = await createBluetoothGuestKey(
      member.igloohome_client_id,
      member.igloohome_client_secret,
      member.igloohome_lock_id,
      startsAt,
      endsAt
    );

    if (!igResult) {
      return res.status(502).json({ error: 'Failed to generate Bluetooth access. Please try again or contact your gym.' });
    }

    // Store encrypted key in access_codes
    await pool.query(
      `INSERT INTO access_codes (member_id, code, valid_from, valid_to, source, provider_code_id)
       VALUES ($1, $2, $3, $4, 'igloohome_bluetooth', $5)`,
      [member.member_id, encryptCode(igResult.bluetoothGuestKey), startsAt, endsAt, igResult.keyId]
    );

    res.json({ keyId: igResult.keyId, bluetoothGuestKey: igResult.bluetoothGuestKey, valid_until: endsAt });
  } catch (err) {
    console.error('Request Bluetooth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
