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

スコア・生データを変えたときだけ。**2ステップとも必要**（片方だけだとトップページと町丁目詳細ページでスコアが食い違う。理由は下記）。

```bash
python3 etl/export_d1.py --rebuild
python3 etl/make_schema.py
git add web/migrations web/seed/data.sql
git commit -m "データ更新"
git push
```

1. **push**: `deploy.yml`が自動で走り、ビルド前に`seed/data.sql`をビルド用のローカルD1へ読み込んでから
   `/machi/[ward]/[town]`（3,142ページ）を新しいスコアで静的（SSG）に作り直す。
2. **Load D1 Data**: GitHubの**Actions → Load D1 Data → Run workflow**から手動実行し、
   本番のRemote D1にも同じデータを入れる（`load-data.yml`が`migrations/0001_init.sql`で
   スキーマを揃えたあと`seed/data.sql`を投入）。トップページ（`/`）と`/api/town`はここを見ている。

自動投入にしていないのは、DBが一時的に使用不可になるうえ、スコア再計算時以外は流す必要が無いため。

## デプロイ

Cloudflare Workers に [OpenNext](https://opennext.js.org/cloudflare) で載せる。
main への push で 型チェック → ローカルD1へのseed投入 → ビルド → D1マイグレーション適用 → デプロイ が自動で走る（`.github/workflows/deploy.yml`）。
ここでの「D1マイグレーション適用」は新規セットアップ用で、既存カラムの追加などスキーマ変更は
反映されない（上記の理由）。スキーマ変更はLoad D1 Dataの手動実行で行う。

トップページ（`/`）と`/api/town`はスコア・犯罪件数・ハザード値を**Remote D1から毎リクエストSSRで参照**する。
`/machi/[ward]/[town]`（町丁目詳細ページ）は**ビルド時に`seed/data.sql`から静的HTML（SSG）として生成**していて、
実行時にD1へは触れない。地図のポリゴンは静的アセット。

ローカルで本番相当を見る: `cd web && npm run preview`

