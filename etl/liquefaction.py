"""東京の液状化予測図の公開データを町丁目単位に集計

「地盤」を標高で代表させていたのを、地盤そのものの性質に置き換えるためのモジュール。
標高は高潮スコアと相関0.856あり、1軸まるごと冗長だった。

【データの前提】
液状化予測図そのもの（250mメッシュの3区分）はWeb閲覧専用で配布されていない。
配布されているのは予測図の材料で、このうち2つを使う。

- PL分布図 (liqpt.shp) — ボーリング地点ごとのPL値（液状化指数）による3段階判定。20,477点
- 液状化履歴図 (eqliq.shp ほか) — 1923年関東大地震・2011年東北地方太平洋沖地震で
  実際に液状化した地域のポリゴン

【ボーリング点が疎であることへの対処】
町丁目あたりの点数は中央値3点。1点しかない町丁目が516件ある。
1本のボーリングで町丁目全体を決めつけると、「大」1点だけで最下位に落ちる。
そこで治安スコアと同じ経験ベイズで、点数の少ない町丁目を23区の平均に引き寄せる。
prior=2 で、100点に張り付く町丁目が917件→1件に減り、
点が5個以上ある町丁目の順位はほとんど動かないことを実測で確認している。
"""
import glob
import os
import sys

import geopandas as gpd
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import paths
from polygon_join import join as town_join

# PL値（液状化指数）の3区分を代表値に置き換える。
# 「大」は PL>15 の開区間なので、控えめに20とした。
PL_WEIGHT = {
    "小（0≦PL≦5）": 2.5,
    "中（5<PL≦15）": 10.0,
    "大（PL>15）": 20.0,
}

# 経験ベイズの事前分布の強さ（擬似的に加えるボーリング点の本数）
PRIOR_POINTS = 2.0

CRS_WORK = 3857  # 元データがこのCRS。変換の往復を減らすため合わせる


def _towns():
    t = town_join()
    t = t[t.geometry.notna()][["key", "ward", "town", "pop", "geometry"]].copy()
    return t.to_crs(CRS_WORK)


def _history_keys(towns, filename):
    """履歴ポリゴンと交差する町丁目のkey集合"""
    path = os.path.join(paths.LIQ_HISTORY_DIR, filename)
    if not os.path.exists(path):
        return set()
    g = gpd.read_file(path, encoding="cp932").to_crs(CRS_WORK)
    g = g[g.geometry.notna() & g.is_valid]
    if len(g) == 0:
        return set()
    j = gpd.sjoin(towns[["key", "geometry"]], g[["geometry"]], how="inner", predicate="intersects")
    return set(j["key"])


def aggregate():
    towns = _towns()
    idx = towns[["key", "geometry"]].reset_index(drop=True)

    pl = gpd.read_file(
        paths.require(paths.LIQ_PL_SHP, "液状化 PL分布図 (liqpt.shp)"), encoding="cp932"
    )
    unknown = set(pl["PL区分"].dropna().unique()) - set(PL_WEIGHT)
    if unknown:
        raise ValueError(
            f"PL区分に未知の値があります: {unknown}\n"
            f"元データの区分が変わった可能性があります。PL_WEIGHT を確認してください。"
        )
    pl["w"] = pl["PL区分"].map(PL_WEIGHT)
    pl = pl.to_crs(CRS_WORK)

    j = gpd.sjoin(pl, idx, how="inner", predicate="within")
    agg = j.groupby("key").agg(
        liq_points=("w", "size"),
        liq_sum=("w", "sum"),
        liq_small=("PL区分", lambda s: int((s == "小（0≦PL≦5）").sum())),
        liq_mid=("PL区分", lambda s: int((s == "中（5<PL≦15）").sum())),
        liq_large=("PL区分", lambda s: int((s == "大（PL>15）").sum())),
    )

    m = towns.drop(columns="geometry").merge(agg, on="key", how="left")
    m["liq_covered"] = m["liq_points"].notna()
    # ボーリングが1〜2本しかない町丁目は、その1本が町全体を代表しているとは限らない
    m["liq_thin"] = m["liq_covered"] & (m["liq_points"].fillna(0) <= 2)

    # 23区全体の平均PL代表値を事前分布の中心にする
    prior_mean = j["w"].mean()
    m["liq_pl"] = (m["liq_sum"] + PRIOR_POINTS * prior_mean) / (
        m["liq_points"] + PRIOR_POINTS
    )
    m["liq_pl_raw"] = m["liq_sum"] / m["liq_points"]

    # 実際に液状化した記録。スコアには混ぜず、独立した事実として持つ
    hist = _history_keys(towns, "eqliq.shp")
    k1923 = _history_keys(towns, "eqliq_1923KantoEarthquake.shp")
    k2011 = _history_keys(towns, "eqliq_2011TohokuEarthquake_polygon.shp")
    m["liq_history"] = m["key"].isin(hist | k1923 | k2011)
    m["liq_1923"] = m["key"].isin(k1923)
    m["liq_2011"] = m["key"].isin(k2011)

    return m[[
        "key", "liq_points", "liq_small", "liq_mid", "liq_large",
        "liq_pl", "liq_pl_raw", "liq_covered", "liq_thin",
        "liq_history", "liq_1923", "liq_2011",
    ]]


if __name__ == "__main__":
    m = aggregate()
    n = len(m)
    cov = int(m["liq_covered"].sum())
    print(f"町丁目 {n}件 / ボーリング点あり {cov}件 ({cov / n * 100:.1f}%)")
    print(f"  うち点が2本以下（参考程度） {int(m['liq_thin'].sum())}件")
    print(f"  ボーリング点の合計 {int(m['liq_points'].sum()):,}点")
    print()
    print(f"液状化の実績がある町丁目 {int(m['liq_history'].sum())}件")
    print(f"  1923 関東大地震 {int(m['liq_1923'].sum())}件 / "
          f"2011 東北地方太平洋沖 {int(m['liq_2011'].sum())}件")
    print()
    print("平滑化後のPL代表値の分布:")
    print(m["liq_pl"].describe([.25, .5, .75]).round(2).to_string())
