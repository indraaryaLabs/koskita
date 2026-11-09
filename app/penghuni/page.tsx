import { OwnerShell } from "@/components/owner-shell";
import { EmptyState } from "@/components/ui";
import { getOwnerContext, sb } from "@/lib/supabase";
import { formatRupiah } from "@/lib/constants";
import { AddTenantSection } from "./add-tenant";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  phone_e164: string;
  portal_token: string;
  archived_at: string | null;
  lease: {
    id: string;
    start_date: string;
    end_date: string | null;
    period_months: number;
    rent_idr: number;
    deposit_idr: number;
    status: string;
    room: { name: string; price_idr: number };
  } | null;
};

export default async function PenghuniPage() {
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx?.org) {
    return <OwnerShell title="Penghuni" requireOrg={false}><></></OwnerShell>;
  }

  const { data, error } = await client
    .from("tenants")
    .select(
      `*, lease:leases(room:rooms(name, price_idr))`,
    )
    .is("archived_at", null)
    .order("name");

  if (error) {
    return (
      <OwnerShell title="Penghuni" requireOrg={false}>
        <EmptyState title="Data tidak bisa dibuka" description={error.message} />
      </OwnerShell>
    );
  }

  // Kontrak aktif per penghuni diambil terpisah agar embed sederhana
  const { data: activeLeases } = await client
    .from("leases")
    .select("id, tenant_id, start_date, end_date, period_months, rent_idr, deposit_idr, room:rooms(name)")
    .eq("status", "active")
    .order("start_date");

  type LeaseRow = {
    id: string;
    tenant_id: string;
    start_date: string;
    end_date: string | null;
    period_months: number;
    rent_idr: number;
    deposit_idr: number;
    room: { name: string }[] | { name: string } | null;
  };

  const leaseByTenant = new Map<string, LeaseRow>();
  for (const l of (activeLeases ?? []) as unknown as LeaseRow[]) leaseByTenant.set(l.tenant_id, l);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <OwnerShell title="Penghuni & kontrak">
      <div className="max-w-4xl space-y-6">
        <AddTenantSection />

        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada penghuni"
            description="Tempel daftar sederhana untuk mengisi penghuni lama sekaligus, atau isi satu per satu."
          />
        ) : (
          <div className="space-y-3">
            {rows.map((t) => {
              const lease = leaseByTenant.get(t.id) ?? null;
              const leaseRoomName = lease
                ? (Array.isArray(lease.room) ? lease.room[0]?.name : lease.room?.name) ?? null
                : null;
              return (
                <div key={t.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-lg">{t.name}</p>
                      <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                        {t.phone_e164 || "Nomor telepon belum diisi"}
                        {leaseRoomName ? ` · Kamar ${leaseRoomName}` : " · Belum punya kontrak aktif"}
                      </p>
                    </div>
                    {lease && (
                      <span className="badge" style={{ background: "var(--color-paid-soft)", color: "var(--color-paid)" }}>
                        ● Kontrak aktif
                      </span>
                    )}
                  </div>
                  {lease && (
                    <p className="mt-2 text-sm">
                      Sewa <strong className="money">{formatRupiah(lease.rent_idr)}</strong>/bln · Deposit{" "}
                      <strong className="money">{formatRupiah(lease.deposit_idr)}</strong> · Periode{" "}
                      {lease.period_months} bulan · Masuk {lease.start_date}
                    </p>
                  )}
                  <p className="mt-2 break-all text-xs" style={{ color: "var(--color-ink-muted)" }}>
                    Tautan portal: <code>/portal/{t.portal_token}</code>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OwnerShell>
  );
}
