import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatDob } from '@/lib/campaign-utils';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { mssv, dobPassword } = body;

    if (!mssv) {
      return NextResponse.json({ error: 'Thiếu thông tin MSSV' }, { status: 400 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Đợt chọn nhóm không tồn tại' }, { status: 404 });
    }

    if (campaign.status !== 'OPEN') {
      return NextResponse.json({ error: 'Đợt chọn nhóm này đã khóa' }, { status: 400 });
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, group_id, dob')
      .eq('campaign_id', campaignId)
      .eq('mssv', mssv)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Sinh viên không tìm thấy' }, { status: 404 });
    }

    // Khi RỜI NHÓM -> Bắt buộc nhập Mật khẩu Ngày Sinh!
    if (!dobPassword) {
      return NextResponse.json({ error: 'Vui lòng nhập Mật khẩu Ngày sinh (VD: 01102008) để xác nhận rời nhóm.', requireDob: true }, { status: 401 });
    }

    if (student.dob) {
      const inputDobFormatted = formatDob(dobPassword);
      const storedDobFormatted = formatDob(student.dob);

      if (inputDobFormatted !== storedDobFormatted) {
        return NextResponse.json({ error: 'Mật khẩu Ngày sinh không chính xác! (Định dạng: NgàyThángNăm liền nhau, VD: 01102008)', requireDob: true }, { status: 401 });
      }
    }

    const { error: updateError } = await supabase
      .from('students')
      .update({
        group_id: null,
        joined_at: null,
      })
      .eq('id', student.id);

    if (updateError) {
      return NextResponse.json({ error: 'Không thể rời nhóm' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error in leave group API:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
