# スムピタ

東京23区の町丁目ごとに、**治安・洪水・高潮・地盤（液状化）**の4つのリスクを公的データから可視化する
引越し先リサーチダッシュボード。

設計判断の経緯はすべて [`machi-project-plan.md`](machi-project-plan.md) にある。
UIを触る前にそちらの「設計上の約束ごと」を読むこと。

## 構成

```
etl/
  paths.py              生データの配置場所（環境変数 SUMIPITA_DATA で上書き可）
  score_proto.py        犯罪/人口の正規化・突合 → 治安スコア
  polygon_join.py       町丁目ポリゴンの読み込みと人口データへの結合
  tokyo_flood.py        東京都「浸水予想区域図」の集計（洪水の主軸）
  takashio.py           東京都港湾局「高潮浸水想定区域図」の集計
  liquefaction.py       東京の液状化予測図（PL分布図・液状化履歴図）の集計
  ksj_flood.py          国土数値情報（家屋倒壊等氾濫想定区域・荒川/多摩川/江戸川）
  flood_join.py         国土数値情報の空間結合（家屋倒壊等氾濫想定区域の補完用）※未回収
  combine_scores.py     4軸を統合 → cache/sumupita_scores.csv
  export_d1.py          D1投入用CSV + R2用GeoJSON を dist/ に書き出す
  make_schema.py        dist/*.csv → web/migrations/0001_init.sql と web/seed/data.sql
  build_web_data.py     dist/geojson → web/public/data/geojson（地図のポリゴン）
cache/                ETL中間・最終成果物（再計算コストが高いためコミットして共有）
  sumupita_scores.csv   4軸スコア算出結果。export_d1.py / build_web_data.py の入力
  tokyo_flood_stats.csv 洪水集計の分析用ダンプ（tokyo_flood.py 単体実行時のみ出力）
  takashio_stats.csv    高潮集計の分析用ダンプ（takashio.py 単体実行時のみ出力）
web/                  Next.js フロントエンド（README は web/README.md）
```

## セットアップ

Python 3.9以上。**仮想環境を作って入れること。**

**有効化するスクリプトはシェルによって違う。** 間違えると仮想環境に入らないまま
システムのPythonにインストールされてしまうので、自分のシェルを確認すること（`echo $SHELL`）。

```bash
# bash / zsh（macOSの既定はzsh）
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

```fish
# fish
python3 -m venv .venv
source .venv/bin/activate.fish
python3 -m pip install -r requirements.txt
```

**有効化できたかは必ず確認する。**

```bash
python3 -c "import sys; print(sys.prefix)"
# .../sumipita/.venv と出れば成功。/Applications/Xcode.app/... などが出たら失敗
```

プロンプトの先頭に `(.venv)` が付いていれば有効。抜けるときは `deactivate`。

有効化が面倒なら、毎回フルパスで叩いてもよい。こちらは確実に仮想環境のPythonが使われる。

```bash
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python etl/combine_scores.py
```

<details>
<summary>うまくいかないとき</summary>

**`Unsupported use of '='. In fish, please use 'set VIRTUAL_ENV ...'`**
シェルが fish なのに bash用の `activate` を読んでいる。`activate.fish` を使う。
このエラーが出たまま `pip install` すると、仮想環境に入らずシステムのPythonに入ってしまう。

**`Defaulting to user installation because normal site-packages is not writeable`**
仮想環境が有効になっていない証拠。上の確認コマンドで `sys.prefix` を見ること。
インストール自体は `~/Library/Python/3.x/` に成功するので動きはするが、
プロジェクトごとにバージョンを分けられなくなる。

**`pip: command not found`**
macOSに `pip` という名前のコマンドは無い。`python3 -m pip` を使う。
`pip3` でも動くが、複数のPythonが入っていると別の環境に入ってしまうことがあるので
`python3 -m pip` のほうが確実。

**`error: externally-managed-environment`**
Homebrewやシステムのpythonは、壊れるのを防ぐために直接インストールできないようになっている。
上の手順どおり仮想環境を作れば出なくなる。
`--break-system-packages` で無理に入れることもできるが、システム側を壊す可能性があるので勧めない。

**`python3: command not found`**
Pythonが入っていない。`brew install python@3.12` か
[python.org](https://www.python.org/downloads/) から入れる。

**geopandasのインストールで失敗する**
`python3 -m pip install --upgrade pip` でpipを新しくしてから再実行する。
古いpipだとビルド済みのwheelを取りに行かず、ソースからのビルドに失敗することがある。

**Xcode付属のPython 3.9が使われている**
動作は確認済み（geopandas 1.0.1 / shapely 2.0.7 の組み合わせでETL全スクリプトが通る）。
ただしPythonが古いと入るパッケージも古くなるので、可能なら
`brew install python@3.12` を入れて `python3.12 -m venv .venv` で作り直すほうがよい。
</details>

### 生データを `data/` に置く

すべてCC BY。**再配布はしていないので各自ダウンロードすること。**
別の場所に置く場合は `export SUMIPITA_DATA=/path/to/raw` で切り替えられる。

| 配置先 | データ | 取得元 |
|---|---|---|
| `data/R7.csv`<br>`data/R6.csv` | 警視庁 町丁別・罪種別認知件数（令和7年・令和6年） | [警視庁](https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html)<br>直リンク: `.../ninchikensu.files/R7.csv` |
| `data/jy25qv0500.csv` | 住民基本台帳による東京都の世帯と人口 令和7年1月 **第5表** | [東京都総務局](https://www.toukei.metro.tokyo.lg.jp/juukiy/2025/jy25000001.htm) |
| `data/shinsui_*.csv`（7流域） | 東京都 浸水予想区域図（改定）浸水深・地盤高データ | [東京都オープンデータ](https://catalog.data.metro.tokyo.lg.jp/dataset/t000014d0000000029) |
| `data/shp/r2ka13.*` | e-Stat 令和2年国勢調査 町丁・字等別境界データ（東京都） | [e-Stat](https://www.e-stat.go.jp/gis/statmap-search?type=2) → 小地域 → 2020年 → 世界測地系緯度経度Shapefile → 13 東京都 |
| `data/takashio/shape(depth)/*.shp` | 東京都港湾局 高潮浸水想定区域図［想定最大規模］（浸水深） | [東京都オープンデータ](https://catalog.data.metro.tokyo.lg.jp/dataset/t000015d1700000007)（`shape_depth_.zip`・展開後345MB） |
| `data/liquefaction/PL分布図/`<br>`data/liquefaction/液状化履歴図/` | 東京の液状化予測図 令和7年度改訂版 の公開データ | [公開データ（地図情報等）](https://doboku.metro.tokyo.lg.jp/start/03-jyouhou/ekijyouka/layertable.html) から `PL分布図.zip` と `液状化履歴図.zip` |
| `data/ksj/` | 国土数値情報 洪水浸水想定区域（東京都管理河川）。家屋倒壊等氾濫想定区域に使う | [国土数値情報 A31a 令和7年度版](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A31a-2025.html) の **GeoJSON形式** `A31a-25_13_10_GEOJSON.zip`（約12MB）と `A31a-25_13_20_GEOJSON.zip`（約20MB）を、どちらも `data/ksj/` に展開 |
| `data/A31a-25_83_10_GEOJSON.zip` | 同（関東地方整備局）。**荒川・多摩川・江戸川** | 同ページの `A31a-25_83_10_GEOJSON.zip`（約528MB）。**展開せずzipのまま置く**（展開すると5GBになる。GDALの `/vsizip/` で直接読んでいる） |

浸水予想区域図で必要な7流域:
`shinsui_kandagawa` / `shinsui_sumidagawa` / `shinsui_syakujiigawa` / `shinsui_jyounantiku` /
`shinsui_koutounaibu` / `shinsui_nogawa` / `shinsui_nakagawa`

エンコーディングが混在している。犯罪データは **Shift_JIS(cp932)**、人口と浸水は **UTF-8 BOM付き**。

shpの2つは展開後が大きい（高潮は345MB）ので、`data/` にコピーせずダウンロード先を直接指してもよい。

```bash
export SUMIPITA_SHP="$HOME/Downloads/A002005212020DDSWC13 (1)/r2ka13.shp"
export SUMIPITA_TAKASHIO="$HOME/Downloads/shape(depth)"
```

## 実行

```bash
# 1) スコア算出 → cache/sumupita_scores.csv   （約30秒）
python3 etl/combine_scores.py

# 2) D1投入用CSV + 地図用GeoJSON → dist/      （約5秒。既存スコアを再利用）
python3 etl/export_d1.py
python3 etl/export_d1.py --rebuild           # スコアから作り直す場合

# 3) スキーマとデータのSQLを生成
python3 etl/make_schema.py

# 4) 地図のポリゴンを配置 → web/public/data/geojson/
python3 etl/build_web_data.py

# 5) ローカルD1を用意して起動
cd web
npm install
npx wrangler d1 migrations apply sumipita --local
npx wrangler d1 execute sumipita --local --file=seed/data.sql
npm run dev
```

`cache/sumupita_scores.csv` は算出済みのものがコミットされているので、
画面だけ触るなら 2) 以降でよい。

**スキーマは手で書かない。** `make_schema.py` が `dist/*.csv` から
`web/migrations/0001_init.sql` を生成する。以前は手書きしていて、
ETLにカラムを足すたびに書き忘れて実態とズレていた。

### スキーマとデータを分けている理由

| | 置き場所 | 適用方法 |
|---|---|---|
| スキーマ | `web/migrations/` | `wrangler d1 migrations apply`（デプロイ時に自動） |
| データ 3,142行 | `web/seed/data.sql` | `wrangler d1 execute`（手動） |

スキーマは滅多に変わらないので履歴として管理する意味がある。
適用済みかどうかはD1側の `d1_migrations` テーブルが覚えているので、何度流しても安全。

データはスコアを再計算するたびに全件入れ替わるので、マイグレーションとして
積み上げる対象ではない。またpushのたびに2.5MBを流すとデプロイが遅くなるうえ、
投入中はDBが一時的に応答しなくなる。

### データを更新する

スコアの定義や生データを変えたときだけ実行する。

```bash
python3 etl/export_d1.py --rebuild
python3 etl/make_schema.py
git add web/migrations web/seed/data.sql
git commit -m "データ更新"
git push
```

pushすると、スキーマ（`web/migrations/`）は`deploy.yml`が自動で適用する。
データ（`web/seed/data.sql`）は自動投入しない（毎push流すとデプロイが遅くなり、
投入中はDBが一時応答不能になるため）。GitHubの **Actions → Load D1 Data →
Run workflow** から手動で実行すること。個人PCから`wrangler d1 execute`を
直接叩く必要はない。

### 出力

| 出力 | 内容 |
|---|---|
| `dist/towns.csv` | 3,142行。緯度経度・面積・国勢調査コード付き |
| `dist/town_scores.csv` | 4軸スコア + 各種フラグ |
| `dist/crime_counts.csv` | 生の犯罪件数（スコアの根拠表示用） |
| `dist/hazard_details.csv` | 浸水深・地盤高・液状化（ボーリング点数と判定内訳・履歴フラグ） |
| `dist/geojson/{区コード}.geojson` | 町丁目ポリゴン 23ファイル + `wards.geojson`。計6.3MB |

ポリゴンの紐付け率は99.90%（3,139/3,142）。
未解決は江東区海の森1〜3丁目のみで、いずれも人口0なので実害はない。

## デプロイ

Cloudflare Workers に [OpenNext](https://opennext.js.org/cloudflare)（`@opennextjs/cloudflare`）で載せる。
Next.js をそのまま Workers 上で動かす構成なので、SSR も API ルートもそのまま使える。

| ファイル | 役割 |
|---|---|
| `web/open-next.config.ts` | Next.js を Workers 向けに変換する設定 |
| `web/wrangler.jsonc` | Worker 名・エントリポイント・アセットの配置 |
| `.github/workflows/deploy.yml` | main への push でデプロイ |
| `.github/workflows/lint.yml` | push / PR で型チェック |

スコア・犯罪件数・ハザード値は **D1** に入れ、毎リクエストSSRで引く。
地図のポリゴン（6.4MB）はSQLで扱う意味がないので静的アセットのまま配る。

### 初回だけやること

**1. D1を作る**

```bash
cd web
npx wrangler login
npx wrangler d1 create sumipita
```

出力された `database_id` を `web/wrangler.jsonc` の `PLACEHOLDER_DATABASE_ID` と差し替える。

`database_id` を貼るまでは `Invalid uuid` で失敗する。

**2. 本番のD1にスキーマとデータを入れる**

```bash
npx wrangler d1 migrations apply sumipita --remote
npx wrangler d1 execute sumipita --remote --file=seed/data.sql
```

`--remote` を付け忘れるとローカルのD1に入るだけで本番は空のまま。
以降スキーマの適用はデプロイ時に自動で走るので、手で実行するのは初回だけ。

**3. デプロイ**

```bash
npm run deploy
```

**4. GitHubに登録する**

Settings → Secrets and variables → Actions

| 名前 | 中身 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 権限は Workers Scripts の Edit と D1 の Edit の両方が必要（D1権限が無いとマイグレーション適用が7403で失敗する） |
| `CLOUDFLARE_ACCOUNT_ID` | ダッシュボードのURLに出ている32桁 |

### 以降

main に push すると自動でデプロイされる。
型チェック → ビルド → **D1マイグレーション適用** → デプロイの順。
ポリゴンが欠けていたら最初に止まる（地図が真っ白のサイトが公開されるのを防ぐため）。

**ETLはCIで動かさない。** 生データが再配布不可でリポジトリに入っていないため。
スコアを更新したときは、ローカルでETLを流したあと本番D1を入れ替える。

```bash
python3 etl/export_d1.py --rebuild
python3 etl/make_schema.py
cd web && npx wrangler d1 execute sumipita --remote --file=seed/data.sql
```

`schema.sql` の先頭に `DROP TABLE IF EXISTS` が入っているので、
スキーマから流し直せば作り直しになる。

### ローカルで本番と同じ状態を見る

```bash
cd web
npm run preview
```

## 現状

- 4軸スコア: 治安・洪水・高潮は3,142町丁目中2,994件、地盤（液状化）は2,538件で算出済み
  （地盤はボーリング地点が1つもない456件を判定不能としているため少ない）
- ETLパイプライン: 生データから通しで再現可能
- スコアカードUI: 実装済み
- 地図: 実装済み（MapLibre GL JS + 地理院タイル。軸タブで塗り分けを切り替え）
- デプロイ: Cloudflare Workers（OpenNext）+ GitHub Actions
- D1 + Workers API: 未実装（`web/wrangler.jsonc` にバインディングを足す形で拡張する）
- SEO: 未対応（title と description のみ）
- `flood_join.py`（国土数値情報の空間結合。家屋倒壊等氾濫想定区域の補完用）は未回収

### 地図について

背景地図は[地理院タイル（淡色地図）](https://maps.gsi.go.jp/development/ichiran.html)。APIキー不要で出典表示のみで使えるが、
**大量アクセスをかける場合は国土地理院への申請が必要**なので、公開前に規約を確認すること。

ポリゴンは現在 `web/public/data/geojson/` から6.3MBを一括ロードしている。
**公開直後はこのままで動くが、アクセスが増えたらR2配信か区ごとの遅延読み込みに移すこと。**
