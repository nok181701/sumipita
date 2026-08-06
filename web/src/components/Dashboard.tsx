"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import ScoreCard from "./ScoreCard";
import TownSearch from "./TownSearch";
import type { IndexFile, Town } from "@/lib/types";

// MapLibre は window に依存するので SSR しない
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-[480px] rounded-lg border border-line bg-white shadow-sm" />,
});

/**
 * 詳細は区ごとに分割して取得する。
 * D1 + Workers に移行したら、この fetch を API 呼び出しに差し替えるだけで済む構成にしている。
 */
export default function Dashboard({ meta }: { meta: IndexFile }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [town, setTown] = useState<Town | null>(null);
  const [cache] = useState(() => new Map<string, Town[]>());
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (key: string) => {
      const ward = key.split("|")[0];
      setSelected(key);
      setLoading(true);
      try {
        let rows = cache.get(ward);
        if (!rows) {
          const res = await fetch(`/data/wards/${encodeURIComponent(ward)}.json`);
          rows = ((await res.json()) as { towns: Town[] }).towns;
          cache.set(ward, rows);
        }
        setTown(rows.find((t) => t.key === key) ?? null);
      } finally {
        setLoading(false);
      }
    },
    [cache],
  );

  useEffect(() => {
    if (!selected && meta.index.length) void load("世田谷区|三軒茶屋1丁目");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 lg:flex-row">
      <aside className="flex h-[420px] flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm lg:h-[calc(100vh-2rem)] lg:w-[380px] lg:shrink-0">
        <TownSearch
          entries={meta.index}
          wards={meta.wards}
          onSelect={load}
          selectedKey={selected}
        />
      </aside>

      <main className="min-w-0 flex-1 space-y-4">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">スムピタ</h1>
          <p className="text-sm text-muted">
            東京23区 {meta.town_count.toLocaleString()}町丁目 / スコア算出可{" "}
            {meta.scored_count.toLocaleString()}件 ・ {meta.data_year}年データ
          </p>
        </header>

        <MapView
          entries={meta.index}
          wardCodes={meta.ward_codes}
          selectedKey={selected}
          onSelect={load}
        />

        {loading && !town && (
          <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-muted">
            読み込み中…
          </div>
        )}
        {town && <ScoreCard town={town} />}

        <footer className="rounded-lg border border-line bg-white p-4 text-[11px] leading-relaxed text-muted">
          <p className="mb-2 font-medium text-ink">出典</p>
          <ul className="space-y-1">
            {meta.sources.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  {s.name}
                </a>
                <span className="ml-1">（{s.license}）</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            高潮浸水想定区域図の対象外の区: {meta.tide_out_of_scope.join("・")}
            。これらの区の高潮欄は「対象区域外」であり、安全性を確認したものではありません。
          </p>
        </footer>
      </main>
    </div>
  );
}
