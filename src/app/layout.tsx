import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from '@/shared/components/providers/query-provider';

export const metadata: Metadata = {
  title: "QR Library System - School Library Management",
  description: "Modern QR-based Library Management System for school libraries. Manage books, issue and return with QR codes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
