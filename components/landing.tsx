import Link from "next/link";
import { CalendarCheck, BellRing, ReceiptText, ShieldCheck, Smartphone } from "lucide-react";

/** Halaman utama untuk pengunjung yang belum login (Bahasa Indonesia, tanpa slop desain). */
export function Landing() {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 md:pt-16">
      <nav className="mb-10 flex items-center justify-between">
        <span className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>
          KosKita
        </span>
        <Link href="/login" className="btn btn-ghost">
          Masuk
        </Link>
      </nav>

      <section className="md:grid md:grid-cols-2 md:items-center md:gap-10">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            Uang sewa kos masuk tepat waktu, tanpa buku dan tanpa menagih canggung.
          </h1>
          <p className="mt-4 text-lg" style={{ color: "var(--color-ink-muted)" }}>
            Untuk pemilik kos 5–30 kamar. Setiap awal bulan cukup buka satu layar: siapa yang sudah
            bayar, siapa yang perlu diingatkan hari ini — dengan sekali ketuk.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/onboarding" className="btn btn-primary text-lg">
              Mulai gratis untuk 5 kamar
            </Link>
            <Link href="/login" className="btn btn-ghost text-lg">
              Sudah punya akun
            </Link>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Gratis permanen untuk kos sangat kecil. Tanpa kartu kredit.
          </p>
        </div>

        {/* Contoh layar nyata, bukan mockup generik */}
        <div className="card mt-8 p-5 md:mt-0" aria-label="Contoh layar Hari ini">
          <p className="label-muted">Hari ini · 9 November</p>
          <p className="text-2xl font-extrabold money">Rp1.850.000</p>
          <p className="text-sm mb-3" style={{ color: "var(--color-ink-muted)" }}>
            12 dari 14 kamar sudah ditagih · 3 perlu diingatkan
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <p className="font-bold">Rina S.</p>
                <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Kamar 203 · Telat 5 hari</p>
              </div>
              <span className="badge" style={{ background: "var(--color-late-soft)", color: "var(--color-late)" }}>
                ⏰ Telat 5 hari
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <p className="font-bold">Dika P.</p>
                <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Kamar 104 · Jatuh tempo hari ini</p>
              </div>
              <span className="badge" style={{ background: "var(--color-due-soft)", color: "var(--color-due)" }}>
                • Belum bayar
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <p className="font-bold">Sinta M.</p>
                <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Kamar 301 · Sudah bayar 8 Nov</p>
              </div>
              <span className="badge" style={{ background: "var(--color-paid-soft)", color: "var(--color-paid)" }}>
                ✔ Lunas
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: CalendarCheck,
            title: "Tagihan terbit sendiri",
            desc: "Tagihan dibuat otomatis H-7 sebelum jatuh tempo tiap penghuni — termasuk listrik dan biaya tambahan.",
          },
          {
            icon: BellRing,
            title: "Pengingat sekali ketuk",
            desc: "WhatsApp terbuka dengan pesan sopan yang sudah terisi nama, nominal, dan tautan portal penghuni.",
          },
          {
            icon: ReceiptText,
            title: "Kwitansi dan pembukuan",
            desc: "Bukti transfer diverifikasi, kwitansi PDF bernomor keluar otomatis, laporan untung bersih tiap bulan.",
          },
          {
            icon: ShieldCheck,
            title: "Uang tidak lewat aplikasi",
            desc: "Pembayaran langsung ke rekening atau QRIS Anda. KosKita hanya mencatat dan memverifikasi.",
          },
          {
            icon: Smartphone,
            title: "Portal tanpa akun",
            desc: "Penghuni membuka tautan: lihat tagihan, kirim bukti bayar, lapor kerusakan — tanpa daftar.",
          },
          {
            icon: CalendarCheck,
            title: "Siap dalam 10 menit",
            desc: "Tambah kamar sekaligus (101–110), tempel daftar penghuni lama, langsung tampil layar Hari ini.",
          },
        ].map((f, i) => (
          <div key={i} className="card p-5">
            <f.icon size={22} style={{ color: "var(--color-primary)" }} aria-hidden />
            <h3 className="mt-2 font-bold">{f.title}</h3>
            <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
              {f.desc}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-14 rounded-2xl border p-6 text-center" style={{ borderColor: "var(--color-border)" }}>
        <h2 className="text-2xl font-extrabold">Mulai gratis sekarang</h2>
        <p className="mt-2" style={{ color: "var(--color-ink-muted)" }}>
          Layar “Hari ini” Anda siap sebelum kamar pertama ditagih.
        </p>
        <Link href="/onboarding" className="btn btn-primary mt-4">
          Mulai gratis untuk 5 kamar
        </Link>
      </section>

      <footer className="mt-10 text-center text-sm" style={{ color: "var(--color-ink-muted)" }}>
        <Link href="/privasi" className="underline mr-4" style={{ color: "var(--color-ink-muted)" }}>
          Kebijakan Privasi
        </Link>
        <Link href="/syarat" className="underline" style={{ color: "var(--color-ink-muted)" }}>
          Syarat Layanan
        </Link>
      </footer>
    </div>
  );
}
