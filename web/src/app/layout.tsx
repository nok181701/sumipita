import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "スムピタ — 引越し先の街を、決める前に確かめる",
  description:
    "東京23区の町丁目ごとに、治安・洪水・高潮・地盤の4つを公的データから可視化。内見では分からない街の条件を、引越しを決める前に確かめられます。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
