import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chọn Nhóm Linh Hoạt",
  description: "Ứng dụng chọn nhóm đăng ký môn học dành cho Sinh viên & Lớp trưởng",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
