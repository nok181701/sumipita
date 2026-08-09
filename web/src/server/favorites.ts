import { getCloudflareContext } from "@opennextjs/cloudflare";
import { loadIndex } from "@/server/db";
import { slugPathOf } from "@/lib/machiSlugs";
import type { IndexEntry } from "@/lib/types";

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export async function isFavorited(userId: string, key: string): Promise<boolean> {
  const row = await (await db())
    .prepare(`SELECT 1 FROM favorites WHERE user_id = ?1 AND town_key = ?2`)
    .bind(userId, key)
    .first();
  return row !== null;
}

export async function addFavorite(userId: string, key: string): Promise<void> {
  await (await db())
    .prepare(`INSERT OR IGNORE INTO favorites (user_id, town_key) VALUES (?1, ?2)`)
    .bind(userId, key)
    .run();
}

export async function removeFavorite(userId: string, key: string): Promise<void> {
  await (await db())
    .prepare(`DELETE FROM favorites WHERE user_id = ?1 AND town_key = ?2`)
    .bind(userId, key)
    .run();
}

export async function listFavoriteKeys(userId: string): Promise<string[]> {
  const rows = await (await db())
    .prepare(`SELECT town_key FROM favorites WHERE user_id = ?1 ORDER BY created_at DESC`)
    .bind(userId)
    .all<{ town_key: string }>();
  return rows.results.map((r: { town_key: string }) => r.town_key);
}

/** お気に入り登録順（新しい順）で、一覧表示に必要な情報（スコア・リンク用slug）付きで返す */
export async function listFavoriteTowns(userId: string): Promise<IndexEntry[]> {
  const keys = await listFavoriteKeys(userId);
  if (keys.length === 0) return [];

  const { index } = await loadIndex();
  const byKey = new Map(index.map((e) => [e.key, e]));

  return keys
    .map((key) => byKey.get(key))
    .filter((e): e is IndexEntry => e !== undefined)
    .map((e) => ({ ...e, slug: slugPathOf(e.key) }));
}
