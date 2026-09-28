import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://cfzqdjvzvzhprddveohe.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmenFkanZ6dnpocHJkZHZlb2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NzM0MDAsImV4cCI6MjEwNjE0OTQwMH0.FeCsn239c_Q3JAf280YQxk9UEow6ORCfVt502tX1pqo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
