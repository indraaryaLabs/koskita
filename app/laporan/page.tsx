import { OwnerShell } from "@/components/owner-shell";
import { Money, EmptyState } from "@/components/ui";
import { MonthlyChart } from "./monthly-chart";
import { getOwnerContext, sb } from "@/lib/supabase";
import { monthlySeries, arrearsAging } from "@/lib/data";
import { formatRupiah, formatTanggal, todayISO } from "@/lib/constants";
import { Download, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx?.org) {
    return <OwnerShell title="Laporan" requireOrg={false}><></></OwnerShell>;
  }

  const today = todayISO();
  const [series, aging] = await Promise.all([
    monthlySeries(client, 12),
    arrearsAging(client, today),
  ]);

  const current = series[series.length - 1];
  if (!current) {
    return (
      <OwnerShell title="Laporan" requireOrg={false}>
        <EmptyState title="Belum ada data" description="Laporan muncul setelah tagihan dan pembayaran mulai terekam." />
      </OwnerShell>
    );
  }

  const occupancyPct = Math.round(current.occupancy * 100);

  return (
    <OwnerShell title="Laporan">
      <div className="max-w-4xl space-y-6">
        <section className="grid gap-3 md:grid-cols-4" aria-label="Ringkasan bulan ini">
          <div className="card p-4">
            <p className="label-muted">Masuk bulan ini</p>
            <Money value={current.income} size="xl" tone="paid" />
          </div>
          <div className="card p-4">
            <p className="label-muted">Keluar bulan ini</p>
            <Money value={current.expense} size="xl" tone="due" />
          </div>
          <div className="card p-4">
            <p className="label-muted">Laba bersih</p>
            <Money value={current.net} size="xl" tone={current.net >= 0 ? "paid" : "late"} />
          </div>
          <div className="card p-4">
            <p className="label-muted">Tingkat hunian</p>
            <p className="text-3xl font-semibold money">{occupancyPct}%</p>
          </div>
        </section>

        <section className="card p-4" aria-label="Grafik 12 bulan">
          <h2 className="text-lg font-extrabold mb-1">12 bulan terakhir</h2>
          <MonthlyChart data={series} />
        </section>

        <section aria-labelledby="agingH" className="max-w-4xl">
          <h2 id="agingH" className="mb-2 text-lg font-extrabold">Tunggakan menurut umur</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="label-muted">0–30 hari</p>
              <Money value={aging.buckets.b30} size="lg" tone="due" />
            </div>
            <div className="card p-4">
              <p className="label-muted">31–60 hari</p>
              <Money value={aging.buckets.b60} size="lg" tone="due" />
            </div>
            <div className="card p-4">
              <p className="label-muted">Lebih dari 60 hari</p>
              <Money value={aging.buckets.bmore} size="lg" tone="late" />
            </div>
          </div>
          {aging.details.length > 0 && (
            <div className="card mt-3 divide-y" style={{ borderColor: "var(--color-border)" }}>
              {aging.details.slice(0, 12).map(({ row, days }) => (
                <div key={row.invoice_id} className="flex items-center justify-between p-3 text-sm">
                  <span>
                    {row.tenant_name} · Kamar {row.room_name} · {row.number}
                  </span>
                  <span className="money font-semibold" style={{ color: "var(--color-late)" }}>
                    Telat {days} hari · {formatRupiah(row.total_idr - row.paid_idr)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4 flex flex-wrap gap-3" aria-label="Unduh laporan">
          <a href="/api/report/csv" className="btn btn-ghost">
            <Download size={18} aria-hidden /> Unduh Excel (CSV)
          </a>
          <a href="/api/report/pdf" className="btn btn-ghost" target="_blank" rel="noreferrer">
            <FileText size={18} aria-hidden /> Unduh PDF
          </a>
        </section>
      </div>
    </OwnerShell>
  );
}
