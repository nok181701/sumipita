# スムピタ

東京23区の町丁目ごとに、**治安・洪水・高潮・地盤**の4つのリスクを公的データから可視化する
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
  flood_join.py         国土数値情報の空間結合（家屋倒壊等氾濫想定区域の補完用）※未回収
  combine_scores.py     4軸を統合 → cache/sumupita_scores.csv
  export_d1.py          D1投入用CSV + R2用GeoJSON を dist/ に書き出す
  build_web_data.py     cache/sumupita_scores.csv → web/public/data/*.json
cache/                ETL中間・最終成果物（再計算コストが高いためコミットして共有）
  sumupita_scores.csv   4軸スコア算出結果。export_d1.py / build_web_data.py の入力
  tokyo_flood_stats.csv 洪水集計の分析用ダンプ（tokyo_flood.py 単体実行時のみ出力）
  takashio_stats.csv    高潮集計の分析用ダンプ（takashio.py 単体実行時のみ出力）
schema.sql            Cloudflare D1 のスキーマ定義
web/                  Next.js フロントエンド（README は web/README.md）
```

## セットアップ

```bash
pip install -r requirements.txt
```

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
# 1) スコア算出 → cache/sumupita_scores.csv   （約27秒）
python3 etl/combine_scores.py

# 2) D1投入用CSV + R2用GeoJSON → dist/       （約4秒。既存スコアを再利用）
python3 etl/export_d1.py
python3 etl/export_d1.py --rebuild           # スコアから作り直す場合

# 3) フロント用JSON → web/public/data/
python3 etl/build_web_data.py

# 4) フロントを起動
cd web && npm install && npm run dev
```

`cache/sumupita_scores.csv` は算出済みのものがコミットされているので、
フロントだけ触るなら 3) と 4) だけで動く。

`export_d1.py` は既定で `cache/sumupita_scores.csv` を再利用する。
生データやスコア定義を変えたときだけ `--rebuild` を付けること
（GitHub Actions では毎回 `--rebuild`）。

### 出力

| 出力 | 内容 |
|---|---|
| `dist/towns.csv` | 3,142行。緯度経度・面積・国勢調査コード付き |
| `dist/town_scores.csv` | 4軸スコア + 各種フラグ |
| `dist/crime_counts.csv` | 生の犯罪件数（スコアの根拠表示用） |
| `dist/hazard_details.csv` | 浸水深・地盤高 |
| `dist/geojson/{区コード}.geojson` | 町丁目ポリゴン 23ファイル + `wards.geojson`。計6.3MB |

ポリゴンの紐付け率は99.90%（3,139/3,142）。
未解決は江東区海の森1〜3丁目のみで、いずれも人口0なので実害はない。

## 現状

- 4軸スコア: 3,142町丁目中2,994件で算出済み
- ETLパイプライン: 生データから通しで再現可能（既存 `cache/sumupita_scores.csv` とバイナリ一致を確認済み）
- スコアカードUI: 実装済み
- 地図: 実装済み（MapLibre GL JS + 地理院タイル。軸タブで塗り分けを切り替え）
- D1 + Workers API: 未実装
- `flood_join.py`（国土数値情報の空間結合。家屋倒壊等氾濫想定区域の補完用）は未回収

### 地図について

背景地図は[地理院タイル（淡色地図）](https://maps.gsi.go.jp/development/ichiran.html)。APIキー不要で出典表示のみで使えるが、
**大量アクセスをかける場合は国土地理院への申請が必要**なので、公開前に規約を確認すること。

ポリゴンは現在 `web/public/data/geojson/` から6.3MBを一括ロードしている。
本番では R2 に置き、表示中の区だけ取得するかベクトルタイル化する。
