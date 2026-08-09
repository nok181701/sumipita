type Props = {
  /** シンボルのみ / 横組み / 縦組み */
  variant?: "symbol" | "horizontal" | "vertical";
  /** シンボルの一辺(px)。ロックアップ全体がこれに追従する */
  size?: number;
  className?: string;
};

const HOUSE =
  "M24 9.5 L38 20 V36.5 a2.5 2.5 0 0 1 -2.5 2.5 H12.5 A2.5 2.5 0 0 1 10 36.5 V20 Z";

function Symbol({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="すみピタ"
      className={className}
    >
      <rect x="3" y="3" width="42" height="42" rx="13" stroke="#c3e9f2" strokeWidth="2.5" />
      <path d={HOUSE} fill="#2bb3cd" />
      {/* 扉は背景の抜き。白以外の面に置くならこの fill を合わせる */}
      <rect x="19.5" y="27" width="9" height="12" rx="2.2" fill="#fff" />
    </svg>
  );
}

export default function Logo({ variant = "horizontal", size = 40, className }: Props) {
  if (variant === "symbol") return <Symbol size={size} className={className} />;

  if (variant === "vertical") {
    return (
      <span className={`inline-flex flex-col items-center gap-2 ${className ?? ""}`}>
        <Symbol size={size} />
        <span
          className="font-bold leading-none text-ink"
          style={{ fontFamily: "var(--font-logo)", fontSize: size * 0.62, letterSpacing: ".03em" }}
        >
          すみピタ
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <Symbol size={size} />
      <span
        className="font-bold leading-none text-ink"
        style={{ fontFamily: "var(--font-logo)", fontSize: size * 0.78, letterSpacing: ".02em" }}
      >
        すみピタ
      </span>
    </span>
  );
}
