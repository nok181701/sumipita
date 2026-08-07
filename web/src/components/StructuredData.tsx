import { CRITERIA } from "@/lib/criteria";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import type { Source } from "@/lib/types";

/**
 * 構造化データ（JSON-LD）。
 *
 * 中身は3つ。
 * - WebSite / WebApplication: これが何のサイトかを機械に伝える
 * - Dataset: 公的データを町丁目単位に加工したものなので、データセットとしても成立する。
 *   Googleのデータセット検索に拾われる可能性がある
 * - FAQPage: 判定基準の「何を基準に判定しているか」をそのままQ&Aとして出す。
 *   本文に実在する内容だけを使うこと（無い内容を書くとガイドライン違反になる）
 */
export default function StructuredData({ sources }: { sources: Source[] }) {
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "ja",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: `${SITE_NAME} — ${SITE_TAGLINE}`,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "ReferenceApplication",
      operatingSystem: "Web",
      inLanguage: "ja",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
      featureList: [
        "町丁目単位の治安スコア（警視庁の罪種別認知件数をもとに算出）",
        "洪水・内水の浸水想定（東京都 浸水予想区域図）",
        "高潮の浸水想定（東京都港湾局 高潮浸水想定区域図）",
        "地盤の液状化しやすさ（東京の液状化予測図のボーリング判定）",
        "4軸を切り替えられる町丁目単位のハザードマップ",
      ],
    },
    {
      "@type": "Dataset",
      "@id": `${SITE_URL}/#dataset`,
      name: "東京23区 町丁目別 治安・災害リスクスコア",
      description:
        "東京23区の3,142町丁目について、治安・洪水・高潮・地盤（液状化）の4指標を" +
        "公的統計とGISデータから算出したもの。各スコアは23区内での相対順位（0〜100）。",
      url: SITE_URL,
      inLanguage: "ja",
      license: "https://creativecommons.org/licenses/by/4.0/",
      isAccessibleForFree: true,
      creator: { "@type": "Organization", name: SITE_NAME },
      spatialCoverage: {
        "@type": "Place",
        name: "東京都区部",
        address: { "@type": "PostalAddress", addressRegion: "東京都", addressCountry: "JP" },
      },
      variableMeasured: CRITERIA.map((c) => ({
        "@type": "PropertyValue",
        name: c.label,
        description: c.summary,
      })),
      isBasedOn: sources.map((s) => ({
        "@type": "CreativeWork",
        name: s.name,
        url: s.url,
        license: s.license,
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: CRITERIA.map((c) => ({
        "@type": "Question",
        name: `${c.label}は、何を基準に判定しているか`,
        acceptedAnswer: {
          "@type": "Answer",
          // ページ本文（判定基準セクション）と同じ内容にしておく
          text: `${c.summary} ${c.howTo.join(" ")}`,
        },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      // JSON-LD は React に文字列として渡す。ここに入るのは自前の定数だけ
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
