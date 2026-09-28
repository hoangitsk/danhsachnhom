# 🚀 Web App Chọn Nhóm Linh Hoạt (Group Registration App)

Ứng dụng web giúp **Lớp trưởng / Giảng viên** tạo đợt chọn nhóm tái sử dụng cho từng môn học/lớp học. Sinh viên chọn nhóm theo thời gian thực (Real-time), tự động giới hạn số lượng (VD: 5 người/nhóm), hỗ trợ Auto-assign sinh viên lẻ và xuất file Excel 1-click.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend & Backend**: Next.js 15 (App Router, TypeScript), Tailwind CSS, Lucide Icons
- **Database & Realtime**: Supabase (PostgreSQL)
- **Export File**: SheetJS (XLSX)
- **Deploy**: Vercel (Miễn phí 100%)

---

## 📦 1. Hướng Dẫn Cấu Hình Supabase (Database Miễn Phí)

1. Truy cập [Supabase.com](https://supabase.com) -> Đăng ký/Đăng nhập -> Tạo một **New Project**.
2. Vào mục **SQL Editor** trong bảng điều khiển Supabase.
3. Mở file [`supabase/schema.sql`](./supabase/schema.sql) trong dự án này, copy toàn bộ nội dung và **Run** để khởi tạo các bảng `campaigns`, `groups`, `students` và bật tính năng Realtime.
4. Vào mục **Project Settings** -> **API**:
   - Copy **Project URL** (VD: `https://xxxx.supabase.co`)
   - Copy **anon / public key**

---

## 💻 2. Chạy Cục Bộ (Local Development)

1. Tạo file `.env.local` ở thư mục gốc của dự án với nội dung:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
2. Cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Chạy giao diện phát triển:
   ```bash
   npm run dev
   ```
4. Truy cập [http://localhost:3000](http://localhost:3000) để trải nghiệm tạo đợt chọn nhóm!

---

## 🌐 3. Hướng Dẫn Triển Khai Lên Vercel (1-Click Free Deploy)

1. Đẩy dự án này lên repository của bạn trên **GitHub**.
2. Truy cập [Vercel.com](https://vercel.com) -> Chọn **Add New Project** -> Chọn Repository từ GitHub.
3. Tại phần **Environment Variables**, thêm 2 biến môi trường:
   - `NEXT_PUBLIC_SUPABASE_URL`: (Link URL Supabase của bạn)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Anon Key Supabase của bạn)
4. Bấm **Deploy**. Sau khoảng 1 phút, bạn sẽ có link web chính thức để gửi cho lớp học!

---

## 🌟 Tính Năng Nổi Bật

- ⚡ **Khởi tạo siêu nhanh**: Dán danh sách sinh viên từ Excel/Word -> Tự tính toán số lượng nhóm.
- 🔗 **Phân quyền thông qua Link**: 1 Link gửi Sinh viên + 1 Link/Mã PIN dành riêng cho Admin (Lớp trưởng).
- 🔄 **Real-time 100%**: Sinh viên khác vừa bấm tham gia/rời nhóm là màn hình mọi người tự nhảy ngay lập tức.
- 🔀 **Auto-assign 1-Click**: Tự động gom tất cả sinh viên lẻ chưa có nhóm vào các slot trống khi hết hạn chốt.
- 📊 **Xuất Excel Chuẩn**: 1-click tải bảng tổng hợp danh sách nhóm file `.xlsx` để nộp cho Giảng viên.
