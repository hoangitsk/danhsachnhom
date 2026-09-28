# Technical Spec: Web App Chọn Nhóm Linh Hoạt (Group Registration App)

## Problem Statement

Mỗi khi bắt đầu một môn học / lớp học mới, Lớp trưởng hoặc Giảng viên phải tốn nhiều thời gian tạo file Google Sheets hoặc bảng ghi tay để sinh viên đăng ký chọn nhóm. Việc này gặp các phiền phức:
- File trùng lặp, bị chỉnh sửa đè dữ liệu của nhau.
- Khó kiểm soát số lượng tối đa mỗi nhóm (VD: mỗi nhóm 5 người).
- Không thể tái sử dụng cho các lớp học / môn học khác sau này.

## Solution

Xây dựng ứng dụng Web "Chọn Nhóm Linh Hoạt":
- **Cho phép Admin (Lớp trưởng / Giảng viên)** khởi tạo các "Đợt chọn nhóm" (Campaigns) tái sử dụng. Dán danh sách lớp (Họ tên + MSSV), đặt số người tối đa/nhóm, hệ thống tự chia nhóm và cấp **Link cho sinh viên** và **Link/Passcode Admin**.
- **Cho phép Sinh viên** dùng link/mã đợt để chọn nhóm nhanh: Nhập MSSV/Họ tên (đối chiếu danh sách whitelist), xem các Card nhóm kèm danh sách thành viên hiện tại (Real-time), bấm Tham gia/Rời nhóm trước hạn chốt (Deadline).
- **Cho phép Admin** quản lý, đổi nhóm thủ công, tự động gom nhóm ngẫu nhiên (Auto-assign) cho sinh viên lẻ, và xuất file Excel (.xlsx) danh sách nhóm chỉ với 1-click.

## User Stories

1. As an Admin, I want to create a new group registration campaign by pasting student list (Name + MSSV) and setting max group size, so that I can quickly set up group formation for any class.
2. As an Admin, I want to receive a Student Link and an Admin Access Link/Passcode upon campaign creation, so that I can easily distribute the student link to the class chat.
3. As a Student, I want to open the campaign link, select my name/MSSV from the whitelist, and see all group cards with their current members in real-time, so that I can choose a group with my friends.
4. As a Student, I want to join an available group or leave/switch my group before the deadline, so that I have flexibility in choosing my teammates.
5. As a Student, I want full groups (e.g., 5/5 members) to automatically lock against new joins, so that groups do not exceed the maximum allowed members.
6. As a Student, I want my browser to remember my MSSV session, so that I don't need to sign in every time I return.
7. As an Admin, I want to manually add missing students, reassign students, or lock/unlock the campaign, so that I can handle late registrations or special cases.
8. As an Admin, I want an auto-assign feature to randomly distribute unassigned students into remaining empty slots when the deadline passes, so that every student gets a group.
9. As an Admin, I want to export the final group assignment table to an Excel (.xlsx) file, so that I can submit it directly to the instructor.

## Implementation Decisions

### Tech Stack
- **Framework**: Next.js (App Router, TypeScript)
- **Styling**: Tailwind CSS + Shadcn UI / Lucide Icons
- **Database & Realtime**: Supabase (PostgreSQL + Realtime subscriptions)
- **Deployment**: Vercel (Frontend & Serverless API) + Supabase Cloud (Database)

### Data Schema (PostgreSQL via Supabase)
1. `campaigns`:
   - `id`: UUID (Primary Key)
   - `title`: String (Tên đợt, VD: "Lập trình Web - D21")
   - `max_per_group`: Integer (VD: 5)
   - `total_students`: Integer
   - `admin_passcode_hash`: String
   - `status`: Enum (`OPEN`, `LOCKED`, `COMPLETED`)
   - `created_at`: Timestamp
2. `groups`:
   - `id`: UUID (Primary Key)
   - `campaign_id`: UUID (Foreign Key -> campaigns.id)
   - `group_number`: Integer (VD: 1, 2, 3...)
   - `custom_name`: String (Optional, VD: "Nhóm Siêu Đỉnh")
3. `students`:
   - `id`: UUID (Primary Key)
   - `campaign_id`: UUID (Foreign Key -> campaigns.id)
   - `group_id`: UUID (Optional Foreign Key -> groups.id, NULL if unassigned)
   - `mssv`: String
   - `full_name`: String

### Key Interaction Flows
- **Campaign Creation**: Client posts `title`, `max_per_group`, raw student text string, and `passcode`. Server parses student text into `(mssv, full_name)` tuples, creates `campaign`, generates `groups` count (`ceil(total / max_per_group)`), inserts `students` whitelist. Returns campaign `id` and admin token.
- **Realtime Updates**: Supabase Realtime listens to `INSERT/UPDATE/DELETE` on `students` table filtered by `campaign_id`, instantly updating group card counts and member lists on all connected client screens.

## Testing Decisions

- **Seam 1: Campaign Generation Logic**: Unit test function `calculateGroupCount(totalStudents, maxPerGroup)` and student list parsing helper (`parseStudentListText`).
- **Seam 2: Group Capacity & State Machine**: Integration test verifying that a group rejects join requests when `count >= max_per_group`, and permits leaving/switching prior to deadline.
- **Seam 3: Auto-assign Algorithm**: Test that `autoAssignUnassignedStudents(campaignId)` distributes all unassigned students evenly into groups with remaining capacity without exceeding `max_per_group`.

## Out of Scope

- Permanent student account registration with email verification / OAuth.
- Complex multi-role permissions beyond Admin Passcode and Student Link.
- In-app messaging or chat between group members.

## Further Notes

- App is designed to be 100% free-tier compatible with Vercel and Supabase.
