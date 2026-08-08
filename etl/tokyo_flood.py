"""東京都「浸水予想区域図」浸水深・地盤高データを町丁目単位に集計

約10mメッシュの点データ（浸水深m・地盤高m・緯度経度）を町丁目ポリゴンに空間結合する。
国土数値情報と違い、外水氾濫＋内水氾濫の両方を含み、浸水深が実数値で入っている。
"""
import geopandas as gpd
import pandas as pd
import numpy as np
import glob
import sys
sys.path.insert(0, '.')
import paths
from polygon_join import join as town_join

CSV_DIR = paths.FLOOD_CSV_DIR
CHUNK = 400_000

# 元データは1河川・流域につき1ファイル（shinsui_<スラグ>.csv）。
# ファイル名以外に流域を示す列が無いため、ファイル名から流域を復元する。
# 「なぜこの点数なのか」（近くにどの川があるからか）を出すために使う。
#
# 【重要】ラベルは東京都建設局の公式な図面名称に合わせること。
# ファイル名だけから安易に「野川流域」等と付けると、実際の対象河川より狭い
# 名前になり誤解を招く。例えば shinsui_nogawa.csv の正式名称は
# 「野川、仙川、入間川、谷沢川及び丸子川流域」で、丸子川は大田区田園調布
# 付近（多摩川沿い）まで流れており、「野川流域」とだけ表示すると
# 「野川なんて近くに無いのに」と誤解される。
# 参照: https://www.kensetsu.metro.tokyo.lg.jp/river/chusho_seibi/panhulink/menu
BASIN_LABELS = {
    'kandagawa': '神田川流域',
    'sumidagawa': '隅田川・新河岸川流域',
    'syakujiigawa': '石神井川・白子川流域',
    'nogawa': '野川・仙川・入間川・谷沢川・丸子川流域',
    'nakagawa': '中川・綾瀬川圏域',
    'koutounaibu': '江東内部河川流域',
    'jyounantiku': '城南地区河川流域（渋谷川・古川・目黒川・立会川・内川・呑川）',
}


def _basin_label(path):
    stem = path.split('/')[-1]
    slug = stem[len('shinsui_'):-len('.csv')]
    return BASIN_LABELS.get(slug, slug)


def town_polygons():
    t = town_join()
    t = t[t.geometry.notna()][['key', 'ward', 'town', 'pop', 'geometry']].copy()
    t['town_area'] = t.to_crs(6677).geometry.area
    return t


def aggregate():
    towns = town_polygons()
    idx = towns[['key', 'geometry']].reset_index(drop=True)

    acc = {}         # key -> dict of accumulators（町丁目全体、既存の集計）
    basin_acc = {}   # (key, basin) -> 浸水した点数。主因の流域を出すための集計
    files = sorted(glob.glob(f'{CSV_DIR}/shinsui_*.csv'))
    if not files:
        raise FileNotFoundError(
            f'浸水予想区域図のCSVが1つも見つかりません: {CSV_DIR}/shinsui_*.csv')
    for f in files:
        name = f.split('/')[-1]
        basin = _basin_label(f)
        total = 0
        for ch in pd.read_csv(f, encoding='utf-8-sig', chunksize=CHUNK):
            pts = gpd.GeoDataFrame(
                ch[['浸水深', '地盤高']],
                geometry=gpd.points_from_xy(ch['経度'], ch['緯度']),
                crs=4326)
            j = gpd.sjoin(pts, idx, how='inner', predicate='within')
            if len(j) == 0:
                continue
            g = j.groupby('key').agg(
                n=('浸水深', 'size'),
                n_flood=('浸水深', lambda s: int((s > 0).sum())),
                depth_sum=('浸水深', 'sum'),
                depth_max=('浸水深', 'max'),
                elev_sum=('地盤高', 'sum'),
                elev_min=('地盤高', 'min'),
            )
            for k, row in g.iterrows():
                a = acc.setdefault(k, dict(n=0, n_flood=0, depth_sum=0.0,
                                           depth_max=0.0, elev_sum=0.0, elev_min=1e9))
                a['n'] += row['n']
                a['n_flood'] += row['n_flood']
                a['depth_sum'] += row['depth_sum']
                a['depth_max'] = max(a['depth_max'], row['depth_max'])
                a['elev_sum'] += row['elev_sum']
                a['elev_min'] = min(a['elev_min'], row['elev_min'])

                b = basin_acc.setdefault((k, basin), 0)
                basin_acc[(k, basin)] = b + row['n_flood']
            total += len(j)
        print(f'  {name}: {total:,} 点を割当', file=sys.stderr)

    res = pd.DataFrame.from_dict(acc, orient='index')
    res.index.name = 'key'
    out = towns.drop(columns='geometry').set_index('key').join(res)
    out['n'] = out['n'].fillna(0).astype(int)
    covered = out['n'] > 0
    out['tk_coverage'] = covered
    # 浸水域の面積割合（グリッド点の比率＝面積比）
    out['tk_flood_ratio'] = (out['n_flood'] / out['n']).where(covered)
    # 浸水域内の平均浸水深（0mの点は除外して平均）
    out['tk_mean_depth'] = (out['depth_sum'] / out['n_flood'].replace(0, np.nan)).where(covered)
    out['tk_max_depth'] = out['depth_max'].where(covered)
    # 地盤高
    out['tk_mean_elev'] = (out['elev_sum'] / out['n']).where(covered)
    out['tk_min_elev'] = out['elev_min'].where(covered).replace(1e9, np.nan)
    # ゼロメートル地帯（平均地盤高が海抜0m未満）
    out['tk_below_sea'] = out['tk_mean_elev'] < 0

    # 主にどの流域の浸水想定で点数が決まっているか。
    # 町丁目が2つ以上の流域にまたがることがあるので、浸水した点数がいちばん
    # 多い流域を代表にする（ksj_flood.py の nat_main_river と同じ考え方）。
    basin_df = pd.DataFrame(
        [{'key': k, 'basin': b, 'n_flood': n}
         for (k, b), n in basin_acc.items() if n > 0])
    if len(basin_df):
        main = basin_df.sort_values('n_flood').groupby('key').tail(1).set_index('key')
        out['tk_main_basin'] = main['basin']
        out['tk_main_basin_ratio'] = (main['n_flood'] / out['n_flood']).where(covered)
        # 区切り文字は "|" を使う。流域ラベル自体に "・" を含むもの
        # （中川・綾瀬川流域、城南地区（目黒川・呑川など）等）があり、
        # "・" で区切ると流域名の内部がちぎれて誤分割されるため。
        basins_desc = (
            basin_df.sort_values('n_flood', ascending=False)
            .groupby('key')['basin']
            .apply(lambda s: '|'.join(dict.fromkeys(s)))
        )
        out['tk_basins'] = basins_desc
    else:
        out['tk_main_basin'] = None
        out['tk_main_basin_ratio'] = None
        out['tk_basins'] = None
    return out.reset_index()


if __name__ == '__main__':
    r = aggregate()
    cov = r['tk_coverage']
    print(f'町丁目 {len(r)}件 / データ範囲内 {cov.sum()}件 ({cov.mean()*100:.1f}%)')
    print()
    print('=== 浸水面積割合の分布（データ範囲内）===')
    print(r.loc[cov, 'tk_flood_ratio'].describe([.25, .5, .75, .9]).to_string())
    print()
    print('=== 平均浸水深の分布 ===')
    print(r.loc[cov, 'tk_mean_depth'].describe([.5, .9, .99]).to_string())
    print()
    print('=== 浸水リスク上位10（面積割合×平均深さ）===')
    r['expo'] = r['tk_flood_ratio'] * r['tk_mean_depth']
    print(r.nlargest(10, 'expo')[
        ['ward', 'town', 'pop', 'tk_flood_ratio', 'tk_mean_depth',
         'tk_max_depth', 'tk_mean_elev']
    ].to_string(index=False, float_format=lambda x: f'{x:.2f}'))
    print()
    print('=== ゼロメートル地帯（平均地盤高 < 0m）===')
    b = r[r['tk_below_sea'] == True]
    print(f'{len(b)}件 / 人口合計 {int(b["pop"].sum()):,}人')
    print(b.groupby('ward').size().sort_values(ascending=False).to_string())
    print()
    print('=== 区別 平均浸水深 ===')
    print(r[cov].groupby('ward')['tk_mean_depth'].mean().sort_values(ascending=False)
          .to_string(float_format=lambda x: f'{x:.2f}'))
    r.to_csv('cache/tokyo_flood_stats.csv', index=False)
