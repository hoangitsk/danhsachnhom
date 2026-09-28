import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { groupId, newLeaderMssv, requesterMssv } = body;

    if (!groupId || !newLeaderMssv || !requesterMssv) {
      return NextResponse.json({ error: 'Thiếu thông tin để đổi nhóm trưởng' }, { status: 400 });
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

    if (campaign.status !== 'OPEN') {
      return NextResponse.json({ error: 'Đợt chọn nhóm đã khóa' }, { status: 400 });
    }

    // 2. Kiểm tra người yêu cầu đổi (requesterMssv) có thuộc nhóm này không
    const { data: requester, error: requesterErr } = await supabase
      .from('students')
      .select('id, group_id')
      .eq('campaign_id', campaignId)
      .eq('mssv', requesterMssv)
      .single();

    if (requesterErr || !requester || requester.group_id !== groupId) {
      return NextResponse.json(
        { error: 'Bạn phải là thành viên trong nhóm này mới có quyền đổi nhóm trưởng!' },
        { status: 403 }
      );
    }

    // 3. Kiểm tra tân nhóm trưởng (newLeaderMssv) có thuộc nhóm này không
    const { data: targetLeader, error: targetErr } = await supabase
      .from('students')
      .select('id, full_name, group_id')
      .eq('campaign_id', campaignId)
      .eq('mssv', newLeaderMssv)
      .single();

    if (targetErr || !targetLeader || targetLeader.group_id !== groupId) {
      return NextResponse.json(
        { error: 'Sinh viên được chọn không phải là thành viên của nhóm này!' },
        { status: 400 }
      );
    }

    // 4. Cập nhật leader_mssv trong bảng public.groups
    const { error: updateErr } = await supabase
      .from('groups')
      .update({ leader_mssv: newLeaderMssv })
      .eq('id', groupId);

    if (updateErr) {
      console.error('Error updating leader_mssv:', updateErr);
      return NextResponse.json({ error: 'Không thể cập nhật nhóm trưởng' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newLeaderName: targetLeader.full_name,
    });
  } catch (err: unknown) {
    console.error('Server error changing leader:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
