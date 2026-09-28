# 02: Luồng Khởi tạo Đợt Chọn Nhóm cho Admin (Campaign Creation)

**What to build:** Giao diện và API cho phép Admin (Lớp trưởng/Giảng viên) dán danh sách sinh viên, đặt số người tối đa/nhóm, tạo đợt chọn nhóm và nhận Link Sinh viên + Link Admin.

**Blocked by:** 01-project-setup-and-db-schema

**Status:** completed

- [x] Giao diện Form tạo đợt chọn nhóm: Tên đợt, Textarea dán danh sách (Họ tên + MSSV), Số người tối đa/nhóm, Passcode Admin.
- [x] Logic phân tích (parse) danh sách sinh viên từ chuỗi text thành các record `(mssv, full_name)`.
- [x] API Route tính số lượng nhóm = `ceil(tổng SV / max_per_group)` và lưu `campaign`, `groups`, `students` vào Supabase.
- [x] Màn hình trả về chứa Link Chọn Nhóm cho Sinh viên và Link Quản lý Admin.
