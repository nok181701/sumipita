import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import AuthButton from "@/components/AuthButton";
import Logo from "@/components/Logo";
import { scoreColor } from "@/lib/axes";
import { listFavoriteTowns } from "@/server/favorites";

export const metadata: Metadata = {
  title: "お気に入り",
};

export const dynamic = "force-dynamic";

const AXIS_LABELS = [
  { key: "s", label: "治安" },
  { key: "f", label: "洪水" },
  { key: "g", label: "地盤" },
  { key: "t", label: "高潮" },
] as const;

export default async function FavoritesPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <header className="mb-4">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="flex items-baseline gap-2.5">
            <Link href="/" aria-label="すみピタのトップへ">
              <Logo size={32} />
            </Link>
            <span className="text-[12px] text-muted">お気に入り</span>
          </div>
          <AuthButton />
        </div>
      </header>

      {!session?.user && (
        <div className="rounded-card border border-line bg-white p-6 text-center text-[13px] text-muted shadow-card">
          ログインすると、気になる町丁目をお気に入りに登録して後から見返せます。
        </div>
      )}

      {session?.user && <FavoriteList userId={session.user.id} />}
    </div>
  );
}

async function FavoriteList({ userId }: { userId: string }) {
  const towns = await listFavoriteTowns(userId);

  if (towns.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-6 text-center text-[13px] text-muted shadow-card">
        まだお気に入りがありません。
        <br />
        <Link
          href="/"
          className="mt-2 inline-block font-medium text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
        >
          地図で街を探す →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {towns.map((t) => (
        <li key={t.key}>
          {t.slug ? (
            <Link
              href={`/machi/${t.slug.wardSlug}/${t.slug.townSlug}`}
              className="flex items-center justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-card transition-colors hover:bg-aqua-50/60"
            >
              <span className="min-w-0 truncate text-[14px] font-semibold">
                {t.ward}
                <span className="text-aqua-700">{t.town}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {AXIS_LABELS.map(({ key, label }) => {
                  const score = t[key];
                  return (
                    <span
                      key={key}
                      title={`${label}: ${score === null ? "データなし" : Math.round(score)}`}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: scoreColor(score) }}
                    />
                  );
                })}
              </span>
            </Link>
          ) : (
            <div className="rounded-card border border-line bg-white p-4 text-[14px] text-muted shadow-card">
              {t.ward}
              {t.town}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
