import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
