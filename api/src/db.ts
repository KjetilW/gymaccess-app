import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://gymaccess:gymaccess@localhost:5432/gymaccess',
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});
