/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // buildIdはNext.jsのデフォルト（毎ビルドでランダム）に任せる。
  //
  // 以前はR2 incremental cacheのキー（prefix/buildId/hash）を固定するために
  // buildIdも固定していたが、それだとコードを変えるデプロイをしたときに
  // 「古いビルドのJSチャンクを参照したままのR2キャッシュ」が生き残ってしまい、
  // そのページに新規アクセスが来ると存在しないチャンクを読みに行って
  // クライアント側エラーになる不具合が実際に発生した（chunkのファイル名は
  // ビルドのたびに変わるが、Cloudflare Workersのアセットは各デプロイの
  // 内容に置き換わるため）。
  //
  // buildIdをランダムにすると、デプロイのたびに古いbuildId配下のキャッシュは
  // 誰からも参照されなくなる（新しいbuildIdでしか引かれない）ため、この不整合が
  // 起きなくなる。参照されなくなった古いキャッシュはR2バケットのライフサイクル
  // ルール（30日で自動削除、wrangler r2 bucket lifecycleで設定）に任せて
  // 自然に消える。
};

export default nextConfig;

// これが無いと next dev で D1 などのバインディングが使えず、
// 「no such table」のように空のDBを引いたような挙動になる。
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
