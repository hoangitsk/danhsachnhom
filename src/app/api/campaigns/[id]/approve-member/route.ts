import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { targetMssv, action, requesterMssv } = body;

    if (!targetMssv || !action || !requesterMssv) {
      return NextResponse.json({ error: 'Thiếu thông tin yêu cầu' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
    }

    // 1. Kiểm tra Campaign
    const { data: campaign, error: campaignErr } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (campaignErr || !campaign) {
      return NextResponse.json({ error: 'Đợt chọn nhóm không tồn tại' }, { status: 404 });
    }

    if (campaign.status !== 'OPEN') {
      return NextResponse.json({ error: 'Đợt chọn nhóm đã khóa' }, { status: 400 });
    }

    // 2. Tìm sinh viên cần duyệt/từ chối
    const { data: targetStudent, error: studentErr } = await supabase
      .from('students')
      .select('id, group_id, mssv, full_name')
      .eq('campaign_id', campaignId)
      .eq('mssv', targetMssv)
      .single();

    if (studentErr || !targetStudent || !targetStudent.group_id) {
      return NextResponse.json({ error: 'Sinh viên không tồn tại hoặc chưa tham gia nhóm' }, { status: 404 });
    }

    // 3. Kiểm tra thông tin nhóm và quyền của Nhóm trưởng
    const { data: groupData, error: groupErr } = await supabase
      .from('groups')
      .select('id, leader_mssv')
      .eq('id', targetStudent.group_id)
      .single();

    if (groupErr || !groupData) {
      return NextResponse.json({ error: 'Nhóm không tồn tại' }, { status: 404 });
    }

    // Lấy danh sách sinh viên nhóm này để xác định Trưởng nếu leader_mssv chưa set
    const { data: groupMembers } = await supabase
      .from('students')
      .select('mssv')
      .eq('group_id', groupData.id)
      .order('joined_at', { ascending: true });

    const effectiveLeader = groupData.leader_mssv || groupMembers?.[0]?.mssv;

    if (effectiveLeader !== requesterMssv) {
      return NextResponse.json({ error: 'Chỉ Nhóm trưởng mới có quyền duyệt hoặc từ chối thành viên' }, { status: 403 });
    }

    // 4. Xử lý Duyệt hoặc Từ chối
    if (action === 'approve') {
      const { error: updateErr } = await supabase
        .from('students')
        .update({ approval_status: 'APPROVED' })
        .eq('id', targetStudent.id);

      if (updateErr) {
        return NextResponse.json({ error: 'Lỗi khi duyệt thành viên' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Đã duyệt ${targetStudent.full_name} vào nhóm` });
    } else {
      // action === 'reject': Xóa khỏi nhóm và reset status
      const { error: updateErr } = await supabase
        .from('students')
        .update({ group_id: null, approval_status: 'APPROVED' })
        .eq('id', targetStudent.id);

      if (updateErr) {
        return NextResponse.json({ error: 'Lỗi khi từ chối thành viên' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Đã từ chối ${targetStudent.full_name}` });
    }
  } catch (err: unknown) {
    console.error('Error in approve-member API:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
