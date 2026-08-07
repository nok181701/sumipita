/**
 * サイト全体で共有するSEO用の定数。
 *
 * ドメインは未確定なので環境変数で差し替えられるようにしている。
 * 決まったら .env.production に NEXT_PUBLIC_SITE_URL を書くだけでよい。
 * canonical / OGP / sitemap がすべてここを見る。
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sumipita.example.com"
).replace(/\/$/, "");

export const SITE_NAME = "スムピタ";

export const SITE_TAGLINE = "引越し先の街を、決める前に確かめる";

/** 検索結果に出る説明文。全角で120字前後に収めている */
export const SITE_DESCRIPTION =
  "東京23区の町丁目ごとに、治安・洪水・高潮・地盤（液状化）の4つを公的データから点数化。" +
  "警視庁の犯罪統計や東京都のハザードマップをもとに、内見では分からない街の条件を地図と一緒に確認できます。";

/**
 * meta keywords。
 * Googleは2009年からランキング要素として使っていないので、ここを厚くしても順位は動かない。
 * 一部の検索エンジンや社内検索、SNSのプレビュー生成が読むことがある程度の位置づけで置いている。
 * 順位を上げたいなら本文と見出しに自然に書くほうが確実。
 */
export const SITE_KEYWORDS = [
  "東京23区",
  "治安",
  "引越し",
  "ハザードマップ",
  "液状化",
  "浸水",
  "高潮",
  "町丁目",
  "住みやすさ",
  "防災",
  "犯罪発生率",
  "地盤",
];

export const OG_IMAGE = "/og.png";
