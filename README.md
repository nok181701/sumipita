# スムピタ

東京23区の町丁目ごとに治安・洪水・高潮・地盤（液状化）を可視化する引越し先リサーチダッシュボード。

設計判断は [`machi-project-plan.md`](machi-project-plan.md) の「設計上の約束ごと」参照。

## 構成

```
etl/        ETLスクリプト一式（生データ → cache/ → dist/ → web/migrations, web/seed）
cache/      ETL中間・最終成果物（コミット済み）
web/        Next.js フロントエンド
```

## セットアップ

```bash
python3 -m venv .venv
source .venv/bin/activate       # fishなら activate.fish
python3 -m pip install -r requirements.txt
```

生データは `data/` に置く（CC BY・再配布不可なので各自ダウンロード）。配置ファイル名は
`etl/paths.py`、取得元URLは `machi-project-plan.md` 参照。`SUMIPITA_DATA` で置き場所を変更可。

## 実行

```bash
python3 etl/combine_scores.py                # スコア算出 → cache/
python3 etl/export_d1.py [--rebuild]         # D1用CSV + GeoJSON → dist/
python3 etl/make_schema.py                    # migrations/, seed/data.sql を生成
python3 etl/build_web_data.py                 # ポリゴン配置 → web/public/data/geojson/

cd web
npm install
npx wrangler d1 migrations apply sumipita --local
npx wrangler d1 execute sumipita --local --file=seed/data.sql
npm run dev
```

`cache/sumupita_scores.csv` はコミット済みなので、画面だけ触るなら2行目以降でよい。

## データを更新する

スコア・生データを変えたときだけ。

```bash
python3 etl/export_d1.py --rebuild
python3 etl/make_schema.py
git add web/migrations web/seed/data.sql
git commit -m "データ更新"
git push
```

スキーマ(`web/migrations/`)はpushで自動適用される。データ(`web/seed/data.sql`)は
自動投入しない（毎push流すと重い・DBが一時応答不能になる）。GitHubの
**Actions → Load D1 Data → Run workflow** から手動実行する。

## デプロイ

Cloudflare Workers に [OpenNext](https://opennext.js.org/cloudflare) で載せる。
main への push で 型チェック → ビルド → D1マイグレーション適用 → デプロイ が自動で走る（`.github/workflows/deploy.yml`）。

スコア・犯罪件数・ハザード値は **D1**（毎リクエストSSRで参照）、地図のポリゴンは静的アセット。

ローカルで本番相当を見る: `cd web && npm run preview`

<details>
<summary>初回セットアップ（実施済み・障害復旧用。新規参加者は不要）</summary>

```bash
cd web
npx wrangler login
npx wrangler d1 create sumipita
# 出力された database_id を wrangler.jsonc の PLACEHOLDER_DATABASE_ID に貼る

npx wrangler d1 migrations apply sumipita --remote
npx wrangler d1 execute sumipita --remote --file=seed/data.sql

npm run deploy
```

GitHub Secrets（Settings → Secrets and variables → Actions）:

| 名前 | 中身 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Workers Scripts Edit + D1 Edit |
| `CLOUDFLARE_ACCOUNT_ID` | ダッシュボードURLの32桁 |

</details>

## 現状

- 4軸スコア: 治安・洪水・高潮は2,994/3,142件、地盤は2,538件で算出済み
- 地図: 実装済み（MapLibre GL JS + 地理院タイル）
- D1 + Workers API: 実装済み（`src/server/db.ts`。一覧はSSR、詳細は `/api/town`）
- SEO: 未対応
- `etl/flood_join.py`（家屋倒壊等氾濫想定区域の補完用）は未回収

背景地図は地理院タイル。大量アクセス時は国土地理院への申請が必要。
ポリゴンは`web/public/data/geojson/`から6.3MB一括ロード。アクセスが増えたらR2配信か遅延読み込みに移すこと。
