import { auth } from "@/auth";
import { addFavorite, isFavorited, removeFavorite } from "@/server/favorites";
import { slugPathOf } from "@/lib/machiSlugs";

export const dynamic = "force-dynamic";

async function requireUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  const favorited = await isFavorited(userId, key);
  return Response.json(
    { favorited },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { key } = (await request.json().catch(() => ({}))) as { key?: string };
  if (!key || !slugPathOf(key)) {
    return Response.json({ error: "invalid key" }, { status: 400 });
  }

  await addFavorite(userId, key);
  return Response.json({ favorited: true });
}

export async function DELETE(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  await removeFavorite(userId, key);
  return Response.json({ favorited: false });
}
