import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

export const authRoutes = Router();

const JWT_SECRET = process.env.API_SECRET || 'dev-secret';

authRoutes.post('/register', async (req, res) => {
  try {
    const { name, email, password, gymName, location, membershipPrice, billingInterval, accessType } = req.body;

    if (!name || !email || !password || !gymName || !membershipPrice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await pool.query('SELECT admin_id FROM admins WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create gym on Starter plan (free, 3% platform fee)
    const gymResult = await pool.query(
      `INSERT INTO gyms (name, location, membership_price, billing_interval, access_type, saas_plan)
       VALUES ($1, $2, $3, $4, $5, 'starter') RETURNING gym_id`,
      [gymName, location || '', membershipPrice, billingInterval || 'monthly', accessType || 'shared_pin']
    );
    const gymId = gymResult.rows[0].gym_id;

    // Create admin
    const passwordHash = await bcrypt.hash(password, 10);
    const adminResult = await pool.query(
      `INSERT INTO admins (gym_id, name, email, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING admin_id`,
      [gymId, name, email, passwordHash]
    );
    const adminId = adminResult.rows[0].admin_id;

    // Link admin to gym
    await pool.query('UPDATE gyms SET admin_user = $1 WHERE gym_id = $2', [adminId, gymId]);

    const token = jwt.sign({ adminId, gymId }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, adminId, gymId });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRoutes.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query(
      'SELECT admin_id, gym_id, name, password_hash FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ adminId: admin.admin_id, gymId: admin.gym_id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, adminId: admin.admin_id, gymId: admin.gym_id, name: admin.name });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
