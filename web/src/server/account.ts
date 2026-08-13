import { getCloudflareContext } from "@opennextjs/cloudflare";

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/**
 * アカウントに紐づく全データ（お気に入り・セッション・OAuth連携・ユーザー本体）を削除する。
 * D1の.batch()は単一トランザクションとして実行されるため、途中失敗で一部だけ
 * 消えた状態にはならない。
 */
export async function deleteAccount(userId: string): Promise<void> {
  const d1 = await db();
  await d1.batch([
    d1.prepare(`DELETE FROM favorites WHERE user_id = ?1`).bind(userId),
    d1.prepare(`DELETE FROM sessions WHERE userId = ?1`).bind(userId),
    d1.prepare(`DELETE FROM accounts WHERE userId = ?1`).bind(userId),
    d1.prepare(`DELETE FROM users WHERE id = ?1`).bind(userId),
  ]);
}
