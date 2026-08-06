"use client";

import { useState } from "react";
import { AXES, buildAxisViews, scoreColor, scoreLabel, typhoonSpecific } from "@/lib/axes";
import type { AxisView } from "@/lib/axes";
import type { Town } from "@/lib/types";

function StatusChip({ status }: { status: AxisView["status"] }) {
  if (status === "scored") return null;
  const text =
    status === "out_of_scope"
      ? "対象区域外"
      : status === "no_data"
        ? "データなし"
        : "算出対象外";
  return (
    <span className="rounded border border-line bg-white px-1.5 py-0.5 text-[11px] font-normal text-muted">
      {text}
    </span>
  );
}

function AxisRow({ view }: { view: AxisView }) {
  const [open, setOpen] = useState(false);
  const meta = AXES.find((a) => a.id === view.id)!;
  const color = scoreColor(view.score);

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 py-3 text-left hover:bg-black/[0.02]"
      >
        <div className="flex w-28 shrink-0 items-center gap-1.5">
          <span className="text-sm font-medium">{view.label}</span>
          <StatusChip status={view.status} />
        </div>

        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          {view.score !== null && (
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${view.score}%`, background: color }}
            />
          )}
        </div>

        <div className="flex w-24 shrink-0 items-baseline justify-end gap-1.5">
          <span className="tabular-nums text-lg font-semibold" style={{ color }}>
            {view.score === null ? "—" : view.score.toFixed(0)}
          </span>
          <span className="text-xs text-muted">{scoreLabel(view.score)}</span>
        </div>

        <span className="w-4 shrink-0 text-xs text-muted">{open ? "−" : "+"}</span>
      </button>

      {view.statusNote && (
        <p
          className={`pb-3 pl-28 text-xs leading-relaxed ${
            view.status === "scored" ? "text-muted" : "text-amber-700"
          }`}
        >
          {view.statusNote}
        </p>
      )}

      {open && (
        <div className="pb-4 pl-28 pr-4">
          <p className="mb-3 text-xs leading-relaxed text-muted">{meta.what}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-3">
            {view.evidence.map((e: { label: string; value: string }) => (
              <div key={e.label} className="flex justify-between border-b border-line/60 pb-1">
                <dt className="text-muted">{e.label}</dt>
                <dd className="tabular-nums font-medium">{e.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

export default function ScoreCard({ town }: { town: Town }) {
  const views = buildAxisViews(town);
  const typhoon = typhoonSpecific(town);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <header className="mb-1 flex flex-wrap items-baseline gap-x-2">
        <h2 className="text-xl font-semibold">
          {town.ward}
          {town.town}
        </h2>
        <span className="text-sm text-muted">
          人口 {town.pop?.toLocaleString() ?? "—"}人 / {town.households?.toLocaleString() ?? "—"}世帯
        </span>
      </header>

      <p className="mb-4 text-xs text-muted">
        4つの軸は合成せず、それぞれ独立して見てください。治安と災害リスクの相関はほぼゼロで、
        総合点にすると片方を必ず見落とします。
      </p>

      {typhoon && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          <strong className="font-semibold">台風に特化したリスクがあります。</strong>{" "}
          大雨による洪水・内水氾濫には強い一方で、高潮の浸水想定は深刻です。
          洪水スコアだけを見て「安全」と判断しないでください。
        </div>
      )}

      <div>
        {views.map((v) => (
          <AxisRow key={v.id} view={v} />
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        スコアは23区3,142町丁目の中での相対順位（0〜100）です。絶対的な安全性の指標ではありません。
        区の平均値は算出していません（犯罪件数の分母が夜間人口のため、業務地区を多く含む区で実態と大きくずれるためです）。
      </p>
    </section>
  );
}
