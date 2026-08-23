"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { deleteAccount } from "@/app/actions/account";

export default function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("削除に失敗しました。時間をおいて再度お試しください。");
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-card">
      <p className="text-[13px] font-semibold text-ink">退会・アカウント削除</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
        アカウントを削除すると、お気に入りに登録した町丁目情報を含む本サービス内のすべてのデータが完全に削除され、元に戻すことはできません。
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-full border border-line px-4 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-aqua-50"
        >
          退会する
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[12px] font-medium text-ink">
            本当に削除しますか？この操作は取り消せません。
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border border-line px-4 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-aqua-50 disabled:opacity-60"
            >
              {deleting ? "削除中…" : "完全に削除する"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="rounded-full border border-line px-4 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-aqua-50 disabled:opacity-60"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-muted">{error}</p>}
    </div>
  );
}
