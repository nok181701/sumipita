"""スムピタ ETL: D1投入用CSVとR2用GeoJSONを書き出す

GitHub Actions の定期実行でこれを走らせ、成果物を D1 / R2 に push する想定。
重いGIS処理（geopandas）はここで完結させ、Workers側は読むだけにする。
"""
import geopandas as gpd
import pandas as pd
import json
import os
import sys
sys.path.insert(0, '.')
from polygon_join import join as town_join

OUT = 'dist'
DATA_YEAR = 2025
SCORES_CSV = 'cache/sumupita_scores.csv'
WARD_CODES = {w: f'131{i:02d}' for i, w in enumerate(
    ['千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区',
     '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区',
     '北区', '荒川区', '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区'], start=1)}
# 高潮浸水想定区域図の対象17区（これ以外は台風リスク対象外）
TIDE_WARDS = {'千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区',
              '江東区', '品川区', '目黒区', '大田区', '北区', '荒川区', '板橋区',
              '足立区', '葛飾区', '江戸川区'}


def load_scores(rebuild=False):
    """4軸スコアを取得する。

    浸水・高潮の集計は600万点規模の空間結合で数分かかるため、既に
    `cache/sumupita_scores.csv` があるときは既定でそれを再利用する。
    生データを更新したときや、スコア定義を変えたときは rebuild=True で
    combine_scores から作り直すこと（GitHub Actions では毎回こちら）。
    """
    if not rebuild and os.path.exists(SCORES_CSV):
        print(f'{SCORES_CSV} を再利用します（作り直すには --rebuild）')
        return pd.read_csv(SCORES_CSV)
    from combine_scores import build as build_scores
    return build_scores()


def export(rebuild=False):
    os.makedirs(OUT, exist_ok=True)
    m = load_scores(rebuild)
    geo = town_join()

    # --- towns ---
    g = geo[geo.geometry.notna()].to_crs(6677)
    cent = g.geometry.centroid.to_crs(4326)
    geo_info = pd.DataFrame({
        'key': g['key'].values,
        'kokusei_code': g['KEY_CODE'].values,
        'lat': cent.y.values,
        'lng': cent.x.values,
        'area_m2': g.geometry.area.values,
        'shared_polygon_key': g['poly_key'].values,
    })
    t = m[['key', 'ward', 'town', 'pop', 'households']].merge(geo_info, on='key', how='left')
    t['ward_code'] = t['ward'].map(WARD_CODES)
    t['has_polygon'] = t['lat'].notna().astype(int)
    # ポリゴンを共有していない場合は NULL にする
    dup = t['shared_polygon_key'].duplicated(keep=False) & t['shared_polygon_key'].notna()
    t.loc[~dup, 'shared_polygon_key'] = None
    t = t.rename(columns={'pop': 'population'})
    t[['key', 'ward', 'town', 'ward_code', 'kokusei_code', 'lat', 'lng', 'area_m2',
       'population', 'households', 'has_polygon', 'shared_polygon_key']].to_csv(
        f'{OUT}/towns.csv', index=False)

    # --- town_scores ---
    s = m[['key']].copy()
    s['data_year'] = DATA_YEAR
    for c in ['safety_score', 'flood_score', 'tide_score', 'ground_score',
              'serious_score', 'daily_score',
              'flood_exposure', 'tide_exposure']:
        # ground_score は令和7年度改訂の液状化予測図ベース（旧: 平均地盤高）
        s[c] = m[c]
    s['elev_score'] = m['elev_score']   # 旧・地盤スコア（標高順位）。参考値
    s['mean_elev_m'] = m['tk_mean_elev']
    s['below_sea'] = m['below_sea_flag'].fillna(False).astype(int)
    s['business_area'] = m['business_area_flag'].fillna(False).astype(int)
    s['scored'] = m['safety_score'].notna().astype(int)
    s.to_csv(f'{OUT}/town_scores.csv', index=False)

    # --- crime_counts ---
    c = m[['key']].copy()
    c['data_year'] = DATA_YEAR
    c['robbery'] = m['凶悪犯強盗'].fillna(0)
    c['violence'] = m[['粗暴犯暴行', '粗暴犯傷害', '粗暴犯脅迫', '粗暴犯恐喝']].sum(axis=1)
    c['burglary'] = m['burglary_r7'].fillna(0)   # 空き巣+忍込み+居空き（表示用の生件数）
    c['bicycle'] = m['非侵入窃盗自転車盗'].fillna(0)
    c['vehicle'] = m[['非侵入窃盗車上ねらい', '非侵入窃盗自動車盗',
                      '非侵入窃盗オートバイ盗']].sum(axis=1)
    c['snatch'] = m['非侵入窃盗ひったくり'].fillna(0)
    c['pickpocket'] = m['非侵入窃盗すり'].fillna(0)
    c['total'] = m['総合計'].fillna(0)
    # 画面のスコア根拠表示で使う内訳。合算値だけだと「うち強盗◯件」が出せない。
    c['serious_2y'] = m['serious'].fillna(0)      # 重大犯罪 R6+R7
    c['serious_r7'] = m['serious_r7'].fillna(0)
    c['daily_r7'] = m['daily'].fillna(0)
    c['assault'] = m['粗暴犯暴行'].fillna(0)
    c['injury'] = m['粗暴犯傷害'].fillna(0)
    c['burglary_akisu'] = m['侵入窃盗空き巣'].fillna(0)
    c['burglary_shinobi'] = m['侵入窃盗忍込み'].fillna(0)
    c['burglary_izora'] = m['侵入窃盗居空き'].fillna(0)
    for col in c.columns[2:]:
        c[col] = c[col].astype(int)
    c.to_csv(f'{OUT}/crime_counts.csv', index=False)

    # --- hazard_details ---
    h = m[['key']].copy()
    h['data_year'] = DATA_YEAR
    h['flood_ratio'] = m['tk_flood_ratio']
    h['flood_mean_depth'] = m['tk_mean_depth']
    h['flood_max_depth'] = m['tk_max_depth']
    h['flood_covered'] = m['tk_coverage'].fillna(False).astype(int)
    # 主にどの流域の浸水想定で決まっているか（「近くに川があるから」の裏付け）。
    # 浸水が無い町丁目では該当流域が無いので空欄になる。
    h['flood_basin'] = m['tk_main_basin']
    h['flood_basin_ratio'] = m['tk_main_basin_ratio']
    h['flood_basins'] = m['tk_basins']
    h['tide_ratio'] = m['ts_flood_ratio'].fillna(0)
    h['tide_mean_depth'] = m['ts_mean_depth'].fillna(0)
    h['tide_max_depth'] = m['ts_max_depth'].fillna(0)
    h['tide_in_scope'] = m['ward'].isin(TIDE_WARDS).astype(int)
    h['mean_elev_m'] = m['tk_mean_elev']
    h['min_elev_m'] = m['tk_min_elev']
    # 地盤（液状化）。ボーリング地点が無い町丁目は liq_covered=0 で、
    # スコアが無いことと液状化しないことを取り違えないようにする
    h['liq_points'] = m['liq_points'].fillna(0).astype(int)
    h['liq_small'] = m['liq_small'].fillna(0).astype(int)
    h['liq_mid'] = m['liq_mid'].fillna(0).astype(int)
    h['liq_large'] = m['liq_large'].fillna(0).astype(int)
    h['liq_pl'] = m['liq_pl']
    h['liq_covered'] = m['liq_covered'].fillna(False).astype(int)
    h['liq_thin'] = m['liq_thin'].fillna(False).astype(int)
    h['liq_history'] = m['liq_history'].fillna(False).astype(int)
    h['liq_1923'] = m['liq_1923'].fillna(False).astype(int)
    h['liq_2011'] = m['liq_2011'].fillna(False).astype(int)
    # 家屋倒壊等氾濫想定区域。浸水深とは別種のリスクでスコアに混ぜていないため、
    # 画面では独立した警告として出す。面積割合をそのまま持つ。
    h['collapse_zone'] = m['collapse_zone'].fillna(False).astype(int)
    h['collapse_flow_ratio'] = m['collapse_flow_ratio'].fillna(0)
    h['collapse_erosion_ratio'] = m['collapse_erosion_ratio'].fillna(0)
    # 荒川・多摩川・江戸川。洪水スコアには統合済みだが、
    # 「どの川で、どれくらいの深さか」は点数だけでは分からないので内訳を残す。
    h['national_river'] = m['nat_covered'].fillna(False).astype(int)
    h['nat_rivers'] = m['nat_rivers']
    h['nat_ratio'] = m['nat_ratio']
    h['nat_exposure'] = m['nat_exposure'].fillna(0)
    h['nat_main_label'] = m['nat_main_label']
    h['nat_main_ratio'] = m['nat_main_ratio']
    h['nat_max_label'] = m['nat_max_label']
    h['nat_max_ratio'] = m['nat_max_ratio']
    # 洪水スコアが東京都と国のどちらのデータで決まったか
    h['flood_source'] = m['flood_source']
    h['tokyo_exposure'] = m['tokyo_exposure']
    h.to_csv(f'{OUT}/hazard_details.csv', index=False)

    # --- R2用 GeoJSON（区ごとに分割。フロントは表示中の区だけ取得する）---
    os.makedirs(f'{OUT}/geojson', exist_ok=True)
    gj = geo[geo.geometry.notna()][['key', 'ward', 'town', 'geometry']].to_crs(4326)
    # 座標を6桁に丸めてサイズ削減（約11cm精度で十分）
    gj['geometry'] = gj.geometry.set_precision(1e-6)
    for ward, sub in gj.groupby('ward'):
        code = WARD_CODES[ward]
        sub.to_file(f'{OUT}/geojson/{code}.geojson', driver='GeoJSON')
    # 全区まとめ（初期表示・区単位の俯瞰用に簡略化したもの）
    simple = gj.copy()
    simple['geometry'] = simple.geometry.simplify(0.0001)
    simple.dissolve(by='ward').reset_index()[['ward', 'geometry']].to_file(
        f'{OUT}/geojson/wards.geojson', driver='GeoJSON')

    return t, s, c, h


if __name__ == '__main__':
    rebuild = '--rebuild' in sys.argv
    t, s, c, h = export(rebuild)
    print(f'towns          {len(t):,} 行')
    print(f'town_scores    {len(s):,} 行')
    print(f'crime_counts   {len(c):,} 行')
    print(f'hazard_details {len(h):,} 行')
    print()
    for f in sorted(os.listdir(OUT)):
        p = f'{OUT}/{f}'
        if os.path.isfile(p):
            print(f'  {f:24s} {os.path.getsize(p)/1024:>8.1f} KB')
    gd = f'{OUT}/geojson'
    tot = sum(os.path.getsize(f'{gd}/{f}') for f in os.listdir(gd))
    print(f'  geojson/ ({len(os.listdir(gd))}ファイル) {tot/1024/1024:>6.1f} MB')
