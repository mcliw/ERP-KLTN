import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'; // 1. IMPORT TOASTER

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LDG Store",
  description: "Website bán laptop uy tín",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {children}
        
        {/* 2. ĐẶT COMPONENT TOASTER Ở ĐÂY */}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}