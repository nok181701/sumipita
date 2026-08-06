"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AXES } from "@/lib/axes";
import type { Axis, IndexEntry } from "@/lib/types";

/** index.json のスコアキー。axes.ts の Axis と1対1で対応する */
const PROP: Record<Axis, "s" | "f" | "t" | "g"> = {
  safety: "s",
  flood: "f",
  tide: "t",
  ground: "g",
};

const SRC = "towns";
const FILL = "towns-fill";
const HATCH = "towns-hatch";
const LINE = "towns-line";
const PICKED = "towns-picked";

const NO_DATA = "#d4d4d8";

/**
 * 塗り分けは0-100の連続値。しきい値ごとに色を切るとスコアカードの
 * 「良好/平均的/注意」と二重の基準になるので、連続的に補間する。
 */
const colorRamp = (prop: string): maplibregl.ExpressionSpecification => [
  "interpolate",
  ["linear"],
  ["to-number", ["get", prop]],
  0, "#b91c1c",
  25, "#dc2626",
  40, "#d97706",
  55, "#ca8a04",
  70, "#16a34a",
  100, "#15803d",
];

/** 斜線パターン。「データがない」を色で塗らないための地の模様 */
function hatchImage(): ImageData {
  const s = 8;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "#a1a1aa";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-2, s + 2);
  ctx.lineTo(s + 2, -2);
  ctx.moveTo(-2, 2);
  ctx.lineTo(2, -2);
  ctx.moveTo(s - 2, s + 2);
  ctx.lineTo(s + 2, s - 2);
  ctx.stroke();
  return ctx.getImageData(0, 0, s, s);
}

type Props = {
  entries: IndexEntry[];
  wardCodes: Record<string, string>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

export default function MapView({ entries, wardCodes, selectedKey, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const [axis, setAxis] = useState<Axis>("safety");
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  // hover ハンドラは初期化時に1度だけ登録するので、最新の軸は ref から読む
  const axisRef = useRef<Axis>(axis);
  useEffect(() => {
    axisRef.current = axis;
  }, [axis]);

  // --- 初期化 ---
  useEffect(() => {
    if (!container.current || map.current) return;

    const m = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          gsi: {
            type: "raster",
            tiles: ["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 18,
            attribution:
              '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">地理院タイル</a>',
          },
        },
        layers: [{ id: "gsi", type: "raster", source: "gsi" }],
      },
      center: [139.75, 35.69],
      zoom: 10.2,
      maxZoom: 17,
      minZoom: 8,
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 8,
      className: "sumipita-popup",
    });

    m.on("load", async () => {
      m.addImage("hatch", hatchImage());

      // スコアを引くための索引。GeoJSONにはkeyしか入っていない
      const byKey = new Map(entries.map((e) => [e.key, e]));
      const codes = Object.values(wardCodes);
      const features: GeoJSON.Feature[] = [];
      let done = 0;

      await Promise.all(
        codes.map(async (code) => {
          const res = await fetch(`/data/geojson/${code}.geojson`);
          const fc = (await res.json()) as GeoJSON.FeatureCollection;
          for (const f of fc.features) {
            const e = byKey.get(f.properties?.key as string);
            if (!e) continue;
            // 値が無い軸はプロパティ自体を持たせない。
            // has で「データなし」を判定でき、null を0点として塗る事故が起きない。
            const props: Record<string, unknown> = { key: e.key, ward: e.ward, town: e.town };
            if (e.s !== null) props.s = e.s;
            if (e.f !== null) props.f = e.f;
            if (e.t !== null) props.t = e.t;
            if (e.g !== null) props.g = e.g;
            features.push({ ...f, id: features.length, properties: props });
          }
          done += 1;
          setProgress(Math.round((done / codes.length) * 100));
        }),
      );

      m.addSource(SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features } as GeoJSON.FeatureCollection,
      });

      m.addLayer({
        id: HATCH,
        type: "fill",
        source: SRC,
        paint: { "fill-pattern": "hatch", "fill-opacity": 0.85 },
      });
      m.addLayer({
        id: FILL,
        type: "fill",
        source: SRC,
        paint: { "fill-opacity": 0.68 },
      });
      m.addLayer({
        id: LINE,
        type: "line",
        source: SRC,
        paint: { "line-color": "#71717a", "line-width": 0.4, "line-opacity": 0.5 },
      });
      m.addLayer({
        id: PICKED,
        type: "line",
        source: SRC,
        filter: ["==", ["get", "key"], ""],
        paint: { "line-color": "#111827", "line-width": 2.5 },
      });

      m.on("click", FILL, (e) => {
        const k = e.features?.[0]?.properties?.key as string | undefined;
        if (k) onSelect(k);
      });
      m.on("click", HATCH, (e) => {
        const k = e.features?.[0]?.properties?.key as string | undefined;
        if (k) onSelect(k);
      });

      const hover = (e: maplibregl.MapLayerMouseEvent) => {
        m.getCanvas().style.cursor = "pointer";
        const p = e.features?.[0]?.properties;
        if (!p) return;
        const prop = PROP[axisRef.current];
        const v = p[prop];
        const label = AXES.find((a) => a.id === axisRef.current)!.label;
        const shown =
          v === undefined || v === null
            ? '<span style="color:#a1a1aa">データなし / 対象区域外</span>'
            : `${Number(v).toFixed(0)} 点`;
        popup.current!
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:12px;line-height:1.5">
               <strong>${p.ward}${p.town}</strong><br/>${label}: ${shown}
             </div>`,
          )
          .addTo(m);
      };
      m.on("mousemove", FILL, hover);
      m.on("mousemove", HATCH, hover);
      const leave = () => {
        m.getCanvas().style.cursor = "";
        popup.current!.remove();
      };
      m.on("mouseleave", FILL, leave);
      m.on("mouseleave", HATCH, leave);

      setLoaded(true);
    });

    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 軸の切り替え ---
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const p = PROP[axis];
    m.setPaintProperty(FILL, "fill-color", [
      "case",
      ["!", ["has", p]],
      NO_DATA,
      colorRamp(p),
    ] as maplibregl.ExpressionSpecification);
    // 「データなし」だけ斜線にする。塗りは上に重ねるので、
    // 該当する町丁目では塗り側を透明にして斜線を見せる
    m.setFilter(HATCH, ["!", ["has", p]]);
    m.setPaintProperty(FILL, "fill-opacity", [
      "case",
      ["!", ["has", p]],
      0,
      0.68,
    ] as maplibregl.ExpressionSpecification);
  }, [axis, loaded]);

  // --- 選択町丁目の強調と移動 ---
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded || !selectedKey) return;
    m.setFilter(PICKED, ["==", ["get", "key"], selectedKey]);
    const e = entries.find((x) => x.key === selectedKey);
    if (e?.lat && e?.lng) {
      m.easeTo({ center: [e.lng, e.lat], zoom: Math.max(m.getZoom(), 13.5), duration: 600 });
    }
  }, [selectedKey, loaded, entries]);

  const meta = AXES.find((a) => a.id === axis)!;

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-line p-2">
        {AXES.map((a) => (
          <button
            key={a.id}
            onClick={() => setAxis(a.id)}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              axis === a.id
                ? "bg-ink font-medium text-white"
                : "text-muted hover:bg-black/[0.04] hover:text-ink"
            }`}
          >
            {a.label}
          </button>
        ))}
        <span className="ml-auto pr-1 text-[11px] text-muted">{meta.unit}</span>
      </div>

      <div className="relative">
        <div ref={container} className="h-[420px] w-full lg:h-[480px]" />

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-muted">
            ポリゴンを読み込み中… {progress}%
          </div>
        )}

        <div className="pointer-events-none absolute bottom-6 right-2 rounded border border-line bg-white/95 px-3 py-2 text-[11px] shadow-sm">
          <div className="mb-1 font-medium">{meta.label}スコア</div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted">0</span>
            <span
              className="h-2 w-24 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg,#b91c1c,#dc2626,#d97706,#ca8a04,#16a34a,#15803d)",
              }}
            />
            <span className="text-muted">100</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-5 rounded-sm border border-line"
              style={{
                background:
                  "repeating-linear-gradient(45deg,#f4f4f5 0 2px,#a1a1aa 2px 3px)",
              }}
            />
            <span className="text-muted">対象区域外 / データなし</span>
          </div>
        </div>
      </div>

      <p className="border-t border-line px-3 py-2 text-[11px] leading-relaxed text-muted">
        斜線は「調査の対象外またはデータが存在しない」ことを表します。安全と確認された区域ではありません。
        高潮は世田谷・渋谷・中野・杉並・豊島・練馬の6区が対象外です。
      </p>
    </section>
  );
}
