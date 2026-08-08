"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Logo from "./Logo";
import ScoreCard from "./ScoreCard";
import TownSearch from "./TownSearch";
import type { IndexFile, Town } from "@/lib/types";

// MapLibre は window に依存するので SSR しない
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] rounded-card border border-line bg-white shadow-card" />
  ),
});

/**
 * 詳細は区ごとに分割して取得する。
 * D1 + Workers に移行したら、この fetch を API 呼び出しに差し替えるだけで済む構成にしている。
 */
export default function Dashboard({ meta }: { meta: IndexFile }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [town, setTown] = useState<Town | null>(null);
  const [cache] = useState(() => new Map<string, Town>());
  const [loading, setLoading] = useState(false);

  // 詳細はD1から1件ずつ取る。区ごとのJSONを丸ごと落とす必要がなくなった。
  const load = useCallback(
    async (key: string) => {
      setSelected(key);
      const hit = cache.get(key);
      if (hit) {
        setTown(hit);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/town?key=${encodeURIComponent(key)}`);
        if (!res.ok) {
          setTown(null);
          return;
        }
        const t = (await res.json()) as Town;
        cache.set(key, t);
        setTown(t);
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

  const selectedSlug = meta.index.find((e) => e.key === selected)?.slug ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
      <header className="mb-4">
        <div className="flex items-baseline gap-2.5">
          <h1>
            <Logo size={32} />
          </h1>
          <span className="text-[12px] text-muted">東京23区・町丁目単位</span>
        </div>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed lg:hidden">
          引越し先を決める前に、
          <strong className="font-semibold">治安・洪水・高潮・地盤（液状化）</strong>
          を公的データで町丁目ごとにサクッと確認できます。
        </p>
        <p className="mt-2 hidden max-w-2xl text-[13.5px] leading-relaxed lg:block">
          治安、洪水、高潮、地盤（液状化）を町丁目ごとに調べました。
          <br />
          引越しなどで住居先を決める前に、ここでサクッと確認できます。
          <strong className="font-semibold">治安・洪水・高潮・地盤（液状化）</strong>
          の4つを、 公的データから町丁目ごとに出しました。
          <br />
        </p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="relative z-30 rounded-card border border-line bg-white shadow-card lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-[350px] lg:shrink-0 lg:flex-col lg:overflow-hidden">
          <TownSearch
            entries={meta.index}
            wards={meta.wards}
            onSelect={load}
            selectedKey={selected}
          />
        </aside>

        <main className="min-w-0 flex-1 space-y-4">
          <MapView
            entries={meta.index}
            wardCodes={meta.ward_codes}
            selectedKey={selected}
            onSelect={load}
          />

          {loading && !town && (
            <div className="rounded-card border border-line bg-white p-8 text-center text-sm text-muted shadow-card">
              読み込み中…
            </div>
          )}
          {town && <ScoreCard town={town} headingLevel="h2" />}

          {town && selectedSlug && (
            <div className="text-right">
              <Link
                href={`/machi/${selectedSlug.wardSlug}/${selectedSlug.townSlug}`}
                className="text-[12px] font-medium text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
              >
                この街の詳細ページを開く（共有・ブックマーク用） →
              </Link>
            </div>
          )}

          <div className="rounded-card border border-line bg-white p-4 text-center shadow-card">
            <Link
              href="/criteria"
              target="_blank"
              rel="noreferrer noopener"
              className="text-[13px] font-medium text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
            >
              判定基準を見る →
            </Link>
          </div>

          <footer className="rounded-card border border-line bg-white/70 p-4 text-[11px] leading-relaxed text-muted">
            <p className="mb-1.5 font-semibold text-ink">
              このアプリが見ているデータ（{meta.data_year}
              年時点・すべて公的機関の公開データ）
            </p>
            <ul className="space-y-1">
              {meta.sources.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline decoration-line underline-offset-2 transition-colors hover:text-aqua-600"
                  >
                    {s.name}
                  </a>
                  <span className="ml-1">（{s.license}）</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              高潮は {meta.tide_out_of_scope.join("・")}{" "}
              が想定区域の対象外です。これらの区の高潮欄は「調べていない」であって「安全」ではありません。
              全{meta.town_count.toLocaleString()}町丁目のうち、
              人口が少なくスコアを出せなかったものが{" "}
              {(meta.town_count - meta.scored_count).toLocaleString()}
              件あります。
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
