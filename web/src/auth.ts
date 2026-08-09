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
    // Cloudflare Workers はCloudflare自体のプロキシ越しに来るため、Auth.jsが
    // リクエストのHostヘッダを自動では信用しない（UntrustedHostエラーになる）。
    // ドメインはこちらのWorker/DNS側で確定しているので明示的に信頼する。
    trustHost: true,
    // database戦略（アダプタ利用時）はデフォルトだとsession.user.idが落ちるため明示する。
    // お気に入り機能などユーザーIDでD1を引く処理に必要。
    callbacks: {
      session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
  };
});
