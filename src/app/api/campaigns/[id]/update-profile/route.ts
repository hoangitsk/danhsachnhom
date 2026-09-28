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
    const { mssv, dobPassword, contactInfo } = body;

    if (!mssv) {
      return NextResponse.json({ error: 'Thiếu thông tin MSSV' }, { status: 400 });
    }

    // 1. Kiểm tra Campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Đợt chọn nhóm không tồn tại' }, { status: 404 });
    }

    // 2. Tìm sinh viên
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, dob')
      .eq('campaign_id', campaignId)
      .eq('mssv', mssv)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Sinh viên không tìm thấy' }, { status: 404 });
    }

    // 3. Kiểm tra Mật khẩu Ngày Sinh nếu đã cài đặt
    if (student.dob) {
      if (!dobPassword) {
        return NextResponse.json(
          { error: 'Vui lòng nhập Mật khẩu Ngày sinh (VD: 01102008) để xác nhận cập nhật.', requireDob: true },
          { status: 401 }
        );
      }

      const inputDobFormatted = formatDob(dobPassword);
      const storedDobFormatted = formatDob(student.dob);

      if (inputDobFormatted !== storedDobFormatted) {
        return NextResponse.json(
          { error: 'Mật khẩu Ngày sinh không chính xác! (VD: 01102008)', requireDob: true },
          { status: 401 }
        );
      }
    }

    // 4. Cập nhật contact_info (và dob nếu chưa có)
    const updatePayload: Record<string, unknown> = {
      contact_info: (contactInfo || '').trim(),
    };

    if (!student.dob && dobPassword) {
      updatePayload.dob = formatDob(dobPassword);
    }

    const { error: updateError } = await supabase
      .from('students')
      .update(updatePayload)
      .eq('id', student.id);

    if (updateError) {
      console.error('Error updating contact_info:', updateError);
      return NextResponse.json({ error: 'Không thể cập nhật thông tin cá nhân' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Server error updating profile:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
