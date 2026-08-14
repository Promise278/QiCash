import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QiCash | Private Payments. Real Freedom.",
  description: "QiCash is a privacy-first payment platform built for secure, modern campus transactions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
