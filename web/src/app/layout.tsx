import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "スムピタ — 引越し先の街を、決める前に確かめる",
    template: "%s | スムピタ",
  },
  description:
    "東京23区の町丁目ごとに、治安・洪水・高潮・地盤（液状化）の4つを公的データから点数化。内見では分からない街の条件を地図と一緒に確認できます。",
};

export const viewport: Viewport = {
  themeColor: "#2bb3cd",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
