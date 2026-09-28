import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseStudentListText, calculateGroupCount, ParsedStudent } from '@/lib/campaign-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, maxPerGroup, rawStudentText, studentList, adminPasscode } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Tên đợt chọn nhóm không được để trống' }, { status: 400 });
    }

    const parsedMaxPerGroup = parseInt(maxPerGroup, 10) || 5;
    if (parsedMaxPerGroup < 1) {
      return NextResponse.json({ error: 'Số người tối đa/nhóm phải lớn hơn 0' }, { status: 400 });
    }

    if (!adminPasscode || !adminPasscode.trim()) {
      return NextResponse.json({ error: 'Mật khẩu Admin không được để trống' }, { status: 400 });
    }

    let students: ParsedStudent[] = [];
    if (Array.isArray(studentList) && studentList.length > 0) {
      students = studentList;
    } else {
      students = parseStudentListText(rawStudentText || '');
    }

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'Danh sách sinh viên rỗng hoặc không đúng định dạng. Vui lòng dán text hoặc tải file Excel lên.' },
        { status: 400 }
      );
    }

    const totalStudents = students.length;
    const groupCount = calculateGroupCount(totalStudents, parsedMaxPerGroup);

    // 1. Tạo Campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        title: title.trim(),
        max_per_group: parsedMaxPerGroup,
        total_students: totalStudents,
        admin_passcode: adminPasscode.trim(),
        status: 'OPEN',
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      console.error('Error creating campaign:', campaignError);
      return NextResponse.json({ error: 'Không thể khởi tạo đợt chọn nhóm trên Supabase' }, { status: 500 });
    }

    const campaignId = campaign.id;

    // 2. Tạo danh sách nhóm
    const groupsToInsert = Array.from({ length: groupCount }, (_, i) => ({
      campaign_id: campaignId,
      group_number: i + 1,
      custom_name: `Nhóm ${i + 1}`,
    }));

    const { error: groupError } = await supabase.from('groups').insert(groupsToInsert);
    if (groupError) {
      console.error('Error creating groups:', groupError);
      return NextResponse.json({ error: 'Lỗi khi khởi tạo danh sách nhóm' }, { status: 500 });
    }

    // 3. Tạo danh sách sinh viên Whitelist (kèm Ngày sinh / dob)
    const studentsToInsert = students.map((s) => ({
      campaign_id: campaignId,
      mssv: s.mssv,
      full_name: s.fullName,
      dob: s.dob || null,
    }));

    const { error: studentError } = await supabase.from('students').insert(studentsToInsert);
    if (studentError) {
      console.error('Error inserting students:', studentError);
      return NextResponse.json({ error: 'Lỗi khi lưu danh sách sinh viên' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaignId,
      title: campaign.title,
      totalStudents,
      groupCount,
      maxPerGroup: parsedMaxPerGroup,
    });
  } catch (err: unknown) {
    console.error('Server error creating campaign:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi máy chủ' }, { status: 500 });
  }
}
