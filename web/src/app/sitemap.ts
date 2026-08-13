import type { MetadataRoute } from "next";
import machiSlugs from "@/lib/machiSlugs.json";

const BASE_URL = "https://sumipita.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const wardUrls: MetadataRoute.Sitemap = Object.values(machiSlugs.wardSlug).map(
    (wardSlug) => ({
      url: `${BASE_URL}/machi/${wardSlug}`,
      changeFrequency: "yearly",
      priority: 0.7,
    }),
  );

  const townUrls: MetadataRoute.Sitemap = Object.entries(machiSlugs.townSlug).map(
    ([key, townSlug]) => {
      const ward = key.split("|")[0];
      const wardSlug = (machiSlugs.wardSlug as Record<string, string>)[ward];
      return {
        url: `${BASE_URL}/machi/${wardSlug}/${townSlug}`,
        changeFrequency: "yearly",
        priority: 0.6,
      };
    },
  );

  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/criteria`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...wardUrls,
    ...townUrls,
  ];
}
