import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { passcode } = body;

    // 1. Kiểm tra Campaign & Passcode
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('admin_passcode')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Đợt chọn nhóm không tồn tại' }, { status: 404 });
    }

    if (campaign.admin_passcode !== passcode) {
      return NextResponse.json({ error: 'Mật khẩu Admin không chính xác!' }, { status: 401 });
    }

    // 2. Xoá Campaign (Cascade xoá luôn groups và students)
    const { error: deleteError } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId);

    if (deleteError) {
      console.error('Error deleting campaign:', deleteError);
      return NextResponse.json({ error: 'Không thể xoá đợt chọn nhóm này' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Server error deleting campaign:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
