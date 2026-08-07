import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

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
