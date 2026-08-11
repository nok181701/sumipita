import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import Logo from "@/components/Logo";
import { loadIndex } from "@/server/db";
import { slugPathOf } from "@/lib/machiSlugs";
import { scoreColor } from "@/lib/axes";
import machiSlugs from "@/lib/machiSlugs.json";
import type { IndexEntry } from "@/lib/types";

const BASE_URL = "https://sumipita.com";

type WardTown = IndexEntry & { slug: ReturnType<typeof slugPathOf> };

const wardBySlug: Record<string, string> = Object.fromEntries(
  Object.entries(machiSlugs.wardSlug).map(([ward, slug]) => [slug, ward]),
);

// /machi/[ward]/[town] と同じ理由で、通常デプロイのビルドはD1につながる
// ローカルD1（miniflareのシミュレータ）を用意していないため空リストを返す
// （POPULATE_MACHI_CACHE=1 のときだけ全件事前生成し、R2キャッシュへ書き込む）。
// それ以外は dynamicParams=true により初回アクセス時にD1へ問い合わせて生成し、
// そのままR2に積まれる。
export function generateStaticParams() {
  if (process.env.POPULATE_MACHI_CACHE !== "1") return [];
  return Object.values(machiSlugs.wardSlug).map((wardSlug) => ({ ward: wardSlug }));
}

export const dynamicParams = true;

type Params = { ward: string };

// ビルド中に23ページぶんそれぞれがD1へ問い合わせると無駄なので、1回だけ取得してメモリ上から引く
let indexPromise: ReturnType<typeof loadIndex> | null = null;
async function getIndex() {
  if (!indexPromise) indexPromise = loadIndex();
  return indexPromise;
}

async function getWardTowns(wardSlug: string) {
  const ward = wardBySlug[wardSlug];
  if (!ward) return null;
  const { index } = await getIndex();
  const towns = index
    .filter((e) => e.ward === ward)
    .map((e) => ({ ...e, slug: slugPathOf(e.key) }));
  if (towns.length === 0) return null;
  return { ward, towns };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { ward: wardSlug } = await params;
  const data = await getWardTowns(wardSlug);
  if (!data) return {};

  return {
    title: `${data.ward}の町丁目一覧`,
    description: `${data.ward}内${data.towns.length}町丁目の治安・洪水・地盤（液状化）・高潮スコアを町丁目ごとに一覧で確認。公的データから算出しています。`,
    alternates: {
      canonical: `/machi/${wardSlug}`,
    },
  };
}

function buildJsonLd(ward: string, wardSlug: string, towns: WardTown[]) {
  const url = `${BASE_URL}/machi/${wardSlug}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "すみピタ", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: ward, item: url },
    ],
  };

  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${ward}の町丁目一覧`,
    itemListElement: towns.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${t.ward}${t.town}`,
      url: t.slug ? `${BASE_URL}/machi/${wardSlug}/${t.slug.townSlug}` : url,
    })),
  };

  return [breadcrumb, list];
}

function ScoreCell({ value }: { value: number | null }) {
  return (
    <td
      className="tabular-nums px-2 py-1.5 text-right text-[12.5px] font-semibold"
      style={{ color: scoreColor(value) }}
    >
      {value === null ? "—" : Math.round(value)}
    </td>
  );
}

export default async function WardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { ward: wardSlug } = await params;
  const data = await getWardTowns(wardSlug);
  if (!data) notFound();

  const { ward, towns } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      {buildJsonLd(ward, wardSlug, towns).map((jsonLd, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      <header className="mb-4">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="flex items-baseline gap-2.5">
            <Link href="/" aria-label="すみピタのトップへ">
              <Logo size={32} />
            </Link>
            <span className="text-[12px] text-muted">東京23区・町丁目単位</span>
          </div>
          <AuthButton />
        </div>
        <nav aria-label="パンくずリスト" className="mt-2 text-[12px] text-muted">
          <Link
            href="/"
            className="text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
          >
            地図で全町丁目を見る
          </Link>
          <span className="mx-1.5">›</span>
          <span>{ward}</span>
        </nav>
      </header>

      <div className="rounded-card border border-line bg-white p-5 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight">{ward}の町丁目一覧</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          {ward}には{towns.length}の町丁目があります。同じ区の中でも、隣り合う町丁目でスコアが大きく異なるため、
          区としての平均点は出していません。気になる町丁目を選んで確認してください。
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line text-[11px] text-muted">
                <th className="px-2 py-1.5 text-left font-medium">町丁目</th>
                <th className="px-2 py-1.5 text-right font-medium">治安</th>
                <th className="px-2 py-1.5 text-right font-medium">洪水</th>
                <th className="px-2 py-1.5 text-right font-medium">地盤</th>
                <th className="px-2 py-1.5 text-right font-medium">高潮</th>
              </tr>
            </thead>
            <tbody>
              {towns.map((t) => (
                <tr key={t.key} className="border-b border-line/70 last:border-0">
                  <td className="px-2 py-1.5 text-[12.5px]">
                    {t.slug ? (
                      <Link
                        href={`/machi/${wardSlug}/${t.slug.townSlug}`}
                        className="text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
                      >
                        {t.town}
                      </Link>
                    ) : (
                      t.town
                    )}
                  </td>
                  <ScoreCell value={t.s} />
                  <ScoreCell value={t.f} />
                  <ScoreCell value={t.g} />
                  <ScoreCell value={t.t} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          点数は23区3,142町丁目の中での相対的な位置です（100に近いほど上位、—はデータなし・対象区域外）。
          各軸の見方は
          <Link
            href="/criteria"
            className="text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
          >
            判定基準
          </Link>
          で説明しています。
        </p>
      </div>
    </div>
  );
}
