import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const { passcode, action, payload } = body;

    // 1. Kiểm tra Passcode
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Đợt chọn nhóm không tồn tại' }, { status: 404 });
    }

    if (campaign.admin_passcode !== passcode) {
      return NextResponse.json({ error: 'Mật khẩu Admin không chính xác' }, { status: 401 });
    }

    // 2. Xử lý các Action của Admin
    if (action === 'TOGGLE_STATUS') {
      const newStatus = campaign.status === 'OPEN' ? 'LOCKED' : 'OPEN';
      const { error: updateErr } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true, newStatus });
    }

    if (action === 'ASSIGN_STUDENT') {
      const { studentId, groupId } = payload;
      const { error: updateErr } = await supabase
        .from('students')
        .update({
          group_id: groupId || null,
          joined_at: groupId ? new Date().toISOString() : null,
        })
        .eq('id', studentId);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true });
    }

    if (action === 'ADD_STUDENT') {
      const { mssv, fullName } = payload;
      if (!mssv || !fullName) {
        return NextResponse.json({ error: 'MSSV và Họ tên không được để trống' }, { status: 400 });
      }

      const { error: insertErr } = await supabase.from('students').insert({
        campaign_id: campaignId,
        mssv: mssv.trim(),
        full_name: fullName.trim(),
      });

      if (insertErr) throw insertErr;

      // Cập nhật sĩ số campaign
      await supabase
        .from('campaigns')
        .update({ total_students: campaign.total_students + 1 })
        .eq('id', campaignId);

      return NextResponse.json({ success: true });
    }

    if (action === 'AUTO_ASSIGN') {
      // Tải tất cả groups
      const { data: groups, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .eq('campaign_id', campaignId);

      if (groupErr) throw groupErr;

      // Tải tất cả students
      const { data: students, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('campaign_id', campaignId);

      if (studentErr) throw studentErr;

      const unassignedStudents = students.filter((s) => !s.group_id);
      if (unassignedStudents.length === 0) {
        return NextResponse.json({ message: 'Tất cả sinh viên đều đã có nhóm!' });
      }

      // Xáo trộn ngẫu nhiên sinh viên chưa có nhóm
      const shuffled = [...unassignedStudents].sort(() => Math.random() - 0.5);

      // Tính slot trống của từng nhóm
      const groupSlots: { groupId: string; remaining: number }[] = groups.map((g) => {
        const count = students.filter((s) => s.group_id === g.id).length;
        return {
          groupId: g.id,
          remaining: campaign.max_per_group - count,
        };
      });

      let studentIdx = 0;
      for (const slot of groupSlots) {
        while (slot.remaining > 0 && studentIdx < shuffled.length) {
          const student = shuffled[studentIdx];
          await supabase
            .from('students')
            .update({
              group_id: slot.groupId,
              joined_at: new Date().toISOString(),
            })
            .eq('id', student.id);

          slot.remaining--;
          studentIdx++;
        }
      }

      return NextResponse.json({ success: true, assignedCount: studentIdx });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Error in Admin API:', err);
    return NextResponse.json({ error: 'Lỗi khi xử lý thao tác Admin' }, { status: 500 });
  }
}
