import type { MetadataRoute } from "next";
import machiSlugs from "@/lib/machiSlugs.json";

const BASE_URL = "https://sumipita.com";

export default function sitemap(): MetadataRoute.Sitemap {
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
    ...townUrls,
  ];
}
