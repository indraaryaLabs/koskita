import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KosKita — Kelola kos Anda dengan tenang",
  description:
    "Tagihan otomatis, pengingat sekali ketuk, bukti bayar, dan kwitansi untuk kos 5–30 kamar.",
  openGraph: { title: "KosKita", description: "Kelola kos Anda dengan tenang" },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-dvh">
        {children}
        <Toaster style={{ background: "var(--color-surface)", color: "var(--color-ink)" }} />
      </body>
    </html>
  );
}
