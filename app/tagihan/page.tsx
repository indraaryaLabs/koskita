import Link from "next/link";
import { OwnerShell } from "@/components/owner-shell";
import { StatusBadge, EmptyState, Money } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { getOwnerContext, sb, sbAdmin } from "@/lib/supabase";
import { listOpenInvoices, displayFor } from "@/lib/data";
import { verifyPaymentAction } from "@/app/actions";
import { formatTanggal, todayISO } from "@/lib/constants";
import { CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type PendingRow = {
  id: string;
  amount_idr: number;
  paid_on: string;
  method: string;
  proof_path: string | null;
  invoice: {
    number: string;
    due_date: string;
    total_idr: number;
    paid_idr: number;
    lease: { tenant: { name: string }; room: { name: string } };
  };
};

type DraftRow = {
  id: string;
  number: string;
  due_date: string;
  total_idr: number;
  lease: { tenant: { name: string } | null; room: { name: string } | null };
};

export default async function TagihanPage() {
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx?.org) {
    return (
      <OwnerShell title="Tagihan" requireOrg={false}>
        <></>
      </OwnerShell>
    );
  }

  const today = todayISO();
  const [rows, pendingRes, draftsRes] = await Promise.all([
    listOpenInvoices(client),
    client
      .from("payments")
      .select(
        `id, amount_idr, paid_on, method, status, proof_path,
         invoice:invoices(number, due_date, total_idr, paid_idr,
           lease:leases(tenant:tenants(name), room:rooms(name)))`,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    client
      .from("invoices")
      .select(
        `id, number, due_date, total_idr,
         lease:leases(tenant:tenants(name), room:rooms(name))`,
      )
      .eq("status", "draft")
      .order("due_date"),
  ]);

  const pendingRows = (pendingRes.data ?? []) as unknown as PendingRow[];

  // Signed URL bukti berumur pendek (maks 10 menit) — PRD bagian 10
  const proofUrls = new Map<string, string>();
  const admin = sbAdmin();
  for (const p of pendingRows.filter((x) => x.proof_path)) {
    if (!admin) break;
    const { data } = await admin.storage.from("private-files").createSignedUrl(p.proof_path as string, 600);
    if (data) proofUrls.set(p.id, data.signedUrl);
  }

  const draftRows = (draftsRes.data ?? []) as unknown as DraftRow[];

  return (
    <OwnerShell title="Tagihan">
      <section aria-labelledby="perluDicekH" className="mb-8 max-w-4xl">
        <h2 id="perluDicekH" className="mb-2 text-lg font-extrabold">Perlu dicek ({pendingRows.length})</h2>
        {pendingRows.length === 0 ? (
          <EmptyState
            title="Tidak ada bukti menunggu"
            description="Bukti bayar dari portal penghuni tampil di sini untuk Anda terima atau tolak."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2" role="list">
            {pendingRows.map((p) => (
              <ProofCard key={p.id} p={p} proofUrl={proofUrls.get(p.id) ?? null} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="terbukaH" className="max-w-4xl">
        <h2 id="terbukaH" className="mb-2 text-lg font-extrabold">Tagihan belum lunas ({rows.length})</h2>
        {rows.length === 0 ? (
          <EmptyState title="Semua lunas" description="Tagihan terbit otomatis H-7 sebelum jatuh tempo tiap penghuni." />
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--color-border)" }}>
            {rows.map((r) => {
              const d = displayFor(r, today);
              return (
                <Link
                  key={r.invoice_id}
                  href={`/tagihan/${r.invoice_id}`}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-bold">{r.tenant_name}</p>
                    <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                      Kamar {r.room_name} · {r.number} · Jatuh tempo {formatTanggal(r.due_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Money value={r.total_idr - r.paid_idr + r.late_fee_idr} size="md" tone={d.tone as "paid" | "due" | "late"} />
                    <div className="mt-1">
                      <StatusBadge label={d.label} tone={d.tone as "paid"} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {draftRows.length > 0 && (
        <section aria-labelledby="draftH" className="mt-8 max-w-4xl">
          <h2 id="draftH" className="mb-2 text-lg font-extrabold">
            Perlu dilengkapi — isi meteran listrik ({draftRows.length})
          </h2>
          <div className="card divide-y" style={{ borderColor: "var(--color-border)" }}>
            {draftRows.map((dr) => (
              <Link key={dr.id} href={`/tagihan/${dr.id}`} className="flex items-center justify-between p-4">
                <span className="font-semibold">
                  {dr.lease?.tenant?.name} · Kamar {dr.lease?.room?.name}
                </span>
                <StatusBadge label="Draft — tunggu meteran" tone="draft" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </OwnerShell>
  );
}

function ProofCard({ p, proofUrl }: { p: PendingRow; proofUrl: string | null }) {
  const methodLabel = p.method === "transfer" ? "Transfer" : p.method === "qris" ? "QRIS" : "Tunai";
  return (
    <div className="card p-4 space-y-3" role="listitem">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">{p.invoice.lease.tenant.name}</p>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Kamar {p.invoice.lease.room.name} · {p.invoice.number} · {methodLabel} {formatTanggal(p.paid_on)}
          </p>
        </div>
      </div>
      <Money value={p.amount_idr} size="lg" tone="due" />

      {proofUrl ? (
        proofUrl.endsWith(".pdf") ? (
          <a href={proofUrl} target="_blank" rel="noreferrer" className="btn btn-ghost w-full">
            Buka bukti (PDF)
          </a>
        ) : (
          <a href={proofUrl} target="_blank" rel="noreferrer">
            <img src={proofUrl} alt={`Bukti bayar dari ${p.invoice.lease.tenant.name}`} className="w-full rounded-xl border" style={{ borderColor: "var(--color-border)" }} />
          </a>
        )
      ) : (
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Bukti dicatat langsung (tunai).</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <ActionForm action={verifyPaymentAction} successMessage="Kwitansi terbit otomatis.">
          <input type="hidden" name="payment_id" value={p.id} />
          <input type="hidden" name="decision" value="verify" />
          <SubmitButton className="btn btn-primary w-full">
            <CheckCircle2 size={18} aria-hidden /> Terima
          </SubmitButton>
        </ActionForm>
        <ActionForm action={verifyPaymentAction} successMessage="Bukti ditolak. Penghuni bisa melihat alasannya.">
          <input type="hidden" name="payment_id" value={p.id} />
          <input type="hidden" name="decision" value="reject" />
          <label className="sr-only" htmlFor={`reason-${p.id}`}>Alasan penolakan</label>
          <input id={`reason-${p.id}`} name="reject_reason" className="input mb-2" placeholder="Alasan ditolak (terlihat penghuni)" required />
          <SubmitButton className="btn btn-ghost w-full">
            <XCircle size={18} aria-hidden /> Tolak
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
