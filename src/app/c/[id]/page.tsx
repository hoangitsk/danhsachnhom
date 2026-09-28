'use client';

import { useState, useEffect, useCallback, use, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, UserCheck, LogOut, CheckCircle2, Lock, RefreshCw, Search, ShieldAlert, KeyRound, UserPlus, Check, X, AlertCircle, Sparkles, ClipboardList, Crown, Edit3, MessageCircle, Phone } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  max_per_group: number;
  total_students: number;
  status: 'OPEN' | 'LOCKED' | 'COMPLETED';
}

interface Group {
  id: string;
  campaign_id: string;
  group_number: number;
  custom_name: string | null;
  leader_mssv?: string | null;
}

interface Student {
  id: string;
  campaign_id: string;
  group_id: string | null;
  mssv: string;
  full_name: string;
  dob?: string | null;
  contact_info?: string | null;
  approval_status?: 'APPROVED' | 'PENDING' | null;
}

export default function StudentSelectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab view: 'groups' hoặc 'master-list'
  const [activeTab, setActiveTab] = useState<'groups' | 'master-list'>('groups');
  const [masterListFilter, setMasterListFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [masterListSearch, setMasterListSearch] = useState('');

  // MSSV sinh viên đang chọn
  const [currentMssv, setCurrentMssv] = useState<string | null>(null);
  const [mssvSearchQuery, setMssvSearchQuery] = useState('');

  // Modal Cập nhật Thông tin Liên lạc Cá nhân
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileContactInput, setProfileContactInput] = useState('');
  const [profileDobInput, setProfileDobInput] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Modal xác nhận Ngày sinh khi Đổi nhóm / Rời nhóm
  const [dobModalInfo, setDobModalInfo] = useState<{
    action: 'join' | 'leave';
    groupId?: string;
  } | null>(null);
  const [dobInput, setDobInput] = useState('');
  const [dobError, setDobError] = useState<string | null>(null);

  // Modal Tham gia / Đổi nhóm (với câu hỏi Xác nhận Nhóm Trưởng)
  const [joinTargetGroup, setJoinTargetGroup] = useState<Group | null>(null);
  const [joinIsLeader, setJoinIsLeader] = useState<boolean>(false);
  const [joinDobInput, setJoinDobInput] = useState<string>('');
  const [joinModalError, setJoinModalError] = useState<string | null>(null);

  // Modal Thêm bạn vào nhóm (cho Nhóm trưởng / Thành viên)
  const [addMemberTargetGroup, setAddMemberTargetGroup] = useState<string | null>(null);
  const [addMemberTab, setAddMemberTab] = useState<'search' | 'paste'>('search');
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('');
  const [addMemberPasteText, setAddMemberPasteText] = useState('');

  // Modal Đổi Nhóm Trưởng
  const [changeLeaderTargetGroup, setChangeLeaderTargetGroup] = useState<Group | null>(null);
  const [selectedNewLeaderMssv, setSelectedNewLeaderMssv] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      const { data: campaignData, error: campaignErr } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignErr || !campaignData) {
        setError('Đợt chọn nhóm không tồn tại hoặc đã bị xoá.');
        setLoading(false);
        return;
      }
      setCampaign(campaignData);

      const { data: groupsData, error: groupsErr } = await supabase
        .from('groups')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('group_number', { ascending: true });

      if (groupsErr) throw groupsErr;
      setGroups(groupsData || []);

      const { data: studentsData, error: studentsErr } = await supabase
        .from('students')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('mssv', { ascending: true });

      if (studentsErr) throw studentsErr;
      setStudents(studentsData || []);
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      setError('Lỗi khi tải dữ liệu đợt chọn nhóm.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();

    const saved = localStorage.getItem(`student_mssv_${campaignId}`);
    if (saved) {
      setCurrentMssv(saved);
    }
  }, [campaignId, fetchData]);

  // Đăng ký Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`campaign_${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchData]);

  const currentStudent = students.find((s) => s.mssv === currentMssv);

  const handleSetMssv = (selectedMssv: string) => {
    const trimmed = selectedMssv.trim();
    if (!trimmed) return;

    const exists = students.some((s) => s.mssv === trimmed);
    if (!exists) {
      alert('MSSV của bạn không có trong danh sách đợt chọn nhóm này!');
      return;
    }

    setCurrentMssv(trimmed);
    localStorage.setItem(`student_mssv_${campaignId}`, trimmed);
  };

  const handleLogoutMssv = () => {
    setCurrentMssv(null);
    localStorage.removeItem(`student_mssv_${campaignId}`);
  };

  // Cập nhật Thông tin cá nhân
  const handleSaveProfile = async () => {
    if (!currentMssv) return;

    setActionLoading(true);
    setProfileError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mssv: currentMssv,
          dobPassword: profileDobInput,
          contactInfo: profileContactInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');

      setShowProfileModal(false);
      setProfileDobInput('');
      await fetchData();
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Lỗi khi cập nhật thông tin');
    } finally {
      setActionLoading(false);
    }
  };

  // Thao tác Tham gia / Đổi nhóm
  const executeJoinGroup = async (groupId: string, isLeader: boolean, dobPassword?: string) => {
    if (!currentMssv) return;
    setActionLoading(true);
    setJoinModalError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mssv: currentMssv, groupId, isLeader, dobPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setJoinModalError(data.error || 'Tham gia nhóm thất bại');
        return;
      }

      setJoinTargetGroup(null);
      setJoinDobInput('');
      setJoinIsLeader(false);
      await fetchData();
    } catch (err: unknown) {
      setJoinModalError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tham gia nhóm');
    } finally {
      setActionLoading(false);
    }
  };

  // Thao tác Rời nhóm
  const executeLeaveGroup = async (dobPassword?: string) => {
    if (!currentMssv) return;
    setActionLoading(true);
    setDobError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mssv: currentMssv, dobPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requireDob) {
          setDobModalInfo({ action: 'leave' });
          setDobError(data.error);
        } else {
          alert(data.error || 'Rời nhóm thất bại');
        }
        return;
      }

      setDobModalInfo(null);
      setDobInput('');
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi rời nhóm');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinClick = (targetGroup: Group) => {
    if (!currentMssv) {
      alert('Vui lòng xác thực MSSV của bạn ở đầu trang trước!');
      return;
    }

    setJoinTargetGroup(targetGroup);
    setJoinIsLeader(false);
    setJoinDobInput('');
    setJoinModalError(null);
  };

  const handleApproveMember = async (targetMssv: string, action: 'approve' | 'reject') => {
    if (!currentMssv) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/approve-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMssv,
          action,
          requesterMssv: currentMssv,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Thao tác thất bại');

      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi duyệt thành viên');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveClick = () => {
    if (!currentMssv) return;
    setDobModalInfo({ action: 'leave' });
    setDobInput('');
    setDobError(null);
  };

  const handleChangeLeader = async () => {
    if (!changeLeaderTargetGroup || !selectedNewLeaderMssv || !currentMssv) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/change-leader`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: changeLeaderTargetGroup.id,
          newLeaderMssv: selectedNewLeaderMssv,
          requesterMssv: currentMssv,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đổi nhóm trưởng thất bại');

      setChangeLeaderTargetGroup(null);
      setSelectedNewLeaderMssv('');
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi đổi nhóm trưởng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMembersToMyGroup = async (mssvsToAdd: string[]) => {
    if (!addMemberTargetGroup || mssvsToAdd.length === 0) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/add-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mssvList: mssvsToAdd,
          targetGroupId: addMemberTargetGroup,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Thêm thành viên thất bại');

      setAddMemberTargetGroup(null);
      setAddMemberSearchQuery('');
      setAddMemberPasteText('');
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi thêm thành viên');
    } finally {
      setActionLoading(false);
    }
  };

  const unassignedStudentsList = useMemo(() => {
    return students.filter((s) => !s.group_id);
  }, [students]);

  const assignedStudentsCount = students.filter((s) => s.group_id).length;

  const searchedUnassignedStudents = useMemo(() => {
    if (!addMemberSearchQuery.trim()) return unassignedStudentsList;
    const q = addMemberSearchQuery.toLowerCase().trim();
    return unassignedStudentsList.filter(
      (s) =>
        s.mssv.toLowerCase().includes(q) ||
        s.full_name.toLowerCase().includes(q) ||
        (s.contact_info && s.contact_info.toLowerCase().includes(q))
    );
  }, [unassignedStudentsList, addMemberSearchQuery]);

  const parsedPastedStudents = useMemo(() => {
    if (!addMemberPasteText.trim()) return [];
    const rawTokens = addMemberPasteText
      .split(/[\n,;\t]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const matched: Student[] = [];
    const matchedMssvs = new Set<string>();

    for (const token of rawTokens) {
      const q = token.toLowerCase();
      const found = unassignedStudentsList.find(
        (s) =>
          !matchedMssvs.has(s.mssv) &&
          (s.mssv.toLowerCase().includes(q) || s.full_name.toLowerCase().includes(q))
      );
      if (found) {
        matchedMssvs.add(found.mssv);
        matched.push(found);
      }
    }

    return matched;
  }, [addMemberPasteText, unassignedStudentsList]);

  const filteredMasterList = students.filter((s) => {
    const matchesSearch =
      s.mssv.toLowerCase().includes(masterListSearch.toLowerCase()) ||
      s.full_name.toLowerCase().includes(masterListSearch.toLowerCase()) ||
      (s.contact_info && s.contact_info.toLowerCase().includes(masterListSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (masterListFilter === 'assigned') return !!s.group_id;
    if (masterListFilter === 'unassigned') return !s.group_id;
    return true;
  });

  const filteredWhitelist = students.filter(
    (s) =>
      s.mssv.toLowerCase().includes(mssvSearchQuery.toLowerCase()) ||
      s.full_name.toLowerCase().includes(mssvSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center text-slate-500 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Đang tải thông tin đợt chọn nhóm...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 bg-white rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Không tìm thấy đợt chọn nhóm</h2>
        <p className="text-sm text-slate-600">{error || 'Đợt này không tồn tại.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      {/* Top Banner Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">{campaign.title}</h1>
              {campaign.status === 'LOCKED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  <Lock className="w-3 h-3" /> Đã Khóa Chốt Nhóm
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sĩ số: {campaign.total_students} sinh viên • Đã vào nhóm:{' '}
              <span className="text-emerald-600 font-bold">{assignedStudentsCount}</span> • Chưa có nhóm:{' '}
              <span className="text-amber-600 font-bold">{unassignedStudentsList.length}</span>
            </p>
          </div>

          {/* Sinh viên đăng nhập */}
          {currentStudent ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
                <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-blue-900 block">{currentStudent.full_name}</span>
                  <span className="text-blue-700 font-mono text-[11px]">MSSV: {currentStudent.mssv}</span>
                </div>
                <button
                  onClick={handleLogoutMssv}
                  title="Đổi MSSV khác"
                  className="ml-1 text-slate-400 hover:text-slate-700 p-1 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => {
                  setProfileContactInput(currentStudent.contact_info || '');
                  setProfileDobInput('');
                  setProfileError(null);
                  setShowProfileModal(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1 shadow-sm"
                title="Cập nhật thông tin liên lạc / SĐT / Zalo / Kỹ năng"
              >
                <Edit3 className="w-3.5 h-3.5" /> Sửa Bio / Zalo
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              ⚠️ Bạn chưa chọn MSSV cá nhân
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Modal Cập Nhật Thông Tin Liên Lạc Cá Nhân (Bio/Zalo/SĐT/Kỹ năng) */}
        {showProfileModal && currentStudent && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                  Cập Nhật Thông Tin Cá Nhân / Liên Lạc
                </h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Thêm SĐT, Zalo hoặc mô tả kỹ năng của bạn để các bạn khác hoặc Nhóm trưởng tiện liên lạc & chọn bạn vào nhóm:
              </p>

              {profileError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {profileError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thông tin liên lạc & Kỹ năng / Ghi chú
                </label>
                <input
                  type="text"
                  placeholder="VD: Zalo: 0912345678 - Làm slide, mẫn cán"
                  value={profileContactInput}
                  onChange={(e) => setProfileContactInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">Thông tin này sẽ hiển thị cạnh tên bạn cho cả lớp cùng thấy.</p>
              </div>

              {currentStudent.dob && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhập Mật khẩu Ngày Sinh để xác nhận (DDMMYYYY)
                  </label>
                  <input
                    type="password"
                    placeholder="VD: 01102008"
                    value={profileDobInput}
                    onChange={(e) => setProfileDobInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-50"
                >
                  Lưu Thông Tin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Tham Gia / Đổi Nhóm & Xác Nhận Nhóm Trưởng */}
        {joinTargetGroup && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Xác nhận vào {joinTargetGroup.custom_name || `Nhóm ${joinTargetGroup.group_number}`}
                </h3>
                <button
                  onClick={() => setJoinTargetGroup(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {joinModalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {joinModalError}
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Bạn có phải là Nhóm Trưởng không?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setJoinIsLeader(true)}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                      joinIsLeader
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Crown className="w-5 h-5 text-amber-500" />
                    Có, tôi là Nhóm Trưởng
                  </button>
                  <button
                    type="button"
                    onClick={() => setJoinIsLeader(false)}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                      !joinIsLeader
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Users className="w-5 h-5 text-blue-500" />
                    Không, tôi là Thành Viên
                  </button>
                </div>
                {!joinIsLeader && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ℹ️ Khi tham gia với tư cách thành viên, Nhóm trưởng sẽ duyệt thông tin của bạn vào nhóm.
                  </p>
                )}
              </div>

              {currentStudent?.group_id && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mật khẩu Ngày Sinh (DDMMYYYY) để xác nhận đổi nhóm
                  </label>
                  <input
                    type="password"
                    placeholder="VD: 01102008"
                    value={joinDobInput}
                    onChange={(e) => setJoinDobInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setJoinTargetGroup(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={() =>
                    executeJoinGroup(
                      joinTargetGroup.id,
                      joinIsLeader,
                      currentStudent?.group_id ? joinDobInput : undefined
                    )
                  }
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
                >
                  {currentStudent?.group_id ? 'Xác Nhận Đổi Nhóm' : 'Xác Nhận Tham Gia'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xác thực Mật khẩu Ngày sinh khi Đổi / Rời nhóm */}
        {dobModalInfo && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                  Xác nhận Mật khẩu Ngày Sinh
                </h3>
                <button
                  onClick={() => setDobModalInfo(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Để {dobModalInfo.action === 'join' ? 'đổi nhóm' : 'rời nhóm'}, vui lòng nhập Mật khẩu Ngày Sinh theo định dạng viết liền 8 chữ số (VD: Ngày 01/10/2008 thì nhập <strong className="font-mono text-slate-900">01102008</strong>).
              </p>

              {dobError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {dobError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu Ngày Sinh (DDMMYYYY)
                </label>
                <input
                  type="password"
                  placeholder="VD: 01102008"
                  value={dobInput}
                  onChange={(e) => setDobInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDobModalInfo(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (dobModalInfo.action === 'join' && dobModalInfo.groupId) {
                      executeJoinGroup(dobModalInfo.groupId, false, dobInput);
                    } else {
                      executeLeaveGroup(dobInput);
                    }
                  }}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  Xác Nhận {dobModalInfo.action === 'join' ? 'Đổi Nhóm' : 'Rời Nhóm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Đổi Nhóm Trưởng */}
        {changeLeaderTargetGroup && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Đổi Nhóm Trưởng cho {changeLeaderTargetGroup.custom_name || `Nhóm ${changeLeaderTargetGroup.group_number}`}
                </h3>
                <button
                  onClick={() => setChangeLeaderTargetGroup(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Bạn đang là thành viên của nhóm này. Vui lòng chọn một thành viên trong nhóm để chỉ định làm <strong>Nhóm trưởng mới</strong>:
              </p>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {students
                  .filter((s) => s.group_id === changeLeaderTargetGroup.id)
                  .map((m) => {
                    const isLeader =
                      changeLeaderTargetGroup.leader_mssv === m.mssv ||
                      (!changeLeaderTargetGroup.leader_mssv &&
                        students.filter((s) => s.group_id === changeLeaderTargetGroup.id)[0]?.mssv === m.mssv);

                    return (
                      <label
                        key={m.id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                          selectedNewLeaderMssv === m.mssv
                            ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-100 font-bold'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="new_leader"
                            value={m.mssv}
                            checked={selectedNewLeaderMssv === m.mssv}
                            onChange={() => setSelectedNewLeaderMssv(m.mssv)}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>{m.full_name}</span>
                          <span className="font-mono text-[11px] text-slate-500">({m.mssv})</span>
                        </div>
                        {isLeader && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            <Crown className="w-3 h-3 text-amber-600" /> Trưởng hiện tại
                          </span>
                        )}
                      </label>
                    );
                  })}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setChangeLeaderTargetGroup(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleChangeLeader}
                  disabled={actionLoading || !selectedNewLeaderMssv}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" /> Xác Nhận Đổi Nhóm Trưởng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Thêm Thành Viên Chưa Có Nhóm */}
        {addMemberTargetGroup && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  Thêm Bạn Vào Nhóm
                </h3>
                <button
                  onClick={() => setAddMemberTargetGroup(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setAddMemberTab('search')}
                  className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                    addMemberTab === 'search' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> Gõ Tìm MSSV / Họ tên
                </button>
                <button
                  type="button"
                  onClick={() => setAddMemberTab('paste')}
                  className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                    addMemberTab === 'paste' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" /> Dán MSSV / Họ tên Hàng Loạt
                </button>
              </div>

              {addMemberTab === 'search' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Gõ MSSV, Họ tên hoặc Kỹ năng để tìm nhanh..."
                      value={addMemberSearchQuery}
                      onChange={(e) => setAddMemberSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                    {searchedUnassignedStudents.length === 0 ? (
                      <p className="p-4 text-xs text-center text-slate-500">
                        Không tìm thấy sinh viên lẻ nào khớp với từ khóa.
                      </p>
                    ) : (
                      searchedUnassignedStudents.map((s) => (
                        <div
                          key={s.id}
                          className="p-3 text-xs flex justify-between items-center hover:bg-emerald-50 transition"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block">{s.full_name}</span>
                            <span className="font-mono text-[11px] text-slate-500">{s.mssv}</span>
                            {s.contact_info && (
                              <span className="block text-[11px] text-amber-700 font-medium mt-0.5">
                                💬 {s.contact_info}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddMembersToMyGroup([s.mssv])}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Thêm Vào Nhóm
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {addMemberTab === 'paste' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Dán danh sách MSSV hoặc Họ tên (mỗi dòng 1 bạn hoặc tách bằng dấu phẩy). Tự động đối chiếu với các bạn chưa có nhóm:
                  </p>
                  <textarea
                    rows={4}
                    placeholder={`261A300575\nPhan Ngọc Mai Anh\n261A300451`}
                    value={addMemberPasteText}
                    onChange={(e) => setAddMemberPasteText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  />

                  {parsedPastedStudents.length > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <p className="font-bold text-emerald-800 flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-emerald-600" /> Nhận diện được {parsedPastedStudents.length} sinh viên lẻ:
                      </p>
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {parsedPastedStudents.map((s) => (
                          <div key={s.id} className="font-mono text-emerald-900 text-[11px] flex justify-between">
                            <span>{s.full_name}</span>
                            <span className="font-bold">{s.mssv}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setAddMemberTargetGroup(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() =>
                        handleAddMembersToMyGroup(parsedPastedStudents.map((s) => s.mssv))
                      }
                      disabled={actionLoading || parsedPastedStudents.length === 0}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Thêm Tất Cả ({parsedPastedStudents.length} SV) Vào Nhóm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bước 1: Chọn MSSV nếu chưa xác thực */}
        {!currentMssv && (
          <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-md space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Xác thực MSSV của bạn để chọn nhóm
            </h2>
            <p className="text-xs text-slate-600">
              Vui lòng tìm và chọn đúng Tên & MSSV của bạn trong danh sách dưới đây:
            </p>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Gõ MSSV hoặc Họ tên để tìm nhanh..."
                value={mssvSearchQuery}
                onChange={(e) => setMssvSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
              {filteredWhitelist.length === 0 ? (
                <p className="p-4 text-xs text-center text-slate-500">Không tìm thấy sinh viên khớp với từ khóa.</p>
              ) : (
                filteredWhitelist.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSetMssv(s.mssv)}
                    className="w-full px-4 py-2.5 text-left text-xs flex justify-between items-center hover:bg-blue-100 transition group"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 group-hover:text-blue-900 block">{s.full_name}</span>
                      {s.contact_info && (
                        <span className="text-[11px] text-amber-700 block">💬 {s.contact_info}</span>
                      )}
                    </div>
                    <span className="font-mono text-slate-500 group-hover:text-blue-700">{s.mssv}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Thanh Chuyển Tab */}
        <div className="flex border-b border-slate-200 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('groups')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
                activeTab === 'groups'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              🏢 Danh Sách Nhóm ({groups.length})
            </button>
            <button
              onClick={() => setActiveTab('master-list')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
                activeTab === 'master-list'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              📊 Danh Sách Tổng Lớp ({students.length} SV)
            </button>
          </div>

          <span className="text-xs text-slate-500 flex items-center gap-1.5 pb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Cập nhật Real-time
          </span>
        </div>

        {/* TAB 1: DANH SÁCH THẺ NHÓM */}
        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => {
              const groupMembers = students.filter((s) => s.group_id === group.id);
              const memberCount = groupMembers.length;
              const isFull = memberCount >= campaign.max_per_group;
              const isMyGroup = currentStudent?.group_id === group.id;

              return (
                <div
                  key={group.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                    isMyGroup
                      ? 'border-2 border-blue-600 ring-2 ring-blue-100'
                      : isFull
                      ? 'border-slate-200 bg-slate-50/50'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Header Card */}
                  <div className="p-5 border-b border-slate-100 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          {group.custom_name || `Nhóm ${group.group_number}`}
                        </h3>
                        {isMyGroup && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full mt-1">
                            <CheckCircle2 className="w-3 h-3" /> Nhóm của bạn
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                          isFull
                            ? 'bg-slate-200 text-slate-700'
                            : memberCount > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {memberCount} / {campaign.max_per_group}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFull ? 'bg-slate-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${(memberCount / campaign.max_per_group) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Body: Danh sách thành viên */}
                  <div className="p-5 flex-grow space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thành viên:</p>

                      <div className="flex gap-1.5">
                        {isMyGroup && memberCount > 0 && campaign.status === 'OPEN' && (
                          <button
                            onClick={() => {
                              setChangeLeaderTargetGroup(group);
                              const currentLeader =
                                group.leader_mssv || groupMembers[0]?.mssv || '';
                              setSelectedNewLeaderMssv(currentLeader);
                            }}
                            className="text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition inline-flex items-center gap-1"
                            title="Đổi Nhóm Trưởng"
                          >
                            <Crown className="w-3 h-3 text-amber-600" /> Đổi Trưởng
                          </button>
                        )}

                        {isMyGroup && !isFull && campaign.status === 'OPEN' && unassignedStudentsList.length > 0 && (
                          <button
                            onClick={() => {
                              setAddMemberTargetGroup(group.id);
                              setAddMemberSearchQuery('');
                              setAddMemberPasteText('');
                            }}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <UserPlus className="w-3 h-3" /> + Thêm bạn
                          </button>
                        )}
                      </div>
                    </div>

                    {groupMembers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Chưa có ai tham gia nhóm này.</p>
                    ) : (
                      <ul className="space-y-2">
                        {groupMembers.map((m, idx) => {
                          const isLeader =
                            group.leader_mssv === m.mssv ||
                            (!group.leader_mssv && idx === 0);

                          const isPending = m.approval_status === 'PENDING';
                          const isCurrentLeader =
                            currentMssv &&
                            (group.leader_mssv === currentMssv || (!group.leader_mssv && groupMembers[0]?.mssv === currentMssv));

                          return (
                            <li
                              key={m.id}
                              className={`text-xs p-2.5 rounded-xl space-y-1 ${
                                m.mssv === currentMssv
                                  ? 'bg-blue-50/90 text-blue-900 border border-blue-200'
                                  : isPending
                                  ? 'bg-amber-50/60 text-slate-700 border border-amber-200'
                                  : 'bg-slate-50 text-slate-700 border border-slate-100'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-semibold flex items-center gap-1.5 flex-wrap">
                                  {isLeader && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                      <Crown className="w-3 h-3 text-amber-600" /> Nhóm trưởng
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                      ⏳ Chờ duyệt
                                    </span>
                                  )}
                                  {m.full_name}
                                </span>
                                <span className="font-mono text-[11px] text-slate-500">{m.mssv}</span>
                              </div>

                              {/* Hiển thị Bio / Liên lạc nếu có */}
                              {m.contact_info && (
                                <p className="text-[11px] text-amber-800 bg-amber-50/80 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3 text-amber-600 flex-shrink-0" /> {m.contact_info}
                                </p>
                              )}

                              {/* Nút Duyệt / Từ Chối dành cho Nhóm Trưởng */}
                              {isPending && isCurrentLeader && (
                                <div className="flex gap-1.5 pt-1 justify-end">
                                  <button
                                    onClick={() => handleApproveMember(m.mssv, 'approve')}
                                    disabled={actionLoading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-sm transition flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <Check className="w-3 h-3" /> Duyệt
                                  </button>
                                  <button
                                    onClick={() => handleApproveMember(m.mssv, 'reject')}
                                    disabled={actionLoading}
                                    className="bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] px-2.5 py-1 rounded-lg transition flex items-center gap-1 border border-red-200 disabled:opacity-50"
                                  >
                                    <X className="w-3 h-3" /> Từ chối
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Footer Button */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    {campaign.status !== 'OPEN' ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" /> Đã Khóa Chọn Nhóm
                      </button>
                    ) : isMyGroup ? (
                      <button
                        onClick={handleLeaveClick}
                        disabled={actionLoading}
                        className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-red-200 disabled:opacity-50"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Rời Nhóm Này
                      </button>
                    ) : isFull ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed"
                      >
                        Nhóm Đã Đủ {campaign.max_per_group} Người
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinClick(group)}
                        disabled={actionLoading}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                      >
                        {currentStudent?.group_id ? 'Đổi Sang Nhóm Này' : 'Tham Gia Nhóm Này'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: DANH SÁCH TỔNG TẤT CẢ SINH VIÊN */}
        {activeTab === 'master-list' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setMasterListFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    masterListFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({students.length})
                </button>
                <button
                  onClick={() => setMasterListFilter('assigned')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    masterListFilter === 'assigned'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  ✓ Đã có nhóm ({assignedStudentsCount})
                </button>
                <button
                  onClick={() => setMasterListFilter('unassigned')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    masterListFilter === 'unassigned'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  ⚠️ Chưa có nhóm ({unassignedStudentsList.length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm MSSV, Tên hoặc Kỹ năng..."
                  value={masterListSearch}
                  onChange={(e) => setMasterListSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4">STT</th>
                    <th className="py-2.5 px-4">MSSV</th>
                    <th className="py-2.5 px-4">Họ và Tên</th>
                    <th className="py-2.5 px-4">Liên Lạc / Kỹ Năng (Bio)</th>
                    <th className="py-2.5 px-4">Trạng Thái Nhóm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMasterList.map((s, idx) => {
                    const group = groups.find((g) => g.id === s.group_id);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{s.mssv}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{s.full_name}</td>
                        <td className="py-2.5 px-4">
                          {s.contact_info ? (
                            <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 font-medium inline-flex items-center gap-1">
                              💬 {s.contact_info}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Chưa nhập Bio</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {group ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                              s.approval_status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {s.approval_status === 'PENDING' ? '⏳ Chờ duyệt - ' : <Check className="w-3 h-3" />}
                              {group.custom_name || `Nhóm ${group.group_number}`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                              ⚠️ Chưa có nhóm
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
