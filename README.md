# スムピタ

東京23区の町丁目ごとに治安・洪水・高潮・地盤（液状化）を可視化する引越し先リサーチダッシュボード。


## 構成

```
etl/        ETLスクリプト一式（生データ → cache/ → dist/ → web/migrations, web/seed）
cache/      ETL中間・最終成果物（コミット済み）
web/        webアプリ
```

## セットアップ

```bash
python3 -m venv .venv
source .venv/bin/activate       # fishなら activate.fish
python3 -m pip install -r requirements.txt
```

生データは `data/` に置く。配置ファイル名は
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

## データを更新する

スコア・生データを変えたときだけ。

```bash
python3 etl/export_d1.py --rebuild
python3 etl/make_schema.py
git add web/migrations web/seed/data.sql
git commit -m "データ更新"
git push
```

スキーマ(`web/migrations/`)はciで実行。
データ(`web/seed/data.sql`)は自動投入せず、GitHubの**Actions → Load D1 Data → Run workflow** から手動実行する。

## デプロイ

Cloudflare Workers に [OpenNext](https://opennext.js.org/cloudflare) で載せる。
main への push で 型チェック → ビルド → D1マイグレーション適用 → デプロイ が自動で走る（`.github/workflows/deploy.yml`）。

スコア・犯罪件数・ハザード値は **D1**（毎リクエストSSRで参照）、地図のポリゴンは静的アセット。

ローカルで本番相当を見る: `cd web && npm run preview`

