import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isPremium } from "@/server/subscription";

const TOWN_VIEW_LIMIT = 20;
const TOWN_VIEW_WINDOW = "1 d";

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * 詳細閲覧（/api/town）のレート制限。D1では持たず、UpstashのRESTベースRedisを使う
 * （Cloudflare Rate LimitingはIPベース・短時間窓が前提でユーザー単位の日次カウントに向かないため見送った）。
 * 除外リスト・プレミアム会員以外は全員に同じ上限をかける。
 */
async function getLimiter(): Promise<Ratelimit> {
  const { env } = await getCloudflareContext({ async: true });
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(TOWN_VIEW_LIMIT, TOWN_VIEW_WINDOW),
    prefix: "ratelimit:town-view",
  });
}

/**
 * IPは自宅/外出先/モバイル回線で変わり不安定なので、除外はログイン中のメールアドレスで判定する。
 * RATE_LIMIT_EXEMPT_EMAILSはカンマ区切り。未ログインのユーザーは対象外(除外されない)。
 */
function isExemptEmail(email: string | null | undefined, exemptList: string | undefined): boolean {
  if (!email || !exemptList) return false;
  return exemptList
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function checkTownViewLimit(
  ip: string,
  email: string | null | undefined,
  userId: string | null | undefined,
): Promise<LimitResult> {
  const { env } = await getCloudflareContext({ async: true });
  if (isExemptEmail(email, env.RATE_LIMIT_EXEMPT_EMAILS)) {
    return { success: true, limit: TOWN_VIEW_LIMIT, remaining: TOWN_VIEW_LIMIT, reset: 0 };
  }
  if (userId && (await isPremium(userId))) {
    return { success: true, limit: TOWN_VIEW_LIMIT, remaining: TOWN_VIEW_LIMIT, reset: 0 };
  }

  const limiter = await getLimiter();
  return limiter.limit(ip);
}
