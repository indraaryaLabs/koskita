import Link from "next/link";
import { OwnerShell } from "@/components/owner-shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { EmptyState } from "@/components/ui";
import { checkoutAction } from "@/app/actions";
import { getOwnerContext, sb } from "@/lib/supabase";
import { todayISO, formatRupiah } from "@/lib/constants";
import { listOpenInvoices } from "@/lib/data";

export const dynamic = "force-dynamic";

type LeaseRow = {
  id: string;
  start_date: string;
  rent_idr: number;
  deposit_idr: number;
  tenant: { name: string } | null;
  room: { name: string } | null;
};

export default async function CheckoutPage() {
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx?.org || ctx.org.role !== "owner") {
    return (
      <OwnerShell title="Check-out & deposit" requireOrg={false} caretakerAllowed={false}>
        <></>
      </OwnerShell>
    );
  }

  const { data: leases } = await client
    .from("leases")
    .select("id, start_date, rent_idr, deposit_idr, tenant:tenants(name), room:rooms(name)")
    .eq("status", "active")
    .order("start_date");

  const rows = (leases ?? []) as unknown as LeaseRow[];
  const openRows = await listOpenInvoices(client);
  const unpaidByLease = new Map<string, number>();
  for (const r of openRows) {
    unpaidByLease.set(r.lease_id, (unpaidByLease.get(r.lease_id) ?? 0) + (r.total_idr - r.paid_idr));
  }

  return (
    <OwnerShell title="Check-out & deposit">
      <div className="max-w-4xl space-y-4">
        <p className="text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
          Alur: isi tanggal keluar + potongan kerusakan → aplikasi menghitung pengembalian deposit
          → rincian bisa diunduh sebagai PDF. Kamar otomatis jadi kosong.
        </p>
        {rows.length === 0 ? (
          <EmptyState title="Tidak ada kontrak aktif" description="Check-out bisa dilakukan ketika ada penghuni yang mau keluar." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((l) => (
              <div key={l.id} className="card p-5">
                <p className="font-extrabold text-lg">{l.tenant?.name}</p>
                <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                  Kamar {l.room?.name} · Masuk {l.start_date} · Sewa {formatRupiah(l.rent_idr)}
                </p>
                <CheckoutForm lease={l} today={todayISO()} unpaid={unpaidByLease.get(l.id) ?? 0} />
              </div>
            ))}
          </div>
        )}
      </div>
    </OwnerShell>
  );
}

import { Download } from "lucide-react";

function CheckoutForm({ lease, today, unpaid }: { lease: LeaseRow; today: string; unpaid: number }) {
  return (
    <ActionForm action={checkoutAction} successMessage="Check-out tersimpan & kamar kosong lagi." className="mt-3 space-y-3">
      <input type="hidden" name="lease_id" value={lease.id} />
      <input type="hidden" name="deposit_idr" value={lease.deposit_idr} />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={`co-${lease.id}`} className="label">Tanggal keluar</label>
          <input id={`co-${lease.id}`} name="checkout_date" type="date" className="input" defaultValue={today} required />
        </div>
        <div>
          <label htmlFor={`fm-${lease.id}`} className="label">Meteran akhir (opsional)</label>
          <input id={`fm-${lease.id}`} name="final_meter" inputMode="numeric" className="input" />
        </div>
      </div>

      <fieldset className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
        <legend className="px-2 text-sm font-bold">Potongan (kerusakan / belum lunas)</legend>
        <div className="grid gap-2 md:grid-cols-2">
          <input name="ded_amount_0" inputMode="numeric" className="input" placeholder="Potongan 1 (Rp)" />
          <input name="ded_reason_0" className="input" placeholder="Alasan 1 (mis. kerusakan AC)" />
          <input name="ded_amount_1" inputMode="numeric" className="input" placeholder="Potongan 2 (Rp)" />
          <input name="ded_reason_1" className="input" placeholder="Alasan 2" />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton className="btn btn-primary">Proses check-out</SubmitButton>
        <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Deposit tercatat {formatRupiah(lease.deposit_idr)}
          {unpaid > 0 ? ` · tagihan belum lunas ${formatRupiah(unpaid)} (otomatis dipotong dari deposit)` : ""}.
        </p>
      </div>
    </ActionForm>
  );
}
