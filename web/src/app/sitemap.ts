import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * 町丁目ごとの静的ページを作ったら、ここに3,142件を並べることになる。
 * その場合は sitemap を分割すること（1ファイル50,000URL・50MBの上限がある）。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      // 全文がサーバー側でレンダリングされる唯一のページ。
      // クローラが実際に読める本文はほぼここにある
      url: `${SITE_URL}/criteria`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.8,
    },
  ];
}
