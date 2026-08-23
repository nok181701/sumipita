import { getCloudflareContext } from "@opennextjs/cloudflare";
import Stripe from "stripe";

export type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/**
 * current_period_endはSubscription本体ではなく各Subscription Item側にある
 * （Stripeの比較的新しいAPIバージョンでの仕様）。単一プランで1 item前提のため先頭を見る。
 */
function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

async function stripeClient() {
  const { env } = await getCloudflareContext({ async: true });
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const row = await (await db())
    .prepare(`SELECT * FROM subscriptions WHERE user_id = ?1`)
    .bind(userId)
    .first<SubscriptionRow>();
  return row ?? null;
}

export function isPremiumStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export async function isPremium(userId: string): Promise<boolean> {
  const row = await getSubscription(userId);
  return isPremiumStatus(row?.status);
}

/**
 * 既存customerがいれば使い回し、いなければcustomer_emailでStripeに新規作成させる
 * （正式なcustomer_idの記録はcheckout.session.completedのwebhookで行う）。
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  baseUrl: string,
): Promise<string> {
  const existing = await getSubscription(userId);
  const stripe = await stripeClient();
  const { env } = await getCloudflareContext({ async: true });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: userId,
    ...(existing?.stripe_customer_id
      ? { customer: existing.stripe_customer_id }
      : { customer_email: email }),
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${baseUrl}/?checkout=success`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
  });
  if (!session.url) throw new Error("stripe checkout session has no url");
  return session.url;
}

export async function createBillingPortalSession(userId: string, baseUrl: string): Promise<string> {
  const sub = await getSubscription(userId);
  if (!sub?.stripe_customer_id) throw new Error("no stripe customer for user");
  const stripe = await stripeClient();
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: baseUrl,
  });
  return portal.url;
}

/**
 * checkout.session.completed webhook専用。session.subscriptionは未展開のことがあるため、
 * 正式なstatus/current_period_endはsubscriptions.retrieveで取り直す。
 */
export async function recordCheckoutCompleted(
  userId: string,
  checkoutSession: Stripe.Checkout.Session,
): Promise<void> {
  const customerId =
    typeof checkoutSession.customer === "string"
      ? checkoutSession.customer
      : checkoutSession.customer?.id;
  const subscriptionId =
    typeof checkoutSession.subscription === "string"
      ? checkoutSession.subscription
      : checkoutSession.subscription?.id;
  if (!customerId || !subscriptionId) {
    console.error("checkout.session.completed missing customer/subscription", checkoutSession.id);
    return;
  }

  const stripe = await stripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = subscriptionPeriodEnd(subscription);

  await (await db())
    .prepare(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         stripe_customer_id = excluded.stripe_customer_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         status = excluded.status,
         current_period_end = excluded.current_period_end,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(userId, customerId, subscriptionId, subscription.status, periodEnd)
    .run();
}

/**
 * customer.subscription.updated/deleted webhook専用。stripe_customer_idをキーに更新する。
 * 0件更新でもエラーにしない — checkout.session.completedより先にこのイベントが届く
 * 順序前後のケースがあり得るが、そちらの処理で行が作られた時点で自己修復する。
 */
export async function syncSubscriptionFromStripeObject(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const periodEnd = subscriptionPeriodEnd(subscription);

  const result = await (await db())
    .prepare(
      `UPDATE subscriptions SET status = ?1, current_period_end = ?2, stripe_subscription_id = ?3, updated_at = CURRENT_TIMESTAMP WHERE stripe_customer_id = ?4`,
    )
    .bind(subscription.status, periodEnd, subscription.id, customerId)
    .run();

  if (result.meta.changes === 0) {
    console.warn(
      "subscription update for unknown stripe_customer_id (may arrive before checkout.session.completed)",
      customerId,
    );
  }
}

/**
 * 退会時にStripe側を解約する。resource_missing（Stripe側で既に消えている）以外の
 * エラーは呼び出し元に投げ、退会処理自体を中断させる（先にDBだけ消すと解約手段が失われるため）。
 */
export async function cancelStripeSubscriptionForDeletion(userId: string): Promise<void> {
  const sub = await getSubscription(userId);
  if (!sub?.stripe_subscription_id || sub.status === "canceled") return;

  const stripe = await stripeClient();
  try {
    await stripe.subscriptions.cancel(sub.stripe_subscription_id);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError && err.code === "resource_missing") return;
    throw err;
  }
}
