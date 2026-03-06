import { pool } from './db';

const migrations = `
  CREATE TABLE IF NOT EXISTS gyms (
    gym_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    admin_user UUID,
    membership_price INTEGER NOT NULL,
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
    access_type VARCHAR(50) NOT NULL DEFAULT 'shared_pin',
    shared_pin VARCHAR(20),
    stripe_price_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS admins (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(gym_id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  ALTER TABLE gyms DROP CONSTRAINT IF EXISTS gyms_admin_user_fkey;
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'gyms_admin_user_fkey'
    ) THEN
      ALTER TABLE gyms ADD CONSTRAINT gyms_admin_user_fkey
        FOREIGN KEY (admin_user) REFERENCES admins(admin_id);
    END IF;
  END $$;

  CREATE TABLE IF NOT EXISTS members (
    member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(gym_id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(gym_id, email)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(member_id),
    provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
    provider_subscription_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS access_codes (
    code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(member_id),
    code VARCHAR(255) NOT NULL,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_to TIMESTAMP,
    device_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(member_id),
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  );

  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS error_message TEXT;

  CREATE TABLE IF NOT EXISTS notification_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(gym_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(gym_id, type)
  );

  -- Add cascade deletes for gym deletion support
  ALTER TABLE access_codes DROP CONSTRAINT IF EXISTS access_codes_member_id_fkey;
  ALTER TABLE access_codes ADD CONSTRAINT access_codes_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE;

  ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_member_id_fkey;
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE;

  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_member_id_fkey;
  ALTER TABLE notifications ADD CONSTRAINT notifications_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE;

  ALTER TABLE members DROP CONSTRAINT IF EXISTS members_gym_id_fkey;
  ALTER TABLE members ADD CONSTRAINT members_gym_id_fkey
    FOREIGN KEY (gym_id) REFERENCES gyms(gym_id) ON DELETE CASCADE;

  ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_gym_id_fkey;
  ALTER TABLE admins ADD CONSTRAINT admins_gym_id_fkey
    FOREIGN KEY (gym_id) REFERENCES gyms(gym_id) ON DELETE CASCADE;

  ALTER TABLE gyms DROP CONSTRAINT IF EXISTS gyms_admin_user_fkey;
  ALTER TABLE gyms ADD CONSTRAINT gyms_admin_user_fkey
    FOREIGN KEY (admin_user) REFERENCES admins(admin_id) ON DELETE SET NULL;

  -- Stripe Connect fields (feature 167)
  ALTER TABLE gyms ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);
  ALTER TABLE gyms ADD COLUMN IF NOT EXISTS stripe_connect_status VARCHAR(20) NOT NULL DEFAULT 'not_connected';

  -- SaaS subscription fields (feature 175)
  ALTER TABLE gyms ADD COLUMN IF NOT EXISTS saas_status VARCHAR(20) NOT NULL DEFAULT 'trial';
  ALTER TABLE gyms ADD COLUMN IF NOT EXISTS saas_subscription_id VARCHAR(255);
  ALTER TABLE gyms ADD COLUMN IF NOT EXISTS saas_stripe_customer_id VARCHAR(255);
  ALTER TABLE gyms ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;

  -- Set trial_ends_at for existing gyms that don't have it yet
  UPDATE gyms SET trial_ends_at = NOW() + INTERVAL '30 days' WHERE trial_ends_at IS NULL;
`;

export async function runMigrations() {
  try {
    await pool.query(migrations);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
}

// Run directly if invoked as script
if (require.main === module) {
  runMigrations()
    .catch(() => process.exit(1))
    .finally(() => pool.end());
}
