export type Axis = "safety" | "flood" | "tide" | "ground";

export type Scores = Record<Axis, number | null>;

export type Flags = {
  /** 人口100人未満はスコア算出対象外 */
  scored: boolean;
  /** 浸水予想区域図の流域データの範囲内か */
  flood_covered: boolean;
  /** 高潮浸水想定区域の対象17区に含まれるか */
  tide_in_scope: boolean;
  /** ゼロメートル地帯（標高は高潮の補足として見せる） */
  below_sea: boolean;
  /** 業務地区（夜間人口が分母のため治安スコアが不当に低く出る） */
  business_area: boolean;
  /** ボーリング地点が1本でもあるか。無ければ地盤スコアは出せない */
  liq_covered: boolean;
  /** ボーリングが2本以下。町丁目全体を代表しているとは限らない */
  liq_thin: boolean;
  /** 過去の地震で実際に液状化した記録がある */
  liq_history: boolean;
  liq_1923: boolean;
  liq_2011: boolean;
};

export type Crime = {
  serious_2y: number | null;
  serious_r7: number | null;
  daily_r7: number | null;
  total_r7: number | null;
  robbery: number | null;
  assault: number | null;
  injury: number | null;
  burglary_akisu: number | null;
  burglary_shinobi: number | null;
  burglary_izora: number | null;
  bicycle_theft: number | null;
  vehicle_theft: number | null;
  snatch: number | null;
  pickpocket: number | null;
};

export type Hazard = {
  flood_ratio: number | null;
  flood_mean_depth: number | null;
  flood_max_depth: number | null;
  flood_exposure: number | null;
  tide_ratio: number | null;
  tide_mean_depth: number | null;
  tide_max_depth: number | null;
  tide_exposure: number | null;
  mean_elev: number | null;
  min_elev: number | null;
  /** 町丁目内のボーリング地点数 */
  liq_points: number | null;
  liq_small: number | null;
  liq_mid: number | null;
  liq_large: number | null;
  /** 平滑化後のPL代表値 */
  liq_pl: number | null;
};

export type Town = {
  key: string;
  ward: string;
  town: string;
  pop: number | null;
  households: number | null;
  scores: Scores;
  flags: Flags;
  crime: Crime;
  hazard: Hazard;
};

export type IndexEntry = {
  key: string;
  ward: string;
  town: string;
  pop: number | null;
  s: number | null;
  f: number | null;
  t: number | null;
  g: number | null;
  scored: boolean;
  /** 高潮浸水想定区域の対象17区か。false のとき t は null（対象外であって安全確認済みではない） */
  tide_scope: boolean;
  /** ポリゴン重心。ポリゴン未対応の3件（江東区海の森）は null */
  lat: number | null;
  lng: number | null;
};

export type Source = {
  id: string;
  name: string;
  url: string;
  license: string;
};

export type IndexFile = {
  data_year: number;
  min_pop: number;
  tide_out_of_scope: string[];
  town_count: number;
  scored_count: number;
  wards: string[];
  /** 区名 → 区コード。GeoJSONのファイル名が区コードなので必要 */
  ward_codes: Record<string, string>;
  sources: Source[];
  index: IndexEntry[];
};
