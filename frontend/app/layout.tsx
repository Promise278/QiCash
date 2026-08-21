import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QiCash | Private Campus Payments on Quai Network",
  description: "QiCash is a privacy-first payment platform for students and campus merchants. Scan, pay, and track — all in QUAI on Quai Network.",
  keywords: ["QiCash", "Quai", "campus payments", "crypto", "privacy", "QUAI", "BlipPay"],
  openGraph: {
    title: "QiCash | Pay Smarter. Stay Private.",
    description: "Privacy-first campus payments on Quai Network. Scan QR codes, pay with QUAI, track everything.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
