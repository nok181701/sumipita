import raw from "./machiSlugs.json";

/**
 * 区名・町丁目名 と URLスラッグ（ローマ字）の対応表。
 *
 * geolonia/japanese-addresses（CC BY 4.0、国交省「位置参照情報」がもと）の
 * ローマ字表記から機械生成。町丁目の追加・削除がない限り作り直す必要はない
 * （東京23区の町丁目は年1回のデータ更新でも増減しない前提）。
 */

type SlugData = {
  wardSlug: Record<string, string>;
  townSlug: Record<string, string>;
};

const data = raw as SlugData;

const wardBySlug: Record<string, string> = Object.fromEntries(
  Object.entries(data.wardSlug).map(([ward, slug]) => [slug, ward]),
);

/** "setagaya|sangenjaya-1" → "世田谷区|三軒茶屋1丁目" */
const keyBySlugPath: Record<string, string> = Object.fromEntries(
  Object.entries(data.townSlug).map(([key, townSlug]) => {
    const ward = key.split("|")[0];
    return [`${data.wardSlug[ward]}|${townSlug}`, key];
  }),
);

/** ward → "setagaya" */
export function wardSlugOf(ward: string): string | undefined {
  return data.wardSlug[ward];
}

/** key（"世田谷区|三軒茶屋1丁目"）→ { wardSlug, townSlug }（/machi/[ward]/[town] へのリンク生成用） */
export function slugPathOf(key: string): { wardSlug: string; townSlug: string } | null {
  const [ward] = key.split("|");
  const wardSlug = data.wardSlug[ward];
  const townSlug = data.townSlug[key];
  if (!wardSlug || !townSlug) return null;
  return { wardSlug, townSlug };
}

/** "setagaya" + "sangenjaya-1" → "世田谷区|三軒茶屋1丁目"（ルートでのlookup用） */
export function keyFromSlugs(wardSlug: string, townSlug: string): string | null {
  if (!wardBySlug[wardSlug]) return null;
  return keyBySlugPath[`${wardSlug}|${townSlug}`] ?? null;
}
