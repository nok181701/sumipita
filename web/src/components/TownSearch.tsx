"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IndexEntry } from "@/lib/types";
import { scoreColor } from "@/lib/axes";

/** 全角/半角・漢数字の揺れを吸収して検索する（データ側の突合と同じ考え方） */
const KANJI: Record<string, string> = {
  一: "1",
  二: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",
  十: "10",
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
        value === null
          ? "bg-line/50 outline-dashed outline-1 outline-offset-1 outline-line"
          : "bg-line"
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
  // モバイルでは結果一覧をドロップダウンで出す。検索ボックス自体は常に最上部の固定サイズで、
  // 一覧を出しても地図を押し下げないようにするため
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const normalized = useMemo(
    () => entries.map((e) => ({ e, n: normalize(e.ward + e.town) })),
    [entries],
  );

  const results = useMemo(() => {
    const nq = normalize(q);
    return normalized
      .filter(
        ({ e, n }) =>
          (ward ? e.ward === ward : true) && (nq ? n.includes(nq) : true),
      )
      .slice(0, 60)
      .map(({ e }) => e);
  }, [normalized, q, ward]);

  const select = (key: string) => {
    onSelect(key);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative lg:flex lg:h-full lg:flex-col">
      <div className="flex flex-col gap-2 p-3 lg:shrink-0">
        <p className="hidden px-0.5 text-[11px] font-medium text-aqua-600 lg:block">
          気になっている街を入れてください
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="町丁目で検索（例: 三軒茶屋、芝浦2丁目）"
          className="w-full rounded-full border border-line bg-aqua-50/60 px-4 py-2 text-base outline-none transition-colors placeholder:text-muted/70 focus:border-aqua-500 focus:bg-white"
        />
        <div className="hidden flex-wrap gap-1 lg:flex">
          <button
            onClick={() => {
              setWard("");
              setOpen(true);
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
              ward === ""
                ? "bg-aqua-500 font-medium text-white"
                : "bg-aqua-50 text-muted hover:bg-aqua-100"
            }`}
          >
            全23区
          </button>
          {wards.map((w) => (
            <button
              key={w}
              onClick={() => {
                setWard(w);
                setOpen(true);
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                ward === w
                  ? "bg-aqua-500 font-medium text-white"
                  : "bg-aqua-50 text-muted hover:bg-aqua-100"
              }`}
            >
              {w.replace("区", "")}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`absolute inset-x-0 top-full z-30 mt-1.5 flex flex-col rounded-card border border-line bg-white shadow-card lg:static lg:mt-0 lg:flex-1 lg:overflow-hidden lg:rounded-none lg:border-0 lg:border-t lg:shadow-none ${
          open ? "flex" : "hidden lg:flex"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-1.5 text-[10px] text-muted">
          <span>
            {results.length === 60 ? "上位60件" : `${results.length}件`}
          </span>
          <span
            className="flex gap-1.5"
            title="点線の枠は対象区域外またはデータなし"
          >
            <span className="w-9 text-center">治安</span>
            <span className="w-9 text-center">洪水</span>
            <span className="w-9 text-center">高潮</span>
            <span className="w-9 text-center">液状化</span>
          </span>
        </div>

        <ul className="max-h-[60vh] overflow-y-auto border-t border-line lg:max-h-none lg:flex-1">
          {results.map((e) => (
            <li
              key={e.key}
              className={`flex items-stretch border-b border-line/70 ${
                selectedKey === e.key ? "bg-aqua-100/80" : ""
              }`}
            >
              <button
                onClick={() => select(e.key)}
                className={`flex min-w-0 flex-1 items-center gap-2 px-4 py-2.5 text-left text-[13px] transition-colors ${
                  selectedKey === e.key ? "font-medium" : "hover:bg-aqua-50"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="mr-1 text-[11px] text-muted">
                    {e.ward}
                  </span>
                  {e.town}
                  {!e.scored && (
                    <span className="ml-1.5 text-[10px] text-muted">
                      （対象外）
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <MiniBar value={e.s} />
                  <MiniBar value={e.f} />
                  <MiniBar
                    value={e.t}
                    title={
                      e.tide_scope ? "データなし" : "高潮浸水想定区域の対象外"
                    }
                  />
                  <MiniBar value={e.g} />
                </span>
              </button>
              {e.slug && (
                <Link
                  href={`/machi/${e.slug.wardSlug}/${e.slug.townSlug}`}
                  title={`${e.ward}${e.town}の詳細ページを開く`}
                  aria-label={`${e.ward}${e.town}の詳細ページを開く`}
                  className="flex shrink-0 items-center px-3 text-muted transition-colors hover:bg-aqua-50 hover:text-aqua-600"
                >
                  →
                </Link>
              )}
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">
              見つかりませんでした。
              <br />
              <span className="text-[12px]">
                「三軒茶屋」のように町名だけでも探せます
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
