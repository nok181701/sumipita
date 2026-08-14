import { auth } from "@/auth";
import { loadTown } from "@/server/db";
import { checkTownViewLimit } from "@/server/rateLimit";

export const dynamic = "force-dynamic";

// 町丁目キーは '世田谷区|三軒茶屋1丁目' 形式。
// パスに入れるとエンコードが煩雑なのでクエリで受ける。
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  // IPベースで制限する（現状ログイン必須ではなく、未ログインでもこのAPIを呼べるため）。
  // ただしRATE_LIMIT_EXEMPT_EMAILSに載っているアカウントでログイン中なら除外する。
  // Upstash側の障害・設定ミスでアプリ本体（詳細閲覧）まで止まらないよう、
  // チェック自体が失敗した場合は制限をかけずに通す（フェイルオープン）。
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const session = await auth();
    const { success, limit, remaining, reset } = await checkTownViewLimit(
      ip,
      session?.user?.email,
    );
    if (!success) {
      return Response.json(
        { error: "rate limited", limit, remaining, reset },
        { status: 429 },
      );
    }
  } catch (err) {
    console.error("rate limit check failed, allowing request", err);
  }

  const town = await loadTown(key);
  if (!town) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json(town, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
