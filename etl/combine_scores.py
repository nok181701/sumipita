"""スムピタ 総合スコア（治安 / 洪水 / 高潮 / 地盤 の4軸並列）

4軸を合成せず並列表示する。引越し先選びでは
「豪雨には強いが台風には弱い」といった区別こそが判断材料になるため。

地盤軸は当初「平均地盤高（標高）」だったが、高潮スコアと相関0.856あり
1軸まるごと冗長だった。液状化（ボーリング地点のPL判定）に入れ替え、
標高は高潮スコアの補足情報に降格している。
"""
import pandas as pd
import numpy as np
import sys
sys.path.insert(0, '.')
from score_proto import build as build_safety
from tokyo_flood import aggregate as tokyo_flood
from takashio import aggregate as takashio_flood
from liquefaction import aggregate as liquefaction
from ksj_flood import aggregate as ksj_flood

MIN_POP = 100

# 高潮浸水想定区域図の対象外の区。ここを「安全」として集計しないための定義。
TIDE_OUT_OF_SCOPE = {'世田谷区', '渋谷区', '中野区', '杉並区', '豊島区', '練馬区'}


def pct_score(series, valid=None):
    """値が小さいほど良い指標を 0-100 に正規化（0なら100点）"""
    s = series if valid is None else series.where(valid)
    return s.rank(method='max', ascending=False, pct=True) * 100


def build():
    safety = build_safety()
    flood = tokyo_flood()
    tide = takashio_flood()
    liq = liquefaction()
    ksj = ksj_flood()

    m = safety.merge(
        flood[['key', 'tk_coverage', 'tk_flood_ratio', 'tk_mean_depth', 'tk_max_depth',
               'tk_mean_elev', 'tk_min_elev', 'tk_below_sea']],
        on='key', how='left')
    m = m.merge(
        tide[['key', 'ts_flood_ratio', 'ts_mean_depth', 'ts_max_depth', 'ts_exposure']],
        on='key', how='left')
    m = m.merge(liq, on='key', how='left')
    m = m.merge(ksj, on='key', how='left')

    pop_ok = m['pop'] >= MIN_POP
    flood_valid = pop_ok & m['tk_coverage'].fillna(False)

    # --- 1. 治安スコア（score_proto で算出済み: safety_score）---

    # --- 2. 洪水スコア: 町丁目全体で均した平均浸水深(m) ---
    # 東京都「浸水予想区域図」（実数値m・外水+内水）が主軸。
    m['tokyo_exposure'] = (m['tk_flood_ratio'] * m['tk_mean_depth']).fillna(0)

    # 荒川・多摩川・江戸川は国管理河川で東京都データに入っていない。
    # 当初これをスコアから外していたが、**千代田区岩本町一丁目と中央区東日本橋3丁目が
    # 洪水スコア100点満点なのに荒川で1.7〜1.8mの浸水想定**という状態になっていた。
    # 国のランク値を代表値(m)に置き換えれば東京都データと同じ単位になるので統合する。
    # 足さずに大きいほうを採るのは、複数の川が同時に決壊する想定ではないため。
    m['nat_exposure'] = m['nat_exposure'].fillna(0)
    m['flood_exposure'] = m[['tokyo_exposure', 'nat_exposure']].max(axis=1)
    m['flood_source'] = np.where(
        m['nat_exposure'] > m['tokyo_exposure'], '国管理河川', '東京都')
    m['flood_score'] = pct_score(m['flood_exposure'], flood_valid)

    # --- 3. 高潮スコア: 同じ定義（面積割合 × 浸水域内の平均深さ）---
    # 対象は17区。世田谷・渋谷・中野・杉並・豊島・練馬は区域外＝曝露0として扱う
    m['tide_exposure'] = m['ts_exposure'].fillna(0)
    m['tide_score'] = pct_score(m['tide_exposure'], pop_ok)

    # --- 4. 地盤スコア: 液状化のしやすさ ---
    # ボーリング地点のPL判定を経験ベイズで平滑化した値（liquefaction.py で算出）。
    # 点が1本しかない町丁目をその1本だけで決めつけないための処理が入っている。
    for c in ['liq_covered', 'liq_thin', 'liq_history', 'liq_1923', 'liq_2011']:
        m[c] = m[c].fillna(False).astype(bool)
    liq_valid = pop_ok & m['liq_covered']
    m['ground_score'] = pct_score(m['liq_pl'], liq_valid)

    # 標高は軸から外したが、高潮スコアの補足として表示するので値は残す。
    # 参考値として順位も持っておく（UIには出さない）。
    m['elev_score'] = m['tk_mean_elev'].where(flood_valid).rank(method='min', pct=True) * 100
    m['below_sea_flag'] = m['tk_below_sea'].fillna(False)

    # --- 洪水スコアに含まれていないリスク（独立表示）---
    # どちらもスコアには混ぜない。混ぜると意味が壊れるか、警告が薄まる。
    #
    # 1. 家屋倒壊等氾濫想定区域: 家が流される・倒壊するおそれのある区域。
    #    「2階に逃げれば助かる」が通用しない、浸水深とは種類の違うリスク。
    # 2. 荒川・多摩川・江戸川: 国管理河川なので東京都「浸水予想区域図」に入っておらず、
    #    **洪水スコアの計算に一切含まれていない**。荒川沿いで洪水スコアが良好に見える
    #    町丁目が実在するので、スコアと並べて必ず注記を出すこと。
    for c in ['collapse_zone', 'nat_covered']:
        m[c] = m[c].fillna(False).astype(bool)
    for c in ['collapse_flow_ratio', 'collapse_erosion_ratio', 'collapse_ratio']:
        m[c] = m[c].fillna(0.0)

    # --- 業務地区フラグ（注記表示用・暫定）---
    # 犯罪の分母は夜間人口だが、業務地区では昼間人口が桁違いに多く、
    # 来訪者が被害に遭った件数まで居住者数で割ってしまうためスコアが不当に下がる。
    # 本来は国勢調査「従業地・通学地集計」の昼間人口を使うべきだが未取得のため、
    # スコアから除外している来訪者由来の犯罪（万引き・置引き・占有離脱物横領）の
    # 人口比を暫定的な代理指標にする。
    # 【精度の限界】神田神保町一丁目は検出できるが秋葉原(外神田二丁目)は取りこぼす。
    # あくまで注記を出すためのフラグで、スコア自体の補正には使わない。
    visitor = m[['非侵入窃盗万引き', '非侵入窃盗置引き', 'その他占有離脱物横領']].sum(axis=1)
    m['visitor_rate'] = (visitor / m['pop'] * 1000).where(pop_ok)
    m['business_area_flag'] = m['visitor_rate'] >= m['visitor_rate'].quantile(0.90)

    return m


if __name__ == '__main__':
    m = build()
    ok = m[['safety_score', 'flood_score', 'tide_score', 'ground_score']].notna().all(axis=1)
    print(f'町丁目 {len(m)}件 / 4軸すべて算出可 {ok.sum()}件')
    print(f'  地盤(液状化)のみ未算出 {int((m["safety_score"].notna() & m["ground_score"].isna()).sum())}件'
          f' — ボーリング地点が1本も無い町丁目')
    print()
    print('=== 地盤（液状化）===')
    lq = m[m['ground_score'].notna()]
    print(f'算出 {len(lq)}件 / うちボーリング2本以下（参考程度） {int(lq["liq_thin"].sum())}件')
    print(f'液状化の実績がある町丁目 {int(m["liq_history"].sum())}件'
          f'（1923関東 {int(m["liq_1923"].sum())} / 2011東北 {int(m["liq_2011"].sum())}）')
    print('液状化リスクが高い順:')
    print(lq.nsmallest(6, 'ground_score')[
        ['ward', 'town', 'pop', 'liq_points', 'liq_large', 'liq_pl', 'ground_score']
    ].to_string(index=False, float_format=lambda x: f'{x:.1f}'))
    print()
    print('=== 曝露度の比較（町丁目全体の平均浸水深 m）===')
    cmp = pd.DataFrame({
        '洪水': m.loc[ok, 'flood_exposure'].describe([.5, .9]),
        '高潮': m.loc[ok, 'tide_exposure'].describe([.5, .9]),
    })
    print(cmp.to_string(float_format=lambda x: f'{x:.2f}'))
    # 区平均は出さない。千代田区のように居住者が少ない業務地区の町丁目が
    # 多数を占める区では、夜間人口を分母にした発生率が実態より大幅に悪化し、
    # 区平均が誤解を招く（千代田区の区平均28.5 に対し、住宅地の四番町は86.5）。
    # このアプリは町丁目単位で見るためのものなので、区平均はUIに出さない。
    print()
    print('=== 洪水は軽微だが高潮が深刻（台風特化リスク）===')
    g = m[ok].copy()
    g['diff'] = g['flood_score'] - g['tide_score']
    print(g.nlargest(8, 'diff')[
        ['ward', 'town', 'pop', 'flood_score', 'tide_score', 'tide_exposure', 'diff']
    ].to_string(index=False, float_format=lambda x: f'{x:.1f}'))
    print()
    print('=== 洪水スコアに含まれていないリスク ===')
    cz = m[m['collapse_zone']]
    print(f'家屋倒壊等氾濫想定区域: {len(cz)}件 / 人口 {int(cz["pop"].sum()):,}人')
    nt = m[m['nat_covered']]
    print(f'荒川・多摩川・江戸川の浸水想定: {len(nt)}件 / 人口 {int(nt["pop"].sum()):,}人')
    lead = m[ok & (m['flood_source'] == '国管理河川')]
    print(f'洪水スコアが国管理河川で決まった町丁目: {len(lead)}件 '
          f'/ 人口 {int(lead["pop"].sum()):,}人')
    print('（統合しなければ実態より高い点数のままだった町丁目）')
    print(lead.nlargest(6, 'nat_exposure')[
        ['ward', 'town', 'pop', 'flood_score', 'tokyo_exposure', 'nat_exposure', 'nat_rivers']
    ].to_string(index=False, float_format=lambda x: f'{x:.2f}'))
    print()
    print('=== 4軸すべて良好（治安70+ / 洪水70+ / 高潮70+ / 地盤70+）===')
    good = m[ok & (m['safety_score'] >= 70) & (m['flood_score'] >= 70)
             & (m['tide_score'] >= 70) & (m['ground_score'] >= 70)]
    # 【重要】高潮スコアは対象区域外の6区で一律100点になる。単純に数えると
    # 「調べていない」を「満点」として集計してしまい、内陸区が不当に上位を占める。
    # 実際 129件のうち107件が高潮未調査の内陸区で、実測4軸すべて良好なのは22件しかない。
    measured = ~good['ward'].isin(TIDE_OUT_OF_SCOPE)
    print(f'{len(good)}件 / 人口 {int(good["pop"].sum()):,}人'
          f'（うち {int((~measured).sum())}件 は高潮が未調査の内陸区）')
    print(f'高潮まで実測して4軸すべて良好: {int(measured.sum())}件 / '
          f'人口 {int(good[measured]["pop"].sum()):,}人')
    print(good[measured].groupby('ward').size().sort_values(ascending=False).to_string())
    m.to_csv('cache/sumupita_scores.csv', index=False)
