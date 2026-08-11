"use server";

import { auth } from "@/auth";
import { addFavorite, isFavorited, removeFavorite } from "@/server/favorites";
import { slugPathOf } from "@/lib/machiSlugs";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("unauthorized");
  return userId;
}

export async function getFavorited(key: string): Promise<boolean> {
  const userId = await requireUserId();
  return isFavorited(userId, key);
}

export async function setFavorited(key: string, favorited: boolean): Promise<boolean> {
  const userId = await requireUserId();
  if (!slugPathOf(key)) throw new Error("invalid key");

  if (favorited) {
    await addFavorite(userId, key);
  } else {
    await removeFavorite(userId, key);
  }
  return favorited;
}
