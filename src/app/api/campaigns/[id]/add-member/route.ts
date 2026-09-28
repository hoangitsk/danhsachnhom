import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { targetMssv, mssvList, targetGroupId } = body;

    if (!targetGroupId) {
      return NextResponse.json({ error: 'Thiếu thông tin nhóm đích' }, { status: 400 });
    }

    // Tổng hợp danh sách MSSV cần thêm
    const targetMssvs: string[] = [];
    if (Array.isArray(mssvList) && mssvList.length > 0) {
      targetMssvs.push(...mssvList.map((m) => String(m).trim()).filter(Boolean));
    } else if (targetMssv && String(targetMssv).trim()) {
      targetMssvs.push(String(targetMssv).trim());
    }

    if (targetMssvs.length === 0) {
      return NextResponse.json({ error: 'Vui lòng chọn hoặc nhập ít nhất một MSSV' }, { status: 400 });
    }

    // 1. Kiểm tra Campaign
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

    // 2. Kiểm tra sĩ số nhóm đích hiện tại
    const { data: currentMembers, error: groupMembersError } = await supabase
      .from('students')
      .select('id')
      .eq('group_id', targetGroupId);

    if (groupMembersError) {
      return NextResponse.json({ error: 'Lỗi khi kiểm tra sĩ số nhóm' }, { status: 500 });
    }

    const availableSlots = campaign.max_per_group - currentMembers.length;
    if (availableSlots <= 0) {
      return NextResponse.json({ error: 'Nhóm này đã đầy đủ thành viên!' }, { status: 400 });
    }

    if (targetMssvs.length > availableSlots) {
      return NextResponse.json(
        { error: `Nhóm chỉ còn ${availableSlots} slot trống, không thể thêm ${targetMssvs.length} sinh viên.` },
        { status: 400 }
      );
    }

    // 3. Tìm các sinh viên theo danh sách MSSV
    const { data: foundStudents, error: studentError } = await supabase
      .from('students')
      .select('id, mssv, full_name, group_id')
      .eq('campaign_id', campaignId)
      .in('mssv', targetMssvs);

    if (studentError || !foundStudents || foundStudents.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy sinh viên khớp với các MSSV đã nhập' }, { status: 404 });
    }

    const alreadyAssigned = foundStudents.filter((s) => s.group_id);
    if (alreadyAssigned.length > 0) {
      const names = alreadyAssigned.map((s) => `${s.mssv} (${s.full_name})`).join(', ');
      return NextResponse.json(
        { error: `Sinh viên sau đây đã có nhóm khác rồi: ${names}` },
        { status: 400 }
      );
    }

    // 4. Cập nhật group_id cho danh sách sinh viên tìm thấy
    const studentIdsToUpdate = foundStudents.map((s) => s.id);
    const { error: updateError } = await supabase
      .from('students')
      .update({
        group_id: targetGroupId,
        joined_at: new Date().toISOString(),
        approval_status: 'APPROVED',
      })
      .in('id', studentIdsToUpdate);

    if (updateError) {
      return NextResponse.json({ error: 'Lỗi khi thêm sinh viên vào nhóm' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      addedCount: foundStudents.length,
      addedStudents: foundStudents.map((s) => s.full_name),
    });
  } catch (err: unknown) {
    console.error('Error adding member to group:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
