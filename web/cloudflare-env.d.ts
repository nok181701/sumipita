// wrangler.jsonc のバインディングに対応する型。
// バインディングを足したらここにも追記すること。
declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    AUTH_GOOGLE_ID: string;
    AUTH_GOOGLE_SECRET: string;
    AUTH_SECRET: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    RATE_LIMIT_EXEMPT_EMAILS: string;
  }
}

interface CloudflareEnv extends Cloudflare.Env {}
