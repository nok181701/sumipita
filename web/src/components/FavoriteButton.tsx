"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.2c-.25 0-.5-.08-.7-.24C6.6 16.3 3.5 13.4 3.5 9.9 3.5 7.2 5.6 5 8.3 5c1.5 0 2.9.7 3.7 1.9C12.8 5.7 14.2 5 15.7 5c2.7 0 4.8 2.2 4.8 4.9 0 3.5-3.1 6.4-7.8 10.06-.2.16-.45.24-.7.24Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FavoriteButton({ townKey }: { townKey: string }) {
  const { status } = useSession();
  const [favorited, setFavorited] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch(`/api/favorites?key=${encodeURIComponent(townKey)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { favorited: boolean } | null) => {
        if (!cancelled && data) setFavorited(data.favorited);
      });
    return () => {
      cancelled = true;
    };
  }, [status, townKey]);

  if (status === "loading") {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-aqua-100" />;
  }

  if (status !== "authenticated") {
    return (
      <button
        onClick={() => signIn("google")}
        aria-label="お気に入り登録するにはログインしてください"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-aqua-50 hover:text-aqua-600"
      >
        <HeartIcon filled={false} />
      </button>
    );
  }

  const toggle = async () => {
    const next = !favorited;
    setFavorited(next);
    try {
      const res = next
        ? await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: townKey }),
          })
        : await fetch(`/api/favorites?key=${encodeURIComponent(townKey)}`, {
            method: "DELETE",
          });
      if (!res.ok) throw new Error("failed");
      showToast(next ? "お気に入りに追加しました" : "お気に入りを解除しました");
    } catch {
      setFavorited(!next);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={favorited ? "お気に入りから外す" : "お気に入りに登録"}
        aria-pressed={favorited ?? false}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-aqua-50 ${
          favorited ? "text-aqua-600" : "text-muted hover:text-aqua-600"
        }`}
      >
        <HeartIcon filled={favorited === true} />
      </button>

      {toast && (
        <span
          role="status"
          className="pointer-events-none absolute right-0 top-[calc(100%+4px)] z-50 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[11px] font-medium text-white shadow-card"
        >
          {toast}
        </span>
      )}
    </div>
  );
}
