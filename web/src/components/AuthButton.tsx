"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import PlanModal from "./PlanModal";
import UserAvatar from "./UserAvatar";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

const isDev = process.env.NODE_ENV !== "production";

function DevLoginForm() {
  const [email, setEmail] = useState("dev@example.com");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email) void signIn("dev-login", { email });
      }}
      className="flex items-center gap-1"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="relative -translate-y-2 w-32 rounded-full border border-dashed border-line px-2.5 py-1.5 text-[11px] text-ink"
      />
      <button
        type="submit"
        className="relative -translate-y-2 rounded-full border border-dashed border-line px-3 py-1.5 text-[11px] font-medium text-muted"
      >
        開発ログイン
      </button>
    </form>
  );
}

type Props = {
  compact?: boolean;
  isPremium?: boolean;
  currentPeriodEnd?: string | null;
};

export default function AuthButton({
  compact = false,
  isPremium = false,
  currentPeriodEnd = null,
}: Props) {
  const { data: session, status } = useSession();
  const [modalOpen, setModalOpen] = useState(false);

  if (status === "loading") {
    return (
      <div
        className={
          compact
            ? "h-8 w-8 animate-pulse rounded-full bg-aqua-100"
            : "h-7 w-7 animate-pulse rounded-full bg-aqua-100"
        }
      />
    );
  }

  if (session?.user) {
    const label = session.user.name ?? session.user.email ?? "";

    if (compact) {
      return (
        <>
          <button
            onClick={() => setModalOpen(true)}
            aria-label={`${label}のプランを見る`}
            className="relative flex h-8 w-8 shrink-0 -translate-y-0.5 items-center justify-center rounded-full"
          >
            <UserAvatar size={32} />
          </button>
          <PlanModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            userLabel={label}
            userEmail={session.user.email}
            isPremium={isPremium}
            currentPeriodEnd={currentPeriodEnd}
          />
        </>
      );
    }

    return (
      <div className="relative -translate-y-2">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-[11px] font-medium text-ink transition-colors hover:bg-aqua-50"
        >
          <UserAvatar size={24} />
          <span className="max-w-[7rem] truncate">{label}</span>
        </button>
        <PlanModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          userLabel={label}
          userEmail={session.user.email}
          isPremium={isPremium}
          currentPeriodEnd={currentPeriodEnd}
        />
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={() => signIn("google")}
        className="relative flex h-8 -translate-y-0.5 items-center rounded-xl bg-gray-100/80 px-4 text-xs font-extrabold text-ink transition-colors hover:bg-gray-100"
      >
        ログイン
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isDev && <DevLoginForm />}
      <button
        onClick={() => signIn("google")}
        className="relative flex -translate-y-2 items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink shadow-sm transition-shadow hover:shadow-card"
      >
        <GoogleIcon />
        Googleでログイン
      </button>
    </div>
  );
}
