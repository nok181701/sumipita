import Link from "next/link";
import type { Metadata } from "next";
import CriteriaSection from "@/components/CriteriaSection";
import { OG_IMAGE } from "@/lib/site";

// layout.tsx の title.template が「%s | スムピタ」なので、
// ここでサイト名まで書くと「判定基準 — スムピタ | スムピタ」になる。ページ名だけ渡すこと。
export const metadata: Metadata = {
  title: "判定基準 — 治安・洪水・高潮・地盤のスコアの出し方",
  description:
    "スムピタの4つのスコアが何を数え、何を数えていないかの全文。治安は強盗・暴行・住宅侵入窃盗を重視して万引きや詐欺を除外、" +
    "洪水と高潮は浸水想定区域の面積割合×平均浸水深、地盤はボーリング調査のPL判定を使っています。出典と注意点も記載。",
  alternates: { canonical: "/criteria" },
  openGraph: {
    type: "article",
    url: "/criteria",
    title: "判定基準 — 治安・洪水・高潮・地盤のスコアの出し方 | スムピタ",
    description:
      "4つのスコアが何を数え、何を数えていないか。使っている公的データと、読むときの注意点をすべて書いています。",
    // openGraph を書くと親の設定が丸ごと差し替わるので、画像は明示し直す必要がある
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
};

export default function CriteriaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <Link
        href="/"
        className="text-[13px] text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
      >
        ← 地図に戻る
      </Link>
      <div className="mt-4">
        <CriteriaSection heading="h1" />
      </div>
    </div>
  );
}
