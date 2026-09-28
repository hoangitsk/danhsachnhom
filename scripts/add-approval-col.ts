import { Client } from 'pg';

const connectionString = 'postgres://postgres.cfzqdjvzvzhprddveohe:FG9AmnhX65UhbcrS@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

async function updateDb() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log('Adding approval_status column to students table if not exists...');
    await client.query(`
      ALTER TABLE public.students ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'APPROVED';
    `);
    console.log('✅ Added approval_status column successfully!');
  } catch (err) {
    console.error('Error updating DB:', err);
  } finally {
    await client.end();
  }
}

updateDb();
