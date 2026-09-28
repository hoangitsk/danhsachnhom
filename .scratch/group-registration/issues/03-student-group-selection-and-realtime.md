# 03: Giao diện Chọn Nhóm Sinh viên & Realtime Card View

**What to build:** Màn hình giao diện chọn nhóm cho sinh viên. Cho phép xác thực MSSV trong Whitelist, hiển thị các Card nhóm kèm danh sách thành viên cập nhật Real-time, hỗ trợ Tham gia / Rời nhóm.

**Blocked by:** 02-campaign-creation-flow

**Status:** completed

- [x] Màn hình chọn sinh viên: Nhập MSSV hoặc chọn MSSV từ danh sách whitelist để xác định danh tính.
- [x] Lưu phiên sinh viên vào LocalStorage/Cookie để không cần chọn lại khi tải lại trang.
- [x] Hiển thị danh sách Thẻ Nhóm (Group Cards) dạng Grid, có thanh tiến độ (VD: 3/5) và danh sách Họ tên + MSSV thành viên.
- [x] Tích hợp Supabase Realtime: Tự động cập nhật Card nhóm khi có sinh viên khác chọn/rời nhóm.
- [x] Nút "Tham gia nhóm" và "Rời nhóm" có kiểm tra điều kiện (nhóm chưa đầy 5/5, chưa hết hạn chốt).
