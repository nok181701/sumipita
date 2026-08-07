"use client";

import { useMemo, useState } from "react";
import type { IndexEntry } from "@/lib/types";
import { scoreColor } from "@/lib/axes";

/** 全角/半角・漢数字の揺れを吸収して検索する（データ側の突合と同じ考え方） */
const KANJI: Record<string, string> = {
  一: "1", 二: "2", 三: "3", 四: "4", 五: "5",
  六: "6", 七: "7", 八: "8", 九: "9", 十: "10",
};

export function normalize(s: string): string {
  let n = s.normalize("NFKC").replace(/[\s　]/g, "");
  n = n.replace(/([一二三四五六七八九十]+)丁目/g, (_, k: string) => {
    const v = KANJI[k];
    return v ? `${v}丁目` : `${k}丁目`;
  });
  return n;
}

/** value が null のときは空バー。「対象区域外 / データなし」を満点として描かないこと */
function MiniBar({ value, title }: { value: number | null; title?: string }) {
  return (
    <div
      title={value === null ? (title ?? "データなし") : undefined}
      className={`h-1.5 w-9 overflow-hidden rounded-full ${
        value === null ? "bg-line/50 outline-dashed outline-1 outline-offset-1 outline-line" : "bg-line"
      }`}
    >
      {value !== null && (
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: scoreColor(value) }}
        />
      )}
    </div>
  );
}

export default function TownSearch({
  entries,
  wards,
  onSelect,
  selectedKey,
}: {
  entries: IndexEntry[];
  wards: string[];
  onSelect: (key: string) => void;
  selectedKey: string | null;
}) {
  const [q, setQ] = useState("");
  const [ward, setWard] = useState("");

  const normalized = useMemo(
    () => entries.map((e) => ({ e, n: normalize(e.ward + e.town) })),
    [entries],
  );

  const results = useMemo(() => {
    const nq = normalize(q);
    return normalized
      .filter(({ e, n }) => (ward ? e.ward === ward : true) && (nq ? n.includes(nq) : true))
      .slice(0, 60)
      .map(({ e }) => e);
  }, [normalized, q, ward]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 p-3">
        <p className="px-0.5 text-[11px] font-medium text-aqua-600">
          気になっている街を入れてみてください
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="町丁目で検索（例: 三軒茶屋、芝浦2丁目）"
          className="w-full rounded-full border border-line bg-aqua-50/60 px-4 py-2 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-aqua-500 focus:bg-white"
        />
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setWard("")}
            className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
              ward === "" ? "bg-aqua-500 font-medium text-white" : "bg-aqua-50 text-muted hover:bg-aqua-100"
            }`}
          >
            全23区
          </button>
          {wards.map((w) => (
            <button
              key={w}
              onClick={() => setWard(w)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                ward === w ? "bg-aqua-500 font-medium text-white" : "bg-aqua-50 text-muted hover:bg-aqua-100"
              }`}
            >
              {w.replace("区", "")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-1.5 text-[10px] text-muted">
        <span>{results.length === 60 ? "上位60件" : `${results.length}件`}</span>
        <span className="flex gap-1.5" title="点線の枠は対象区域外またはデータなし">
          <span className="w-9 text-center">治安</span>
          <span className="w-9 text-center">洪水</span>
          <span className="w-9 text-center">高潮</span>
          <span className="w-9 text-center">地盤</span>
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto border-t border-line">
        {results.map((e) => (
          <li key={e.key}>
            <button
              onClick={() => onSelect(e.key)}
              className={`flex w-full items-center gap-2 border-b border-line/70 px-4 py-2.5 text-left text-[13px] transition-colors ${
                selectedKey === e.key ? "bg-aqua-100/80 font-medium" : "hover:bg-aqua-50"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="mr-1 text-[11px] text-muted">{e.ward}</span>
                {e.town}
                {!e.scored && <span className="ml-1.5 text-[10px] text-muted">（対象外）</span>}
              </span>
              <span className="flex shrink-0 gap-1.5">
                <MiniBar value={e.s} />
                <MiniBar value={e.f} />
                <MiniBar value={e.t} title={e.tide_scope ? "データなし" : "高潮浸水想定区域の対象外"} />
                <MiniBar value={e.g} />
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted">
            見つかりませんでした。
            <br />
            <span className="text-[12px]">「三軒茶屋」のように町名だけでも探せます</span>
          </li>
        )}
      </ul>
    </div>
  );
}
