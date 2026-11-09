import { OwnerShell } from "@/components/owner-shell";
import { EmptyState, Money } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { addExpenseAction, deleteExpenseAction } from "@/app/actions";
import { getOwnerContext, sb } from "@/lib/supabase";
import { formatTanggal, todayISO, EXPENSE_CATEGORIES, EXPENSE_LABEL } from "@/lib/constants";
import { Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PengeluaranPage() {
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx?.org || ctx.org.role !== "owner") {
    return (
      <OwnerShell title="Pengeluaran" requireOrg={false} caretakerAllowed={false}>
        <></>
      </OwnerShell>
    );
  }

  const [propRes, expRes] = await Promise.all([
    client.from("properties").select("id, name"),
    client.from("expenses").select("*").order("spent_on", { ascending: false }).limit(100),
  ]);
  const properties = (propRes.data ?? []) as { id: string; name: string }[];
  const expenses = (expRes.data ?? []) as unknown as {
    id: string;
    category: string;
    amount_idr: number;
    spent_on: string;
    note: string;
    recurring: boolean;
  }[];

  const totalBulan = expenses
    .filter((e) => (e.spent_on ?? "").startsWith(todayISO().slice(0, 7)))
    .reduce((a, e) => a + e.amount_idr, 0);

  return (
    <OwnerShell title="Pengeluaran">
      <div className="max-w-4xl space-y-6">
        <div className="card p-4">
          <p className="label-muted">Pengeluaran bulan ini</p>
          <Money value={totalBulan} size="xl" tone="due" />
        </div>

        {properties.length > 0 ? (
          <ActionForm action={addExpenseAction} successMessage="Pengeluaran tercatat." resetOnSuccess className="card p-5 space-y-3">
            <input type="hidden" name="property_id" value={properties[0].id} />
            <h2 className="text-lg font-extrabold">Catat pengeluaran</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="expCat" className="label">Kategori</label>
                <select id="expCat" name="category" className="input">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{EXPENSE_LABEL[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="expAmount" className="label">Nominal (Rp)</label>
                <input id="expAmount" name="amount_idr" inputMode="numeric" className="input" required />
              </div>
              <div>
                <label htmlFor="expDate" className="label">Tanggal</label>
                <input id="expDate" name="spent_on" type="date" className="input" defaultValue={todayISO()} required />
              </div>
              <div>
                <label htmlFor="expNote" className="label">Keterangan (opsional)</label>
                <input id="expNote" name="note" className="input" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="recurring" className="size-5" />
              Berulang setiap bulan (mis. WiFi, gaji penjaga)
            </label>
            <SubmitButton className="btn btn-primary">Simpan</SubmitButton>
          </ActionForm>
        ) : null}

        {expenses.length === 0 ? (
          <EmptyState title="Belum ada pengeluaran" description="Catat listrik, air, perbaikan, gaji penjaga — laporan bulan otomatis dalam hitungan laba bersih." />
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--color-border)" }}>
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">{EXPENSE_LABEL[e.category] ?? e.category}</p>
                  <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                    {formatTanggal(e.spent_on)}
                    {e.note ? ` · ${e.note}` : ""}
                    {e.recurring ? " · berulang bulanan" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Money value={e.amount_idr} size="md" tone="due" />
                  <ActionForm action={deleteExpenseAction} className="inline">
                    <input type="hidden" name="id" value={e.id} />
                    <SubmitButton className="btn btn-ghost" >
                      <Trash2 size={16} aria-hidden />
                      <span className="sr-only">Hapus pengeluaran</span>
                    </SubmitButton>
                  </ActionForm>
                </div>
              </div>
            ))}
            <p className="p-3 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              Total {expenses.length} catatan · hapus tercatat di log audit
            </p>
          </div>
        )}
      </div>
    </OwnerShell>
  );
}
