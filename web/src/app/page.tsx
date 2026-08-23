import Dashboard from "@/components/Dashboard";
import { auth } from "@/auth";
import { loadIndex } from "@/server/db";
import { slugPathOf } from "@/lib/machiSlugs";
import { getSubscription, isPremiumStatus } from "@/server/subscription";

// D1を毎リクエスト引くので静的化しない
export const dynamic = "force-dynamic";

export default async function Page() {
  const [meta, session] = await Promise.all([loadIndex(), auth()]);
  const index = meta.index.map((e) => ({ ...e, slug: slugPathOf(e.key) }));
  const subscription = session?.user?.id ? await getSubscription(session.user.id) : null;

  return (
    <Dashboard
      meta={{ ...meta, index }}
      isPremium={isPremiumStatus(subscription?.status)}
      currentPeriodEnd={subscription?.current_period_end ?? null}
    />
  );
}
