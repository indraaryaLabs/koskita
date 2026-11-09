import Link from "next/link";
import { notFound } from "next/navigation";
import { OwnerShell } from "@/components/owner-shell";
import { StatusBadge, Money, EmptyState } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { getOwnerContext, sb } from "@/lib/supabase";
import {
  logReminderAction,
  fillMeterAction,
  addExtraItemAction,
  removeLateFeeAction,
  recordCashPaymentAction,
} from "@/app/actions";
import { formatRupiah, formatTanggal, todayISO } from "@/lib/constants";
import {
  displayFor,
  buildWaLink,
  fillTemplate,
  DEFAULT_TEMPLATES,
  type TodayRow,
} from "@/lib/data";
import {
  BellRing,
  Banknote,
  Plus,
  Trash2,
  Gauge,
  Receipt,
} from "lucide-react";

export const dynamic = "force-dynamic";

type InvoiceFull = {
  id: string;
  number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  status: string;
  total_idr: number;
  paid_idr: number;
  late_fee_idr: number;
  lease: {
    id: string;
    tenant: { id: string; name: string; phone_e164: string; portal_token: string; occupation: string };
    room: { name: string; price_idr: number };
  } | null;
};

type PaymentRow = {
  id: string;
  amount_idr: number;
  paid_on: string;
  method: string;
  status: string;
  receipt_number: string | null;
  reject_reason: string;
};

type ItemRow = {
  id: string;
  kind: string;
  description: string;
  amount_idr: number;
  meter_start: number | null;
  meter_end: number | null;
  unit_price_idr: number;
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx?.org) return <OwnerShell title="Tagihan" requireOrg={false}><></></OwnerShell>;

  const { data: invRaw } = await client
    .from("invoices")
    .select(
      `*, lease:leases(tenant:tenants(id, name, phone_e164, portal_token, occupation),
       room:rooms(name, price_idr))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!invRaw) notFound();
  const inv = invRaw as unknown as InvoiceFull;

  const [{ data: items }, { data: pays }, { data: lastRem }] = await Promise.all([
    client.from("invoice_items").select("*").eq("invoice_id", inv.id).order("id"),
    client.from("payments").select("*").eq("invoice_id", inv.id).order("created_at", { ascending: false }),
    client
      .from("reminders")
      .select("template, sent_at")
      .eq("invoice_id", inv.id)
      .order("sent_at", { ascending: false })
      .limit(1),
  ]);

  const itemRows = (items ?? []) as unknown as ItemRow[];
  const payRows = (pays ?? []) as unknown as PaymentRow[];
  const today = todayISO();
  const display = displayFor(
    { status: inv.status as "draft", due_date: inv.due_date, total_idr: inv.total_idr, paid_idr: inv.paid_idr } as TodayRow,
    today,
  );

  const propertyRes = await client.from("properties").select("name, billing_settings").limit(1).maybeSingle();
  const prop = propertyRes.data as { name: string; billing_settings: Record<string, unknown> } | null;
  const templates = (prop?.billing_settings?.reminder_templates as Record<string, string>) ?? DEFAULT_TEMPLATES;
  const tplName = display.tone === "late" ? "tegas" : "pengingat";
  const remaining = inv.total_idr - inv.paid_idr;
  const message = fillTemplate(templates[tplName], {
    nama: inv.lease?.tenant?.name ?? "",
    kos: prop?.name ?? "",
    periode: `${formatTanggal(inv.period_start)} – ${formatTanggal(inv.period_end)}`,
    tanggal: formatTanggal(inv.due_date),
    total: formatRupiah(remaining),
    portal_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/portal/${inv.lease?.tenant?.portal_token ?? ""}`,
    telat: "beberapa hari",
  });

  if (!inv.lease) {
    return (
      <OwnerShell title={inv.number} requireOrg={false}>
        <EmptyState title="Tagihan tanpa kontrak aktif" description="Kontrak sudah berakhir atau statusnya berubah. Buka menu Tagihan." />
      </OwnerShell>
    );
  }

  return (
    <OwnerShell title={`Tagihan ${inv.number}`}>
      <div className="max-w-4xl space-y-8">
        {/* Ringkasan */}
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-xl">{inv.lease.tenant.name}</p>
              <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                Kamar {inv.lease.room.name} · Periode {formatTanggal(inv.period_start)} – {formatTanggal(inv.period_end)} 
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--color-ink-muted)" }}>
                Jatuh tempo {formatTanggal(inv.due_date)}
              </p>
            </div>
            <div className="text-right">
              <StatusBadge label={display.label} tone={display.tone as "paid"} />
              <div className="mt-2">
                <Money value={remaining} size="xl" tone={display.tone === "late" ? "late" : "due"} />
              </div>
            </div>
          </div>

          {(display.tone === "due" || display.tone === "late") && (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={buildWaLink(inv.lease.tenant.phone_e164, message)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <BellRing size={18} aria-hidden /> Ingatkan via WhatsApp
              </a>
              <ActionForm action={logReminderAction} className="inline">
                <input type="hidden" name="invoice_id" value={inv.id} />
                <input type="hidden" name="template" value={tplName} />
                <SubmitButton className="btn btn-ghost">Catat pengingat</SubmitButton>
              </ActionForm>
              <p className="text-xs self-center" style={{ color: "var(--color-ink-muted)" }}>
                {lastRem && lastRem.length > 0
                  ? `Pengingat terakhir: ${new Date(lastRem[0].sent_at as string).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`
                  : "Belum pernah diingatkan."}
              </p>
            </div>
          )}
        </div>

        {/* Rincian */}
        <section aria-label="Rincian tagihan">
          <h2 className="mb-2 text-lg font-extrabold">Rincian</h2>
          <div className="card divide-y" style={{ borderColor: "var(--color-border)" }}>
            {itemRows.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{it.description}</p>
                  <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
                    {it.kind === "discount"
                      ? "Diskon"
                      : it.kind === "late_fee"
                        ? "Denda"
                        : it.kind === "extra"
                          ? "Tambahan"
                          : it.kind === "fixed"
                            ? "Biaya tetap"
                            : it.kind === "electricity"
                              ? `Listrik${it.unit_price_idr > 0 ? ` @${formatRupiah(it.unit_price_idr)}/kWh` : ""}`
                              : "Sewa"}
                  </p>
                </div>
                <p className="money font-semibold" style={{ color: it.kind === "discount" ? "var(--color-paid)" : "var(--color-ink)" }}>
                  {it.kind === "discount" ? "−" : ""}{formatRupiah(it.amount_idr)}
                </p>

                {it.kind === "electricity" && it.meter_end == null && (
                  <ActionForm action={fillMeterAction} successMessage="Meteran tersimpan." className="w-full flex flex-wrap items-end gap-2" >
                    <input type="hidden" name="item_id" value={it.id} />
                    <div className="w-32">
                      <label htmlFor={`ms-${it.id}`} className="label-muted block" style={{ color: "var(--color-ink-muted)", fontWeight: 600 }}>
                        Meteran awal
                      </label>
                      <input id={`ms-${it.id}`} name="meter_start" inputMode="numeric" className="input" required />
                    </div>
                    <div className="w-32">
                      <label htmlFor={`me-${it.id}`} className="label-muted block" style={{ color: "var(--color-ink-muted)", fontWeight: 600 }}>
                        Meteran akhir
                      </label>
                      <input id={`me-${it.id}`} name="meter_end" inputMode="numeric" className="input" required />
                    </div>
                    <SubmitButton className="btn btn-primary"><Gauge size={16} aria-hidden /> Simpan meteran</SubmitButton>
                  </ActionForm>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between p-4 font-bold">
              <span>Total tagihan</span>
              <span className="money">{formatRupiah(inv.total_idr)}</span>
            </div>
          </div>

          {/* Aksi tambahan */}
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <ActionForm action={addExtraItemAction} successMessage="Rincian ditambah." resetOnSuccess className="card p-4 space-y-2">
              <input type="hidden" name="invoice_id" value={inv.id} />
              <input type="hidden" name="kind" value="extra" />
              <label htmlFor="edesc" className="label">Tambahan sekali</label>
              <input id="edesc" name="description" className="input" placeholder="mis. Tamu menginap, perbaikan" required />
              <input id="eamount" name="amount_idr" inputMode="numeric" className="input" placeholder="Nominal (Rp)" required />
              <SubmitButton className="btn btn-ghost w-full"><Plus size={16} aria-hidden /> Tambah</SubmitButton>
            </ActionForm>

            <ActionForm action={addExtraItemAction} successMessage="Diskon ditambah." resetOnSuccess className="card p-4 space-y-2">
              <input type="hidden" name="invoice_id" value={inv.id} />
              <input type="hidden" name="kind" value="discount" />
              <label htmlFor="ddesc" className="label">Diskon (dengan alasan)</label>
              <input id="ddesc" name="description" className="input" placeholder="Keterangan" required />
              <input id="dreason" name="reason" className="input" placeholder="Alasan (tercatat)" required />
              <input id="damount" name="amount_idr" inputMode="numeric" className="input" placeholder="Nominal (Rp)" required />
              <SubmitButton className="btn btn-ghost w-full"><Plus size={16} aria-hidden /> Tambah diskon</SubmitButton>
            </ActionForm>

            {inv.late_fee_idr > 0 && (
              <ActionForm action={removeLateFeeAction} successMessage="Denda dihapus (tercatat di log)." className="card p-4 space-y-2">
                <input type="hidden" name="invoice_id" value={inv.id} />
                <label htmlFor="lfreason" className="label">Hapus denda {formatRupiah(inv.late_fee_idr)}</label>
                <input id="lfreason" name="reason" className="input" placeholder="Alasan, mis. sudah berdamai" required />
                <SubmitButton className="btn btn-danger w-full"><Trash2 size={16} aria-hidden /> Hapus denda</SubmitButton>
              </ActionForm>
            )}
          </div>
        </section>

        {/* Catat bayar tunai */}
        {remaining > 0 && (
          <section aria-labelledby="cashH" className="max-w-4xl">
            <h2 id="cashH" className="mb-2 text-lg font-extrabold">Catat pembayaran tunai / langsung</h2>
            <ActionForm action={recordCashPaymentAction} successMessage="Terbukbayar tercatat & kwitansi terbit." className="card p-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="invoice_id" value={inv.id} />
              <div className="w-40">
                <label htmlFor="cashAmount" className="label">Nominal</label>
                <input id="cashAmount" name="amount_idr" inputMode="numeric" className="input" placeholder={String(remaining)} required />
              </div>
              <div className="w-40">
                <label htmlFor="cashDate" className="label">Tanggal bayar</label>
                <input id="cashDate" name="paid_on" type="date" className="input" defaultValue={today} required />
              </div>
              <div className="w-36">
                <label htmlFor="cashMethod" className="label">Metode</label>
                <select id="cashMethod" name="method" className="input">
                  <option value="tunai">Tunai</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>
              <SubmitButton className="btn btn-primary"><Banknote size={18} aria-hidden /> Catat & terima</SubmitButton>
            </ActionForm>
          </section>
        )}

        {/* Riwayat pembayaran */}
        <section aria-labelledby="payHistH" className="max-w-4xl">
          <h2 id="payHistH" className="mb-2 text-lg font-extrabold">Riwayat pembayaran</h2>
          {payRows.length === 0 ? (
            <EmptyState title="Belum ada pembayaran" description="Pembayaran dari portal (transfer/QRIS) dan pencatatan tunai tampil di sini." />
          ) : (
            <div className="card divide-y" style={{ borderColor: "var(--color-border)" }}>
              {payRows.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold money">{formatRupiah(p.amount_idr)}</p>
                    <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                      {p.paid_on} · {p.method === "transfer" ? "Transfer" : p.method === "qris" ? "QRIS" : "Tunai"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.receipt_number && (
                      <a href={`/api/pdf/kwitansi/${p.id}`} className="btn btn-ghost">
                        <Receipt size={16} aria-hidden /> {p.receipt_number}
                      </a>
                    )}
                    {p.status === "pending" && <StatusBadge label="Menunggu dicek" tone="due" />}
                    {p.status === "rejected" && <StatusBadge label={`Ditolak: ${p.reject_reason || "bukti tidak sesuai"}`} tone="late" />}
                    {p.status === "verified" && <StatusBadge label="Diterima" tone="paid" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div>
          <Link href="/tagihan" className="btn btn-ghost">← Kembali ke daftar</Link>
        </div>
      </div>
    </OwnerShell>
  );
}
