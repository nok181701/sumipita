import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// output: "export" では、生成タイミングをビルド時に固定する必要がある。
// これが無いと「force-static が設定されていない」でビルドが落ちる。
export const dynamic = "force-static";

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
      // クローラが実際に読める本文はほぼここにある。
      // 末尾スラッシュは trailingSlash:true が生成する canonical と揃えること。
      // ずれると同じページが2つのURLとして扱われる。
      url: `${SITE_URL}/criteria/`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.8,
    },
  ];
}
