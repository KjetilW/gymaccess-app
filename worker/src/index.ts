import { Pool } from 'pg';
import nodemailer from 'nodemailer';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://gymaccess:gymaccess@localhost:5432/gymaccess',
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailhog',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: false,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  } : undefined,
});

async function processNotifications() {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE status = 'pending' ORDER BY created_at ASC LIMIT 10"
    );

    for (const notification of result.rows) {
      try {
        if (notification.channel === 'email') {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@gymaccess.app',
            to: notification.recipient,
            subject: notification.subject,
            text: notification.body,
          });
        }

        await pool.query(
          "UPDATE notifications SET status = 'sent', sent_at = NOW() WHERE notification_id = $1",
          [notification.notification_id]
        );

        console.log(`Notification ${notification.notification_id} sent to ${notification.recipient}`);
      } catch (err) {
        console.error(`Failed to send notification ${notification.notification_id}:`, err);
        await pool.query(
          "UPDATE notifications SET status = 'failed' WHERE notification_id = $1",
          [notification.notification_id]
        );
      }
    }
  } catch (err) {
    console.error('Error processing notifications:', err);
  }
}

// Poll for pending notifications every 5 seconds
const POLL_INTERVAL = 5000;

async function start() {
  console.log('GymAccess Worker started');
  console.log(`Polling for notifications every ${POLL_INTERVAL / 1000}s`);

  setInterval(processNotifications, POLL_INTERVAL);

  // Process immediately on start
  await processNotifications();
}

start().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
