// wrangler.jsonc のバインディングに対応する型。
// バインディングを足したらここにも追記すること。
declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
  }
}

interface CloudflareEnv extends Cloudflare.Env {}
