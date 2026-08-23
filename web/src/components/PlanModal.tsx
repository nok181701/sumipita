"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DeleteAccountSection from "./DeleteAccountSection";
import SubscriptionSection from "./SubscriptionSection";
import UserAvatar from "./UserAvatar";

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 transition-opacity duration-200 lg:px-4 ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={onClose}
    >
      <div
        className={`relative max-h-[85vh] w-full max-w-sm overflow-hidden rounded-card bg-white shadow-card transition-all duration-200 ease-out lg:max-w-md ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-line/60 text-[13px] text-ink"
        >
          ✕
        </button>

        <div className="max-h-[85vh] overflow-y-auto p-5">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-aqua-50 to-aqua-100/60 p-4">
            <UserAvatar size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-ink">
                {userLabel}
              </p>
              {userEmail && (
                <p className="truncate text-[11px] text-muted">{userEmail}</p>
              )}
              <span className="mt-1.5 inline-block rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-aqua-700">
                {isPremium ? "プレミアム" : "無料プラン"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
            <div
              className={`rounded-2xl p-3 ${!isPremium ? "bg-aqua-50" : "bg-line/40"}`}
            >
              <p className="font-semibold text-ink">
                無料プラン{!isPremium && "（現在）"}
              </p>
              <ul className="mt-1.5 space-y-1 leading-relaxed text-ink">
                <li>
                  町丁目の詳細を1日<strong className="font-bold">20</strong>
                  回まで見られます
                </li>
              </ul>
            </div>
            <div
              className={`rounded-2xl p-3 ${isPremium ? "bg-aqua-50" : "bg-line/40"}`}
            >
              <p className="font-semibold text-ink">
                プレミアムプラン{isPremium && "（現在）"}
              </p>
              <ul className="mt-1.5 space-y-1 leading-relaxed text-ink">
                <li>
                  町丁目の詳細を<strong className="font-bold">無制限</strong>
                  に見られます
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <SubscriptionSection
              isPremium={isPremium}
              currentPeriodEnd={currentPeriodEnd}
            />
          </div>

          <p className="mb-2 mt-5 text-[11px] font-semibold text-muted">
            アカウント
          </p>
          <div className="overflow-hidden rounded-2xl border border-line">
            <Link
              href="/favorites"
              onClick={onClose}
              className="flex items-center justify-between px-4 py-3 text-[13px] text-ink transition-colors hover:bg-aqua-50/60"
            >
              お気に入り
              <span className="text-muted">›</span>
            </Link>
            <button
              onClick={() => {
                onClose();
                void signOut();
              }}
              className="flex w-full items-center justify-between border-t border-line px-4 py-3 text-left text-[13px] text-ink transition-colors hover:bg-aqua-50/60"
            >
              ログアウト
              <span className="text-muted">›</span>
            </button>
          </div>

          <div className="mt-4">
            <DeleteAccountSection />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
