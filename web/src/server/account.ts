import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cancelStripeSubscriptionForDeletion } from "@/server/subscription";

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/**
 * アカウントに紐づく全データ（サブスク・お気に入り・セッション・OAuth連携・ユーザー本体）を削除する。
 * Stripeの解約はDB削除より先に行う。逆順にすると、DB側のstripe_subscription_idが
 * 消えた後では解約する手段（アカウントもポータルへのアクセスも）がユーザーから失われるため。
 * Stripe側の解約に失敗したらここで例外が投げられ、退会処理自体を中断する（fail closed）。
 * D1の.batch()は単一トランザクションとして実行されるため、途中失敗で一部だけ
 * 消えた状態にはならない。
 */
export async function deleteAccount(userId: string): Promise<void> {
  await cancelStripeSubscriptionForDeletion(userId);

  const d1 = await db();
  await d1.batch([
    d1.prepare(`DELETE FROM favorites WHERE user_id = ?1`).bind(userId),
    d1.prepare(`DELETE FROM subscriptions WHERE user_id = ?1`).bind(userId),
    d1.prepare(`DELETE FROM sessions WHERE userId = ?1`).bind(userId),
    d1.prepare(`DELETE FROM accounts WHERE userId = ?1`).bind(userId),
    d1.prepare(`DELETE FROM users WHERE id = ?1`).bind(userId),
  ]);
}
