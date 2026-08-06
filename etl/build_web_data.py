"""cache/sumupita_scores.csv → フロントエンド用 JSON

D1 に載せ替えるまでの繋ぎ。schema.sql のテーブル分割
（towns / town_scores / crime_counts / hazard_details）と同じ考え方で、
スコアと生値を分けて持たせている。

【重要】「データがない」と「リスクがない」を区別するフラグを必ず付ける。
世田谷区の高潮スコア100は「対象区域外」であって「調査したが安全」ではない。
"""
import json
import math
import unicodedata

import pandas as pd

SRC = "cache/sumupita_scores.csv"
# 緯度経度は export_d1.py の成果物から取る（ポリゴンの重心）。
# 無ければ地図なしで動くので必須にはしない。
TOWNS_CSV = "dist/towns.csv"
GEOJSON_SRC = "dist/geojson"
# R2 の GeoJSON を区ごと24分割する方針に合わせ、詳細も区ごとに分割する。
# 検索用の index は全件だが軽量（スコアのみ）。
DST_DIR = "web/public/data"

DATA_YEAR = 2025  # 犯罪データ 令和7年 / 人口 令和7年1月1日現在

# 高潮浸水想定区域の対象外の区（東京都港湾局の対象は17区）
TIDE_OUT_OF_SCOPE = {"世田谷区", "渋谷区", "中野区", "杉並区", "豊島区", "練馬区"}

MIN_POP = 100

CRIME_FIELDS = {
    "robbery": "凶悪犯強盗",
    "assault": "粗暴犯暴行",
    "injury": "粗暴犯傷害",
    "burglary_akisu": "侵入窃盗空き巣",
    "burglary_shinobi": "侵入窃盗忍込み",
    "burglary_izora": "侵入窃盗居空き",
    "bicycle_theft": "非侵入窃盗自転車盗",
    "vehicle_theft": "非侵入窃盗車上ねらい",
    "snatch": "非侵入窃盗ひったくり",
    "pickpocket": "非侵入窃盗すり",
}


def num(v, digits=None):
    """NaN を None に落として JSON セーフにする"""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, (int,)) or (isinstance(v, float) and v.is_integer() and digits is None):
        return int(v)
    v = float(v)
    return round(v, digits) if digits is not None else v


def flag(v):
    return bool(v) if pd.notna(v) else False


def display_name(s):
    """表示名は突合キーと別に trim が必要（犯罪側にも末尾スペース付きの町丁目がある）"""
    return unicodedata.normalize("NFKC", str(s)).strip()


def load_geo():
    """緯度経度と区コードを export_d1.py の成果物から取る（無ければ空）"""
    import os

    if not os.path.exists(TOWNS_CSV):
        return {}, {}
    t = pd.read_csv(TOWNS_CSV)
    latlng = {
        r.key: (num(r.lat, 6), num(r.lng, 6))
        for r in t.itertuples(index=False)
        if pd.notna(r.lat)
    }
    codes = {display_name(r.ward): str(r.ward_code) for r in t.itertuples(index=False)}
    return latlng, codes


def build():
    d = pd.read_csv(SRC)
    latlng, _ = load_geo()
    towns = []

    for r in d.itertuples(index=False):
        row = r._asdict()
        ward = display_name(row["ward"])
        pop = num(row["pop"])
        scored = pd.notna(row["safety_score"])
        flood_covered = flag(row["tk_coverage"])
        tide_in_scope = ward not in TIDE_OUT_OF_SCOPE

        ll = latlng.get(row["key"])

        towns.append({
            "key": row["key"],
            "ward": ward,
            "town": display_name(row["town"]),
            "pop": pop,
            "households": num(row["households"]),
            # ポリゴンの重心。地図のflyTo用。ポリゴン未対応の3件はnull
            "lat": ll[0] if ll else None,
            "lng": ll[1] if ll else None,

            # --- 4軸スコア（合成しない。並列表示用）---
            "scores": {
                "safety": num(row["safety_score"], 1),
                "flood": num(row["flood_score"], 1),
                "tide": num(row["tide_score"], 1),
                "ground": num(row["ground_score"], 1),
            },

            # --- データ有無フラグ（スコアの解釈に必須）---
            "flags": {
                # 人口100人未満はスコア算出対象外（分母が小さく発生率が発散する）
                "scored": bool(scored),
                # 浸水予想区域図の流域データの範囲内か
                "flood_covered": flood_covered,
                # 高潮浸水想定区域の対象17区に含まれるか
                "tide_in_scope": tide_in_scope,
                # ゼロメートル地帯
                "below_sea": flag(row["below_sea_flag"]),
                # 業務地区（夜間人口を分母にした治安スコアが不当に低く出る）
                "business_area": flag(row["business_area_flag"]),
            },

            # --- 生の犯罪件数（スコアの根拠表示用）---
            "crime": {
                "serious_2y": num(row["serious"]),      # 重大犯罪 R6+R7 合算
                "serious_r7": num(row["serious_r7"]),
                "daily_r7": num(row["daily"]),          # 生活犯罪 R7
                "total_r7": num(row["総合計"]),
                **{k: num(row[v]) for k, v in CRIME_FIELDS.items()},
            },

            # --- 生のハザード値（スコアの根拠表示用）---
            "hazard": {
                "flood_ratio": num(row["tk_flood_ratio"], 4),
                "flood_mean_depth": num(row["tk_mean_depth"], 2),
                "flood_max_depth": num(row["tk_max_depth"], 2),
                "flood_exposure": num(row["flood_exposure"], 3),
                "tide_ratio": num(row["ts_flood_ratio"], 4),
                "tide_mean_depth": num(row["ts_mean_depth"], 2),
                "tide_max_depth": num(row["ts_max_depth"], 2),
                "tide_exposure": num(row["tide_exposure"], 3),
                "mean_elev": num(row["tk_mean_elev"], 2),
                "min_elev": num(row["tk_min_elev"], 2),
            },
        })

    towns.sort(key=lambda t: (t["ward"], t["town"]))

    out = {
        "data_year": DATA_YEAR,
        "min_pop": MIN_POP,
        "tide_out_of_scope": sorted(TIDE_OUT_OF_SCOPE),
        "town_count": len(towns),
        "scored_count": sum(1 for t in towns if t["flags"]["scored"]),
        # CC BY のため出典表示は必須。DBに持たせて機械的に出す方針
        "sources": [
            {
                "id": "keishicho_crime",
                "name": "警視庁「区市町村の町丁別、罪種別及び手口別認知件数」令和7年",
                "url": "https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html",
                "license": "CC BY 4.0",
            },
            {
                "id": "tokyo_population",
                "name": "東京都総務局「住民基本台帳による東京都の世帯と人口」令和7年1月",
                "url": "https://www.toukei.metro.tokyo.lg.jp/juukiy/2025/jy25000001.htm",
                "license": "CC BY 4.0",
            },
            {
                "id": "tokyo_flood",
                "name": "東京都建設局「浸水予想区域図（改定）浸水深・地盤高データ」",
                "url": "https://catalog.data.metro.tokyo.lg.jp/dataset/t000014d0000000029",
                "license": "CC BY 4.0",
            },
            {
                "id": "tokyo_tide",
                "name": "東京都港湾局「高潮浸水想定区域図」",
                "url": "https://catalog.data.metro.tokyo.lg.jp/",
                "license": "CC BY 4.0",
            },
            {
                "id": "estat_boundary",
                "name": "e-Stat「令和2年国勢調査 町丁・字等別境界データ」",
                "url": "https://www.e-stat.go.jp/gis/statmap-search?type=2",
                "license": "CC BY 4.0",
            },
        ],
        "towns": towns,
    }
    return out


def write(path, obj):
    import os

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path) / 1024


if __name__ == "__main__":
    import os
    from collections import defaultdict

    out = build()
    towns = out.pop("towns")
    _, ward_codes = load_geo()

    # 1) 検索用インデックス（全件・軽量）
    meta = dict(out)
    meta["wards"] = sorted({t["ward"] for t in towns})
    # GeoJSONのファイル名は区コード。地図がどのファイルを取りに行くかの対応表
    meta["ward_codes"] = ward_codes
    # 一覧の高潮バーは「対象区域外」を満点として描いてはいけない。
    # 世田谷区の100は調査結果ではないので、一覧では null にして空バーで見せる。
    meta["index"] = [{
        "key": t["key"],
        "ward": t["ward"],
        "town": t["town"],
        "pop": t["pop"],
        "s": t["scores"]["safety"],
        "f": t["scores"]["flood"] if t["flags"]["flood_covered"] else None,
        "t": t["scores"]["tide"] if t["flags"]["tide_in_scope"] else None,
        "g": t["scores"]["ground"] if t["flags"]["flood_covered"] else None,
        "scored": t["flags"]["scored"],
        "tide_scope": t["flags"]["tide_in_scope"],
        # 地図のflyTo用（ポリゴン重心）
        "lat": t["lat"],
        "lng": t["lng"],
    } for t in towns]
    kb = write(os.path.join(DST_DIR, "index.json"), meta)
    print(f"index.json: {len(towns)}件 / スコア算出可 {out['scored_count']}件 / {kb:.0f} KB")

    # 2) 詳細は区ごとに分割（表示中の区だけ取得する）
    by_ward = defaultdict(list)
    for t in towns:
        by_ward[t["ward"]].append(t)
    total = 0
    for ward, rows in by_ward.items():
        total += write(os.path.join(DST_DIR, "wards", f"{ward}.json"), {"ward": ward, "towns": rows})
    print(f"wards/*.json: {len(by_ward)}区 / 合計 {total:.0f} KB")

    # 3) 地図用ポリゴン。本番では R2 に置くが、開発中は public から配る
    import shutil

    if os.path.isdir(GEOJSON_SRC):
        dst = os.path.join(DST_DIR, "geojson")
        shutil.copytree(GEOJSON_SRC, dst, dirs_exist_ok=True)
        n = len(os.listdir(dst))
        mb = sum(os.path.getsize(os.path.join(dst, f)) for f in os.listdir(dst)) / 1024 / 1024
        print(f"geojson/: {n}ファイル / {mb:.1f} MB")
    else:
        print(f"geojson: {GEOJSON_SRC} が無いのでスキップ（地図は表示されません）")
        print("  → python3 export_d1.py を先に実行してください")
