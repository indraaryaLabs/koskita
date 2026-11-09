"use client";

import { useEffect, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { addTenantAction, importTenantsAction } from "@/app/actions";

type RoomMinimal = { id: string; name: string };

export function AddTenantSection() {
  const [rooms, setRooms] = useState<RoomMinimal[]>([]);

  useEffect(() => {
    fetch("/api/rooms")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fail"))))
      .then((d) => setRooms((d.rooms as RoomMinimal[]) ?? []))
      .catch(() => setRooms([]));
  }, []);

  return (
    <div className="card p-5">
      <h2 className="text-lg font-extrabold mb-3">Tambah penghuni</h2>

      {rooms.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Tambahkan kamar dulu di menu <strong>Kamar</strong>, supaya bisa dipilih di sini.
        </p>
      ) : (
        <>
          <ActionForm
            action={addTenantAction}
            successMessage="Kontrak tercatat. Tautan portal tampil di daftar penghuni."
            resetOnSuccess
            className="space-y-3"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="tname" className="label">Nama penghuni</label>
                <input id="tname" name="name" className="input" required placeholder="Nadia Putri" />
              </div>
              <div>
                <label htmlFor="tphone" className="label">Nomor WhatsApp</label>
                <input id="tphone" name="phone" className="input" required placeholder="0812xxxxxxxx" inputMode="tel" />
              </div>
              <div>
                <label htmlFor="troom" className="label">Kamar</label>
                <select id="troom" name="room_id" className="input" required defaultValue="">
                  <option value="" disabled>Pilih kamar</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tstart" className="label">Tanggal masuk</label>
                <input id="tstart" name="start_date" type="date" className="input" required />
              </div>
              <div>
                <label htmlFor="trent" className="label">Sewa per bulan (Rp)</label>
                <input id="trent" name="rent_idr" inputMode="numeric" className="input" required placeholder="900000" />
              </div>
              <div>
                <label htmlFor="tperiod" className="label">Periode bayar</label>
                <select id="tperiod" name="period_months" className="input" defaultValue="1">
                  <option value="1">Bulanan</option>
                  <option value="3">3 bulan</option>
                  <option value="6">6 bulan</option>
                  <option value="12">Tahunan</option>
                </select>
              </div>
              <div>
                <label htmlFor="tdeposit" className="label">Deposit (Rp)</label>
                <input id="tdeposit" name="deposit_idr" inputMode="numeric" className="input" placeholder="900000" />
              </div>
              <div>
                <label htmlFor="telec" className="label">Cara hitung listrik</label>
                <select id="telec" name="electricity_mode" className="input" defaultValue="token">
                  <option value="token">Token sendiri (bukan bagian tagihan)</option>
                  <option value="included">Termasuk sewa</option>
                  <option value="per_kwh">Per kWh dari meteran</option>
                </select>
              </div>
              <div>
                <label htmlFor="trate" className="label">Tarif listrik per kWh (hanya jika per kWh)</label>
                <input id="trate" name="electricity_rate_idr" inputMode="numeric" className="input" placeholder="1445" />
              </div>
            </div>
            <div>
              <label htmlFor="tcharges" className="label">Biaya tetap tambahan (opsional)</label>
              <input id="tcharges" name="charges" className="input" placeholder="WiFi,100000;Parkir,50000" />
            </div>
            <SubmitButton className="btn btn-primary">Simpan kontrak</SubmitButton>
          </ActionForm>

          <ActionForm
            action={importTenantsAction}
            successMessage="Daftar tercatat."
            resetOnSuccess
            className="mt-6 border-t space-y-2"
          >
            <p className="font-bold pt-4">Impor penghuni lama</p>
            <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
              Satu baris satu penghuni: <code>Nama;NomorHP;Kamar;TanggalMasuk YYYY-MM-DD;SewaPerBulan</code>
            </p>
            <textarea
              name="import"
              className="input min-h-24 font-mono text-sm"
              placeholder={"Rina Sari;081299988877;101;2026-01-01;900000"}
              rows={4}
            />
            <SubmitButton className="btn btn-ghost">Impor daftar</SubmitButton>
          </ActionForm>
        </>
      )}
    </div>
  );
}
