"use server";

import { auth } from "@/auth";
import { deleteAccount as deleteAccountRow } from "@/server/account";

export async function deleteAccount(): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("unauthorized");

  await deleteAccountRow(userId);
}
