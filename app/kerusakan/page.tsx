import { OwnerShell } from "@/components/owner-shell";
import { EmptyState, StatusBadge } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { updateTicketAction, chargeTicketAction } from "@/app/actions";
import { getOwnerContext, sb, sbAdmin } from "@/lib/supabase";
import { formatTanggal, TICKET_LABEL } from "@/lib/constants";
import { Wrench } from "lucide-react";
import { ChargeForm } from "./charge-form";

export const dynamic = "force-dynamic";

type TicketRow = {
  id: string;
  category: string;
  description: string;
  notes: string;
  status: string;
  cost_idr: number;
  photo_path: string | null;
  created_at: string;
  room: { name: string } | null;
  tenant: { name: string; phone_e164: string } | null;
};

const TONE: Record<string, "due" | "paid" | "late" | "draft" | "vacant"> = {
  baru: "due",
  diproses: "vacant",
  selesai: "paid",
};

export default async function KerusakanPage() {
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx?.org) {
    return <OwnerShell title="Kerusakan" requireOrg={false}><></></OwnerShell>;
  }

  const res = await client
    .from("tickets")
    .select("*, room:rooms(name), tenant:tenants(name, phone_e164)")
    .order("created_at", { ascending: false })
    .limit(50);
  const tickets = (res.data ?? []) as unknown as TicketRow[];
  const propertyId = (((await client.from("properties").select("id,name").limit(1).maybeSingle()).data as { id: string } | null)?.id) ?? "";

  const admin = sbAdmin();
  const photoUrls = new Map<string, string>();
  for (const t of tickets.filter((x) => x.photo_path)) {
    if (!admin) break;
    const { data } = await admin.storage.from("private-files").createSignedUrl(t.photo_path as string, 600);
    if (data) photoUrls.set(t.id, data.signedUrl);
  }

  return (
    <OwnerShell title="Kerusakan">
      <div className="max-w-4xl space-y-3">
        {tickets.length === 0 ? (
          <EmptyState
            title="Belum ada laporan"
            description="Penghuni membuat laporan dari tautan portal mereka — statusnya muncul di sini dan di portal."
          />
        ) : (
          tickets.map((t) => (
            <div key={t.id} className="card p-4 space-y-3" role="listitem">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {TICKET_LABEL[t.category] ?? t.category} · Kamar {t.room?.name}
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                    {t.tenant?.name ?? "—"} · {formatTanggal((t.created_at as string).slice(0, 10))}
                  </p>
                </div>
                <StatusBadge label={t.status === "baru" ? "Baru" : t.status === "diproses" ? "Diproses" : "Selesai"} tone={TONE[t.status]} />
              </div>

              <p className="text-[15px]">{t.description}</p>

              {photoUrls.get(t.id) && (
                <a href={photoUrls.get(t.id) as string} target="_blank" rel="noreferrer">
                  <img
                    src={photoUrls.get(t.id) as string}
                    alt={`Foto kerusakan kamar ${t.room?.name}`}
                    className="max-h-56 rounded-xl border"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </a>
              )}

              <ActionForm action={updateTicketAction} successMessage="Status kerusakan diperbarui." className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={t.id} />
                <div className="w-36">
                  <label htmlFor={`st-${t.id}`} className="label">Status</label>
                  <select id={`st-${t.id}`} name="status" className="input" defaultValue={t.status}>
                    <option value="baru">Baru</option>
                    <option value="diproses">Diproses</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
                <div className="flex-1 min-w-56">
                  <label htmlFor={`nt-${t.id}`} className="label">Catatan (terlihat penghuni)</label>
                  <input id={`nt-${t.id}`} name="notes" className="input" defaultValue={t.notes} placeholder="mis. Petugas datang Rabu" />
                </div>
                <StatusBadge label={t.cost_idr > 0 ? `Biaya: ${t.cost_idr.toLocaleString("id-ID")}` : ""} tone="vacant" />
                <SubmitButton className="btn btn-primary">
                  <Wrench size={16} aria-hidden /> Simpan
                </SubmitButton>
              </ActionForm>

              {t.cost_idr === 0 && (
                <ChargeForm ticketId={t.id} propertyId={propertyId} />
              )}
            </div>
          ))
        )}
      </div>
    </OwnerShell>
  );
}
