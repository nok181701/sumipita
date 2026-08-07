import Dashboard from "@/components/Dashboard";
import { loadIndex } from "@/lib/db";

// D1を毎リクエスト引くので静的化しない
export const dynamic = "force-dynamic";

export default async function Page() {
  const meta = await loadIndex();
  return <Dashboard meta={meta} />;
}
