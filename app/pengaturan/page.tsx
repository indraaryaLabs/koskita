import { OwnerShell } from "@/components/owner-shell";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { EmptyState } from "@/components/ui";
import { updatePropertyAction, addPaymentMethodAction, deletePaymentMethodAction } from "@/app/actions";
import { getOwnerContext, sb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Pengaturan() {
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx?.org || ctx.org.role !== "owner") {
    return (
      <OwnerShell title="Pengaturan" requireOrg={false} caretakerAllowed={false}>
        <></>
      </OwnerShell>
    );
  }

  const [{ data: properties }, { data: proofs }] = await Promise.all([
    client.from("properties").select("id, name, code, address, type, billing_settings, rules_text").limit(1),
    client
      .from("payment_proofs")
      .select("id, plan, status, amount_idr, created_at")
      .eq("status", "pending")
      .limit(5),
  ]);

  const [{ data: methods }] = await Promise.all([
    client.from("payment_methods").select("*"),
  ]);

  const prop = (properties ?? [])[0] as
    | {
        id: string;
        name: string;
        code: string;
        address: string;
        type: string;
        billing_settings: Record<string, unknown>;
        rules_text: string;
      }
    | undefined;
  const methodsList = (methods ?? []) as {
    id: string;
    kind: string;
    bank_name: string | null;
    account_no: string | null;
    account_name: string | null;
  }[];

  if (!prop) {
    return (
      <OwnerShell title="Pengaturan" requireOrg={false} caretakerAllowed={false}>
        <EmptyState title="Belum ada properti" description="Selesaikan pendaftaran di halaman utama." />
      </OwnerShell>
    );
  }

  const bs = prop.billing_settings ?? {};
  const late = (bs.late_fee as Record<string, unknown> | undefined) ?? {};

  return (
    <OwnerShell title="Pengaturan">
      <div className="max-w-4xl space-y-6">
        {/* Info kos */}
        <ActionForm action={updatePropertyAction} successMessage="Pengaturan tersimpan." className="card p-5 space-y-4">
          <input type="hidden" name="property_id" value={prop.id} />
          <h2 className="text-lg font-extrabold">Aturan tagihan</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="pmode" className="label">Jatuh tempo</label>
              <select id="pmode" name="billing_mode" className="input" defaultValue={(bs.billing_mode as string) ?? "anniversary"}>
                <option value="anniversary">Hari masuk tiap penghuni (dianjurkan)</option>
                <option value="fixed">Tanggal tetap tiap bulan</option>
              </select>
            </div>
            <div>
              <label htmlFor="pday" className="label">Tanggal tetap (1–28, jika dipilih tanggal tetap)</label>
              <input id="pday" name="billing_day_fixed" type="number" min={1} max={28} className="input" defaultValue={String((bs.billing_day_fixed as number) ?? 1)} />
            </div>
            <div>
              <label htmlFor="pissue" className="label">Tagihan terbit (H- berapa)</label>
              <input id="pissue" name="issue_days" type="number" min={0} max={30} className="input" defaultValue={String((bs.issue_days as number) ?? 7)} />
            </div>
            <div>
              <label htmlFor="pgrace" className="label">Masa tenggang (hari)</label>
              <input id="pgrace" name="grace_days" type="number" min={0} max={30} className="input" defaultValue={String((bs.grace_days as number) ?? 3)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="prorata_fixed_first" defaultChecked={bs.prorata_fixed_first !== false} className="size-5" />
            Bulan pertama dihitung prorata (hanya patut dipakai bila memilih tanggal tetap)
          </label>

          <fieldset className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)" }}>
            <legend className="px-2 text-sm font-bold">Denda keterlambatan</legend>
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="late_fee_enabled" defaultChecked={late.enabled === true} className="size-5" />
              Aktifkan denda (default mati — sepenuhnya pilihan Anda)
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label htmlFor="lfmode" className="label">Jenis</label>
                <select id="lfmode" name="late_fee_mode" className="input" defaultValue={(late.mode as string) ?? "flat"}>
                  <option value="flat">Flat sekali</option>
                  <option value="daily">Per hari</option>
                </select>
              </div>
              <div>
                <label htmlFor="lfamt" className="label">Nominal per kejadian/hari (Rp)</label>
                <input id="lfamt" name="late_fee_amount" inputMode="numeric" className="input" defaultValue={String((late.amount_idr as number) ?? 0)} />
              </div>
              <div>
                <label htmlFor="lfmax" className="label">Batas maksimum (Rp)</label>
                <input id="lfmax" name="late_fee_max" inputMode="numeric" className="input" defaultValue={String((late.max_idr as number) ?? 0)} />
              </div>
            </div>
          </fieldset>

          <div>
            <label htmlFor="rulesText" className="label">Peraturan kos (tampil di portal penghuni)</label>
            <textarea id="rulesText" name="rules_text" className="input min-h-32" defaultValue={prop.rules_text} rows={5} placeholder="Jam malam, tamu menginap, dsb." />
          </div>

          <SubmitButton className="btn btn-primary">Simpan pengaturan</SubmitButton>
        </ActionForm>

        {/* Metode pembayaran */}
        <section className="card p-5 space-y-3">
          <h2 className="text-lg font-extrabold">Info pembayaran</h2>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Ini tampil di portal penghuni sebagai cara membayar tagihan.
            {proofs && proofs.length > 0 && <> Ada {proofs.length} permintaan paket menunggu verifikasi di konsol Admin.</>}
          </p>
          {methodsList.length > 0 && (
            <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {methodsList.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-semibold">{m.kind === "qris" ? "QRIS" : m.bank_name}</p>
                    <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                      {m.account_no} · {m.account_name}
                    </p>
                  </div>
                  <ActionForm action={deletePaymentMethodAction} className="inline">
                    <input type="hidden" name="id" value={m.id} />
                    <SubmitButton className="btn btn-ghost">Hapus</SubmitButton>
                  </ActionForm>
                </div>
              ))}
            </div>
          )}

          <ActionForm action={addPaymentMethodAction} successMessage="Rekening tersimpan." resetOnSuccess className="grid gap-3 md:grid-cols-4 items-end">
            <input type="hidden" name="property_id" value={prop.id} />
            <div>
              <label htmlFor="pmkind" className="label">Jenis</label>
              <select id="pmkind" name="kind" className="input">
                <option value="bank">Rekening bank</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
            <div>
              <label htmlFor="pmbank" className="label">Nama bank</label>
              <input id="pmbank" name="bank_name" className="input" placeholder="BCA" />
            </div>
            <div>
              <label htmlFor="pmno" className="label">Nomor rekening</label>
              <input id="pmno" name="account_no" className="input" placeholder="1234567890" />
            </div>
            <div>
              <label htmlFor="pmname" className="label">Atas nama</label>
              <input id="pmname" name="account_name" className="input" required placeholder="Nama Anda" />
            </div>
            <SubmitButton className="btn btn-ghost md:col-span-1">Tambah</SubmitButton>
          </ActionForm>

          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Gambar QRIS: unggah lewat menu <strong>Lainnya → Pengaturan</strong> setelah fitur unggah gambar tersedia di fase berikutnya.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-extrabold">Akun & paket</h2>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Masuk: {ctx.user.email} · Paket aktif: <strong>{ctx.org.plan}</strong> · Batas:{" "}
            {ctx.org.maxRooms} kamar, {ctx.org.maxProperties} properti
            {ctx.org.planExpiresAt ? ` · berakhir ${ctx.org.planExpiresAt}` : ""}
          </p>
          <p className="text-sm mt-2">
            <a className="underline" href="/paket" style={{ color: "var(--color-primary)" }}>
              Lihat / ubah paket
            </a>
          </p>
        </section>
      </div>
    </OwnerShell>
  );
}
