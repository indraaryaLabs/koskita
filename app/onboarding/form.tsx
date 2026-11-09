"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { onboardingAction } from "@/app/actions";

type Props = { email: string };

export function OnboardingForm({ email }: Props) {
  const step = (n: number, title: string, sub: string) => (
    <div className="mb-4">
      <p className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
        Langkah {n}
      </p>
      <p className="font-extrabold text-lg">{title}</p>
      <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>{sub}</p>
    </div>
  );

  return (
    <ActionForm action={onboardingAction} className="space-y-6">
      <div className="card p-5">
        {step(1, "Nama dan alamat kos", "Nama ini tampil di kwitansi dan portal penghuni.")}
        <input type="hidden" name="email" value={email} />
        <div className="space-y-3">
          <div>
            <label htmlFor="kosName" className="label">Nama kos</label>
            <input id="kosName" name="kosName" required className="input" placeholder="Kos Putri Melati" />
          </div>
          <div>
            <label htmlFor="address" className="label">Alamat</label>
            <input id="address" name="address" required className="input" placeholder="Jl. Kenanga No. 12, Yogyakarta" />
          </div>
          <div>
            <label htmlFor="type" className="label">Jenis kos</label>
            <select id="type" name="type" className="input" defaultValue="campur">
              <option value="campur">Campur</option>
              <option value="putra">Putra</option>
              <option value="putri">Putri</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-5">
        {step(2, "Tambah kamar sekaligus", "Contoh: 101-114 — atau 101, 102, 201. Kosongkan bila nanti di menu Kamar.")}
        <div className="space-y-3">
          <div>
            <label htmlFor="rooms" className="label">Nomor kamar</label>
            <input id="rooms" name="rooms" className="input" placeholder="101-114" />
          </div>
          <div>
            <label htmlFor="roomPrice" className="label">Harga sewa per kamar (per bulan)</label>
            <input id="roomPrice" name="roomPrice" inputMode="numeric" className="input" placeholder="900000" />
          </div>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Gratis maksimal 5 kamar. Tambah kamar lagi nanti setelah pilih paket.
          </p>
        </div>
      </div>

      <SubmitButton className="btn btn-primary w-full text-lg">Simpan dan buka Hari ini</SubmitButton>
    </ActionForm>
  );
}
