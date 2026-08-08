import type { Axis, Town } from "./types";

/**
 * 4軸は合成しない。
 * 治安と災害3軸の相関は0.02〜0.14（実質ゼロ）で、「治安の良い街＝安全な街」は成り立たない。
 * 災害3軸すべて70点以上の413件のうち、治安も70点以上なのは129件（31%）だけ。
 * 総合点を出すと、この見落としが必ず起きる。
 */
export const AXES: {
  id: Axis;
  label: string;
  unit: string;
  what: string;
}[] = [
  {
    id: "safety",
    label: "治安",
    unit: "重大犯罪65% / 生活犯罪35%",
    what:
      "強盗・暴行・傷害といった暴力犯罪と、空き巣・忍込み・居空きのような「住んでいる家に入られる」犯罪を" +
      "重大犯罪として65%、自転車盗・車上ねらい・ひったくりなど日常で遭いやすいものを35%で見ています。" +
      "万引きや詐欺は駅前に店が多いかどうかで決まってしまい、そこに住む人の安心とは別物なので外しました。",
  },
  {
    id: "flood",
    label: "洪水・内水",
    unit: "町丁目全体で均した平均浸水深",
    what:
      "東京都「浸水予想区域図」から、町丁目のうち浸水想定区域が占める面積割合 × 区域内の平均浸水深で算出。" +
      "川があふれる外水氾濫と、下水が処理しきれず道が冠水する内水氾濫の両方を含みます。" +
      "同じ区でも一本道を挟んで大きく変わるので、町丁目の単位で見る意味があります。",
  },
  {
    id: "tide",
    label: "高潮",
    unit: "町丁目全体で均した平均浸水深",
    what:
      "東京都港湾局「高潮浸水想定区域図」を洪水と同じ定義で数値化。" +
      "室戸台風級（910hPa）が最悪の経路で来て、堤防が決壊する前提のかなり厳しい想定です。" +
      "大雨には強くても高潮には無力な街があるので、洪水とは別の軸に分けています。",
  },
  {
    id: "ground",
    label: "地盤",
    unit: "ボーリング調査によるPL判定",
    what:
      "「東京の液状化予測図」のもとになっているボーリング地点の液状化判定（PL値）を、" +
      "町丁目ごとに集計しています。埋立地や昔の川筋のような、砂と水を含んだゆるい地盤ほど低得点です。" +
      "当初この軸は標高でしたが、高潮スコアと相関0.856あって1軸まるごと重複していたため、" +
      "地盤そのものの性質に置き換えました。",
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
      ? "住んでいる人が100人未満の町丁目なので、スコアは出していません。分母が小さすぎて数字が跳ねてしまうためです。"
      : flags.business_area
        ? "オフィス街の可能性があります。犯罪件数を「夜そこで寝ている人の数」で割っているので、昼間に人が集まる街は実際より点が低く出ます。住宅として見るときは割り引いて読んでください。"
        : null,
    evidence: [
      { label: "重大犯罪（2年合算）", value: int(crime.serious_2y, " 件") },
      { label: "うち強盗", value: int(crime.robbery, " 件") },
      {
        label: "うち暴行・傷害",
        value: int((crime.assault ?? 0) + (crime.injury ?? 0), " 件"),
      },
      {
        label: "うち住宅侵入窃盗",
        value: int(
          (crime.burglary_akisu ?? 0) +
            (crime.burglary_shinobi ?? 0) +
            (crime.burglary_izora ?? 0),
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

  // 荒川・多摩川・江戸川のほうが東京都データより深く、実際にスコアを決めているときは、
  // evidence の「主な要因」も国管理河川側に揃える。東京都の7流域データ（flood_basin）は
  // この場合スコアには関与していないので、そちらを出すと説明文と矛盾する。
  const decidedByNationalRiver =
    flags.national_river && hazard.flood_source === "国管理河川";

  // 浸水想定の主な要因（流域名）は、点数が良い町丁目にまで出すと「大した想定でも
  // ないのに川の名前を出された」という違和感になる。要注意な町丁目（30点台まで）
  // に絞って出す。
  const showBasinFactor =
    floodStatus === "scored" &&
    !decidedByNationalRiver &&
    scores.flood !== null &&
    scores.flood < 40 &&
    !!hazard.flood_basin;

  // 「この点数は主に〜によるものです」という因果の言い切りはしない。
  // 流域データは外水氾濫・内水氾濫の両方を合成した想定なので、「主因は〜」と
  // 名指しすると内水（下水の容量超過）の寄与を実態より軽く見せてしまう。
  // あくまで「この区域はどの図の想定区域に入っているか」という事実として書く。
  const basinNote = showBasinFactor
    ? (() => {
        // flood_basins は "|" 区切り。流域ラベル自体に「・」を含むものがあるため
        // （中川・綾瀬川流域 など）、それとかぶらない区切り文字にしてある。
        const others = (hazard.flood_basins ?? "")
          .split("|")
          .filter((b) => b && b !== hazard.flood_basin);
        const extra =
          others.length > 0
            ? `ほかに${others.join("・")}の想定区域も一部にかかっています。`
            : "";
        return `この区域は${hazard.flood_basin}の浸水想定区域に入っています（区域内の想定区域のうち${pct(hazard.flood_basin_ratio)}を占めます）。${extra}`;
      })()
    : "";

  // 「洪水・内水」という軸名なのに、点数が良いと内水（下水があふれて道路が
  // 冠水すること）の説明が一度も出ないままになる。点数によらず全員に一言で
  // 伝えるため、東京都データが根拠のケースでは毎回この一文を先頭に置く。
  // （荒川等の国管理河川データは外水氾濫のみで内水を含まないため、
  // decidedByNationalRiver の分岐にはこの一文を入れない）
  const uchimizuNote =
    "この点数は、川があふれる外水氾濫と、下水があふれて道路が冠水する内水氾濫の両方を含む想定です。";

  const flood: AxisView = {
    id: "flood",
    label: "洪水・内水",
    score: floodStatus === "scored" ? scores.flood : null,
    status: floodStatus,
    statusNote:
      floodStatus === "no_data"
        ? "浸水予想区域図の対象流域から外れていて、そもそもデータがありません。安全だと確認できたわけではありません。"
        : floodStatus === "not_scored"
          ? "住んでいる人が100人未満の町丁目なので、スコアは出していません。"
          : decidedByNationalRiver
            ? `この点数は${hazard.nat_rivers ?? "国管理河川"}の浸水想定で決まっています。東京都のデータだけで見ると${fmt(hazard.tokyo_exposure, 2, "m")}ですが、この川の想定では${fmt(hazard.nat_exposure, 2, "m")}になります。深いほうを採っています。`
            : `${uchimizuNote}${basinNote}元データでは浸水深0.1m未満の区域に色がついていません。「0m」は浸水しない保証ではないので、そこは差し引いて見てください。`,
    evidence: [
      ...(decidedByNationalRiver || showBasinFactor
        ? [
            {
              label: "浸水想定の主な要因",
              value: decidedByNationalRiver
                ? (hazard.nat_rivers ?? "国管理河川")
                : (hazard.flood_basin as string),
            },
          ]
        : []),
      { label: "浸水が予想される面積割合", value: pct(hazard.flood_ratio) },
      {
        label: "浸水する平均の深さ",
        value: fmt(hazard.flood_mean_depth, 2, " m"),
      },
      { label: "１番深い浸水", value: fmt(hazard.flood_max_depth, 2, " m") },
      // 点数を決めているほうの数値だけを出す。データ元の注記も付けない
      // （decidedByNationalRiver のときは上の statusNote で川の名前を
      // すでに説明しているので、evidence側に重ねて出す必要はない）。
      {
        label: "平均の浸水の深さ",
        value: fmt(
          decidedByNationalRiver ? hazard.nat_exposure : hazard.tokyo_exposure,
          2,
          " m",
        ),
      },
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
        ? "この区は内陸のため、東京都が高潮の想定区域そのものを設定していません。調べた結果リスクがなかった、ということではないので、点数として比べないでください。"
        : tideStatus === "not_scored"
          ? "住んでいる人が100人未満の町丁目なので、スコアは出していません。"
          : null,
    // 標高は独立した軸から外したが、カード下部に「この土地の高さ」として
    // 常時表示している（ScoreCard の Elevation）。ここに重ねて出すと二重になる。
    evidence: [
      { label: "浸水想定区域の面積割合", value: pct(hazard.tide_ratio) },
      {
        label: "区域内の平均浸水深",
        value: fmt(hazard.tide_mean_depth, 2, " m"),
      },
      { label: "最大浸水深", value: fmt(hazard.tide_max_depth, 2, " m") },
    ],
  };

  // 地盤は液状化。ボーリング地点が1本も無い町丁目は算出できない（456件）
  const groundStatus: AxisStatus = notScored
    ? "not_scored"
    : !flags.liq_covered
      ? "no_data"
      : "scored";
  const ground: AxisView = {
    id: "ground",
    label: "地盤",
    score: groundStatus === "scored" ? scores.ground : null,
    status: groundStatus,
    statusNote:
      groundStatus === "no_data"
        ? "この町丁目にはボーリング調査の地点が1つもないため、判定できません。地盤が良いという意味ではありません。"
        : groundStatus === "not_scored"
          ? "住んでいる人が100人未満の町丁目なので、スコアは出していません。"
          : flags.liq_history
            ? `過去の地震で実際に液状化した記録がある町丁目です（${
                [
                  flags.liq_1923 ? "1923年 関東大地震" : null,
                  flags.liq_2011 ? "2011年 東北地方太平洋沖地震" : null,
                ]
                  .filter(Boolean)
                  .join(" / ") || "東京都の液状化履歴図に記録あり"
              }）。`
            : flags.liq_thin
              ? "この町丁目のボーリング地点は2本以下です。1〜2本が町全体を代表しているとは限らないので、点数は参考程度に見てください。"
              : null,
    evidence: [
      { label: "ボーリング地点数", value: int(hazard.liq_points, " 地点") },
      { label: "液状化の可能性 大", value: int(hazard.liq_large, " 地点") },
      { label: "同 中", value: int(hazard.liq_mid, " 地点") },
      { label: "同 小", value: int(hazard.liq_small, " 地点") },
      { label: "PL値（平滑化後）", value: fmt(hazard.liq_pl, 1) },
      {
        label: "過去の液状化",
        value: flags.liq_1923
          ? "1923年に記録あり"
          : flags.liq_2011
            ? "2011年に記録あり"
            : flags.liq_history
              ? "記録あり"
              : "記録なし",
      },
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

/** 彩度は落としているが、赤〜緑の順序は保つ。安全の話なので色で油断させない */
export function scoreColor(score: number | null): string {
  if (score === null) return "#9fb6bf";
  if (score >= 70) return "#0fa97f";
  if (score >= 40) return "#e8a13a";
  return "#e35d6a";
}

export function scoreBg(score: number | null): string {
  if (score === null) return "#eef4f6";
  if (score >= 70) return "#e6f7f1";
  if (score >= 40) return "#fdf3e3";
  return "#fdeced";
}

export function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 70) return "安心して選べる";
  if (score >= 40) return "23区の真ん中あたり";
  return "見に行く前に知っておきたい";
}

/** バーの横などに置く短いラベル */
export function scoreLabelShort(score: number | null): string {
  if (score === null) return "—";
  if (score >= 70) return "良好";
  if (score >= 40) return "平均的";
  return "要確認";
}
