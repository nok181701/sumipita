import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// OpenNext（@opennextjs/cloudflare）の設定ファイル。
// `opennextjs-cloudflare build`実行時に読み込まれ、Next.jsアプリをCloudflare Workers向けに変換する際の設定を定義する。
//
// /machi/[ward]/[town] のSSGページ本体をR2（wrangler.jsonc の NEXT_INC_CACHE_R2_BUCKET）に
// 保存する。これが無いとビルド時に生成した静的HTMLの置き場所が無く、本番で404になる
// （実際に一度これで本番が壊れた）。revalidateTag/revalidatePathは使っていないのでtag cacheは未設定。
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
