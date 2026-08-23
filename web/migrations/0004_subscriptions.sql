-- サブスクリプション（プレミアムプラン）用。0002/0003と同様、DROP TABLEを含めないこと。
-- Stripeのwebhookイベントはuser_idを持たない（checkout.session.completedのclient_reference_idを除く）ため、
-- stripe_customer_id / stripe_subscription_id でも引けるようindexを張る。
-- towns/usersへの外部キーは張らない（このスキーマの既存の慣習に合わせる）。
-- 単一プランのみのため、user_idをそのまま主キーにする（1ユーザー1行）。

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "user_id" text NOT NULL,
  "stripe_customer_id" text NOT NULL,
  "stripe_subscription_id" text,
  "status" text,
  "current_period_end" datetime,
  "created_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_idx" ON "subscriptions" ("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_idx" ON "subscriptions" ("stripe_subscription_id");
