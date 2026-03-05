import { Router } from 'express';
import { pool } from '../db';

export const memberRoutes = Router();

// Create member (public - from signup page)
memberRoutes.post('/', async (req, res) => {
  try {
    const { name, email, phone, gymId } = req.body;

    if (!name || !email || !gymId) {
      return res.status(400).json({ error: 'Name, email, and gymId are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check gym exists
    const gymResult = await pool.query('SELECT gym_id FROM gyms WHERE gym_id = $1', [gymId]);
    if (gymResult.rows.length === 0) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    // Check for duplicate email in same gym
    const existing = await pool.query(
      'SELECT member_id FROM members WHERE gym_id = $1 AND email = $2',
      [gymId, email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A member with this email already exists for this gym' });
    }

    const result = await pool.query(
      `INSERT INTO members (gym_id, name, email, phone, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [gymId, name, email, phone || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get member by ID
memberRoutes.get('/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const result = await pool.query('SELECT * FROM members WHERE member_id = $1', [memberId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
