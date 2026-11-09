import type { Metadata } from "next";
import Link from "next/link";
import { Money, StatusBadge } from "@/components/ui";

/*
  Halaman desain internal (PRD bagian 8): katalog token + 3 layar kunci
  sebagai acuan visual saat menambah halaman baru. Static — tidak butuh DB.
*/

export const metadata: Metadata = {
  title: "Desain KosKita — acuan visual",
  robots: { index: false, follow: false },
};

const colors = [
  ["bg", "Krem hangat — latar seluruh aplikasi"],
  ["surface", "Putih — kartu & panel"],
  ["border", "Garis lembut — jangan lebih pekat dari ini"],
  ["ink", "Teks utama"],
  ["ink-muted", "Teks sekunder/keterangan"],
  ["primary", "Terakota — tombol utama, tautan penting"],
  ["primary-soft", "Terakota muda — seleksi menu aktif"],
  ["paid", "Hijau — " + "Lunas, masuk pembukuan"],
  ["due", "Kuning tua — Belum bayar, jatuh tempo"],
  ["late", "Merah — Telat, harus segera ditindak"],
  ["vacant", "Kelabu — kamar kosong, draft"],
] as const;

function Swatch({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-10 shrink-0 rounded-xl border"
        style={{ background: `var(--color-${name})`, borderColor: "var(--color-border)" }}
        aria-hidden
      />
      <div>
        <p className="font-semibold text-sm">--color-{name}</p>
        <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>{desc}</p>
      </div>
    </div>
  );
}

export default function DesignPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 pb-16 pt-10">
      <nav className="mb-8 flex items-center justify-between">
        <span className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>KosKita</span>
        <Link href="/" className="btn btn-ghost">Kembali</Link>
      </nav>

      <h1 className="text-3xl font-extrabold">Acuan desain</h1>
      <p className="mt-2 max-w-2xl text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
        Satu sumber kebenaran tampilan (PRD bagian 8): krem hangat, aksen terakota, Plus Jakarta Sans,
        dasar 16px, target sentuh minimal 44px, ikon Lucide. Status selalu memakai <strong>teks</strong>,
        bukan warna saja.
      </p>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">Token warna</h2>
        <div className="card grid gap-3 p-5 md:grid-cols-2">
          {colors.map(([n, d]) => <Swatch key={n} name={n} desc={d} />)}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">Komponen</h2>
        <div className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary">Tombol utama</button>
            <button className="btn btn-ghost">Tombol sekunder</button>
            <button className="btn btn-danger">Hapus</button>
            <span className="btn btn-ghost opacity-55">Nonaktif</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="Lunas" tone="paid" />
            <StatusBadge label="Belum bayar" tone="due" />
            <StatusBadge label="Telat 5 hari" tone="late" />
            <StatusBadge label="Draft" tone="draft" />
            <StatusBadge label="Kosong" tone="vacant" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Money value={1234500} size="xl" tone="paid" />
            <Money value={90000} size="xl" tone="late" />
            <Money value={210000} size="xl" tone="due" />
          </div>
          <div className="max-w-md space-y-3">
            <div>
              <label htmlFor="d-input" className="label">Contoh label</label>
              <input id="d-input" className="input" placeholder="Petunjuk pengisian" />
            </div>
            <p className="label-muted">Teks bantu kecil memakai label-muted.</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">Layar kunci 1 — Hari ini</h2>
        <div className="card p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="border rounded-xl p-3" style={{ borderColor: "var(--color-border)" }}>
              <p className="label-muted">Belum bayar</p>
              <Money value={1850000} size="xl" tone="due" />
              <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>12 tagihan</p>
            </div>
            <div className="border rounded-xl p-3" style={{ borderColor: "var(--color-border)" }}>
              <p className="label-muted">Telat</p>
              <Money value={450000} size="xl" tone="late" />
              <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>2 kamar</p>
            </div>
            <div className="border rounded-xl p-3" style={{ borderColor: "var(--color-border)" }}>
              <p className="label-muted">Bukti bayar</p>
              <p className="text-3xl font-semibold money">3</p>
              <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Perlu dicek →</p>
            </div>
            <div className="border rounded-xl p-3" style={{ borderColor: "var(--color-border)" }}>
              <p className="label-muted">Perlu diingatkan</p>
              <p className="text-3xl font-semibold money">4</p>
              <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>3 hari ke depan</p>
            </div>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Kartu tunggal per penghuni: nama, kamar, status berlabel, nominal besar, satu tombol
            “Ingatkan” + “Rincian”.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">Layar kunci 2 — Detail tagihan</h2>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-extrabold text-lg">Rina S.</p>
              <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Kamar 203 · INV/MLT/202611/0007</p>
            </div>
            <StatusBadge label="Telat 2 hari" tone="late" />
          </div>
          <div className="mt-4 divide-y" style={{ borderColor: "var(--color-border)" }}>
            {[
              ["Sewa kamar", "Rp900.000"],
              ["WiFi", "Rp100.000"],
              ["Denda keterlambatan (2 hari)", "Rp10.000"],
            ].map(([a, b]) => (
              <div key={a} className="flex justify-between py-2 text-sm">
                <span>{a}</span>
                <span className="money font-semibold">{b}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold">
              <span>Total</span>
              <span className="money">Rp1.010.000</span>
            </div>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Rincian per baris; meteran listrik diisi di baris listrik; pembayaran tunai dicatat di
            bagian bawah; kwitansi berjajar di riwayat.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-extrabold">Layar kunci 3 — Laporan</h2>
        <div className="card p-5">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Masuk bulan ini", "Rp7.200.000"],
              ["Keluar bulan ini", "Rp1.150.000"],
              ["Laba bersih", "Rp6.050.000"],
              ["Tingkat hunian", "86%"],
            ].map(([l, v]) => (
              <div key={l} className="border rounded-xl p-3" style={{ borderColor: "var(--color-border)" }}>
                <p className="label-muted">{l}</p>
                <p className="text-2xl font-semibold money">{v}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Grafik batang 12 bulan + tunggakan 3 kolom umur (0–30, 31–60, &gt;60 hari) + tombol unduh
            Excel dan PDF.
          </p>
        </div>
      </section>

      <p className="mt-10 text-center text-xs" style={{ color: "var(--color-ink-muted)" }}>
        Halaman internal — tidak diindeks mesin pencari.
      </p>
    </main>
  );
}
