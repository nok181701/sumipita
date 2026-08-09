"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session?.user) {
    return (
      <button
        onClick={() => signOut()}
        className="rounded-full px-2.5 py-1 text-[11px] text-muted transition-colors hover:bg-aqua-50"
      >
        {session.user.name ?? session.user.email}（ログアウト）
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="rounded-full bg-aqua-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-aqua-600"
    >
      Googleでログイン
    </button>
  );
}
