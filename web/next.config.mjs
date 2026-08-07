/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cloudflare Pages に静的サイトとして載せる。
  // サーバー側の処理は無く、トップページがビルド時に index.json を読むだけ。
  // 町丁目の詳細は全部ブラウザから /data/*.json を取りにいく構成なので、
  // 静的書き出しで成立する（Workers も Node ランタイムも要らない）。
  output: "export",

  // 静的ホスティングでは /criteria が /criteria/index.html になる。
  // スラッシュの有無でURLが割れると canonical と実際のURLがずれるため、
  // 末尾スラッシュありに寄せる。
  trailingSlash: true,

  // 画像最適化はサーバーが要るので静的書き出しでは使えない
  images: { unoptimized: true },
};

export default nextConfig;
