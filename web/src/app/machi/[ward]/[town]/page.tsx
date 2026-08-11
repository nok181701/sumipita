import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import Logo from "@/components/Logo";
import ScoreCard from "@/components/ScoreCard";
import { loadTown, loadAllTowns } from "@/server/db";
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
      description:
        "東京23区3,142町丁目内での相対評価（100に近いほど上位、公的データから算出）",
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "すみピタ", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: data.ward,
        item: `${BASE_URL}/machi/${ward}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${data.ward}${data.town}`,
        item: url,
      },
    ],
  };

  return [place, breadcrumb];
}

// PRERENDER_ALL_MACHI=1 のときだけ全件事前生成する。これはdeploy.ymlの中で
// 「実際にwrangler deployする、まさにそのビルド」に対してのみ付与される。
// 生成に使うビルドと実際にデプロイされるビルドが同一なので、事前生成したHTMLが
// 参照するJSチャンクは必ず実在するものと一致する（過去に生成用ビルドとデプロイ用
// ビルドが別物だったことでチャンク不一致が起きた経緯があるので、分離しないこと）。
// このフラグが立っていない通常のビルド（ローカル開発など）では1件も事前生成しない。
// dynamicParams=trueにより、事前生成されなかったページもアクセス時にD1へ
// 問い合わせて生成し、そのままR2にキャッシュされる（ISRのフォールバック動作）。
export function generateStaticParams() {
  if (process.env.PRERENDER_ALL_MACHI !== "1") return [];
  return Object.entries(machiSlugs.townSlug).map(([key, townSlug]) => {
    const ward = key.split("|")[0];
    const wardSlug = (machiSlugs.wardSlug as Record<string, string>)[ward];
    return { ward: wardSlug, town: townSlug };
  });
}

export const dynamicParams = true;

type Params = { ward: string; town: string };

// PRERENDER_ALL_MACHI=1 の全件ビルド時だけ使う、1回きりの全件取得（db.tsのloadAllTowns参照）。
let allTownsPromise: ReturnType<typeof loadAllTowns> | null = null;

async function getTown({ ward, town }: Params) {
  const key = keyFromSlugs(ward, town);
  if (!key) return null;

  if (process.env.PRERENDER_ALL_MACHI === "1") {
    if (!allTownsPromise) allTownsPromise = loadAllTowns();
    return (await allTownsPromise).get(key) ?? null;
  }

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
    title: `${data.ward}${data.town}の治安・洪水・地盤・高潮`,
    description: `${data.ward}${data.town}を公的データで採点。治安${fmt(safety)}点・洪水${fmt(flood)}点・地盤（液状化）${fmt(ground)}点・高潮${fmt(tide)}点（100点満点、東京23区内の相対評価）。引っ越し前に確認したい街の条件をすみピタで。`,
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
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="flex items-baseline gap-2.5">
            <Link href="/" aria-label="すみピタのトップへ">
              <Logo size={32} />
            </Link>
          </div>
          <AuthButton />
        </div>
        <nav
          aria-label="パンくずリスト"
          className="mt-2 text-[12px] text-muted"
        >
          <Link
            href="/"
            className="text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
          >
            地図で全町丁目を見る
          </Link>
          <span className="mx-1.5">›</span>
          <Link
            href={`/machi/${ward}`}
            className="text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
          >
            {data.ward}
          </Link>
          <span className="mx-1.5">›</span>
          <span>{data.town}</span>
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
