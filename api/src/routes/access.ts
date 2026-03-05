import { Router } from 'express';
import { pool } from '../db';
import crypto from 'crypto';

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
      let unique = false;
      code = generatePin(codeLength);
      let attempts = 0;
      while (!unique && attempts < 100) {
        const existing = await pool.query(
          `SELECT code_id FROM access_codes ac
           JOIN members m ON ac.member_id = m.member_id
           WHERE m.gym_id = $1 AND ac.code = $2 AND ac.valid_to IS NULL`,
          [member.gym_id, code]
        );
        if (existing.rows.length === 0) {
          unique = true;
        } else {
          code = generatePin(codeLength);
          attempts++;
        }
      }
    }

    // Revoke any existing codes for this member
    await pool.query(
      "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
      [memberId]
    );

    // Create new code
    const result = await pool.query(
      `INSERT INTO access_codes (member_id, code, valid_from)
       VALUES ($1, $2, NOW()) RETURNING *`,
      [memberId, code]
    );

    res.status(201).json(result.rows[0]);
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
