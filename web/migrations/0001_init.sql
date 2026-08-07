-- dist/*.csv から自動生成。手で編集しないこと。
-- 作り直すには python3 etl/make_schema.py
-- 適用: wrangler d1 migrations apply sumipita --local / --remote

DROP TABLE IF EXISTS towns;
CREATE TABLE towns (
  key TEXT,
  ward TEXT,
  town TEXT,
  ward_code TEXT,
  kokusei_code TEXT,
  lat REAL,
  lng REAL,
  area_m2 REAL,
  population REAL,
  households REAL,
  has_polygon INTEGER,
  shared_polygon_key TEXT,
  PRIMARY KEY (key)
);

DROP TABLE IF EXISTS town_scores;
CREATE TABLE town_scores (
  key TEXT,
  data_year INTEGER,
  safety_score REAL,
  flood_score REAL,
  tide_score REAL,
  ground_score REAL,
  serious_score REAL,
  daily_score REAL,
  flood_exposure REAL,
  tide_exposure REAL,
  elev_score REAL,
  mean_elev_m REAL,
  below_sea INTEGER,
  business_area INTEGER,
  scored INTEGER,
  PRIMARY KEY (key, data_year)
);

DROP TABLE IF EXISTS crime_counts;
CREATE TABLE crime_counts (
  key TEXT,
  data_year INTEGER,
  robbery INTEGER,
  violence INTEGER,
  burglary INTEGER,
  bicycle INTEGER,
  vehicle INTEGER,
  snatch INTEGER,
  pickpocket INTEGER,
  total INTEGER,
  serious_2y INTEGER,
  serious_r7 INTEGER,
  daily_r7 INTEGER,
  assault INTEGER,
  injury INTEGER,
  burglary_akisu INTEGER,
  burglary_shinobi INTEGER,
  burglary_izora INTEGER,
  PRIMARY KEY (key, data_year)
);

DROP TABLE IF EXISTS hazard_details;
CREATE TABLE hazard_details (
  key TEXT,
  data_year INTEGER,
  flood_ratio REAL,
  flood_mean_depth REAL,
  flood_max_depth REAL,
  flood_covered INTEGER,
  tide_ratio REAL,
  tide_mean_depth REAL,
  tide_max_depth REAL,
  tide_in_scope INTEGER,
  mean_elev_m REAL,
  min_elev_m REAL,
  liq_points INTEGER,
  liq_small INTEGER,
  liq_mid INTEGER,
  liq_large INTEGER,
  liq_pl REAL,
  liq_covered INTEGER,
  liq_thin INTEGER,
  liq_history INTEGER,
  liq_1923 INTEGER,
  liq_2011 INTEGER,
  collapse_zone INTEGER,
  collapse_flow_ratio REAL,
  collapse_erosion_ratio REAL,
  national_river INTEGER,
  nat_rivers TEXT,
  nat_ratio REAL,
  nat_exposure REAL,
  nat_main_label TEXT,
  nat_main_ratio REAL,
  nat_max_label TEXT,
  nat_max_ratio REAL,
  flood_source TEXT,
  tokyo_exposure REAL,
  PRIMARY KEY (key, data_year)
);

CREATE INDEX idx_towns_ward ON towns(ward);
CREATE INDEX idx_scores_year ON town_scores(data_year);
