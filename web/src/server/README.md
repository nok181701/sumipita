# server/

Worker上でしか動かないコードを置く。

D1バインディングは `getCloudflareContext()` 経由でしか取れないため、
ここのモジュールをクライアントコンポーネントから import するとビルドが壊れる。
`src/lib/` はクライアントからも使う純粋なロジック（型・スコアの色分けなど）。

- `db.ts` — D1へのクエリ。Server Component と API ルートからのみ呼ぶ
