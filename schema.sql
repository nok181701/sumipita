-- スムピタ D1 スキーマ
-- D1 は SQLite。3,139町丁目 × 数十カラムなので規模は小さい。
-- ジオメトリ（町丁目ポリゴンGeoJSON）は D1 に入れず R2 に置く。

-- ========================================
-- 町丁目マスタ
-- ========================================
CREATE TABLE towns (
  key           TEXT PRIMARY KEY,   -- '世田谷区|三宿1丁目' 正規化済み結合キー
  ward          TEXT NOT NULL,      -- 表示用の区名
  town          TEXT NOT NULL,      -- 表示用の町丁目名（末尾スペースはtrim済み）
  ward_code     TEXT NOT NULL,      -- '13112' 5桁（e-Stat/住基の地域コード）
  kokusei_code  TEXT,               -- e-Stat KEY_CODE 13桁。ポリゴン参照用
  lat           REAL NOT NULL,      -- ポリゴン重心（地図の初期表示・住所検索用）
  lng           REAL NOT NULL,
  area_m2       REAL NOT NULL,      -- 町丁目面積
  population    INTEGER NOT NULL,
  households    INTEGER,
  has_polygon   INTEGER NOT NULL DEFAULT 1,  -- 0 = ポリゴン未対応（江東区海の森など）
  shared_polygon_key TEXT           -- 他町丁目とポリゴンを共有する場合の参照先
);

CREATE INDEX idx_towns_ward ON towns(ward);
CREATE INDEX idx_towns_ward_town ON towns(ward, town);
CREATE INDEX idx_towns_latlng ON towns(lat, lng);

-- ========================================
-- スコア（年度別。データ更新時に新しい行を積む）
-- ========================================
CREATE TABLE town_scores (
  key            TEXT NOT NULL,
  data_year      INTEGER NOT NULL,   -- 2025 (令和7年)
  -- 4軸スコア（0-100, 高いほど良い）。算出対象外は NULL
  safety_score   REAL,
  flood_score    REAL,
  tide_score     REAL,
  ground_score   REAL,
  -- 治安の内訳（重大犯罪 = 暴力犯罪 + 住宅対象の侵入窃盗。2年合算+ベイズ平滑化）
  serious_score    REAL,
  daily_score      REAL,
  -- 曝露度（生値。単位付きで表示する用）
  flood_exposure REAL,   -- 町丁目全体で均した平均浸水深(m)
  tide_exposure  REAL,
  mean_elev_m    REAL,   -- 平均地盤高(m)
  below_sea      INTEGER NOT NULL DEFAULT 0,  -- ゼロメートル地帯フラグ
  -- 業務地区フラグ。1 のとき「居住者の体感とスコアが異なる可能性」を注記する。
  -- 犯罪の分母が夜間人口のため、昼間人口が多い地区はスコアが不当に下がる。
  -- 暫定の代理指標なので取りこぼしがある（スコア補正には使わない）。
  business_area  INTEGER NOT NULL DEFAULT 0,
  scored         INTEGER NOT NULL DEFAULT 1,  -- 0 = 人口100人未満などで対象外
  PRIMARY KEY (key, data_year),
  FOREIGN KEY (key) REFERENCES towns(key)
);

CREATE INDEX idx_scores_safety ON town_scores(data_year, safety_score);
CREATE INDEX idx_scores_flood  ON town_scores(data_year, flood_score);
CREATE INDEX idx_scores_tide   ON town_scores(data_year, tide_score);

-- ========================================
-- 犯罪の生件数（スコアの根拠として表示する）
-- ========================================
CREATE TABLE crime_counts (
  key         TEXT NOT NULL,
  data_year   INTEGER NOT NULL,
  robbery     INTEGER NOT NULL DEFAULT 0,  -- 強盗
  violence    INTEGER NOT NULL DEFAULT 0,  -- 暴行+傷害+脅迫+恐喝
  burglary    INTEGER NOT NULL DEFAULT 0,  -- 空き巣+忍込み+居空き（住宅対象のみ）
  bicycle     INTEGER NOT NULL DEFAULT 0,  -- 自転車盗
  vehicle     INTEGER NOT NULL DEFAULT 0,  -- 車上ねらい+自動車盗+オートバイ盗
  snatch      INTEGER NOT NULL DEFAULT 0,  -- ひったくり+すり+置引き
  total       INTEGER NOT NULL DEFAULT 0,  -- 全罪種の総合計（参考値）
  PRIMARY KEY (key, data_year),
  FOREIGN KEY (key) REFERENCES towns(key)
);

-- ========================================
-- 水害の詳細（スコアの根拠として表示する）
-- ========================================
CREATE TABLE hazard_details (
  key              TEXT NOT NULL,
  data_year        INTEGER NOT NULL,
  -- 洪水（東京都 浸水予想区域図: 外水+内水）
  flood_ratio      REAL,   -- 浸水域の面積割合 0-1
  flood_mean_depth REAL,   -- 浸水域内の平均浸水深(m)
  flood_max_depth  REAL,
  flood_covered    INTEGER NOT NULL DEFAULT 1,  -- 0 = 流域データ範囲外
  -- 高潮（東京都港湾局 高潮浸水想定区域図）
  tide_ratio       REAL,
  tide_mean_depth  REAL,
  tide_max_depth   REAL,
  tide_in_scope    INTEGER NOT NULL DEFAULT 1,  -- 0 = 対象17区外（世田谷・渋谷等）
  -- 地盤
  mean_elev_m      REAL,
  min_elev_m       REAL,
  PRIMARY KEY (key, data_year),
  FOREIGN KEY (key) REFERENCES towns(key)
);

-- ========================================
-- 出典表記（全データがCC BY。表示義務があるので DB で管理する）
-- ========================================
CREATE TABLE data_sources (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  publisher    TEXT NOT NULL,
  license      TEXT NOT NULL,
  source_url   TEXT NOT NULL,
  data_year    INTEGER,
  note         TEXT,
  updated_at   TEXT NOT NULL
);

INSERT INTO data_sources (id, name, publisher, license, source_url, data_year, note, updated_at) VALUES
('crime', '区市町村の町丁別、罪種別及び手口別認知件数', '警視庁', 'CC BY 4.0',
 'https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html', 2025,
 '令和7年 年計', '2026-08-06'),
('population', '住民基本台帳による東京都の世帯と人口 第5表', '東京都総務局', 'CC BY 4.0',
 'https://www.toukei.metro.tokyo.lg.jp/juukiy/jy-index.htm', 2025,
 '令和7年1月1日現在', '2026-08-06'),
('boundary', '令和2年国勢調査 町丁・字等別境界データ', 'e-Stat（総務省統計局）', 'CC BY 4.0',
 'https://www.e-stat.go.jp/gis/statmap-search?type=2', 2020,
 '5年ごと更新。住居表示の実際の町丁境界と一致しない場合がある', '2026-08-06'),
('flood', '浸水予想区域図 浸水深・地盤高データ', '東京都建設局', 'CC BY 4.0',
 'https://catalog.data.metro.tokyo.lg.jp/dataset/t000014d0000000029', 2025,
 '外水氾濫+内水氾濫。区市町村ハザードマップと同じ原典', '2026-08-06'),
('tide', '高潮浸水想定区域図［想定最大規模］（浸水深）', '東京都港湾局', 'CC BY 4.0',
 'https://catalog.data.metro.tokyo.lg.jp/dataset/t000015d1700000007', 2024,
 '令和6年12月改定。室戸台風級910hPa・堤防決壊を見込む想定', '2026-08-06');
