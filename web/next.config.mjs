/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /machi/[ward]/[town] を3,142件 generateStaticParams で並列にビルドすると
  // ローカルD1（miniflareのシミュレータ）が同時アクセスに耐えられず落ちるため、直列にする。
  experimental: {
    cpus: 1,
  },
  // ビルドIDを固定する。デフォルトは毎ビルドでランダムな値になり、それがR2の
  // incremental cacheのキー（prefix/buildId/hash）に入るため、固定しないと
  // 通常のコードpushのたびにキャッシュの参照先が変わって404の原因になる
  // （populate-machi-cache.ymlで書き込んだキャッシュも通常deployで読めなくなる）。
  // 変更すると既存のR2キャッシュが全部読めなくなるので、変えるときは
  // populate-machi-cache.ymlを再実行すること。
  generateBuildId: async () => "machi-cache-v1",
};

export default nextConfig;

// これが無いと next dev で D1 などのバインディングが使えず、
// 「no such table」のように空のDBを引いたような挙動になる。
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
