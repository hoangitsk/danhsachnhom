import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { targetMssv, targetGroupId } = body;

    if (!targetMssv || !targetGroupId) {
      return NextResponse.json({ error: 'Thiếu thông tin sinh viên hoặc nhóm' }, { status: 400 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('status, max_per_group')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Đợt chọn nhóm không tồn tại' }, { status: 404 });
    }

    if (campaign.status !== 'OPEN') {
      return NextResponse.json({ error: 'Đợt chọn nhóm đã khóa' }, { status: 400 });
    }

    // Kiểm tra nhóm đích xem đã đầy chưa
    const { data: groupMembers, error: groupMembersError } = await supabase
      .from('students')
      .select('id')
      .eq('group_id', targetGroupId);

    if (groupMembersError) {
      return NextResponse.json({ error: 'Lỗi khi kiểm tra sĩ số nhóm' }, { status: 500 });
    }

    if (groupMembers.length >= campaign.max_per_group) {
      return NextResponse.json({ error: 'Nhóm này đã đầy đủ thành viên' }, { status: 400 });
    }

    // Tìm sinh viên cần thêm
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, group_id')
      .eq('campaign_id', campaignId)
      .eq('mssv', targetMssv)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Không tìm thấy sinh viên trong danh sách' }, { status: 404 });
    }

    if (student.group_id) {
      return NextResponse.json({ error: 'Sinh viên này đã có nhóm khác rồi!' }, { status: 400 });
    }

    // Đưa sinh viên vào nhóm
    const { error: updateError } = await supabase
      .from('students')
      .update({
        group_id: targetGroupId,
        joined_at: new Date().toISOString(),
      })
      .eq('id', student.id);

    if (updateError) {
      return NextResponse.json({ error: 'Lỗi khi thêm sinh viên vào nhóm' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error adding member to group:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
