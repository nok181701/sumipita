import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Cloudflareのbindings/secretsはリクエストスコープでしか取れないため、
// 静的なconfigオブジェクトではなく関数として渡す（DBアクセスと同じパターン。
// src/server/db.ts参照）。
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const { env } = await getCloudflareContext({ async: true });

  return {
    adapter: D1Adapter(env.DB),
    providers: [
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
      }),
    ],
    secret: env.AUTH_SECRET,
  };
});
