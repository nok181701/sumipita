import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const isDev = process.env.NODE_ENV !== "production";

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
      // ローカル開発専用のログイン。本番ビルドには含まれない。
      ...(isDev
        ? [
            Credentials({
              id: "dev-login",
              name: "開発用ログイン",
              credentials: {
                email: { label: "メールアドレス", type: "email" },
              },
              async authorize(credentials) {
                const email = String(credentials?.email ?? "").trim();
                if (!email) return null;

                const existing = await env.DB.prepare(
                  `SELECT * FROM users WHERE email = ?1`,
                )
                  .bind(email)
                  .first<{ id: string; name: string | null; email: string; image: string | null }>();
                if (existing) return existing;

                const id = crypto.randomUUID();
                const name = email.split("@")[0];
                await env.DB.prepare(
                  `INSERT INTO users (id, email, name) VALUES (?1, ?2, ?3)`,
                )
                  .bind(id, email, name)
                  .run();
                return { id, email, name };
              },
            }),
          ]
        : []),
    ],
    secret: env.AUTH_SECRET,
    // Credentialsプロバイダーを使う場合、Auth.jsの仕様上セッションはjwt戦略が必須。
    // 本番はCredentialsを使わないのでdatabase戦略のまま(挙動を変えない)。
    session: { strategy: isDev ? "jwt" : "database" },
    // Cloudflare Workers はCloudflare自体のプロキシ越しに来るため、Auth.jsが
    // リクエストのHostヘッダを自動では信用しない(UntrustedHostエラーになる)。
    // ドメインはこちらのWorker/DNS側で確定しているので明示的に信頼する。
    trustHost: true,
    // database戦略(アダプタ利用時)はデフォルトだとsession.user.idが落ちるため明示する。
    // お気に入り機能などユーザーIDでD1を引く処理に必要。
    // jwt戦略(ローカル開発時)ではuserの代わりにtokenからidを補う。
    callbacks: {
      jwt({ token, user }) {
        if (user) token.id = user.id;
        return token;
      },
      session({ session, user, token }) {
        session.user.id = user?.id ?? (token?.id as string);
        return session;
      },
    },
  };
});
