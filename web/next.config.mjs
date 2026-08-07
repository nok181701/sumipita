/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;

// これが無いと next dev で D1 などのバインディングが使えず、
// 「no such table」のように空のDBを引いたような挙動になる。
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
