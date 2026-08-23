import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import AuthButton from "@/components/AuthButton";
import Logo from "@/components/Logo";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import { getSubscription, isPremiumStatus } from "@/server/subscription";

export const metadata: Metadata = {
  title: "アカウント",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const subscription = session?.user?.id ? await getSubscription(session.user.id) : null;
  const isPremium = isPremiumStatus(subscription?.status);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <header className="mb-4">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="flex items-baseline gap-2.5">
            <Link href="/" aria-label="すみピタのトップへ">
              <Logo size={32} />
            </Link>
            <span className="text-[12px] text-muted">アカウント</span>
          </div>
          <AuthButton />
        </div>
      </header>

      {!session?.user && (
        <div className="rounded-card border border-line bg-white p-6 text-center text-[13px] text-muted shadow-card">
          ログインするとアカウント情報を確認できます。
        </div>
      )}

      {session?.user && (
        <div className="space-y-4">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <p className="text-[12px] text-muted">ログイン中のアカウント</p>
            <p className="mt-1 text-[14px] font-semibold text-ink">
              {session.user.name ?? "名前未設定"}
            </p>
            {session.user.email && (
              <p className="text-[12px] text-muted">{session.user.email}</p>
            )}
          </div>

          <SubscriptionSection
            isLoggedIn
            isPremium={isPremium}
            currentPeriodEnd={subscription?.current_period_end ?? null}
          />

          <DeleteAccountSection />
        </div>
      )}
    </div>
  );
}
