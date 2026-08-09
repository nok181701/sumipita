"""すみピタ 町丁目ポリゴン結合"""
import geopandas as gpd
import sys
sys.path.insert(0, '.')
import paths
from score_proto import norm, load_pop

SHP = paths.POLYGON_SHP
WARD_CODES = [f'{i:03d}' for i in range(101, 124)]   # 23区 (CITYは3桁形式)

# 人口データのkey -> ポリゴンのkey
# 令和2年ポリゴンと令和7年住基データの間で名称/区画が異なるケースの手動対応
POLYGON_ALIAS = {
    # A. 町名変更（「神田」が冠された）
    '千代田区|神田三崎町1丁目': '千代田区|三崎町1丁目',
    '千代田区|神田三崎町2丁目': '千代田区|三崎町2丁目',
    '千代田区|神田三崎町3丁目': '千代田区|三崎町3丁目',
    '千代田区|神田猿楽町1丁目': '千代田区|猿楽町1丁目',
    '千代田区|神田猿楽町2丁目': '千代田区|猿楽町2丁目',
    # B. ポリゴン側が丁目未分割（複数町丁目が同一ポリゴンを共有）
    '千代田区|神田司町2丁目': '千代田区|神田司町',
    '千代田区|神田多町2丁目': '千代田区|神田多町',
    '千代田区|神田鍛冶町3丁目': '千代田区|神田鍛冶町',
    '大田区|令和島1丁目': '大田区|令和島',
    '大田区|令和島2丁目': '大田区|令和島',
    '新宿区|四谷1丁目': '新宿区|四谷',
    '新宿区|戸塚町1丁目': '新宿区|戸塚町',
    # C. 複数町名が1ポリゴンに統合
    '足立区|入谷町': '足立区|入谷町,舎人町',
    '足立区|舎人町': '足立区|入谷町,舎人町',
    # D. 異体字
    '渋谷区|松濤1丁目': '渋谷区|松涛1丁目',
    '渋谷区|松濤2丁目': '渋谷区|松涛2丁目',
    # E. 令和2年時点で未成立の町丁目（ポリゴンなし）
    #    江東区海の森1〜3丁目 は対応ポリゴンが存在しない → 未解決のまま
}


def load_polygons(path=SHP):
    g = gpd.read_file(paths.require(path, '町丁目ポリゴン (r2ka13.shp)'))
    g = g[g['CITY'].astype(str).isin(WARD_CODES) & g['S_NAME'].notna()].copy()
    g['poly_key'] = g['CITY_NAME'] + '|' + g['S_NAME'].map(norm)
    g = g.to_crs(4326)   # JGD2000 -> WGS84
    # 同一keyが複数フィーチャに分かれている場合は統合
    g = g.dissolve(by='poly_key', aggfunc={'AREA': 'sum', 'KEY_CODE': 'first',
                                           'CITY_NAME': 'first', 'S_NAME': 'first'})
    return g.reset_index()


def join(pop_path=None):
    pop_path = pop_path or paths.require(paths.POPULATION, '住民基本台帳 人口データ (jy25qv0500.csv)')
    p = load_pop(pop_path)
    g = load_polygons()
    p['poly_key'] = p['key'].map(lambda k: POLYGON_ALIAS.get(k, k))
    merged = p.merge(g[['poly_key', 'geometry', 'AREA', 'KEY_CODE']],
                     on='poly_key', how='left')
    return gpd.GeoDataFrame(merged, geometry='geometry', crs=4326)


if __name__ == '__main__':
    gdf = join()
    ok = gdf['geometry'].notna()
    print(f'町丁目 {len(gdf)}件 / ポリゴン紐付け成功 {ok.sum()}件 ({ok.mean()*100:.2f}%)')
    print()
    print('未解決:')
    print(gdf.loc[~ok, ['ward', 'town', 'pop']].to_string(index=False))
    print()
    # 共有ポリゴン（複数町丁目が同じポリゴンを指す）の確認
    dup = gdf[ok].groupby('poly_key').size()
    dup = dup[dup > 1]
    print(f'共有ポリゴン {len(dup)}件:')
    for k, n in dup.items():
        print(f'  {k} <- {n}町丁目')
    print()
    # 面積と人口密度
    g2 = gdf[ok].copy()
    g2['area_km2'] = g2['AREA'] / 1e6
    g2['density'] = g2['pop'] / g2['area_km2']
    print('人口密度 上位5 (人/km2):')
    print(g2.nlargest(5, 'density')[['ward', 'town', 'pop', 'area_km2', 'density']].to_string(index=False))
