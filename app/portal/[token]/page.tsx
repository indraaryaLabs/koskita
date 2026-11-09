import type { Metadata } from "next";
import Link from "next/link";
import { sbAdmin, missingEnv } from "@/lib/supabase";
import { formatRupiah, formatTanggal, todayISO } from "@/lib/constants";
import { displayStatus } from "./portal-helpers";
import { PortalPayForm, PortalReportForm } from "./portal-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // noindex portal (PRD bagian 11)
};

type PortalData = {
  tenant: { id: string; name: string; phone_e164: string };
  room: { name: string; price_idr: number } | null;
  property: { id: string; name: string; code: string; rules_text: string; timezone: string } | null;
  payment_methods: { kind: string; bank_name: string | null; account_no: string | null; account_name: string | null; qris_path: string | null }[];
  invoices: {
    id: string;
    number: string;
    period_start: string;
    period_end: string;
    due_date: string;
    status: string;
    total_idr: number;
    paid_idr: number;
    late_fee_idr: number;
    items: { id: string; kind: string; description: string; amount_idr: number; meter_start: number | null; meter_end: number | null }[];
    payments: { id: string; amount_idr: number; paid_on: string; method: string; status: string; receipt_number: string | null; reject_reason: string }[];
  }[];
  tickets: { id: string; category: string; description: string; status: string; notes: string; created_at: string }[];
};

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (missingEnv()) {
    return <PortalError title="Portal belum terpasang" message="Server belum terhubung ke database." />;
  }
  const admin = sbAdmin();
  if (!admin) {
    return <PortalError title="Portal belum terpasang" message="Layanan storage/database belum siap." />;
  }

  // Validasi token via fungsi security definer — portal tidak pernah membaca tabel langsung (PRD F6).
  const { data, error } = await admin.rpc("portal_get", { p_token: token });

  const portal = (data ?? null) as PortalData | null;

  if (error || !portal) {
    return <PortalError title="Tautan tidak berlaku" message="Buka tautan persis seperti yang dikirim pemilik kos, atau minta tautan baru." />;
  }

  const today = todayISO();
  const openInvoices = portal.invoices.filter((i) => i.status !== "paid" && i.paid_idr < i.total_idr);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <header className="mb-6">
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>{portal.property?.name ?? "Kos Anda"}</p>
        <h1 className="text-3xl font-extrabold">
          Kamar {portal.room?.name ?? "—"} · {portal.tenant.name}
        </h1>
      </header>

      <section className="card p-5 mb-2">
        <h2 className="text-lg font-extrabold mb-1">Cara membayar</h2>
        {portal.payment_methods.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Pemilik belum mencantumkan rekening. Tanyakan langsung ke pemilik/nomor WhatsApp kos.
          </p>
        ) : (
          <ul className="space-y-1 text-[15px]">
            {portal.payment_methods.map((m, i) => (
              <li key={i}>
                {m.kind === "qris"
                  ? "QRIS — pindai di tempat (rusak? tanya pemilik)"
                  : `${m.bank_name ?? "Bank"} ${m.account_no ?? ""} a.n. ${m.account_name ?? ""}`}
              </li>
            ))}
          </ul>
        )}
        {portal.property?.rules_text ? (
          <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: "var(--color-ink-muted)" }}>
            {portal.property.rules_text}
          </p>
        ) : null}
      </section>

      {/* Tagihan */}
      <section aria-labelledby="invH" className="mt-8">
        <h2 id="invH" className="text-xl font-extrabold mb-3">
          {openInvoices.length > 0 ? "Tagihan Anda" : "Tidak ada tagihan yang menunggu"}
        </h2>
        {openInvoices.length > 0 ? (
          <div className="space-y-4">
            {openInvoices.map((inv) => {
              const st = displayStatus(inv, today);
              return (
                <div key={inv.id} className="card p-5 space-y-3" role="listitem">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">{inv.number}</p>
                      <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                        Periode {formatTanggal(inv.period_start)} – {formatTanggal(inv.period_end)} · Jatuh tempo {formatTanggal(inv.due_date)}
                      </p>
                    </div>
                    <strong
                      className="badge"
                      style={{
                        background: st.tone === "late" ? "var(--color-late-soft)" : "var(--color-due-soft)",
                        color: st.tone === "late" ? "var(--color-late)" : "var(--color-due)",
                      }}
                    >
                      {st.label}
                    </strong>
                  </div>

                  <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                    {inv.items.map((it) => (
                      <div key={it.id} className="flex justify-between py-1 text-sm">
                        <span>{it.description}</span>
                        <span className="money font-semibold">
                          {it.kind === "discount" ? "−" : ""}
                          {formatRupiah(it.amount_idr)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 font-extrabold text-lg">
                      <span>Harus dibayar</span>
                      <span className="money">{formatRupiah(Math.max(inv.total_idr - inv.paid_idr, 0))}</span>
                    </div>
                  </div>

                  {inv.payments.filter((p) => p.status === "pending").length > 0 && (
                    <p className="text-sm" style={{ color: "var(--color-due)" }}>
                      Bukti Anda sedang diperiksa pemilik. KWITANSI keluar setelah diterima. ✓
                    </p>
                  )}
                  {inv.payments.filter((p) => p.status === "rejected").map((p) => (
                    <p key={p.id} className="text-sm" style={{ color: "var(--color-late)" }}>
                      Bukti ditolak: {p.reject_reason || "tidak sesuai"} — silakan unggah ulang.
                    </p>
                  ))}

                  <PortalPayForm token={token} invoiceId={inv.id} remaining={inv.total_idr - inv.paid_idr} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="card p-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Semua tagihan lunas. Terima kasih telah membayar tepat waktu! 🎉
          </p>
        )}
      </section>

      {/* Riwayat + kwitansi */}
      <section aria-labelledby="histH" className="mt-10">
        <h2 id="histH" className="text-xl font-extrabold mb-3">Riwayat pembayaran</h2>
        {portal.invoices.filter((i) => i.payments.length > 0).length === 0 ? (
          <p className="card p-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>Belum ada pembayaran tercatat.</p>
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--color-border)" }}>
            {portal.invoices
              .flatMap((i) => i.payments.map((p) => ({ ...p, invoice: i })))
              .sort((a, b) => (a.paid_on < b.paid_on ? 1 : -1))
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-semibold money">{formatRupiah(p.amount_idr)}</p>
                    <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
                      {formatTanggal(p.paid_on)} · {p.method === "transfer" ? "Transfer" : p.method === "qris" ? "QRIS" : "Tunai"}
                    </p>
                  </div>
                  {p.status === "verified" ? (
                    <a
                      href={`/api/portal/${token}/kwitansi/${p.id}`}
                      className="btn btn-ghost"
                      download
                    >
                      Kwitansi {p.receipt_number}
                    </a>
                  ) : p.status === "pending" ? (
                    <span className="badge" style={{ background: "var(--color-due-soft)", color: "var(--color-due)" }}>
                      • Sedang dicek
                    </span>
                  ) : (
                    <span className="badge" style={{ background: "var(--color-late-soft)", color: "var(--color-late)" }}>
                      ⏰ Ditolak
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Lapor kerusakan */}
      <section aria-labelledby="repH" className="mt-10">
        <h2 id="repH" className="text-xl font-extrabold mb-3">Lapor kerusakan</h2>
        <PortalReportForm token={token} tickets={portal.tickets} />
      </section>

      <footer className="mt-12 text-center text-xs" style={{ color: "var(--color-ink-muted)" }}>
        <Link href="/" className="underline">
          Kelola kos Anda dengan KosKita
        </Link>
      </footer>
    </main>
  );
}

function PortalError({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mt-2" style={{ color: "var(--color-ink-muted)" }}>{message}</p>
    </main>
  );
}
