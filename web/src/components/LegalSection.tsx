export default function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-card">
      <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-ink">
        {children}
      </div>
    </section>
  );
}
