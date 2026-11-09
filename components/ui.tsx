import { formatRupiah } from "@/lib/constants";

/** Angka uang 24–32px berat 600, tabular-nums (PRD bagian 8) */
export function Money({
  value,
  size = "md",
  tone,
}: {
  value: number | null | undefined;
  size?: "md" | "lg" | "xl";
  tone?: "paid" | "due" | "late" | "muted";
}) {
  const cls =
    size === "xl" ? "text-3xl font-semibold" : size === "lg" ? "text-2xl font-semibold" : "text-lg font-semibold";
  const color =
    tone === "paid"
      ? "var(--color-paid)"
      : tone === "late"
        ? "var(--color-late)"
        : tone === "due"
          ? "var(--color-due)"
          : tone === "muted"
            ? "var(--color-ink-muted)"
            : "var(--color-ink)";
  return (
    <span className={`money ${cls}`} style={{ color }}>
      {formatRupiah(value)}
    </span>
  );
}

/** Status dengan teks + ikon warna, tidak hanya warna */
export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "paid" | "due" | "late" | "draft" | "vacant";
}) {
  const bgMap: Record<string, string> = {
    paid: "var(--color-paid-soft)",
    due: "var(--color-due-soft)",
    late: "var(--color-late-soft)",
    draft: "var(--color-vacant-soft)",
    vacant: "var(--color-vacant-soft)",
  };
  const fgMap: Record<string, string> = {
    paid: "var(--color-paid)",
    due: "var(--color-due)",
    late: "var(--color-late)",
    draft: "var(--color-vacant)",
    vacant: "var(--color-vacant)",
  };
  return (
    <span className="badge" style={{ background: bgMap[tone], color: fgMap[tone] }}>
      {tone === "paid" ? "✔" : tone === "late" ? "⏰" : tone === "draft" ? "✎" : "•"} {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
        {description}
      </p>
      {children}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card space-y-3 p-6">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 w-full animate-pulse rounded"
          style={{ background: "var(--color-border)" }}
        />
      ))}
    </div>
  );
}
