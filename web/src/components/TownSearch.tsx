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
      className={`h-1.5 w-10 overflow-hidden rounded-full ${
        value === null ? "bg-line/60 outline-dashed outline-1 outline-offset-1 outline-line" : "bg-line"
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
      <div className="flex gap-2 p-3">
        <select
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          className="rounded border border-line bg-white px-2 py-1.5 text-sm"
        >
          <option value="">全23区</option>
          {wards.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="町丁目で検索（例: 三軒茶屋、芝浦2丁目）"
          className="min-w-0 flex-1 rounded border border-line bg-white px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-1 text-[11px] text-muted">
        <span title="点線の枠は対象区域外またはデータなし">
          {results.length === 60 ? "上位60件" : `${results.length}件`}
        </span>
        <span className="flex gap-1.5">
          <span className="w-10 text-center">治安</span>
          <span className="w-10 text-center">洪水</span>
          <span className="w-10 text-center">高潮</span>
          <span className="w-10 text-center">地盤</span>
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto border-t border-line">
        {results.map((e) => (
          <li key={e.key}>
            <button
              onClick={() => onSelect(e.key)}
              className={`flex w-full items-center gap-2 border-b border-line px-4 py-2 text-left text-sm hover:bg-black/[0.03] ${
                selectedKey === e.key ? "bg-black/[0.05]" : ""
              }`}
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="text-muted">{e.ward}</span>
                {e.town}
                {!e.scored && (
                  <span className="ml-1.5 text-[11px] text-muted">（算出対象外）</span>
                )}
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
          <li className="px-4 py-6 text-center text-sm text-muted">該当する町丁目がありません</li>
        )}
      </ul>
    </div>
  );
}
