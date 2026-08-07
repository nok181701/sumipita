"""東京都港湾局「高潮浸水想定区域図［想定最大規模］（浸水深）」を町丁目単位に集計

想定条件: 室戸台風級(910hPa) / 東京湾に最大の高潮を発生させる経路 /
          高潮と同時の河川洪水を考慮 / 堤防等の決壊を見込む
対象は17区（世田谷・渋谷・中野・杉並・豊島・練馬を除く）。令和6年12月改定版。
"""
import geopandas as gpd
import pandas as pd
import numpy as np
import glob
import sys
sys.path.insert(0, '.')
import paths
from polygon_join import join as town_join

SHP_DIR = paths.TIDE_SHP_DIR
CRS_AREA = 6677          # データが元からこのCRS（平面直角座標系IX系）
CELL_AREA = 100.0        # 10mメッシュ = 100㎡


def aggregate():
    towns = town_join()
    towns = towns[towns.geometry.notna()][['key', 'ward', 'town', 'pop', 'geometry']].copy()
    towns = towns.to_crs(CRS_AREA)
    towns['town_area'] = towns.geometry.area
    idx = towns[['key', 'geometry']].reset_index(drop=True)

    acc = {}
    files = sorted(glob.glob(f'{SHP_DIR}/*.shp'))
    if not files:
        # 黙って0件で返すと「高潮リスクなし」として通ってしまうので必ず落とす
        raise FileNotFoundError(
            f'高潮のshpが1つも見つかりません: {SHP_DIR}\n'
            f'環境変数 SUMIPITA_TAKASHIO で場所を指定できます。')
    for i, f in enumerate(files, 1):
        g = gpd.read_file(f)
        if len(g) == 0:
            continue
        # セル中心点で判定（ポリゴン同士のoverlayより桁違いに速い）
        pts = gpd.GeoDataFrame(g[['DepthM']], geometry=g.geometry.centroid, crs=g.crs)
        j = gpd.sjoin(pts, idx, how='inner', predicate='within')
        if len(j):
            a = j.groupby('key')['DepthM'].agg(['size', 'sum', 'max'])
            for k, row in a.iterrows():
                d = acc.setdefault(k, dict(n=0, s=0.0, mx=0.0))
                d['n'] += int(row['size'])
                d['s'] += float(row['sum'])
                d['mx'] = max(d['mx'], float(row['max']))
        if i % 20 == 0:
            print(f'  {i}/{len(files)} files', file=sys.stderr)

    res = pd.DataFrame.from_dict(acc, orient='index')
    res.index.name = 'key'
    out = towns.drop(columns='geometry').set_index('key').join(res)
    out['n'] = out['n'].fillna(0)
    out['s'] = out['s'].fillna(0.0)
    out['mx'] = out['mx'].fillna(0.0)

    out['ts_flood_area'] = out['n'] * CELL_AREA
    out['ts_flood_ratio'] = (out['ts_flood_area'] / out['town_area']).clip(0, 1)
    # 浸水域内の平均浸水深
    out['ts_mean_depth'] = (out['s'] / out['n'].replace(0, np.nan)).fillna(0)
    out['ts_max_depth'] = out['mx']
    # 町丁目全体で均した平均浸水深（洪水側と同じ定義）
    out['ts_exposure'] = out['ts_flood_ratio'] * out['ts_mean_depth']
    return out.reset_index()[['key', 'ward', 'town', 'pop', 'ts_flood_ratio',
                              'ts_mean_depth', 'ts_max_depth', 'ts_exposure']]


if __name__ == '__main__':
    r = aggregate()
    hit = r['ts_flood_ratio'] > 0
    print(f'町丁目 {len(r)}件 / 高潮浸水想定区域にかかる {hit.sum()}件 ({hit.mean()*100:.1f}%)')
    print(f'該当町丁目の人口合計 {int(r.loc[hit, "pop"].sum()):,}人')
    print()
    print('=== 高潮曝露度の分布（該当のみ）===')
    print(r.loc[hit, 'ts_exposure'].describe([.25, .5, .75, .9]).to_string())
    print()
    print('=== 高潮リスク上位12 ===')
    print(r.nlargest(12, 'ts_exposure')[
        ['ward', 'town', 'pop', 'ts_flood_ratio', 'ts_mean_depth', 'ts_max_depth']
    ].to_string(index=False, float_format=lambda x: f'{x:.2f}'))
    print()
    print('=== 区別 該当町丁目数 / 平均曝露度 ===')
    w = r[hit].groupby('ward').agg(n=('key', 'size'), expo=('ts_exposure', 'mean'),
                                   pop=('pop', 'sum')).sort_values('expo', ascending=False)
    print(w.to_string(float_format=lambda x: f'{x:.2f}'))
    r.to_csv('cache/takashio_stats.csv', index=False)
