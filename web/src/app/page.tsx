import Dashboard from "@/components/Dashboard";
import { loadIndex } from "@/server/db";
import { slugPathOf } from "@/lib/machiSlugs";

// D1を毎リクエスト引くので静的化しない
export const dynamic = "force-dynamic";

export default async function Page() {
  const meta = await loadIndex();
  const index = meta.index.map((e) => ({ ...e, slug: slugPathOf(e.key) }));
  return <Dashboard meta={{ ...meta, index }} />;
}
