-- SQL Schema cho Ứng dụng Chọn Nhóm Linh Hoạt (Group Registration App)

-- 1. Bảng Campaigns (Đợt chọn nhóm)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    max_per_group INT NOT NULL DEFAULT 5,
    total_students INT NOT NULL DEFAULT 0,
    admin_passcode VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LOCKED', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bảng Groups (Các nhóm trong đợt)
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    group_number INT NOT NULL,
    custom_name VARCHAR(255),
    leader_mssv VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, group_number)
);

-- 3. Bảng Students (Danh sách sinh viên Whitelist)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    mssv VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    dob VARCHAR(50), -- Ngày sinh dạng DDMMYYYY (VD: 01102008)
    joined_at TIMESTAMPTZ,
    UNIQUE(campaign_id, mssv)
);

-- Index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_students_campaign ON public.students(campaign_id);
CREATE INDEX IF NOT EXISTS idx_students_group ON public.students(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_campaign ON public.groups(campaign_id);

-- Cho phép công khai truy vấn (RLS Policy)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép tất cả đọc campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Cho phép tất cả thêm/sửa campaigns" ON public.campaigns FOR ALL USING (true);

CREATE POLICY "Cho phép tất cả đọc groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Cho phép tất cả thêm/sửa groups" ON public.groups FOR ALL USING (true);

CREATE POLICY "Cho phép tất cả đọc students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Cho phép tất cả thêm/sửa students" ON public.students FOR ALL USING (true);

-- Đăng ký Realtime cho bảng public.students và public.groups
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.students, public.groups;
COMMIT;
