import type { Axis, Town } from "./types";

/**
 * 4軸は合成しない。
 * 治安と災害3軸の相関は0.06前後（実質ゼロ）で、「治安の良い街＝安全な街」は成り立たない。
 * 災害3軸すべて70点以上の413件のうち治安も70点以上なのは152件（37%）だけ。
 * 総合点を出すと、この見落としが必ず起きる。
 */
export const AXES: { id: Axis; label: string; unit: string; what: string }[] = [
  {
    id: "safety",
    label: "治安",
    unit: "重大犯罪65% / 生活犯罪35%",
    what:
      "強盗・暴行・傷害などの暴力犯罪と、空き巣・忍込み・居空きの住宅侵入窃盗を重大犯罪として65%、" +
      "自転車盗・車上ねらい・ひったくりなどを生活犯罪として35%で評価。" +
      "万引き・詐欺・占有離脱物横領は商業施設の有無で決まり住民の体感治安と無関係なため除外。",
  },
  {
    id: "flood",
    label: "洪水・内水",
    unit: "町丁目全体で均した平均浸水深",
    what:
      "東京都「浸水予想区域図」から、町丁目のうち浸水想定区域が占める面積割合 × 区域内の平均浸水深。" +
      "大雨による河川氾濫・内水氾濫を想定。",
  },
  {
    id: "tide",
    label: "高潮",
    unit: "町丁目全体で均した平均浸水深",
    what:
      "東京都港湾局「高潮浸水想定区域図」から洪水と同じ定義で算出。" +
      "室戸台風級の台風＋堤防決壊を想定した、洪水とは別種のリスク。",
  },
  {
    id: "ground",
    label: "地盤",
    unit: "平均地盤高の順位",
    what: "東京都「浸水予想区域図」に含まれる地盤高データの平均値。標高が高いほど高得点。",
  },
];

export type AxisStatus = "scored" | "out_of_scope" | "no_data" | "not_scored";

export type AxisView = {
  id: Axis;
  label: string;
  score: number | null;
  status: AxisStatus;
  /** 「データがない」と「リスクがない」を混同させないための一文 */
  statusNote: string | null;
  evidence: { label: string; value: string }[];
};

const fmt = (v: number | null, digits = 2, suffix = "") =>
  v === null || v === undefined ? "—" : `${v.toFixed(digits)}${suffix}`;

const int = (v: number | null, suffix = "") =>
  v === null || v === undefined ? "—" : `${v.toLocaleString()}${suffix}`;

const pct = (v: number | null) =>
  v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`;

export function buildAxisViews(t: Town): AxisView[] {
  const { flags, scores, crime, hazard } = t;

  // 人口100人未満は全軸が算出対象外。分母が小さすぎて発生率が発散するため。
  const notScored = !flags.scored;

  const safety: AxisView = {
    id: "safety",
    label: "治安",
    score: scores.safety,
    status: notScored ? "not_scored" : "scored",
    statusNote: notScored
      ? "居住人口が100人未満のため算出していません。発生率の分母が小さすぎて数値が発散するためです。"
      : flags.business_area
        ? "業務地区の可能性があります。犯罪件数を夜間人口で割っているため、昼間人口が多い地区はスコアが実態より低く出ます。"
        : null,
    evidence: [
      { label: "重大犯罪（2年合算）", value: int(crime.serious_2y, " 件") },
      { label: "うち強盗", value: int(crime.robbery, " 件") },
      { label: "うち暴行・傷害", value: int((crime.assault ?? 0) + (crime.injury ?? 0), " 件") },
      {
        label: "うち住宅侵入窃盗",
        value: int(
          (crime.burglary_akisu ?? 0) + (crime.burglary_shinobi ?? 0) + (crime.burglary_izora ?? 0),
          " 件",
        ),
      },
      { label: "自転車盗", value: int(crime.bicycle_theft, " 件") },
      { label: "ひったくり", value: int(crime.snatch, " 件") },
      { label: "居住人口", value: int(t.pop, " 人") },
    ],
  };

  const floodStatus: AxisStatus = notScored
    ? "not_scored"
    : !flags.flood_covered
      ? "no_data"
      : "scored";
  const flood: AxisView = {
    id: "flood",
    label: "洪水・内水",
    score: floodStatus === "scored" ? scores.flood : null,
    status: floodStatus,
    statusNote:
      floodStatus === "no_data"
        ? "浸水予想区域図の対象流域に含まれていないため、データがありません。安全と確認されたわけではありません。"
        : floodStatus === "not_scored"
          ? "居住人口が100人未満のため算出していません。"
          : "浸水深0.1m未満の区域は元データで着色されていません。「0m」は浸水しないことの保証ではありません。",
    evidence: [
      { label: "浸水想定区域の面積割合", value: pct(hazard.flood_ratio) },
      { label: "区域内の平均浸水深", value: fmt(hazard.flood_mean_depth, 2, " m") },
      { label: "最大浸水深", value: fmt(hazard.flood_max_depth, 2, " m") },
    ],
  };

  // 高潮の対象は17区。世田谷・渋谷・中野・杉並・豊島・練馬は区域外。
  // 「スコア100」ではなく「対象外」と表示しないと、調査済みで安全だと誤読される。
  const tideStatus: AxisStatus = notScored
    ? "not_scored"
    : !flags.tide_in_scope
      ? "out_of_scope"
      : "scored";
  const tide: AxisView = {
    id: "tide",
    label: "高潮",
    score: tideStatus === "scored" ? scores.tide : null,
    status: tideStatus,
    statusNote:
      tideStatus === "out_of_scope"
        ? "この区は高潮浸水想定区域図の対象外です（内陸のため東京都が想定区域を設定していません）。調査した結果リスクがなかった、という意味ではありません。"
        : tideStatus === "not_scored"
          ? "居住人口が100人未満のため算出していません。"
          : null,
    evidence: [
      { label: "浸水想定区域の面積割合", value: pct(hazard.tide_ratio) },
      { label: "区域内の平均浸水深", value: fmt(hazard.tide_mean_depth, 2, " m") },
      { label: "最大浸水深", value: fmt(hazard.tide_max_depth, 2, " m") },
    ],
  };

  const groundStatus: AxisStatus = notScored
    ? "not_scored"
    : !flags.flood_covered
      ? "no_data"
      : "scored";
  const ground: AxisView = {
    id: "ground",
    label: "地盤",
    score: groundStatus === "scored" ? scores.ground : null,
    status: groundStatus,
    statusNote:
      groundStatus === "no_data"
        ? "地盤高データの対象流域外のためデータがありません。"
        : groundStatus === "not_scored"
          ? "居住人口が100人未満のため算出していません。"
          : flags.below_sea
            ? "ゼロメートル地帯です。平均地盤高が満潮時の海面より低く、いったん浸水すると自然排水されません。"
            : null,
    evidence: [
      { label: "平均地盤高", value: fmt(hazard.mean_elev, 2, " m") },
      { label: "最低地盤高", value: fmt(hazard.min_elev, 2, " m") },
    ],
  };

  return [safety, flood, tide, ground];
}

/** 洪水は良好なのに高潮が深刻＝台風特化リスク。洪水だけ見ると必ず見落とす */
export function typhoonSpecific(t: Town): boolean {
  const { flood, tide } = t.scores;
  if (flood === null || tide === null || !t.flags.tide_in_scope) return false;
  return flood >= 70 && tide <= 30;
}

export function scoreColor(score: number | null): string {
  if (score === null) return "#9ca3af";
  if (score >= 70) return "#15803d";
  if (score >= 40) return "#b45309";
  return "#b91c1c";
}

export function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 70) return "良好";
  if (score >= 40) return "平均的";
  return "注意";
}
