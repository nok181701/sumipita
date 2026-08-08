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
npx wrangler d1 execute sumipita --local --file=migrations/0001_init.sql
npx wrangler d1 execute sumipita --local --file=seed/data.sql
npm run dev
```

`migrations/0001_init.sql` は `make_schema.py` がCSVから毎回まるごと作り直す1本のファイル（同じファイル名）。
`d1 migrations apply` はファイル名ベースで1回きり実行なので、列を追加しても「適用済み」として
スキップされ反映されない。スキーマを更新するときは常に `d1 execute --file=migrations/0001_init.sql`
で直接流すこと（DROP TABLEを含むが、直後に全件を入れ直すので実害はない）。

## データを更新する

スコア・生データを変えたときだけ。

```bash
python3 etl/export_d1.py --rebuild
python3 etl/make_schema.py
git add web/migrations web/seed/data.sql
git commit -m "データ更新"
git push
```

スキーマもデータも自動投入せず、GitHubの**Actions → Load D1 Data → Run workflow** から手動実行する
（`load-data.yml` が `migrations/0001_init.sql` を直接流してスキーマを揃えたあと、`seed/data.sql` を投入する）。

## デプロイ

Cloudflare Workers に [OpenNext](https://opennext.js.org/cloudflare) で載せる。
main への push で 型チェック → ビルド → D1マイグレーション適用 → デプロイ が自動で走る（`.github/workflows/deploy.yml`）。
ここでの「D1マイグレーション適用」は新規セットアップ用で、既存カラムの追加などスキーマ変更は
反映されない（上記の理由）。スキーマ変更はLoad D1 Dataの手動実行で行う。

スコア・犯罪件数・ハザード値は **D1**（毎リクエストSSRで参照）、地図のポリゴンは静的アセット。
`/machi/[ward]/[town]`（町丁目詳細ページ）もSSGを試したが、OpenNextのCloudflareアダプタは
R2/KVのincremental cache bindingが無いと事前生成したページを配信できず本番で404になったため、
他ページと同じくforce-dynamicに戻してある。SSG化するにはR2/KVの設定が前提。

ローカルで本番相当を見る: `cd web && npm run preview`

