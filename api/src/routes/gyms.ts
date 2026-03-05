import { Router } from 'express';
import { pool } from '../db';

export const gymRoutes = Router();

// Get gym info (public - for signup page)
gymRoutes.get('/:gymId', async (req, res) => {
  try {
    const { gymId } = req.params;
    const result = await pool.query(
      'SELECT gym_id, name, location, membership_price, billing_interval, access_type FROM gyms WHERE gym_id = $1',
      [gymId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get gym error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
