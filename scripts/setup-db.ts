import { Client } from 'pg';

const connectionString = 'postgres://postgres.cfzqdjvzvzhprddveohe:FG9AmnhX65UhbcrS@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

const sqlScript = `
-- 1. Bảng Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    max_per_group INT NOT NULL DEFAULT 5,
    total_students INT NOT NULL DEFAULT 0,
    admin_passcode VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LOCKED', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bảng Groups
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    group_number INT NOT NULL,
    custom_name VARCHAR(255),
    leader_mssv VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, group_number)
);

-- 3. Bảng Students
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    mssv VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    dob VARCHAR(50),
    joined_at TIMESTAMPTZ,
    UNIQUE(campaign_id, mssv)
);

-- Bật RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all campaigns') THEN
        CREATE POLICY "Allow all campaigns" ON public.campaigns FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all groups') THEN
        CREATE POLICY "Allow all groups" ON public.groups FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all students') THEN
        CREATE POLICY "Allow all students" ON public.students FOR ALL USING (true);
    END IF;
END $$;

-- Bật Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.students, public.groups;
COMMIT;
`;

async function runSetup() {
  console.log('Connecting to Supabase Database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log('Connected! Creating tables and policies...');
    await client.query(sqlScript);
    console.log('✅ Database setup completed successfully!');
  } catch (err) {
    console.error('❌ Error setting up database:', err);
  } finally {
    await client.end();
  }
}

runSetup();
