"use client";

import { useState } from "react";
import {
  AXES,
  buildAxisViews,
  scoreBg,
  scoreColor,
  scoreLabelShort,
  typhoonSpecific,
} from "@/lib/axes";
import { CRITERIA_ANCHOR } from "@/lib/criteria";
import type { AxisView } from "@/lib/axes";
import type { Town } from "@/lib/types";

function StatusChip({ status }: { status: AxisView["status"] }) {
  if (status === "scored") return null;
  const text =
    status === "out_of_scope"
      ? "対象区域外"
      : status === "no_data"
        ? "データなし"
        : "対象外";
  return (
    <span className="rounded-full bg-line/70 px-2 py-0.5 text-[10px] font-medium text-muted">
      {text}
    </span>
  );
}

function AxisRow({ view }: { view: AxisView }) {
  const [open, setOpen] = useState(false);
  const meta = AXES.find((a) => a.id === view.id)!;
  const color = scoreColor(view.score);

  return (
    <div className="rounded-2xl bg-aqua-50/70 p-3 transition-colors hover:bg-aqua-100/60">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">{view.label}</span>
              <StatusChip status={view.status} />
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span
                className="tabular-nums text-2xl font-bold leading-none"
                style={{ color }}
              >
                {view.score === null ? "—" : view.score.toFixed(0)}
              </span>
              {view.score !== null && (
                <span className="text-[11px] text-muted">/100</span>
              )}
            </div>
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: scoreBg(view.score), color }}
            >
              {scoreLabelShort(view.score)}
            </span>
          </div>
        </div>

        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/80">
          {view.score !== null && (
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${view.score}%`, background: color }}
            />
          )}
        </div>

        {view.statusNote && (
          <p
            className={`mt-2 text-[11.5px] leading-relaxed ${
              view.status === "scored" ? "text-muted" : "text-[#a2662a]"
            }`}
          >
            {view.statusNote}
          </p>
        )}

        <span className="mt-1.5 inline-block text-[11px] font-medium text-aqua-600">
          {open ? "閉じる" : "この点数の中身を見る"}
        </span>
      </button>

      {open && (
        <div className="mt-3 rounded-xl bg-white/80 p-3">
          <p className="mb-2 text-[11.5px] leading-relaxed text-muted">
            {meta.what}
          </p>
          <a
            href={`/criteria#${CRITERIA_ANCHOR(view.id)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mb-3 inline-block text-[11px] font-medium text-aqua-600 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-700"
          >
            {view.label}の判定基準を詳しく見る →
          </a>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[11.5px] sm:grid-cols-3">
            {view.evidence.map((e: { label: string; value: string }) => (
              <div
                key={e.label}
                className="flex justify-between gap-2 border-b border-line pb-1"
              >
                <dt className="text-muted">{e.label}</dt>
                <dd className="tabular-nums font-semibold">{e.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function Alert({
  tone,
  title,
  children,
}: {
  tone: "warn" | "danger";
  title: string;
  children: React.ReactNode;
}) {
  const s =
    tone === "danger"
      ? "border-[#f0c0c6] bg-[#fdeced] text-[#8a2f3b]"
      : "border-[#f3d9a8] bg-[#fdf6e8] text-[#7a5518]";
  return (
    <div className={`mb-3 flex gap-2.5 rounded-2xl border px-3.5 py-3 text-[12px] leading-relaxed ${s}`}>
      <span className="mt-0.5 shrink-0 text-base leading-none">⚠</span>
      <span>
        <strong className="font-semibold">{title}</strong>
        <br />
        {children}
      </span>
    </div>
  );
}

/**
 * 荒川・多摩川・江戸川の浸水想定。
 *
 * これらは国管理河川で東京都「浸水予想区域図」に入っていない。当初は洪水スコアから
 * 外していたが、千代田区岩本町一丁目と中央区東日本橋3丁目が**洪水スコア100点満点なのに
 * 荒川で1.7〜1.8mの浸水想定**という状態になっていたため、スコアに統合した。
 *
 * 統合後もこの内訳は出す。点数だけでは「どの川の、どれくらいの深さか」が分からず、
 * 避難の判断につながらないため。
 */
function NationalRiverInfo({ town }: { town: Town }) {
  if (!town.flags.national_river) return null;
  const h = town.hazard;
  const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(0)}%`);
  const deeperThanMain =
    h.nat_max_label && h.nat_main_label && h.nat_max_label !== h.nat_main_label;

  return (
    <Alert tone="warn" title={`${h.nat_rivers ?? "国管理河川"}があふれたときの想定区域です。`}>
      町丁目の{pct(h.nat_ratio)}が想定区域にかかり、いちばん広い範囲で{" "}
      <strong className="font-semibold">{h.nat_main_label ?? "—"}</strong>
      （町丁目の{pct(h.nat_main_ratio)}）の浸水が想定されています。
      {deeperThanMain && (
        <>
          {" "}
          もっとも深いところは{h.nat_max_label}ですが、これは町丁目の
          {pct(h.nat_max_ratio)}にあたる狭い範囲です。
        </>
      )}{" "}
      この想定は上の洪水スコアに反映済みです。
    </Alert>
  );
}

/**
 * 家屋倒壊等氾濫想定区域。「2階に逃げれば助かる」が通用しない区域で、
 * 浸水深とは種類の違うリスク。スコアに混ぜると薄まるので独立して出す。
 */
function CollapseWarning({ town }: { town: Town }) {
  if (!town.flags.collapse_zone) return null;
  const { collapse_flow_ratio: flow, collapse_erosion_ratio: erosion } = town.hazard;
  const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(0)}%`);
  const kinds = [
    flow && flow > 0 ? `氾濫の流れによる倒壊（町丁目の${pct(flow)}）` : null,
    erosion && erosion > 0 ? `川岸が削られることによる流出（同${pct(erosion)}）` : null,
  ].filter(Boolean);

  return (
    <Alert tone="danger" title="家が倒れる・流されるおそれのある区域です。">
      {kinds.join(" と ")}が想定されています。
      浸水の深さとは別のリスクで、
      <strong className="font-semibold">上の階に逃げれば助かるとは限りません</strong>。
      該当する場合は、水平避難（区域の外へ出ること）が前提になります。
      国土交通省の指定にもとづく区域なので、避難計画は必ず自治体の資料で確認してください。{" "}
      <a
        href={`/criteria#${CRITERIA_ANCHOR("collapse")}`}
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2"
      >
        なぜ点数にしていないか →
      </a>
    </Alert>
  );
}

/**
 * 土地の高さ。点数ではなく事実として出す。
 *
 * かつては「地盤」という独立した軸だったが、高潮スコアと相関0.856で冗長だったため
 * 軸からは外した。ただし「この土地は何メートルなのか」は引越し先を選ぶときに
 * 単体で知りたい情報なので、順位づけせずそのままの数字を常に見せる。
 * 4軸と混同されないよう、バーも点数も付けない。
 */
function Elevation({ town }: { town: Town }) {
  const { mean_elev, min_elev } = town.hazard;
  if (mean_elev === null && min_elev === null) return null;

  const m = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)} m`);

  return (
    <div className="mt-2.5 rounded-2xl border border-line bg-white px-3.5 py-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-[12px] font-semibold">この土地の高さ</span>
        <span className="text-[12px]">
          <span className="text-muted">平均 </span>
          <span className="tabular-nums font-semibold">{m(mean_elev)}</span>
          <span className="ml-3 text-muted">いちばん低いところ </span>
          <span className="tabular-nums font-semibold">{m(min_elev)}</span>
        </span>
        {town.flags.below_sea && (
          <span className="rounded-full bg-[#fdeced] px-2 py-0.5 text-[10px] font-semibold text-bad">
            ゼロメートル地帯
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
        {town.flags.below_sea
          ? "土地が満潮時の海面より低いため、いちど水に浸かると自然には引きません。排水ポンプが頼りになる土地です。"
          : "海面からの高さです。点数はつけていません。水は結局いちばん低いところに集まるので、数字そのものを見てください。"}
      </p>
    </div>
  );
}

export default function ScoreCard({
  town,
  headingLevel = "h2",
}: {
  town: Town;
  /** ページ内で唯一のh1にすべき場所（例: 町丁目詳細ページ）ではh1を渡す */
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  const views = buildAxisViews(town);
  const typhoon = typhoonSpecific(town);
  const best = views.filter((v) => v.score !== null && v.score >= 70);
  const worst = views.filter((v) => v.score !== null && v.score < 40);
  // 点が出ていない軸。ここを無視して「4つとも問題なし」と書くと、
  // 調べていないだけの軸を「安全」に見せてしまう（高潮対象外の6区で必ず起きる）
  const unknown = views.filter((v) => v.score === null);

  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-card">
      <header className="mb-3">
        <Heading className="mt-0.5 text-2xl font-bold tracking-tight">
          {town.ward}
          <span className="text-aqua-700">{town.town}</span>
        </Heading>
        <p className="mt-1 text-[12px] text-muted">
          いま {town.pop?.toLocaleString() ?? "—"}人 ・{" "}
          {town.households?.toLocaleString() ?? "—"}世帯が暮らしています
        </p>
      </header>

      {/* 一言まとめ。総合点ではなく「どこが強くてどこが弱いか」を言う */}
      {town.flags.scored && (
        <p className="mb-4 rounded-2xl bg-aqua-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed">
          {worst.length > 0 ? (
            <>
              <strong className="font-semibold">
                {worst.map((v) => v.label).join("と")}
              </strong>
              が23区の下位です。
              {best.length > 0 && (
                <>逆に{best.map((v) => v.label).join("と")}は良好。</>
              )}
              決める前に、弱いほうを一度自分の目で確かめておくと安心です。
            </>
          ) : unknown.length === 0 && best.length === 4 ? (
            <>
              4つとも実際に測ったうえで良好です。23区でこれを満たすのは22町丁目、
              人口にして7.6万人分しかありません。
            </>
          ) : (
            <>
              大きく落ち込んでいる軸はありません。
              {best.length > 0 && (
                <>とくに{best.map((v) => v.label).join("と")}は良好です。</>
              )}
            </>
          )}
          {/* 点が出ていない軸を黙って除外しない。これを書かないと「調べていない」が
              「問題なし」として読まれてしまう */}
          {unknown.length > 0 && (
            <span className="mt-1 block text-muted">
              ただし{unknown.map((v) => v.label).join("と")}
              は、この町丁目ではそもそも数値が出せていません。良い悪いの判断材料には入れないでください。
            </span>
          )}
        </p>
      )}

      {typhoon && (
        <Alert tone="warn" title="台風のときだけ弱い街です。">
          ふだんの大雨には強いのに、高潮の浸水想定はかなり深刻。
          洪水の点数だけ見て「水害には強い街」と判断すると読み違えます。
        </Alert>
      )}

      <NationalRiverInfo town={town} />
      <CollapseWarning town={town} />

      <div className="space-y-2.5">
        {views.map((v) => (
          <AxisRow key={v.id} view={v} />
        ))}
      </div>

      <Elevation town={town} />

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        点数は23区3,142町丁目の中での相対的な位置です（100に近いほど上位）。
        「70点だから絶対に安全」という意味ではありません。
        区ごとの平均は出していません。同じ区の中でも、隣り合う町丁目で大きく違うからです。
      </p>
    </section>
  );
}
