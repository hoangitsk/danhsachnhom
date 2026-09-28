'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Trash2, ExternalLink, ShieldCheck, UserCheck, Copy, Check, Lock, Unlock, ArrowLeft, RefreshCw, Layers } from 'lucide-react';
import Link from 'next/link';

interface CampaignItem {
  id: string;
  title: string;
  max_per_group: number;
  total_students: number;
  status: 'OPEN' | 'LOCKED' | 'COMPLETED';
  created_at: string;
}

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Xoá đợt
  const [deleteTarget, setDeleteTarget] = useState<CampaignItem | null>(null);
  const [passcode, setPasscode] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/campaigns/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tải danh sách thất bại');
      setCampaigns(data.campaigns || []);
    } catch (err: unknown) {
      console.error(err);
      setError('Không thể tải danh sách đợt chọn nhóm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!passcode.trim()) {
      setDeleteError('Vui lòng nhập mật khẩu Admin của đợt này.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/campaigns/${deleteTarget.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xoá đợt chọn nhóm thất bại');

      setDeleteTarget(null);
      setPasscode('');
      await fetchCampaigns();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Lỗi khi xoá');
    } finally {
      setDeleteLoading(false);
    }
  };

  const copyStudentUrl = (id: string) => {
    const url = `${window.location.origin}/c/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Navigation Header */}
      <div className="flex justify-between items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Về Trang Khởi Tạo Đợt Mới
        </Link>
        <button
          onClick={fetchCampaigns}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </button>
      </div>

      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-1">
          <Layers className="w-4 h-4" /> Quản Lý Đợt Chọn Nhóm
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Các Đợt Chọn Nhóm Đã Tạo</h1>
        <p className="text-sm text-slate-600">Xem danh sách, lấy link hoặc xoá các đợt chọn nhóm cũ</p>
      </div>

      {/* Modal Xoá Đợt */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Xác Nhận Xoá Đợt Chọn Nhóm
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xoá đợt: <strong className="text-slate-900">{deleteTarget.title}</strong>? Hành động này sẽ xoá vĩnh viễn đợt chọn nhóm cùng toàn bộ dữ liệu nhóm và sinh viên của đợt đó!
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nhập Mật khẩu Admin của đợt này để xác nhận xoá:
              </label>
              <input
                type="password"
                placeholder="Nhập Passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setPasscode('');
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xoá...' : 'Xoá Vĩnh Viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm font-semibold">Đang tải danh sách các đợt...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 rounded-2xl border border-red-200 text-center text-red-700 font-semibold text-sm">
          {error}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Chưa có đợt chọn nhóm nào</h3>
          <p className="text-xs text-slate-500">Hãy bấm nút bên dưới để khởi tạo đợt chọn nhóm đầu tiên.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-blue-700 transition"
          >
            <Sparkles className="w-4 h-4" /> Tạo Đợt Chọn Nhóm Mới
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const createdDate = new Date(c.created_at).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{c.title}</h3>
                    {c.status === 'LOCKED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                        <Lock className="w-3 h-3" /> Đã khóa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <Unlock className="w-3 h-3" /> Đang mở
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Sĩ số: <strong className="text-slate-800">{c.total_students}</strong> SV • Tối đa:{' '}
                    <strong className="text-slate-800">{c.max_per_group}</strong> người/nhóm • Ngày tạo: {createdDate}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => copyStudentUrl(c.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                  >
                    {copiedId === c.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === c.id ? 'Đã chép!' : 'Link SV'}
                  </button>

                  <Link
                    href={`/c/${c.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Trang SV <ExternalLink className="w-3 h-3" />
                  </Link>

                  <Link
                    href={`/c/${c.id}/admin`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Admin <ExternalLink className="w-3 h-3" />
                  </Link>

                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition"
                    title="Xoá đợt này"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xoá
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
