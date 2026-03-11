import express from 'express';
import cors from 'cors';
import { pool } from './db';
import { memberRoutes } from './routes/members';
import { gymRoutes } from './routes/gyms';
import { authRoutes } from './routes/auth';
import { webhookRoutes } from './routes/webhooks';
import { accessRoutes } from './routes/access';
import { adminRoutes } from './routes/admin';
import { subscriptionRoutes } from './routes/subscriptions';
import { rateLimit } from './middleware/rateLimit';
import { runMigrations } from './migrate';

const app = express();
const PORT = process.env.API_PORT || 8080;

// Stripe webhooks need raw body
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(cors());
app.use(express.json());

// Rate limiting: 100 requests per minute for public endpoints, 30 for auth
app.use('/auth', rateLimit(30, 60 * 1000));
app.use('/members', rateLimit(60, 60 * 1000));
app.use('/gyms', rateLimit(60, 60 * 1000));
app.use('/subscriptions/manage', rateLimit(20, 60 * 1000));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/gyms', gymRoutes);
app.use('/members', memberRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/access', accessRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/admin', adminRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, async () => {
  console.log(`GymAccess API running on port ${PORT}`);
  try {
    await runMigrations();
  } catch (err) {
    console.error('Migration error on startup:', err);
  }
});

export default app;
