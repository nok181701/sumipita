import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import Logo from "@/components/Logo";
import SubscriptionSection from "@/components/SubscriptionSection";
import { getSubscription, isPremiumStatus } from "@/server/subscription";

export const metadata: Metadata = {
  title: "プレミアムプラン",
};

export const dynamic = "force-dynamic";

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <span aria-hidden="true" className="text-aqua-600">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

export default async function PremiumPage() {
  const session = await auth();
  const subscription = session?.user?.id ? await getSubscription(session.user.id) : null;
  const isPremium = isPremiumStatus(subscription?.status);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <header className="mb-4">
        <div className="flex items-baseline gap-2.5">
          <Link href="/" aria-label="すみピタのトップへ">
            <Logo size={32} />
          </Link>
          <span className="text-[12px] text-muted">プレミアムプラン</span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-[13px] font-semibold text-ink">無料</p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink">
            <Check>地図の閲覧・条件比較</Check>
            <Check>町丁目詳細の閲覧（1日20回まで）</Check>
          </ul>
        </div>

        <div className="rounded-card border border-aqua-300 bg-aqua-50/40 p-5 shadow-card">
          <p className="text-[13px] font-semibold text-ink">プレミアム</p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink">
            <Check>地図の閲覧・条件比較</Check>
            <Check>町丁目詳細の閲覧が無制限</Check>
          </ul>
          <p className="mt-3 text-[11px] text-muted">
            料金は登録画面（Stripeの決済画面）でご確認いただけます。
          </p>
        </div>
      </div>

      <div className="mt-4">
        <SubscriptionSection
          isLoggedIn={!!session?.user}
          isPremium={isPremium}
          currentPeriodEnd={subscription?.current_period_end ?? null}
        />
      </div>
    </div>
  );
}
