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

const app = express();
const PORT = process.env.API_PORT || 8080;

// Stripe webhooks need raw body
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`GymAccess API running on port ${PORT}`);
});

export default app;
