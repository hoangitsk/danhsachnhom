'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Lock, Unlock, Shuffle, UserPlus, RefreshCw, CheckCircle2, UserX, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Campaign {
  id: string;
  title: string;
  max_per_group: number;
  total_students: number;
  status: 'OPEN' | 'LOCKED' | 'COMPLETED';
}

interface Group {
  id: string;
  group_number: number;
  custom_name: string | null;
}

interface Student {
  id: string;
  group_id: string | null;
  mssv: string;
  full_name: string;
}

export default function AdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);

  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form Thêm SV mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMssv, setNewMssv] = useState('');
  const [newFullName, setNewFullName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: campaignData } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
      setCampaign(campaignData);

      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('group_number', { ascending: true });
      setGroups(groupsData || []);

      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('mssv', { ascending: true });
      setStudents(studentsData || []);
    } catch (err: unknown) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!passcode.trim()) {
      setLoginError('Vui lòng nhập mật khẩu Admin.');
      return;
    }
    setIsAuthenticated(true);
  };

  const handleAdminAction = async (action: string, payload: unknown = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, action, payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Thao tác Admin thất bại');

      await fetchData();
      if (action === 'ADD_STUDENT') {
        setShowAddModal(false);
        setNewMssv('');
        setNewFullName('');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi thao tác Admin');
      if ((err as Error).message.includes('Mật khẩu Admin')) {
        setIsAuthenticated(false);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!campaign || students.length === 0) return;

    // Chuẩn bị dữ liệu bảng Excel
    const excelRows = students.map((s, idx) => {
      const group = groups.find((g) => g.id === s.group_id);
      return {
        STT: idx + 1,
        MSSV: s.mssv,
        'Họ và Tên': s.full_name,
        'Tên Nhóm': group ? group.custom_name || `Nhóm ${group.group_number}` : 'Chưa có nhóm',
        'Trạng thái': group ? 'Đã chọn nhóm' : 'Chưa chọn nhóm',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh Sách Phân Nhóm');

    // Chỉnh độ rộng cột
    worksheet['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 15 }];

    const fileName = `Danh_Sach_Nhom_${campaign.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const assignedCount = students.filter((s) => s.group_id).length;
  const unassignedCount = students.length - assignedCount;

  // Màn hình Đăng nhập Admin
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <form onSubmit={handleLogin} className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <ShieldCheck className="w-12 h-12 text-amber-600 mx-auto" />
            <h1 className="text-2xl font-bold text-slate-900">Đăng Nhập Trang Admin</h1>
            <p className="text-xs text-slate-500">Nhập mật khẩu Admin đã tạo khi khởi tạo đợt chọn nhóm</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu Admin (Passcode)</label>
            <input
              type="password"
              placeholder="Nhập passcode..."
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition text-sm"
          >
            Vào Trang Quản Lý
          </button>
        </form>
      </div>
    );
  }

  if (loading || !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 gap-2">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
        <p className="text-sm font-semibold">Đang tải dữ liệu Quản trị Admin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      {/* Header Admin */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
              <h1 className="text-xl font-bold">{campaign.title} (Trang Admin)</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Đã ghép: <span className="text-emerald-400 font-bold">{assignedCount}</span>/{campaign.total_students} SV • Còn lại: <span className="text-amber-400 font-bold">{unassignedCount}</span> SV lẻ
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Xuất File Excel
            </button>

            <button
              onClick={() => handleAdminAction('TOGGLE_STATUS')}
              disabled={actionLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                campaign.status === 'OPEN'
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
              }`}
            >
              {campaign.status === 'OPEN' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {campaign.status === 'OPEN' ? 'Khóa Đợt Chọn Nhóm' : 'Mở Lại Đợt Chọn Nhóm'}
            </button>

            <button
              onClick={() => {
                if (confirm('Tự động phân ngẫu nhiên tất cả sinh viên chưa có nhóm vào các slot trống?')) {
                  handleAdminAction('AUTO_ASSIGN');
                }
              }}
              disabled={actionLoading || unassignedCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition disabled:opacity-50"
            >
              <Shuffle className="w-3.5 h-3.5" /> Tự Động Chia Nhóm ({unassignedCount})
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition"
            >
              <UserPlus className="w-3.5 h-3.5" /> Thêm SV Mới
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Modal Thêm Sinh Viên Mới */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> Thêm Sinh Viên Bổ Sung
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã Số Sinh Viên (MSSV)</label>
                <input
                  type="text"
                  placeholder="VD: 21120099"
                  value={newMssv}
                  onChange={(e) => setNewMssv(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  placeholder="VD: Phạm Văn D"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleAdminAction('ADD_STUDENT', { mssv: newMssv, fullName: newFullName })}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Thêm Vào Whitelist
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bảng Quản Lý Sinh Viên & Đổi Nhóm Thủ Công */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Danh Sách Sinh Viên & Nhóm</h2>
            <span className="text-xs text-slate-500">Bấm nút "Xuất File Excel" ở góc trên để tải danh sách về máy</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">MSSV</th>
                  <th className="py-3 px-4">Họ và Tên</th>
                  <th className="py-3 px-4">Nhóm Hiện Tại</th>
                  <th className="py-3 px-4 text-right">Đổi Nhóm Thủ Công</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {students.map((student) => {
                  const currentGroup = groups.find((g) => g.id === student.group_id);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{student.mssv}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{student.full_name}</td>
                      <td className="py-3 px-4">
                        {currentGroup ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> {currentGroup.custom_name || `Nhóm ${currentGroup.group_number}`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                            <UserX className="w-3 h-3" /> Chưa chọn nhóm
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={student.group_id || ''}
                          onChange={(e) =>
                            handleAdminAction('ASSIGN_STUDENT', {
                              studentId: student.id,
                              groupId: e.target.value || null,
                            })
                          }
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">-- Chưa vào nhóm --</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.custom_name || `Nhóm ${g.group_number}`}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
