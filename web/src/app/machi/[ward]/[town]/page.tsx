import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import ScoreCard from "@/components/ScoreCard";
import { loadTown } from "@/server/db";
import { keyFromSlugs } from "@/lib/machiSlugs";
import machiSlugs from "@/lib/machiSlugs.json";
import { buildAxisViews } from "@/lib/axes";
import type { Town } from "@/lib/types";

const BASE_URL = "https://sumipita.com";

/**
 * Rating/AggregateRatingは使わない。Googleのガイドラインでは実際のユーザーレビュー専用で、
 * 自己算出したスコアに流用するとスパム扱いされ得るため、汎用のPropertyValueで持たせる。
 */
function buildJsonLd(data: Town, ward: string, town: string) {
  const url = `${BASE_URL}/machi/${ward}/${town}`;
  const scoredAxes = buildAxisViews(data).filter((v) => v.score !== null);

  const place = {
    "@context": "https://schema.org",
    "@type": "AdministrativeArea",
    name: `${data.ward}${data.town}`,
    url,
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: data.ward,
    },
    additionalProperty: scoredAxes.map((v) => ({
      "@type": "PropertyValue",
      name: `${v.label}スコア`,
      value: Math.round(v.score as number),
      minValue: 0,
      maxValue: 100,
      description: "東京23区3,142町丁目内での相対評価（100に近いほど上位、公的データから算出）",
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "スムピタ", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: `${data.ward}${data.town}`, item: url },
    ],
  };

  return [place, breadcrumb];
}

// 町丁目は年1回のデータ更新以外で増減しないので、ビルド時に全件静的出力する。
// R2（open-next.config.ts の incrementalCache）にビルド時生成したHTMLをデプロイ時に
// 書き込むことで配信する。CIでは `Build` の前にローカルD1へ seed/data.sql を
// 流し込んでいる（deploy.yml の "Seed local D1 for build" ステップ、本番Remote D1には触れない）。
export function generateStaticParams() {
  return Object.entries(machiSlugs.townSlug).map(([key, townSlug]) => {
    const ward = key.split("|")[0];
    const wardSlug = (machiSlugs.wardSlug as Record<string, string>)[ward];
    return { ward: wardSlug, town: townSlug };
  });
}

// 上記で全件列挙しているので、未列挙のパスは即404にする
export const dynamicParams = false;

type Params = { ward: string; town: string };

async function getTown({ ward, town }: Params) {
  const key = keyFromSlugs(ward, town);
  if (!key) return null;
  return loadTown(key);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { ward, town } = await params;
  const data = await getTown({ ward, town });
  if (!data) return {};

  const fmt = (v: number | null) => (v === null ? "—" : Math.round(v));
  const { safety, flood, tide, ground } = data.scores;

  return {
    title: `${data.ward}${data.town}の治安・洪水・高潮・地盤`,
    description: `${data.ward}${data.town}を公的データで採点。治安${fmt(safety)}点・洪水${fmt(flood)}点・高潮${fmt(tide)}点・地盤（液状化）${fmt(ground)}点（100点満点、東京23区内の相対評価）。引っ越し前に確認したい街の条件をスムピタで。`,
    alternates: {
      canonical: `/machi/${ward}/${town}`,
    },
  };
}

export default async function TownPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { ward, town } = await params;
  const data = await getTown({ ward, town });
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      {buildJsonLd(data, ward, town).map((jsonLd, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      <header className="mb-4">
        <div className="flex items-baseline gap-2.5">
          <Link href="/" aria-label="スムピタのトップへ">
            <Logo size={32} />
          </Link>
          <span className="text-[12px] text-muted">東京23区・町丁目単位</span>
        </div>
        <nav aria-label="パンくずリスト" className="mt-2 text-[12px] text-muted">
          <Link
            href="/"
            className="text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
          >
            地図で全町丁目を見る
          </Link>
          <span className="mx-1.5">›</span>
          <span>
            {data.ward}
            {data.town}
          </span>
        </nav>
      </header>

      <ScoreCard town={data} headingLevel="h1" />

      <div className="mt-4 rounded-card border border-line bg-white p-4 text-center shadow-card">
        <Link
          href="/"
          className="text-[13px] font-medium text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
        >
          ← 地図で他の街を探す
        </Link>
      </div>
    </div>
  );
}
