import { CRITERIA, CRITERIA_ANCHOR } from "@/lib/criteria";
import type { Criteria } from "@/lib/criteria";

function Block({ c }: { c: Criteria }) {
  return (
    <article
      id={CRITERIA_ANCHOR(c.id)}
      className="scroll-mt-4 rounded-card border border-line bg-white p-5 shadow-card target:ring-2 target:ring-aqua-500"
    >
      <h3 className="text-lg font-bold tracking-tight">
        {c.scored
          ? `${c.label}は、何を基準に判定しているか`
          : `${c.label}（点数にしていないリスク）`}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed">{c.summary}</p>

      <div className="mt-4 rounded-2xl bg-aqua-50/70 px-3.5 py-3">
        <p className="text-[11px] font-semibold text-aqua-700">使っているデータ</p>
        <p className="mt-1 text-[12px] leading-relaxed">
          <a
            href={c.source.url}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-aqua-200 underline-offset-2 transition-colors hover:text-aqua-600"
          >
            {c.source.name}
          </a>
          {c.source.note && <span className="text-muted"> — {c.source.note}</span>}
        </p>
      </div>

      {c.counted && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-aqua-700">
            {c.scored ? "点数に数えているもの" : "対象にしているもの"}
          </p>
          <div className="mt-1.5 space-y-2">
            {c.counted.map((g) => (
              <div key={g.label} className="rounded-2xl border border-line px-3.5 py-2.5">
                <p className="text-[12px] font-semibold">
                  {g.label}
                  {g.weight && (
                    <span className="ml-1.5 rounded-full bg-aqua-100 px-2 py-0.5 text-[10px] font-medium text-aqua-700">
                      重み {g.weight}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{g.items.join(" ・ ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {c.notCounted && (
        <div className="mt-3 rounded-2xl border border-line bg-[#fbfcfc] px-3.5 py-2.5">
          <p className="text-[11px] font-semibold text-muted">あえて数えていないもの</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            {c.notCounted.items.join(" ・ ")}
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{c.notCounted.why}</p>
        </div>
      )}

      <div className="mt-4">
        <p className="text-[11px] font-semibold text-aqua-700">
          {c.scored ? "点数の出し方" : "どう扱っているか"}
        </p>
        <ol className="mt-1.5 space-y-1.5">
          {c.howTo.map((h, i) => (
            <li key={i} className="flex gap-2.5 text-[12px] leading-relaxed">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-aqua-100 text-[10px] font-semibold text-aqua-700">
                {i + 1}
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold text-[#a2662a]">読むときに気をつけること</p>
        <ul className="mt-1.5 space-y-1.5">
          {c.caveats.map((h, i) => (
            <li key={i} className="flex gap-2 text-[12px] leading-relaxed">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#d9a04a]" />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/**
 * @param heading 単独ページ（/criteria）ではこれが主見出しになるので h1 を渡す。
 *   トップに埋め込む場合は h1 が別にあるため h2 のままにすること。
 *   見出しレベルの重複や飛びは、クローラにも読み上げにも効く。
 */
export default function CriteriaSection({
  heading = "h2",
}: {
  heading?: "h1" | "h2";
}) {
  const Heading = heading;
  return (
    <section id="criteria" className="scroll-mt-4 space-y-4">
      <header className="px-1">
        <Heading className="text-xl font-bold tracking-tight">
          すみピタの判定基準
        </Heading>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          点数はすべて、23区3,142町丁目の中での相対的な順位です（100に近いほど上位）。
          絶対的な安全性を表すものではありません。何をどう数えているかを、軸ごとに書いておきます。
        </p>
      </header>
      {CRITERIA.map((c) => (
        <Block key={c.id} c={c} />
      ))}
    </section>
  );
}
