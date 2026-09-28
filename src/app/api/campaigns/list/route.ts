import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, title, max_per_group, total_students, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns list:', error);
      return NextResponse.json({ error: 'Lỗi khi tải danh sách các đợt' }, { status: 500 });
    }

    return NextResponse.json({ campaigns: campaigns || [] });
  } catch (err: unknown) {
    console.error('Server error in list campaigns API:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
