import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { IndexEntry, IndexFile, Town } from "./types";

const DATA_YEAR = 2025;
const MIN_POP = 100;

const TIDE_OUT_OF_SCOPE = [
  "世田谷区",
  "渋谷区",
  "中野区",
  "杉並区",
  "豊島区",
  "練馬区",
];

export const SOURCES: IndexFile["sources"] = [
  {
    id: "keishicho_crime",
    name: "警視庁「区市町村の町丁別、罪種別及び手口別認知件数」令和7年",
    url: "https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html",
    license: "CC BY 4.0",
  },
  {
    id: "tokyo_population",
    name: "東京都総務局「住民基本台帳による東京都の世帯と人口」令和7年1月",
    url: "https://www.toukei.metro.tokyo.lg.jp/juukiy/2025/jy25000001.htm",
    license: "CC BY 4.0",
  },
  {
    id: "tokyo_flood",
    name: "東京都建設局「浸水予想区域図（改定）浸水深・地盤高データ」",
    url: "https://catalog.data.metro.tokyo.lg.jp/dataset/t000014d0000000029",
    license: "CC BY 4.0",
  },
  {
    id: "tokyo_tide",
    name: "東京都港湾局「高潮浸水想定区域図」",
    url: "https://catalog.data.metro.tokyo.lg.jp/dataset/t000015d1700000007",
    license: "CC BY 4.0",
  },
  {
    id: "tokyo_liquefaction",
    name: "東京都土木技術支援・人材育成センター「東京の液状化予測図 令和7年度改訂版」",
    url: "https://doboku.metro.tokyo.lg.jp/start/03-jyouhou/ekijyouka/layertable.html",
    license: "CC BY 2.1 JP",
  },
  {
    id: "ksj_flood",
    name: "国土数値情報「洪水浸水想定区域データ（河川単位）」令和7年度版",
    url: "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A31a-2025.html",
    license: "CC BY 4.0",
  },
  {
    id: "estat_boundary",
    name: "e-Stat「令和2年国勢調査 町丁・字等別境界データ」",
    url: "https://www.e-stat.go.jp/gis/statmap-search?type=2",
    license: "CC BY 4.0",
  },
];

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

const bool = (v: unknown) => v === 1 || v === true;
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

type IndexRow = {
  key: string;
  ward: string;
  town: string;
  population: number | null;
  lat: number | null;
  lng: number | null;
  safety_score: number | null;
  flood_score: number | null;
  tide_score: number | null;
  ground_score: number | null;
  scored: number;
  flood_covered: number;
  tide_in_scope: number;
  liq_covered: number;
};

/**
 * 一覧。地図の塗り分けと検索に使う。
 *
 * 「データがない」と「リスクがない」を混同させないため、
 * 判定できていない軸は **null にして返す**。
 * 例えば高潮の対象外6区はスコア100が入っているが、
 * それは調査していないだけなので、ここで落として空バーにする。
 */
export async function loadIndex(): Promise<IndexFile> {
  const rows = await (await db())
    .prepare(
      `SELECT t.key, t.ward, t.town, t.population, t.lat, t.lng,
              s.safety_score, s.flood_score, s.tide_score, s.ground_score, s.scored,
              h.flood_covered, h.tide_in_scope, h.liq_covered
         FROM towns t
         JOIN town_scores   s ON s.key = t.key AND s.data_year = ?1
         JOIN hazard_details h ON h.key = t.key AND h.data_year = ?1
        ORDER BY t.ward, t.town`,
    )
    .bind(DATA_YEAR)
    .all<IndexRow>();

  const index: IndexEntry[] = rows.results.map((r: IndexRow) => ({
    key: r.key,
    ward: r.ward,
    town: r.town,
    pop: num(r.population),
    s: num(r.safety_score),
    f: bool(r.flood_covered) ? num(r.flood_score) : null,
    t: bool(r.tide_in_scope) ? num(r.tide_score) : null,
    g: bool(r.liq_covered) ? num(r.ground_score) : null,
    scored: bool(r.scored),
    tide_scope: bool(r.tide_in_scope),
    lat: num(r.lat),
    lng: num(r.lng),
  }));

  const wards = [...new Set(index.map((e) => e.ward))].sort();
  const wardCodes = await (await db())
    .prepare(`SELECT DISTINCT ward, ward_code FROM towns`)
    .all<{ ward: string; ward_code: string }>();

  return {
    data_year: DATA_YEAR,
    min_pop: MIN_POP,
    tide_out_of_scope: TIDE_OUT_OF_SCOPE,
    town_count: index.length,
    scored_count: index.filter((e) => e.scored).length,
    wards,
    ward_codes: Object.fromEntries(
      wardCodes.results.map((r: { ward: string; ward_code: string }) => [r.ward, r.ward_code]),
    ),
    sources: SOURCES,
    index,
  };
}

type TownRow = Record<string, unknown>;

/** 町丁目1件の詳細。スコアの根拠になる生値まで含める */
export async function loadTown(key: string): Promise<Town | null> {
  const r = await (await db())
    .prepare(
      `SELECT t.*, s.*, c.*, h.*
         FROM towns t
         JOIN town_scores   s ON s.key = t.key AND s.data_year = ?2
         JOIN crime_counts  c ON c.key = t.key AND c.data_year = ?2
         JOIN hazard_details h ON h.key = t.key AND h.data_year = ?2
        WHERE t.key = ?1`,
    )
    .bind(key, DATA_YEAR)
    .first<TownRow>();

  if (!r) return null;

  return {
    key: String(r.key),
    ward: String(r.ward),
    town: String(r.town),
    pop: num(r.population),
    households: num(r.households),
    scores: {
      safety: num(r.safety_score),
      flood: num(r.flood_score),
      tide: num(r.tide_score),
      ground: num(r.ground_score),
    },
    flags: {
      scored: bool(r.scored),
      flood_covered: bool(r.flood_covered),
      tide_in_scope: bool(r.tide_in_scope),
      below_sea: bool(r.below_sea),
      business_area: bool(r.business_area),
      liq_covered: bool(r.liq_covered),
      liq_thin: bool(r.liq_thin),
      liq_history: bool(r.liq_history),
      liq_1923: bool(r.liq_1923),
      liq_2011: bool(r.liq_2011),
      collapse_zone: bool(r.collapse_zone),
      national_river: bool(r.national_river),
    },
    crime: {
      serious_2y: num(r.serious_2y),
      serious_r7: num(r.serious_r7),
      daily_r7: num(r.daily_r7),
      total_r7: num(r.total),
      robbery: num(r.robbery),
      assault: num(r.assault),
      injury: num(r.injury),
      burglary_akisu: num(r.burglary_akisu),
      burglary_shinobi: num(r.burglary_shinobi),
      burglary_izora: num(r.burglary_izora),
      bicycle_theft: num(r.bicycle),
      vehicle_theft: num(r.vehicle),
      snatch: num(r.snatch),
      pickpocket: num(r.pickpocket),
    },
    hazard: {
      flood_ratio: num(r.flood_ratio),
      flood_mean_depth: num(r.flood_mean_depth),
      flood_max_depth: num(r.flood_max_depth),
      flood_exposure: num(r.flood_exposure),
      tide_ratio: num(r.tide_ratio),
      tide_mean_depth: num(r.tide_mean_depth),
      tide_max_depth: num(r.tide_max_depth),
      tide_exposure: num(r.tide_exposure),
      mean_elev: num(r.mean_elev_m),
      min_elev: num(r.min_elev_m),
      liq_points: num(r.liq_points),
      liq_small: num(r.liq_small),
      liq_mid: num(r.liq_mid),
      liq_large: num(r.liq_large),
      liq_pl: num(r.liq_pl),
      collapse_flow_ratio: num(r.collapse_flow_ratio),
      collapse_erosion_ratio: num(r.collapse_erosion_ratio),
      nat_ratio: num(r.nat_ratio),
      nat_exposure: num(r.nat_exposure),
      tokyo_exposure: num(r.tokyo_exposure),
      flood_source: String(r.flood_source ?? "東京都"),
      nat_main_label: (r.nat_main_label as string) ?? null,
      nat_main_ratio: num(r.nat_main_ratio),
      nat_max_label: (r.nat_max_label as string) ?? null,
      nat_max_ratio: num(r.nat_max_ratio),
      nat_rivers: (r.nat_rivers as string) ?? null,
    },
  };
}
