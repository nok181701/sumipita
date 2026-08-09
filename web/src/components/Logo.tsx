type Props = {
  /** シンボルのみ / 横組み / 縦組み */
  variant?: "symbol" | "horizontal" | "vertical";
  /** シンボルの一辺(px)。ロックアップ全体がこれに追従する */
  size?: number;
  className?: string;
};

/** 区画に一片が嵌まる直前の形 —「ピタ」の嵌合 */
const NOTCH = "M16 5 H32 A11 11 0 0 1 43 16 V26 H30 A4 4 0 0 0 26 30 V43 H16 A11 11 0 0 1 5 32 Z";

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
      <path d={NOTCH} fill="#2bb3cd" />
      <rect x="30" y="30" width="13" height="13" rx="4" fill="#0f2c38" />
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
