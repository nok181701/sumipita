"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import {
  createBillingPortalSession,
  createCheckoutSession,
  getPriceInfo,
  type PriceInfo,
} from "@/server/subscription";

async function requireUser(): Promise<{ userId: string; email: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) throw new Error("unauthorized");
  return { userId, email };
}

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return "https://sumipita.com";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function startCheckout(): Promise<string> {
  const { userId, email } = await requireUser();
  return createCheckoutSession(userId, email, await baseUrl());
}

export async function openBillingPortal(): Promise<string> {
  const { userId } = await requireUser();
  return createBillingPortalSession(userId, await baseUrl());
}

export async function getPlanPrice(): Promise<PriceInfo> {
  return getPriceInfo();
}
