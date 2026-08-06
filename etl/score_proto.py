"""スムピタ 治安スコア プロトタイプ検証"""
import pandas as pd, re, unicodedata
import paths

WARDS = ['千代田区','中央区','港区','新宿区','文京区','台東区','墨田区','江東区','品川区',
         '目黒区','大田区','世田谷区','渋谷区','中野区','杉並区','豊島区','北区','荒川区',
         '板橋区','練馬区','足立区','葛飾区','江戸川区']
KAN = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}
VARIANT = {'麴':'麹','塚':'塚','斉':'斎'}


def k2n(k):
    if '十' in k:
        a, b = k.split('十')
        return (KAN[a] if a else 1) * 10 + (KAN[b] if b else 0)
    return KAN[k]


def norm(s):
    s = str(s)
    # 異体字セレクタ(U+FE00-FE0F, U+E0100-E01EF)を除去
    s = ''.join(ch for ch in s if not (0xFE00 <= ord(ch) <= 0xFE0F or 0xE0100 <= ord(ch) <= 0xE01EF))
    s = unicodedata.normalize('NFKC', s).strip().replace('\u3000', '').replace(' ', '')
    m = re.search(r'([一二三四五六七八九十]+)丁目$', s)
    if m:
        s = s[:m.start()] + str(k2n(m.group(1))) + '丁目'
    s = s.replace('ヶ', 'ケ').replace('ノ', 'の')
    for a, b in VARIANT.items():
        s = s.replace(a, b)
    return s


def load_crime(path):
    d = pd.read_csv(path, encoding='cp932')
    def ward_of(s):
        for w in WARDS:
            if s.startswith(w):
                return w
        return None
    d['ward'] = d['市区町丁'].map(ward_of)
    d = d[d['ward'].notna()
          & ~d['市区町丁'].str.contains('計')
          & ~d['市区町丁'].str.endswith('以下不詳')
          & ~d['市区町丁'].isin(WARDS)].copy()
    d['town'] = [s[len(w):] for s, w in zip(d['市区町丁'], d['ward'])]
    d['key'] = d['ward'] + '|' + d['town'].map(norm)
    return d


def load_pop(path):
    p = pd.read_csv(path, encoding='utf-8-sig')
    p['code'] = p['地域コード'].astype(str)
    codes = [f'131{i:02d}' for i in range(1, 24)]
    p = p[p['code'].isin(codes) & (p['町丁別地域階層'] == 1)].copy()
    p = p.rename(columns={'地域': 'ward', '町丁別地域': 'town', '人口／総数(人)': 'pop',
                          '世帯数(世帯)': 'households'})
    p['key'] = p['ward'] + '|' + p['town'].map(norm)
    p['town'] = p['town'].str.replace('\u3000', '', regex=False).str.strip()  # 表示用
    return p[['key', 'ward', 'town', 'pop', 'households']]


# 罪種グループ定義
VIOLENT = ['凶悪犯強盗', '凶悪犯その他', '粗暴犯暴行', '粗暴犯傷害', '粗暴犯脅迫',
           '粗暴犯恐喝', '粗暴犯凶器準備集合']
BURGLARY = ['侵入窃盗空き巣', '侵入窃盗忍込み', '侵入窃盗居空き']   # 住宅対象のみ
DAILY = ['非侵入窃盗自転車盗', '非侵入窃盗車上ねらい', '非侵入窃盗ひったくり',
         '非侵入窃盗すり', '非侵入窃盗置引き', '非侵入窃盗オートバイ盗', '非侵入窃盗自動車盗']

# スコア用のグループ。
# 侵入窃盗は単独だと73%が0件で、0件と1件の間に断崖ができて実質2値指標になる。
# 暴力犯罪と統合すると0件は13%まで下がり、連続的な分布になる。
# 「住まいの安全に直結する犯罪」というくくりとして意味も通る。
# 内訳（空き巣が何件か等）は生件数として別途表示する。
SERIOUS = VIOLENT + BURGLARY
WEIGHTS = {'serious': 0.65, 'daily': 0.35}
MIN_POP = 100

# 希少事象は複数年合算する（1年だと0件の町丁目が多すぎて指標にならない）
MULTI_YEAR = {'serious': 2, 'daily': 1}

# ベイズ平滑化の事前分布の強さ（擬似的に加える「発生件数」）
# 擬似人口を一律で決めると、頻度の高い生活犯罪まで平均に引き寄せられて
# 「0件」という有力な情報が消える。そこで擬似"件数"を固定し、
# 擬似人口は罪種ごとの全体発生率から逆算する（希少な罪種ほど強く平滑化される）。
PRIOR_EVENTS = 2.0


def smooth_rate(count, pop, years, prior_events=None):
    """経験ベイズによる平滑化発生率（人口1000人あたり・年あたり）

    素の count/pop は人口が小さいほど分散が大きく、年1件の偶発事象で
    順位が大きく動く。全体平均 r0 の下で prior_events 件分の擬似観測を
    加えることで、標本の小さい町丁目を全体平均に引き寄せる。
    擬似人口 = prior_events / r0 なので、
      - 希少な罪種は擬似人口が大きく → 強く平滑化
      - 頻繁な罪種は擬似人口が小さく → ほぼ素の値を維持
    """
    if prior_events is None:
        prior_events = PRIOR_EVENTS
    person_years = pop * years
    r0 = count.sum() / person_years.sum()          # 23区全体の率
    prior_person_years = prior_events / r0
    return (count + prior_events) / (person_years + prior_person_years) * 1000


def build():
    c7 = load_crime(paths.require(paths.CRIME_R7, '犯罪データ 令和7年 (R7.csv)'))
    c6 = load_crime(paths.require(paths.CRIME_R6, '犯罪データ 令和6年 (R6.csv)'))
    p = load_pop(paths.require(paths.POPULATION, '住民基本台帳 人口データ (jy25qv0500.csv)'))

    m = p.merge(c7, on='key', how='left', suffixes=('', '_c'))
    crime_cols = SERIOUS + DAILY
    m[crime_cols] = m[crime_cols].fillna(0)

    # 直近1年の生件数（表示用。スコアとは別に根拠として見せる）
    m['violent_r7'] = m[VIOLENT].sum(axis=1)
    m['burglary_r7'] = m[BURGLARY].sum(axis=1)
    m['serious_r7'] = m[SERIOUS].sum(axis=1)
    m['daily'] = m[DAILY].sum(axis=1)

    # 重大犯罪は2年合算（R6を加算）
    prev = c6.set_index('key')[SERIOUS].sum(axis=1).rename('serious_r6')
    m = m.join(prev, on='key')
    m['serious_r6'] = m['serious_r6'].fillna(0)
    m['serious'] = m['serious_r7'] + m['serious_r6']

    # 平滑化発生率（人口1000人・1年あたり）
    valid = m['pop'] >= MIN_POP
    for g in ['serious', 'daily']:
        m[f'{g}_rate'] = smooth_rate(m[g], m['pop'], MULTI_YEAR[g]).where(valid)

    # パーセンタイル順位 (100 = 最も安全)
    for g in ['serious', 'daily']:
        m[f'{g}_score'] = m[f'{g}_rate'].rank(method='max', ascending=False, pct=True) * 100

    m['safety_score'] = sum(m[f'{g}_score'] * w for g, w in WEIGHTS.items())
    return m


if __name__ == '__main__':
    m = build()
    n_valid = m['safety_score'].notna().sum()
    print(f'町丁目 {len(m)}件 / スコア算出可 {n_valid}件 / 人口{MIN_POP}人未満で除外 {len(m)-n_valid}件')
    print()
    print('=== 安全スコア 上位10 ===')
    print(m.nlargest(10, 'safety_score')[['ward', 'town', 'pop', 'serious', 'burglary_r7', 'daily', 'safety_score']].to_string(index=False))
    print()
    print('=== 安全スコア 下位10 ===')
    print(m.nsmallest(10, 'safety_score')[['ward', 'town', 'pop', 'serious', 'burglary_r7', 'daily', 'safety_score']].to_string(index=False))
    # 区別平均は出さない。夜間人口を分母にしているため業務地区を多く含む区で
    # 実態と大きくずれる（千代田区の区平均28.5 に対し住宅地の四番町は86.5）。
    # 詳細は machi-project-plan.md「区平均は廃止」を参照。
