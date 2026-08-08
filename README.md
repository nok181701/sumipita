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

スコア・生データを変えたときだけ。**3ステップとも必要**（片方だけだとページ間でスコアが食い違う。理由は下記）。

```bash
python3 etl/export_d1.py --rebuild
python3 etl/make_schema.py
git add web/migrations web/seed/data.sql
git commit -m "データ更新"
git push
```

1. **push**: `deploy.yml`が自動で走り、コードをデプロイする（`/machi/[ward]/[town]`は再生成しない）。
2. **Load D1 Data**: GitHubの**Actions → Load D1 Data → Run workflow**から手動実行し、
   本番のRemote D1にデータを入れる（`load-data.yml`が`migrations/0001_init.sql`でスキーマを揃えたあと
   `seed/data.sql`を投入）。トップページ（`/`）と`/api/town`はここを見ている。
3. **Populate Machi Cache**: GitHubの**Actions → Populate Machi Cache → Run workflow**から手動実行し、
   `/machi/[ward]/[town]`（3,142ページ）を新しいスコアで作り直してRemote R2キャッシュへ書き込む
   （`populate-machi-cache.yml`）。

自動投入にしていないのは、DBが一時的に使用不可になるうえ、スコア再計算時以外は流す必要が無いため。

## デプロイ

Cloudflare Workers に [OpenNext](https://opennext.js.org/cloudflare) で載せる。
main への push で 型チェック → ビルド → D1マイグレーション適用 → デプロイ が自動で走る（`.github/workflows/deploy.yml`）。
ここでの「D1マイグレーション適用」は新規セットアップ用で、既存カラムの追加などスキーマ変更は
反映されない（上記の理由）。スキーマ変更はLoad D1 Dataの手動実行で行う。

トップページ（`/`）と`/api/town`はスコア・犯罪件数・ハザード値を**Remote D1から毎リクエストSSRで参照**する。
`/machi/[ward]/[town]`（町丁目詳細ページ）はR2（`open-next.config.ts`のincrementalCache、`wrangler.jsonc`の
`NEXT_INC_CACHE_R2_BUCKET`）をキャッシュとして使う。ただし**通常の`deploy.yml`ではこのキャッシュを作らない**
（`generateStaticParams`は`POPULATE_MACHI_CACHE=1`が付いているときだけ全件を返し、通常ビルドでは空リスト。
コードのpushのたびにD1へ3,142回問い合わせるのを避けるため）。空リストでも`dynamicParams: true`なので、
アクセス時にD1から生成してそのままR2へ積まれる（本来のISRのフォールバック動作）。データ更新時に
まとめて生成しておきたい場合は`populate-machi-cache.yml`を手動実行する。地図のポリゴンは静的アセット。

（一度R2/KVの設定を忘れてSSG化し、本番で全ページ404にした。デプロイ後は
`curl -I` で `x-nextjs-cache: HIT` になっているか必ず確認すること。）

**ビルドIDを固定してある**（`next.config.mjs`の`generateBuildId`）。R2キャッシュのキーにビルドIDが
入るため、固定しないと通常のコードデプロイのたびに参照先が変わり、それまでのキャッシュが
（`populate-machi-cache.yml`で作ったものも含めて）読めなくなる。変更する場合は
`populate-machi-cache.yml`を再実行すること。

**それでもR2キャッシュはpopulate/フォールバック生成のたびに増える**（同じビルドID内では基本的に
同じキーに上書きされるはずだが、ビルドIDを変えたときや検証時は積み上がる）。無限に溜まらないよう
`sumipita-cache`バケットに90日で自動削除のライフサイクルルールを設定済み
（`wrangler r2 bucket lifecycle add sumipita-cache expire-old-cache --expire-days 90`。
コードには残らない設定なので、バケットを作り直した場合はこのコマンドを再実行すること）。

`populate-machi-cache.yml`のRemote R2書き込みには、`CLOUDFLARE_API_TOKEN`にR2の編集権限が必要
（無いと`403 Authentication error`で失敗する。実際に一度これで失敗している）。

ローカルで本番相当を見る: `cd web && npm run preview`

