"use client";

import { useState } from "react";
import { openBillingPortal, startCheckout } from "@/app/actions/subscription";
import type { PriceInfo } from "@/server/subscription";

type Props = {
  isPremium: boolean;
  currentPeriodEnd: string | null;
  price?: PriceInfo | null;
};

export default function SubscriptionSection({ isPremium, currentPeriodEnd, price }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (action: () => Promise<string>) => {
    setLoading(true);
    setError(null);
    try {
      window.location.href = await action();
    } catch {
      setError("手続きの開始に失敗しました。時間をおいて再度お試しください。");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-card border border-amber-200 bg-amber-50 p-5 shadow-card">
      <p className="text-[13px] font-semibold text-ink">プレミアムプラン</p>

      {isPremium ? (
        <>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            現在プレミアムプランをご利用中です。
            {currentPeriodEnd &&
              `次回更新日: ${new Date(currentPeriodEnd).toLocaleDateString("ja-JP")}`}
          </p>
          <button
            onClick={() => handle(openBillingPortal)}
            disabled={loading}
            className="mt-3 rounded-full border border-line px-4 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-aqua-50 disabled:opacity-60"
          >
            {loading ? "処理中…" : "支払い管理"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            プレミアムプランに登録すると、町丁目詳細の閲覧が無制限になります。
          </p>
          {price && (
            <p className="mt-2 text-[15px] font-bold text-ink">
              {price.amountLabel}
              {price.intervalLabel && (
                <span className="text-[12px] font-medium text-muted">
                  /{price.intervalLabel}（税込）
                </span>
              )}
            </p>
          )}
          <button
            onClick={() => handle(startCheckout)}
            disabled={loading}
            className="mt-3 rounded-full bg-aqua-500 px-4 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "処理中…" : "プレミアムに登録"}
          </button>
        </>
      )}

      {error && <p className="mt-2 text-[12px] text-bad">{error}</p>}
    </div>
  );
}
