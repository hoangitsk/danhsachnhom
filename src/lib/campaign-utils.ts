import * as XLSX from 'xlsx';

export interface ParsedStudent {
  mssv: string;
  fullName: string;
  dob?: string; // Dạng DDMMYYYY (VD: 01102008)
}

/**
 * Chuẩn hóa chuỗi ngày sinh thành dạng DDMMYYYY (VD: 01/10/2008 -> 01102008).
 */
export function formatDob(dobRaw: string | number | undefined | null): string {
  if (!dobRaw) return '';
  const str = String(dobRaw).trim();
  if (!str) return '';

  // Xóa ký tự không phải số
  const cleanDigits = str.replace(/\D/g, '');

  // Nếu là dạng 8 chữ số thuần (VD: 01102008)
  if (cleanDigits.length === 8) {
    return cleanDigits;
  }

  // Nếu chứa dấu gạch đứng/nghiêng/chấm: 01/10/2008 hoặc 1/10/2008
  const parts = str.split(/[/.\-\s]+/);
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];

    // Trường hợp năm viết trước (YYYY-MM-DD)
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
    let fullName = '';
    let dobRaw = '';

    // Tìm các cột tương ứng
    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();
      const valStr = String(value).trim();

      if (!valStr) continue;

      if (keyLower.includes('mssv') || keyLower.includes('mã') || keyLower.includes('sv') || keyLower.includes('student')) {
        const mssvMatch = valStr.match(/\d{6,12}/);
        if (mssvMatch) mssv = mssvMatch[0];
      } else if (keyLower.includes('tên') || keyLower.includes('họ') || keyLower.includes('name')) {
        fullName = valStr;
      } else if (keyLower.includes('ngày sinh') || keyLower.includes('ns') || keyLower.includes('dob') || keyLower.includes('birth')) {
        dobRaw = valStr;
      }
    }

    // Nếu không khớp theo header, quét theo kiểu dữ liệu từng cột
    if (!mssv || !fullName) {
      const values = Object.values(row).map((v) => String(v).trim()).filter(Boolean);
      for (const val of values) {
        if (!mssv && /^\d{6,12}$/.test(val)) {
          mssv = val;
        } else if (!fullName && /[a-zA-ZÀ-ỹ]/.test(val) && val.length > 2) {
          fullName = val;
        } else if (!dobRaw && (/\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}/.test(val) || /^\d{8}$/.test(val))) {
          dobRaw = val;
        }
      }
    }

    if (mssv && !seenMssv.has(mssv)) {
      seenMssv.add(mssv);
      results.push({
        mssv,
        fullName: fullName || `Sinh viên ${mssv}`,
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

    const mssvMatch = trimmed.match(/\b\d{6,12}\b/);

    if (mssvMatch) {
      const mssv = mssvMatch[0];
      if (seenMssv.has(mssv)) continue;

      let remaining = trimmed.replace(mssv, '').trim();

      // Tìm ngày sinh trong chuỗi nếu có
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
    } else {
      const parts = trimmed.split(/[\t,–-]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const p1IsMssv = /^\d+$/.test(parts[0]);
        const mssv = p1IsMssv ? parts[0] : parts[parts.length - 1];
        const fullName = p1IsMssv ? parts.slice(1).join(' ') : parts.slice(0, -1).join(' ');

        if (mssv && !seenMssv.has(mssv)) {
          seenMssv.add(mssv);
          results.push({
            mssv,
            fullName,
            dob: '',
          });
        }
      }
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
