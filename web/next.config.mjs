/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /machi/[ward]/[town] を3,142件 generateStaticParams で並列にビルドすると
  // ローカルD1（miniflareのシミュレータ）が同時アクセスに耐えられず落ちるため、直列にする。
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;

// これが無いと next dev で D1 などのバインディングが使えず、
// 「no such table」のように空のDBを引いたような挙動になる。
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
