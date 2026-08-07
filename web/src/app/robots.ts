import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// output: "export" では、生成タイミングをビルド時に固定する必要がある。
// これが無いと「force-static が設定されていない」でビルドが落ちる。
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // スコアのJSONは中身が公開データそのものなので拒否はしないが、
        // 検索結果に生JSONが並んでも役に立たないのでクロールから外す
        disallow: ["/data/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
