import Link from "next/link";
import type { Metadata } from "next";
import CriteriaSection from "@/components/CriteriaSection";

export const metadata: Metadata = {
  title: "判定基準 — スムピタ",
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
        <CriteriaSection />
      </div>
    </div>
  );
}
