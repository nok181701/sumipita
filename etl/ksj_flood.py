"""国土数値情報の洪水浸水想定区域データを町丁目単位に集計

用途は2つ。どちらも東京都「浸水予想区域図」では埋められない穴を塞ぐためのもので、
洪水スコアそのものには混ぜない。

【1】家屋倒壊等氾濫想定区域
家が流される・倒壊するおそれのある区域。浸水深とは種類の違うリスクで、
「2階に逃げれば助かる」が通用しない。曝露度に混ぜると薄まるので独立表示する。
- 41_氾濫流 — 氾濫の流れそのもので家屋が倒壊・流出する区域
- 42_河岸侵食 — 川岸が削られて家屋が流出する区域

【2】荒川・多摩川・江戸川の浸水想定
この3河川は国管理なので東京都のデータに入っていない。
江戸川区・葛飾区・足立区・大田区の評価には本来必須。

**浸水深はランク1〜6の区分値**で、東京都データの実数値(m)とは単位が違う。
足すとスコアの意味が壊れるので、洪水スコアには統合せず別の指標として持つ。

【データの置き場所】
- 東京都管理河川: data/ksj/ に展開済み（zipが32MBと軽い）
- 国管理河川: 展開後5GBになるので data/A31a-25_83_10_GEOJSON.zip のまま置き、
  GDAL の /vsizip/ で必要な河川・必要な範囲だけ読む。
  23区のbboxで絞ると荒川363MBのファイルが数秒で読める。
"""
import glob
import os
import sys
import zipfile

import geopandas as gpd
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import paths
from polygon_join import join as town_join

# 面積計算は平面直角座標系IX系（東京）で行う
CRS_AREA = 6677

# 東京23区を囲む範囲。国管理河川のファイルは関東全域なのでこれで絞る
BBOX_23KU = (139.55, 35.50, 139.95, 35.85)

# 東京都のデータに含まれず、23区にかかる国管理河川
KANTO_RIVERS = ("荒川", "多摩川", "江戸川")

# 浸水深ランク（A31a_205）。公式コードリストに準拠。
#   https://nlftp.mlit.go.jp/ksj/gml/codelist/water_depth_code.html
# 区分値をUIに出すときは必ずこの表を通すこと。生の1〜6は意味が読めない。
#
# 2つめの数値は「代表値(m)」。東京都データが実数値(m)なので、同じ単位に
# 揃えて洪水スコアに統合するために使う。区間の中央値を採り、
# 上限のない6は20.0mで頭打ちにしている（過大評価を避けるため控えめ）。
DEPTH_RANK = {
    1: ("0〜0.5m未満", 0.25),
    2: ("0.5〜3.0m未満", 1.75),
    3: ("3.0〜5.0m未満", 4.0),
    4: ("5.0〜10.0m未満", 7.5),
    5: ("10.0〜20.0m未満", 15.0),
    6: ("20.0m以上", 20.0),
}


def _towns():
    t = town_join()
    t = t[t.geometry.notna()][["key", "ward", "town", "pop", "geometry"]].to_crs(CRS_AREA)
    t["town_area"] = t.geometry.area
    return t


def _clean(g):
    """不正ジオメトリを修復する。しないと overlay が落ちる。

    `buffer(0)` は使わないこと。荒川の不正ポリゴン1,036件（頂点数最大36万）では
    数分待っても終わらなかった。`make_valid` なら同じ処理が17秒で済む。
    """
    g = g[g.geometry.notna()].copy()
    m = (~g.is_valid).values
    if m.any():
        geo = g.geometry.values.copy()
        geo[m] = geo[m].make_valid()
        g = g.set_geometry(gpd.GeoSeries(geo, crs=g.crs, index=g.index))
    return g[g.geometry.notna() & ~g.is_empty]


def _overlay_ratio(towns, g, prefix):
    """町丁目に占める面積割合を出す"""
    g = _clean(g.to_crs(CRS_AREA))
    if len(g) == 0:
        return pd.DataFrame(columns=["key", f"{prefix}_area", f"{prefix}_ratio"])

    # 河川ごとのポリゴンが重なっていることがあるので、面積を足す前に1つにまとめる。
    # まとめないと同じ場所を二重に数えて割合が1を超える
    g = gpd.GeoDataFrame(geometry=[g.union_all()], crs=CRS_AREA)

    # 区域にかからない町丁目を先に落とす。ここを省くと3,139件すべてと突き合わせて遅い
    cand = gpd.sjoin(towns[["key", "geometry"]], g, how="inner", predicate="intersects")
    sub = towns[towns["key"].isin(set(cand["key"]))][["key", "town_area", "geometry"]]
    ov = gpd.overlay(sub, g, how="intersection")
    if len(ov) == 0:
        return pd.DataFrame(columns=["key", f"{prefix}_area", f"{prefix}_ratio"])
    ov[f"{prefix}_area"] = ov.geometry.area
    a = ov.groupby("key")[f"{prefix}_area"].sum().reset_index()
    a = a.merge(towns[["key", "town_area"]], on="key", how="left")
    a[f"{prefix}_ratio"] = (a[f"{prefix}_area"] / a["town_area"]).clip(upper=1.0)
    return a[["key", f"{prefix}_area", f"{prefix}_ratio"]]


def _read_tokyo(subdir):
    files = sorted(glob.glob(os.path.join(paths.KSJ_TOKYO_DIR, subdir, "*.geojson")))
    files += sorted(glob.glob(os.path.join(paths.KSJ_KANTO_DIR, subdir, "*.geojson")))
    if not files:
        # 黙って空を返すと「家屋倒壊 0件」として完走してしまう。
        # 本来795件・人口264万人が該当するハザードが、エラーも出さずに消える。
        raise FileNotFoundError(
            f"{subdir} のGeoJSONが1つも見つかりません。\n"
            f"  探した場所: {paths.KSJ_TOKYO_DIR}/{subdir}\n"
            f"             {paths.KSJ_KANTO_DIR}/{subdir}\n"
            f"国土数値情報 A31a-25 の展開先を確認してください（README.md 参照）。"
        )
    parts = []
    for f in files:
        g = gpd.read_file(f)
        if len(g):
            parts.append(g)
    if not parts:
        return gpd.GeoDataFrame(geometry=[], crs=6668)
    return pd.concat(parts, ignore_index=True)


def _kanto_members(prefix):
    """ZIP内の該当メンバー名を返す（展開せずに /vsizip/ で読むため）"""
    z = paths.require(paths.KSJ_KANTO_ZIP, "国土数値情報 関東地整 洪水浸水想定区域 (A31a-25_83_10_GEOJSON.zip)")
    with zipfile.ZipFile(z) as f:
        # ZIP内のパス区切りがバックスラッシュ。/vsizip/ はスラッシュでないと開けない
        return [
            i.filename.replace("\\", "/") for i in f.infolist()
            if not i.is_dir() and i.filename.replace("\\", "/").startswith(prefix)
        ]


def collapse_zone(towns):
    """家屋倒壊等氾濫想定区域（氾濫流 + 河岸侵食）"""
    os.makedirs(CACHE_DIR, exist_ok=True)
    out = towns[["key"]].copy()

    for subdir, prefix, label in [
        ("41_家屋倒壊等氾濫想定区域_氾濫流", "collapse_flow", "氾濫流"),
        ("42_家屋倒壊等氾濫想定区域_河岸侵食", "collapse_erosion", "河岸侵食"),
    ]:
        cache = os.path.join(CACHE_DIR, f"{prefix}.csv")
        if os.path.exists(cache):
            r = pd.read_csv(cache)
            print(f"  {label}: キャッシュを再利用")
        else:
            g = _read_tokyo(subdir)
            print(f"  {label}: 都・国のディレクトリから {len(g):,} ポリゴン", flush=True)
            r = _overlay_ratio(towns, g, prefix)
            r.to_csv(cache, index=False)
        out = out.merge(r, on="key", how="left")
        out[f"{prefix}_ratio"] = out[f"{prefix}_ratio"].fillna(0.0)

    out["collapse_ratio"] = out[["collapse_flow_ratio", "collapse_erosion_ratio"]].max(axis=1)
    out["collapse_zone"] = out["collapse_ratio"] > 0
    return out[["key", "collapse_flow_ratio", "collapse_erosion_ratio",
                "collapse_ratio", "collapse_zone"]]


CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache", "ksj")


CHUNK_TOWNS = 200


def _river_overlay(towns, member, name):
    """1河川ぶんの重なりを出す。

    荒川は23区内だけで38,160ポリゴン、頂点36万の巨大ポリゴンを含む。
    素直に書くと途中で止まるので、以下の3点を守ること。

    1. 不正ジオメトリの修復は `buffer(0)` ではなく `make_valid` を使う。
       buffer(0) は荒川の1,036件で数分かかっても終わらない。make_valid なら17秒。
    2. dissolve でポリゴンをまとめない。江戸川28,000件で数分かかり、
       町丁目側を絞ってから生のままoverlayするほうが速い。
    3. overlay は町丁目を200件ずつに分けて実行し、途中結果をキャッシュする。
       荒川は1,254町丁目にかかるため一括では終わらない。
    """
    # 読み込み・修復・候補抽出もそれぞれ数十秒かかるのでキャッシュする
    geom_cache = os.path.join(CACHE_DIR, f"_geom_{name}.parquet")
    cand_cache = os.path.join(CACHE_DIR, f"_cand_{name}.csv")

    if os.path.exists(geom_cache):
        g = gpd.read_parquet(geom_cache)
    else:
        g = gpd.read_file(f"/vsizip/{paths.KSJ_KANTO_ZIP}/{member}", bbox=BBOX_23KU)
        print(f"  {name}: {len(g):,} ポリゴン（23区の範囲のみ）", flush=True)
        g = _clean(g.to_crs(CRS_AREA))[["A31a_205", "geometry"]]
        g.to_parquet(geom_cache)
    print(f"  {name}: {len(g):,} ポリゴン", flush=True)

    if os.path.exists(cand_cache):
        keys = pd.read_csv(cand_cache)["key"].tolist()
    else:
        cand = gpd.sjoin(towns[["key", "geometry"]], g[["geometry"]],
                         how="inner", predicate="intersects")
        keys = sorted(set(cand["key"]))
        pd.DataFrame({"key": keys}).to_csv(cand_cache, index=False)

    sub = towns[towns["key"].isin(keys)][["key", "town_area", "geometry"]].reset_index(drop=True)
    print(f"    重なりうる町丁目 {len(sub)}件に絞ってoverlay", flush=True)

    parts = []
    for i in range(0, len(sub), CHUNK_TOWNS):
        part_cache = os.path.join(CACHE_DIR, f"_ov_{name}_{i:05d}.csv")
        if os.path.exists(part_cache):
            parts.append(pd.read_csv(part_cache))
            continue
        chunk = sub.iloc[i:i + CHUNK_TOWNS]
        ov = gpd.overlay(chunk, g, how="intersection")
        if len(ov) == 0:
            r = pd.DataFrame(columns=["key", "town_area", "A31a_205", "a", "river"])
        else:
            ov["a"] = ov.geometry.area
            ov["river"] = name
            r = pd.DataFrame(ov[["key", "town_area", "A31a_205", "a", "river"]])
        r.to_csv(part_cache, index=False)
        parts.append(r)
        print(f"      {i + len(chunk)}/{len(sub)}", flush=True)

    return pd.concat(parts, ignore_index=True) if parts else pd.DataFrame(
        columns=["key", "town_area", "A31a_205", "a", "river"])


def national_rivers(towns):
    """荒川・多摩川・江戸川の想定最大規模。ZIPのまま範囲を絞って読む

    河川ごとに cache/ksj/ に途中結果を残す。荒川だけで1分以上かかるので、
    途中で止まっても続きから再開できるようにしてある。
    作り直したいときは cache/ksj/ を消すこと。
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    members = _kanto_members("20_")
    rows = []

    for name, frag in [("荒川", "8303040001"), ("江戸川", "8303030284"),
                       ("多摩川", "8303050001")]:
        cache = os.path.join(CACHE_DIR, f"nat_{name}.csv")
        if os.path.exists(cache):
            print(f"  {name}: キャッシュを再利用")
            rows.append(pd.read_csv(cache))
            continue
        hit = [m for m in members if frag in m]
        if not hit:
            raise FileNotFoundError(
                f"{name} のファイル（河川番号 {frag}）が "
                f"{paths.KSJ_KANTO_ZIP} に見つかりません。"
            )
        r = _river_overlay(towns, hit[0], name)
        r.to_csv(cache, index=False)
        rows.append(r)

    if not rows:
        raise RuntimeError(
            "国管理河川のポリゴンが1件も取れませんでした。"
            f"ZIP={paths.KSJ_KANTO_ZIP} の中身と /vsizip/ のパスを確認してください。"
        )

    ov = pd.concat(rows, ignore_index=True)
    ov["rank"] = ov["A31a_205"].astype(int)

    # 【重要】最大ランクで町丁目を代表させてはいけない。
    # 中央区銀座8丁目は町丁目15万㎡のうち53㎡だけがランク5(10〜20m)で、
    # 最大ランクを見出しにすると「銀座は10m浸水する」と読めてしまう。
    # 面積がいちばん広いランクを主たる想定深とし、最大は「その深さがどれだけの
    # 広さを占めるか」とセットでしか出さない。

    # 川が重なる町丁目があるので、面積を単純に足すと二重計上になる。
    # 町丁目ごとに、いちばん広くかかっている川を代表にする。
    by_river = ov.groupby(["key", "river"], as_index=False)["a"].sum()
    main = by_river.sort_values("a").groupby("key").tail(1)[["key", "river"]]
    main = main.rename(columns={"river": "nat_main_river"})

    ovm = ov.merge(main, on="key")
    ovm = ovm[ovm["river"] == ovm["nat_main_river"]]

    by_rank = ovm.groupby(["key", "rank"], as_index=False)["a"].sum()
    # 面積最大のランク＝主たる想定深
    top = by_rank.sort_values("a").groupby("key").tail(1)
    top = top.rename(columns={"rank": "nat_main_rank", "a": "nat_main_area"})
    # 最大ランクと、その面積
    deep = by_rank.sort_values("rank").groupby("key").tail(1)
    deep = deep.rename(columns={"rank": "nat_max_rank", "a": "nat_max_area"})

    # 洪水スコアに統合するための曝露度（町丁目全体で均した平均浸水深 m）。
    # 東京都データの flood_exposure とまったく同じ定義に揃えてある。
    # 川ごとに出してから最大を採る。荒川と江戸川が同時に決壊する想定ではないので足さない。
    ov["d"] = ov["rank"].map(lambda r: DEPTH_RANK[int(r)][1])
    per_river = (ov.groupby(["key", "river"])
                   .apply(lambda x: (x["d"] * x["a"]).sum() / x["town_area"].iloc[0],
                          include_groups=False)
                   .rename("e").reset_index())
    expo = per_river.groupby("key", as_index=False)["e"].max().rename(
        columns={"e": "nat_exposure"})

    tot = ovm.groupby("key", as_index=False)["a"].sum().rename(columns={"a": "nat_area"})
    rivers = ov.groupby("key")["river"].apply(lambda s: "・".join(sorted(set(s)))).reset_index()
    rivers = rivers.rename(columns={"river": "nat_rivers"})

    res = (tot.merge(top, on="key").merge(deep, on="key")
              .merge(main, on="key").merge(rivers, on="key").merge(expo, on="key")
              .merge(towns[["key", "town_area"]], on="key", how="left"))
    res["nat_ratio"] = (res["nat_area"] / res["town_area"]).clip(upper=1.0)
    res["nat_main_ratio"] = (res["nat_main_area"] / res["town_area"]).clip(upper=1.0)
    res["nat_max_ratio"] = (res["nat_max_area"] / res["town_area"]).clip(upper=1.0)
    res["nat_main_label"] = res["nat_main_rank"].map(lambda r: DEPTH_RANK[int(r)][0])
    res["nat_max_label"] = res["nat_max_rank"].map(lambda r: DEPTH_RANK[int(r)][0])
    return res[["key", "nat_ratio", "nat_exposure",
                "nat_main_rank", "nat_main_label", "nat_main_ratio",
                "nat_max_rank", "nat_max_label", "nat_max_ratio",
                "nat_main_river", "nat_rivers"]]


def aggregate(towns=None):
    towns = _towns() if towns is None else towns
    print("家屋倒壊等氾濫想定区域")
    cz = collapse_zone(towns)
    print("国管理河川（荒川・多摩川・江戸川）")
    nr = national_rivers(towns)
    m = towns[["key"]].merge(cz, on="key", how="left").merge(nr, on="key", how="left")
    m["collapse_zone"] = m["collapse_zone"].fillna(False)
    m["nat_covered"] = m["nat_ratio"].notna()
    return m


if __name__ == "__main__":
    towns = _towns()
    m = aggregate(towns).merge(towns[["key", "ward", "town", "pop"]], on="key", how="left")

    cz = m[m["collapse_zone"]]
    print()
    print("=== 家屋倒壊等氾濫想定区域 ===")
    print(f"{len(cz)}件 / 人口 {int(cz['pop'].sum()):,}人")
    print(cz.groupby("ward").size().sort_values(ascending=False).head(8).to_string())
    print("面積割合が大きい町丁目:")
    print(cz.nlargest(6, "collapse_ratio")[
        ["ward", "town", "pop", "collapse_flow_ratio", "collapse_erosion_ratio"]
    ].to_string(index=False, float_format=lambda x: f"{x:.2f}"))

    nr = m[m["nat_covered"]]
    print()
    print("=== 荒川・多摩川・江戸川の浸水想定 ===")
    print(f"{len(nr)}件 / 人口 {int(nr['pop'].sum()):,}人")
    print(nr.groupby("ward").size().sort_values(ascending=False).head(8).to_string())
    print("主たる想定深が深い町丁目（面積がいちばん広いランクで判定）:")
    print(nr.nlargest(8, "nat_main_rank")[
        ["ward", "town", "pop", "nat_ratio", "nat_main_label", "nat_main_ratio", "nat_rivers"]
    ].to_string(index=False, float_format=lambda x: f"{x:.2f}"))
    print()
    print("参考: 最大ランクだけで並べた場合（面積の裏付けが無く誤解を招く）:")
    print(nr.nlargest(5, "nat_max_rank")[
        ["ward", "town", "nat_max_label", "nat_max_ratio", "nat_main_label"]
    ].to_string(index=False, float_format=lambda x: f"{x:.4f}"))
