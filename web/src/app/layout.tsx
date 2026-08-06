import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "スムピタ — 東京23区の住みごこちダッシュボード",
  description:
    "東京23区の町丁目ごとに、治安・洪水・高潮・地盤の4つのリスクを公的データから可視化します。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
