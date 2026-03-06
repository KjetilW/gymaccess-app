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

const MAX_RETRIES = 3;

async function processNotifications() {
  try {
    // Pick up pending notifications and retryable failed ones
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE status = 'pending'
          OR (status = 'failed' AND retry_count < $1)
       ORDER BY created_at ASC LIMIT 10`,
      [MAX_RETRIES]
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
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to send notification ${notification.notification_id}:`, err);
        const newRetryCount = (notification.retry_count || 0) + 1;
        const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';
        await pool.query(
          "UPDATE notifications SET status = $1, retry_count = $2, error_message = $3 WHERE notification_id = $4",
          [newStatus, newRetryCount, errorMsg, notification.notification_id]
        );
        if (newStatus === 'failed') {
          console.log(`Notification ${notification.notification_id} permanently failed after ${newRetryCount} retries`);
        }
      }
    }
  } catch (err) {
    console.error('Error processing notifications:', err);
  }
}

async function processExpiredSubscriptions() {
  try {
    // Find active members whose subscriptions have ended (end_date < NOW())
    const result = await pool.query(
      `UPDATE members SET status = 'expired', updated_at = NOW()
       WHERE member_id IN (
         SELECT DISTINCT s.member_id
         FROM subscriptions s
         JOIN members m ON m.member_id = s.member_id
         WHERE s.end_date < NOW()
           AND s.status = 'active'
           AND m.status = 'active'
       )
       RETURNING member_id`
    );
    if (result.rowCount && result.rowCount > 0) {
      console.log(`Expired ${result.rowCount} subscriptions`);
      for (const row of result.rows) {
        await pool.query(
          "UPDATE access_codes SET valid_to = NOW() WHERE member_id = $1 AND valid_to IS NULL",
          [row.member_id]
        );
      }
    }
  } catch (err) {
    console.error('Error processing expired subscriptions:', err);
  }
}

// Poll for pending notifications every 5 seconds
const POLL_INTERVAL = 5000;
const EXPIRY_CHECK_INTERVAL = 60 * 1000; // Check every minute

async function start() {
  console.log('GymAccess Worker started');
  console.log(`Polling for notifications every ${POLL_INTERVAL / 1000}s`);

  setInterval(processNotifications, POLL_INTERVAL);
  setInterval(processExpiredSubscriptions, EXPIRY_CHECK_INTERVAL);

  // Process immediately on start
  await processNotifications();
  await processExpiredSubscriptions();
}

start().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
