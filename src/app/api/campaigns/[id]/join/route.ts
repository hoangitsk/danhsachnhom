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
    const { mssv, groupId, dobPassword, isLeader } = body;

    if (!mssv || !groupId) {
      return NextResponse.json({ error: 'Thiếu thông tin MSSV hoặc nhóm chọn' }, { status: 400 });
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
      return NextResponse.json({ error: 'Đợt chọn nhóm này đã khóa' }, { status: 400 });
    }

    // 2. Tìm sinh viên
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, group_id, dob')
      .eq('campaign_id', campaignId)
      .eq('mssv', mssv)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'MSSV của bạn không có trong danh sách đợt chọn nhóm này' }, { status: 403 });
    }

    // NẾU SINH VIÊN ĐÃ Ở TRONG MỘT NHÓM KHÁC -> Yêu cầu Mật khẩu Ngày sinh!
    if (student.group_id && student.group_id !== groupId) {
      if (!dobPassword) {
        return NextResponse.json({ error: 'Bạn đang đổi nhóm! Vui lòng nhập Mật khẩu Ngày sinh (VD: 01102008) để xác nhận.', requireDob: true }, { status: 401 });
      }

      if (student.dob) {
        const inputDobFormatted = formatDob(dobPassword);
        const storedDobFormatted = formatDob(student.dob);

        if (inputDobFormatted !== storedDobFormatted) {
          return NextResponse.json({ error: 'Mật khẩu Ngày sinh không chính xác! (VD: 01102008)', requireDob: true }, { status: 401 });
        }
      }
    }

    // 3. Kiểm tra sĩ số nhóm
    const { data: groupMembers, error: groupMembersError } = await supabase
      .from('students')
      .select('id')
      .eq('group_id', groupId);

    if (groupMembersError) {
      return NextResponse.json({ error: 'Lỗi khi kiểm tra sĩ số nhóm' }, { status: 500 });
    }

    if (groupMembers.length >= campaign.max_per_group) {
      return NextResponse.json({ error: 'Nhóm này đã đầy đủ số lượng thành viên' }, { status: 400 });
    }

    // 4. Kiểm tra xem nhóm đã có Nhóm trưởng chưa
    const { data: groupData } = await supabase
      .from('groups')
      .select('leader_mssv')
      .eq('id', groupId)
      .single();

    let approvalStatus = 'APPROVED';

    // Nếu người tham gia xác nhận mình là Nhóm trưởng -> Cập nhật leader_mssv
    if (isLeader === true) {
      await supabase
        .from('groups')
        .update({ leader_mssv: mssv })
        .eq('id', groupId);
      approvalStatus = 'APPROVED';
    } else {
      // Nếu nhóm đã có người trước đó -> Cần chờ duyệt
      if (groupMembers.length > 0) {
        approvalStatus = 'PENDING';
      } else {
        approvalStatus = 'APPROVED';
        if (!groupData?.leader_mssv) {
          await supabase
            .from('groups')
            .update({ leader_mssv: mssv })
            .eq('id', groupId);
        }
      }
    }

    // 5. Cập nhật nhóm cho sinh viên
    const updatePayload: Record<string, unknown> = {
      group_id: groupId,
      joined_at: new Date().toISOString(),
      approval_status: approvalStatus,
    };

    if (!student.dob && dobPassword) {
      updatePayload.dob = formatDob(dobPassword);
    }

    const { error: updateError } = await supabase
      .from('students')
      .update(updatePayload)
      .eq('id', student.id);

    if (updateError) {
      return NextResponse.json({ error: 'Không thể cập nhật nhóm' }, { status: 500 });
    }

    return NextResponse.json({ success: true, approvalStatus });
  } catch (err: unknown) {
    console.error('Error in join group API:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
