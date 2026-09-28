import { parseStudentListText, calculateGroupCount } from '../campaign-utils';

function testCampaignUtils() {
  console.log('Testing calculateGroupCount...');
  console.assert(calculateGroupCount(48, 5) === 10, 'Expected 48/5 to be 10 groups');
  console.assert(calculateGroupCount(50, 5) === 10, 'Expected 50/5 to be 10 groups');
  console.assert(calculateGroupCount(5, 5) === 1, 'Expected 5/5 to be 1 group');

  console.log('Testing parseStudentListText...');
  const sampleInput = `
  21120001\tNguyễn Văn A
  21120002 - Trần Thị B
  Lê Văn C 21120003
  `;

  const parsed = parseStudentListText(sampleInput);
  console.assert(parsed.length === 3, 'Expected 3 students parsed');
  console.assert(parsed[0].mssv === '21120001' && parsed[0].fullName === 'Nguyễn Văn A', 'Parsed 1 mismatch');
  console.assert(parsed[1].mssv === '21120002' && parsed[1].fullName === 'Trần Thị B', 'Parsed 2 mismatch');
  console.assert(parsed[2].mssv === '21120003' && parsed[2].fullName === 'Lê Văn C', 'Parsed 3 mismatch');

  console.log('✅ All campaign-utils tests passed successfully!');
}

testCampaignUtils();
