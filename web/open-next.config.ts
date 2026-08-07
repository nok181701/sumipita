import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext（@opennextjs/cloudflare）の設定ファイル。
// `opennextjs-cloudflare build`実行時に読み込まれ、Next.jsアプリをCloudflare Workers向けに変換する際の設定を定義する。
// 現在はデフォルト設定のまま（カスタムキャッシュやbinding設定は未追加）。
export default defineCloudflareConfig();
