import Link from "next/link";
import { redirect } from "next/navigation";
import { OwnerShell } from "@/components/owner-shell";
import { Money, StatusBadge } from "@/components/ui";
import { RemindButton } from "@/components/remind-button";
import { Landing } from "@/components/landing";
import { missingEnv, sb, getOwnerContext } from "@/lib/supabase";
import {
  listOpenInvoices,
  groupForToday,
  displayFor,
  buildWaLink,
  fillTemplate,
  DEFAULT_TEMPLATES,
  type TodayRow,
} from "@/lib/data";
import { formatRupiah, formatTanggal, todayISO } from "@/lib/constants";
import { BellRing } from "lucide-react";

export const dynamic = "force-dynamic";

async function lastReminderMap(invoiceIds: string[]): Promise<Map<string, string>> {
  const client = await sb();
  const map = new Map<string, string>();
  if (!client || invoiceIds.length === 0) return map;
  const { data } = await client
    .from("reminders")
    .select("invoice_id, sent_at")
    .in("invoice_id", invoiceIds)
    .order("sent_at", { ascending: false });
  for (const r of data ?? []) {
    if (!map.has(r.invoice_id as string)) {
      map.set(r.invoice_id as string, r.sent_at as string);
    }
  }
  return map;
}

export default async function HariIniPage() {
  if (missingEnv()) {
    return (
      <OwnerShell title="Hari ini" requireOrg={false}>
        <></>
      </OwnerShell>
    );
  }

  const ctx = await getOwnerContext();

  // Belum login → halaman penjahat (landing)
  if (!ctx) {
    return <Landing />;
  }

  // Sudah login tapi belum punya organisasi → onboarding
  if (!ctx.org) {
    redirect("/onboarding");
  }

  const client = await sb();
  if (!client) return <OwnerShell title="Hari ini" requireOrg={false}><></></OwnerShell>;

  const today = todayISO();
  const rows = await listOpenInvoices(client);
  const { dueSoon, dueToday, late } = groupForToday(rows, today);
  const lastRem = await lastReminderMap(rows.map((r) => r.invoice_id));

  const { count: pendingCountRaw } = await client
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const pendingCount = pendingCountRaw ?? 0;

  const prop = await client
    .from("properties")
    .select("id, name, billing_settings")
    .limit(1)
    .maybeSingle();

  const property = prop.data as
    | { id: string; name: string; billing_settings: Record<string, unknown> }
    | null;

  const unpaidCount = rows.length;
  const unpaidSum = rows.reduce((a, r) => a + (r.total_idr - r.paid_idr), 0);

  function WaCard({ r, label, tone }: { r: TodayRow; label: string; tone: "paid" | "due" | "late" | "draft" | "vacant" }) {
    if (!property) return null;
    const st = (property.billing_settings ?? {}) as Record<string, unknown>;
    const templates = (st.reminder_templates as Record<string, string> | undefined) ?? DEFAULT_TEMPLATES;
    const tplName = tone === "late" ? "tegas" : diffDays(r.due_date, today) === 0 ? "pengingat" : "ramah";
    const msg = fillTemplate(templates[tplName] ?? DEFAULT_TEMPLATES[tplName], {
      nama: r.tenant_name,
      kos: property.name,
      periode: r.number,
      tanggal: formatTanggal(r.due_date),
      total: formatRupiah(r.total_idr - r.paid_idr),
      portal_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/portal/${r.tenant_token}`,
      telat: `${Math.abs(diffDays(r.due_date, today))} hari`,
    });
    const waUrl = buildWaLink(r.tenant_phone, msg);
    return (
      <div className="card p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-bold text-lg">{r.tenant_name}</p>
            <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
              Kamar {r.room_name} · {r.number}
            </p>
          </div>
          <StatusBadge label={label} tone={tone} />
        </div>
        <div className="flex items-end justify-between gap-3">
          <Money value={r.total_idr - r.paid_idr + r.late_fee_idr} size="lg" tone={tone === "late" ? "late" : "due"} />
          <div className="text-right text-xs" style={{ color: "var(--color-ink-muted)" }}>
            Jatuh tempo {formatTanggal(r.due_date)}
            {lastRem.get(r.invoice_id) && (
              <span className="block">Pengingat terakhir: {new Date(lastRem.get(r.invoice_id) as string).toLocaleString("id-ID")}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <RemindButton waUrl={waUrl} invoiceId={r.invoice_id} template={tplName} className="btn btn-primary flex-1" disabled={!r.tenant_phone}>
            <BellRing size={18} aria-hidden /> Ingatkan
          </RemindButton>
          <Link href="/tagihan" className="btn btn-ghost">
            Rincian
          </Link>
        </div>
      </div>
    );
  }

  return (
    <OwnerShell title="Hari ini">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 max-w-4xl">
        <div className="card p-4">
          <p className="label-muted">Belum bayar</p>
          <Money value={unpaidSum} size="xl" tone="due" />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            {unpaidCount} tagihan
          </p>
        </div>
        <div className="card p-4">
          <p className="label-muted">Telat</p>
          <Money value={late.reduce((a, r) => a + (r.total_idr - r.paid_idr + r.late_fee_idr), 0)} size="xl" tone="late" />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            {late.length} kamar
          </p>
        </div>
        <div className="card p-4 relative">
          {pendingCount > 0 && (
            <span
              aria-live="polite"
              className="absolute -top-2 -right-2 badge"
              style={{ background: "var(--color-late)", color: "#fff" }}
            >
              {pendingCount}
            </span>
          )}
          <p className="label-muted">Bukti bayar</p>
          <p className="text-2xl font-semibold">{pendingCount}</p>
          <Link href="/tagihan" className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
            Perlu dicek →
          </Link>
        </div>
        <div className="card p-4">
          <p className="label-muted">Perlu diingatkan</p>
          <p className="text-2xl font-semibold">{dueSoon.length + dueToday.length}</p>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            3 hari ke depan + hari ini
          </p>
        </div>
      </section>

      <div className="mt-6 max-w-3xl space-y-6">
        {late.length > 0 && (
          <section aria-labelledby="terlambat">
            <h2 id="terlambat" className="mb-2 text-lg font-extrabold">
              Terlambat ({late.length})
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {late.map((r) => {
                const d = displayFor(r, today);
                return <WaCard key={r.invoice_id} r={r} label={d.label} tone={d.tone as "late"} />;
              })}
            </div>
          </section>
        )}

        {dueToday.length > 0 && (
          <section aria-labelledby="hari-ini-2">
            <h2 id="hari-ini-2" className="mb-2 text-lg font-extrabold">
              Jatuh tempo hari ini ({dueToday.length})
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {dueToday.map((r) => {
                const d = displayFor(r, today);
                return <WaCard key={r.invoice_id} r={r} label={d.label} tone={d.tone as "due"} />;
              })}
            </div>
          </section>
        )}

        {dueSoon.length > 0 && (
          <section aria-labelledby="3h">
            <h2 id="3h" className="mb-2 text-lg font-extrabold">
              Jatuh tempo 3 hari lagi ({dueSoon.length})
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {dueSoon.map((r) => {
                const d = displayFor(r, today);
                return <WaCard key={r.invoice_id} r={r} label={d.label} tone={d.tone as "due"} />;
              })}
            </div>
          </section>
        )}

        {rows.length === 0 && (
          <div className="card p-6 text-center max-w-2xl mx-auto">
            <p className="text-lg font-bold">Belum ada tagihan terbuka 🎉</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-ink-muted)" }}>
              Tambahkan penghuni di menu Lainnya → Penghuni. Tagihan terbit otomatis H-7 sebelum jatuh tempo.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/penghuni" className="btn btn-primary">Tambah penghuni</Link>
              <Link href="/kamar" className="btn btn-ghost">Kelola kamar</Link>
            </div>
          </div>
        )}
      </div>
    </OwnerShell>
  );
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);
}
