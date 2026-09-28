'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import { parseStudentListText, parseExcelFile, calculateGroupCount, ParsedStudent } from '@/lib/campaign-utils';
import { Users, Sparkles, Copy, Check, ShieldCheck, UserCheck, ArrowRight, FileSpreadsheet, Upload } from 'lucide-react';

export default function HomePage() {
  const [title, setTitle] = useState('');
  const [maxPerGroup, setMaxPerGroup] = useState<number>(5);
  const [rawStudentText, setRawStudentText] = useState('');
  const [excelStudents, setExcelStudents] = useState<ParsedStudent[]>([]);
  const [inputMode, setInputMode] = useState<'text' | 'excel'>('excel');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdResult, setCreatedResult] = useState<{
    campaignId: string;
    title: string;
    totalStudents: number;
    groupCount: number;
    maxPerGroup: number;
  } | null>(null);

  const [copiedStudentLink, setCopiedStudentLink] = useState(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);

  // Parse text nếu đang ở chế độ text
  const parsedFromText = useMemo(() => {
    return parseStudentListText(rawStudentText);
  }, [rawStudentText]);

  const activeStudentsList = useMemo(() => {
    return inputMode === 'excel' ? excelStudents : parsedFromText;
  }, [inputMode, excelStudents, parsedFromText]);

  const estimatedGroups = useMemo(() => {
    return calculateGroupCount(activeStudentsList.length, maxPerGroup);
  }, [activeStudentsList.length, maxPerGroup]);

  // Xử lý khi chọn file Excel / CSV
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsed = parseExcelFile(buffer);
        if (parsed.length === 0) {
          setError('Không đọc được sinh viên nào từ file. Vui lòng kiểm tra file Excel.');
        } else {
          setExcelStudents(parsed);
          setInputMode('excel');
        }
      } catch (err) {
        console.error(err);
        setError('Lỗi khi đọc file Excel. Vui lòng thử lại.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Vui lòng nhập tên đợt chọn nhóm.');
      return;
    }

    if (activeStudentsList.length === 0) {
      setError('Vui lòng dán danh sách hoặc tải file Excel chứa sinh viên hợp lệ.');
      return;
    }

    if (!adminPasscode.trim()) {
      setError('Vui lòng tạo mật khẩu Admin để quản lý đợt này.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          maxPerGroup,
          studentList: activeStudentsList,
          adminPasscode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Tạo đợt chọn nhóm thất bại.');
      }

      setCreatedResult({
        campaignId: data.campaignId,
        title: data.title,
        totalStudents: data.totalStudents,
        groupCount: data.groupCount,
        maxPerGroup: data.maxPerGroup,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  };

  const studentUrl = createdResult
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${createdResult.campaignId}`
    : '';

  const adminUrl = createdResult
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${createdResult.campaignId}/admin`
    : '';

  const copyToClipboard = (text: string, type: 'student' | 'admin') => {
    navigator.clipboard.writeText(text);
    if (type === 'student') {
      setCopiedStudentLink(true);
      setTimeout(() => setCopiedStudentLink(false), 2000);
    } else {
      setCopiedAdminLink(true);
      setTimeout(() => setCopiedAdminLink(false), 2000);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-3">
          <Sparkles className="w-4 h-4" /> Ứng dụng Chọn Nhóm Thông Minh
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Tạo Đợt Chọn Nhóm Mới
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Tải file Excel / dán danh sách sinh viên. Hệ thống tự động chia nhóm và cập nhật Real-time!
        </p>
      </div>

      {createdResult ? (
        /* Card Kết Quả Sau Khi Tạo Xong */
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <Check className="w-8 h-8 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold">Khởi tạo đợt chọn nhóm thành công!</h2>
              <p className="text-sm text-emerald-800">
                Đợt: <strong>{createdResult.title}</strong> — Tổng {createdResult.totalStudents} sinh viên (Đã tự động tạo {createdResult.groupCount} nhóm).
              </p>
            </div>
          </div>

          {/* Box 1: Link cho Sinh Viên */}
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" /> Link dành cho Sinh Viên chọn nhóm:
              </span>
              <button
                onClick={() => copyToClipboard(studentUrl, 'student')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                {copiedStudentLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedStudentLink ? 'Đã chép!' : 'Chép Link Sinh Viên'}
              </button>
            </div>
            <input
              type="text"
              readOnly
              value={studentUrl}
              className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm text-slate-700 select-all font-mono"
            />
            <p className="text-xs text-blue-700">👉 Gửi link này vào nhóm Zalo / Messenger của lớp để sinh viên chọn nhóm.</p>
          </div>

          {/* Box 2: Link cho Admin */}
          <div className="p-5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" /> Link Quản lý cho Admin (Lớp trưởng):
              </span>
              <button
                onClick={() => copyToClipboard(adminUrl, 'admin')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition"
              >
                {copiedAdminLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedAdminLink ? 'Đã chép!' : 'Chép Link Admin'}
              </button>
            </div>
            <input
              type="text"
              readOnly
              value={adminUrl}
              className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm text-slate-700 select-all font-mono"
            />
            <p className="text-xs text-amber-800">🔒 Dùng link này (hoặc mật khẩu Admin vừa đặt) để xem thống kê, ghép nhóm thủ công và xuất file Excel.</p>
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100">
            <button
              onClick={() => setCreatedResult(null)}
              className="text-sm text-slate-500 hover:text-slate-800 transition"
            >
              + Tạo đợt chọn nhóm khác
            </button>
            <a
              href={studentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition text-sm"
            >
              Xem trang chọn nhóm <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : (
        /* Form Khởi Tạo */
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Tên Đợt */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Tên đợt chọn nhóm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Lập trình Web - Lớp D21 (Học kỳ 1)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
              required
            />
          </div>

          {/* Số lượng tối đa / nhóm + Passcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Số người tối đa mỗi nhóm <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxPerGroup}
                onChange={(e) => setMaxPerGroup(parseInt(e.target.value, 10) || 5)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Mật khẩu Admin (Đặt mã PIN ngắn) <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                placeholder="VD: 123456"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                required
              />
            </div>
          </div>

          {/* Nhập Danh Sách: Tải File Excel hoặc Dán Text */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-800">
                Danh sách sinh viên lớp <span className="text-red-500">*</span>
              </label>

              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode('excel')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    inputMode === 'excel' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  📁 Tải File Excel/CSV
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    inputMode === 'text' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  📝 Dán Text
                </button>
              </div>
            </div>

            {inputMode === 'excel' ? (
              <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl p-6 text-center space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-blue-600 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Tải file danh sách sinh viên (.xlsx, .xls, .csv)</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hỗ trợ tự nhận diện các cột MSSV, Họ và Tên, và Ngày sinh (nếu có).
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition shadow-sm">
                  <Upload className="w-4 h-4" /> Chọn File Từ Máy Tính
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {excelStudents.length > 0 && (
                  <p className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                    ✓ Đã nhận diện được {excelStudents.length} sinh viên từ file!
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Dán trực tiếp từ Excel hoặc Text (Định dạng: <i>MSSV - Họ tên - Ngày sinh</i>).
                </p>
                <textarea
                  rows={6}
                  placeholder={`21120001\tNguyễn Văn A\t01/10/2008\n21120002\tTrần Thị B\t15/05/2007`}
                  value={rawStudentText}
                  onChange={(e) => setRawStudentText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Preview Sinh Viên nhận diện */}
          {activeStudentsList.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" /> Đã nhận diện ({activeStudentsList.length} SV ~ {estimatedGroups} nhóm):
                </h4>
              </div>
              <div className="space-y-1">
                {activeStudentsList.slice(0, 5).map((s, idx) => (
                  <div key={idx} className="text-xs text-slate-600 font-mono flex gap-4">
                    <span className="w-24 text-slate-900 font-semibold">{s.mssv}</span>
                    <span className="w-48 font-medium">{s.fullName}</span>
                    {s.dob && <span className="text-slate-400">NS: {s.dob}</span>}
                  </div>
                ))}
                {activeStudentsList.length > 5 && (
                  <p className="text-xs text-slate-400 italic pt-1">
                    ... và {activeStudentsList.length - 5} sinh viên khác.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 shadow-md flex justify-center items-center gap-2 text-base disabled:opacity-50"
          >
            {loading ? 'Đang tạo đợt chọn nhóm...' : 'Tạo Đợt Chọn Nhóm & Nhận Link'}
          </button>
        </form>
      )}
    </main>
  );
}
