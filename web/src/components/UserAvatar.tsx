export default function UserAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-aqua-500 text-white"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="currentColor" />
        <path d="M4 20.5c0-4.42 3.58-7.5 8-7.5s8 3.08 8 7.5" fill="currentColor" />
      </svg>
    </span>
  );
}
