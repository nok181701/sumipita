"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import SubscriptionSection from "./SubscriptionSection";

type Props = {
  open: boolean;
  onClose: () => void;
  userLabel: string;
  userEmail?: string | null;
  isPremium: boolean;
  currentPeriodEnd: string | null;
};

export default function PlanModal({
  open,
  onClose,
  userLabel,
  userEmail,
  isPremium,
  currentPeriodEnd,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 lg:hidden"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-card border border-line bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{userLabel}</p>
            {userEmail && <p className="truncate text-[11px] text-muted">{userEmail}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 text-[15px] text-muted"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
          <div
            className={`rounded-lg border p-3 ${!isPremium ? "border-aqua-300 bg-aqua-50/40" : "border-line"}`}
          >
            <p className="font-semibold text-ink">無料{!isPremium && "（現在）"}</p>
            <ul className="mt-1.5 space-y-1 leading-relaxed text-ink">
              <li>町丁目詳細 1日20回まで</li>
            </ul>
          </div>
          <div
            className={`rounded-lg border p-3 ${isPremium ? "border-aqua-300 bg-aqua-50/40" : "border-line"}`}
          >
            <p className="font-semibold text-ink">プレミアム{isPremium && "（現在）"}</p>
            <ul className="mt-1.5 space-y-1 leading-relaxed text-ink">
              <li>町丁目詳細 無制限</li>
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <SubscriptionSection
            isLoggedIn
            isPremium={isPremium}
            currentPeriodEnd={currentPeriodEnd}
          />
        </div>

        <div className="mt-4 flex flex-col border-t border-line pt-2 text-[12px]">
          <Link
            href="/favorites"
            onClick={onClose}
            className="py-1.5 text-ink transition-colors hover:text-aqua-600"
          >
            お気に入り
          </Link>
          <Link
            href="/account"
            onClick={onClose}
            className="py-1.5 text-ink transition-colors hover:text-aqua-600"
          >
            アカウント
          </Link>
          <button
            onClick={() => {
              onClose();
              void signOut();
            }}
            className="py-1.5 text-left text-ink transition-colors hover:text-aqua-600"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
