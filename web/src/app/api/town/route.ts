import { loadTown } from "@/server/db";

export const dynamic = "force-dynamic";

// 町丁目キーは '世田谷区|三軒茶屋1丁目' 形式。
// パスに入れるとエンコードが煩雑なのでクエリで受ける。
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  const town = await loadTown(key);
  if (!town) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json(town, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
