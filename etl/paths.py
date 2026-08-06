"""生データの配置場所を1か所にまとめる。

元のスクリプトは `/mnt/user-data/uploads` を直接参照していたが、
その場所は既に存在しないため、リポジトリ直下の `data/` を既定にした。
別の場所に置きたい場合は環境変数 `SUMIPITA_DATA` で上書きできる。

    export SUMIPITA_DATA=~/Downloads/sumipita-raw

配置するファイル（すべてCC BY。取得元は machi-project-plan.md 参照）:

    data/
      R7.csv                     警視庁 町丁別認知件数 令和7年（Shift_JIS）
      R6.csv                     同 令和6年（重大犯罪の2年合算に必要）
      jy25qv0500.csv             東京都 住民基本台帳 令和7年1月 第5表（UTF-8 BOM）
      shinsui_kandagawa.csv      東京都 浸水予想区域図（7流域ぶん）
      shinsui_sumidagawa.csv
      shinsui_syakujiigawa.csv
      shinsui_jyounantiku.csv
      shinsui_koutounaibu.csv
      shinsui_nogawa.csv
      shinsui_nakagawa.csv
      shp/r2ka13.shp             e-Stat 令和2年国勢調査 町丁・字等別境界データ
      shp/r2ka13.dbf / .shx / .prj
      takashio/shape(depth)/*.shp 東京都港湾局 高潮浸水想定区域図
"""
import os

DATA_DIR = os.path.abspath(os.environ.get("SUMIPITA_DATA", "data"))

CRIME_R7 = os.path.join(DATA_DIR, "R7.csv")
CRIME_R6 = os.path.join(DATA_DIR, "R6.csv")
POPULATION = os.path.join(DATA_DIR, "jy25qv0500.csv")
FLOOD_CSV_DIR = DATA_DIR                       # shinsui_*.csv

# ポリゴンと高潮shpは展開後のサイズが大きく（高潮は345MB）、
# `data/` にコピーせずダウンロード先を直接指したい場合がある。
# 個別に環境変数で上書きできるようにしておく。
POLYGON_SHP = os.environ.get(
    "SUMIPITA_SHP", os.path.join(DATA_DIR, "shp", "r2ka13.shp"))
TIDE_SHP_DIR = os.environ.get(
    "SUMIPITA_TAKASHIO", os.path.join(DATA_DIR, "takashio", "shape(depth)"))


def require(path, what):
    """入力ファイルが無いときに、何をどこに置けばよいか分かるエラーを出す"""
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"{what} が見つかりません: {path}\n"
            f"取得元は machi-project-plan.md を参照してください。\n"
            f"別の場所に置いている場合は環境変数 SUMIPITA_DATA を設定してください。"
        )
    return path
