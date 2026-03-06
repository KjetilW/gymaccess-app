import { Router } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import { encryptCode, decryptCode, isEncrypted } from '../utils/crypto';

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
