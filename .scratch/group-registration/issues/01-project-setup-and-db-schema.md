# 01: Khởi tạo Dự án Next.js & Cấu hình Supabase Database Schema

**What to build:** Khởi tạo cấu trúc dự án Next.js App Router, Tailwind CSS, cài đặt thư viện Supabase client và định nghĩa bảng cơ sở dữ liệu (`campaigns`, `groups`, `students`) cùng Realtime publication.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Tạo dự án Next.js với TypeScript, Tailwind CSS.
- [x] Cấu hình biến môi trường kết nối Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- [x] Định nghĩa các bảng Database: `campaigns`, `groups`, `students` với khóa ngoại và ràng buộc số lượng.
- [x] Bật tính năng Supabase Realtime cho bảng `students` và `groups`.
