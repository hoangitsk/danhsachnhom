import * as XLSX from 'xlsx';

export interface ParsedStudent {
  mssv: string;
  fullName: string;
  dob?: string; // Dạng DDMMYYYY (VD: 01102008)
}

/**
 * Chuẩn hóa chuỗi ngày sinh thành dạng DDMMYYYY (VD: 01/10/2008 -> 01102008).
 */
export function formatDob(dobRaw: string | number | Date | undefined | null): string {
  if (!dobRaw) return '';

  if (dobRaw instanceof Date) {
    const d = String(dobRaw.getDate()).padStart(2, '0');
    const m = String(dobRaw.getMonth() + 1).padStart(2, '0');
    const y = dobRaw.getFullYear();
    return `${d}${m}${y}`;
  }

  const str = String(dobRaw).trim();
  if (!str) return '';

  const cleanDigits = str.replace(/\D/g, '');

  if (cleanDigits.length === 8) {
    return cleanDigits;
  }

  const parts = str.split(/[/.\-\s]+/);
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];

    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    }

    if (year.length === 2) {
      year = '20' + year;
    }

    return `${day}${month}${year}`;
  }

  return cleanDigits;
}

/**
 * Phân tích file Excel / CSV (.xlsx, .xls, .csv) tải lên.
 * Hỗ trợ tách cột [Họ lót] + [Tên] ghép thành [Họ và Tên].
 */
export function parseExcelFile(arrayBuffer: ArrayBuffer): ParsedStudent[] {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  const results: ParsedStudent[] = [];
  const seenMssv = new Set<string>();

  for (const row of jsonData) {
    let mssv = '';
    let hoLot = '';
    let ten = '';
    let fullNameDirect = '';
    let dobRaw: string | Date = '';

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase().trim();
      const valStr = String(value).trim();
      if (!valStr) continue;

      // 1. Tim cột MSSV (Hỗ trợ cả chuỗi như 261A300575 hoặc 210444)
      if (
        keyLower.includes('mã sv') ||
        keyLower.includes('mã sinh viên') ||
        keyLower.includes('mã số') ||
        keyLower.includes('mssv') ||
        keyLower === 'mã' ||
        keyLower.includes('student id')
      ) {
        mssv = valStr;
      }
      // 2. Tìm cột Họ lót / Họ và đệm
      else if (
        keyLower.includes('họ lót') ||
        keyLower.includes('họ và tên lót') ||
        keyLower.includes('họ và đệm') ||
        keyLower === 'họ' ||
        keyLower.includes('ho lot')
      ) {
        hoLot = valStr;
      }
      // 3. Tìm cột Tên
      else if (keyLower === 'tên' || keyLower === 'ten' || keyLower.includes('first name')) {
        ten = valStr;
      }
      // 4. Tìm cột Họ và tên đầy đủ
      else if (
        keyLower.includes('họ và tên') ||
        keyLower.includes('họ tên') ||
        keyLower.includes('ho va ten') ||
        keyLower.includes('full name')
      ) {
        fullNameDirect = valStr;
      }
      // 5. Tìm cột Ngày sinh
      else if (
        keyLower.includes('ngày sinh') ||
        keyLower.includes('ngaysinh') ||
        keyLower.includes('dob') ||
        keyLower === 'ns'
      ) {
        if (value instanceof Date) {
          dobRaw = value;
        } else {
          dobRaw = valStr;
        }
      }
    }

    // Ghép [Họ lót] + [Tên] nếu Excel tách làm 2 cột
    let finalFullName = '';
    if (hoLot && ten) {
      finalFullName = `${hoLot} ${ten}`.replace(/\s+/g, ' ').trim();
    } else if (fullNameDirect) {
      finalFullName = fullNameDirect.trim();
    } else if (hoLot || ten) {
      finalFullName = (hoLot || ten).trim();
    }

    // Fallback nếu không khớp tên cột Header
    if (!mssv || !finalFullName) {
      const values = Object.values(row).map((v) => String(v).trim()).filter(Boolean);
      for (const val of values) {
        if (!mssv && /^[a-zA-Z0-9]{5,15}$/.test(val) && /\d/.test(val)) {
          mssv = val;
        } else if (!finalFullName && /[a-zA-ZÀ-ỹ]/.test(val) && val.length > 2) {
          finalFullName = val;
        } else if (!dobRaw && (/\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}/.test(val) || /^\d{8}$/.test(val))) {
          dobRaw = val;
        }
      }
    }

    if (mssv && !seenMssv.has(mssv)) {
      seenMssv.add(mssv);
      results.push({
        mssv,
        fullName: finalFullName || `Sinh viên ${mssv}`,
        dob: formatDob(dobRaw),
      });
    }
  }

  return results;
}

/**
 * Phân tích chuỗi text dán từ Excel / Word / Text.
 */
export function parseStudentListText(rawText: string): ParsedStudent[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const results: ParsedStudent[] = [];
  const seenMssv = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const mssvMatch = trimmed.match(/\b[a-zA-Z0-9]{5,15}\b/);

    if (mssvMatch) {
      const mssv = mssvMatch[0];
      if (seenMssv.has(mssv)) continue;

      let remaining = trimmed.replace(mssv, '').trim();

      let dobRaw = '';
      const dobMatch = remaining.match(/\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b/) || remaining.match(/\b\d{8}\b/);
      if (dobMatch) {
        dobRaw = dobMatch[0];
        remaining = remaining.replace(dobRaw, '').trim();
      }

      let fullName = remaining.replace(/^[-–\t,:\s]+|[-–\t,:\s]+$/g, '').trim();
      if (!fullName) {
        fullName = `Sinh viên ${mssv}`;
      }

      seenMssv.add(mssv);
      results.push({
        mssv,
        fullName,
        dob: formatDob(dobRaw),
      });
    }
  }

  return results;
}

/**
 * Tính toán số lượng nhóm dựa vào tổng số sinh viên và số lượng tối đa/nhóm
 */
export function calculateGroupCount(totalStudents: number, maxPerGroup: number): number {
  if (totalStudents <= 0 || maxPerGroup <= 0) return 0;
  return Math.ceil(totalStudents / maxPerGroup);
}
