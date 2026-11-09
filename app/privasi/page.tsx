import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — KosKita",
  description: "Bagaimana KosKita menyimpan dan melindungi data kos Anda.",
};

export default function PrivasiPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-10 leading-relaxed">
      <nav className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>
          KosKita
        </Link>
        <Link href="/syarat" className="text-sm underline" style={{ color: "var(--color-ink-muted)" }}>
          Syarat Layanan
        </Link>
      </nav>

      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold">Kebijakan Privasi</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Berlaku sejak 9 November 2026. Ringkas dan tanpa jargon — sesuai komitmen aplikasi ini.
          </p>
        </header>

        <section>
          <h2 className="text-xl font-extrabold">Data apa yang kami simpan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Data kos Anda: nama, alamat, daftar kamar, harga sewa, aturan kos.</li>
            <li>Data penghuni: nama, nomor WhatsApp, pekerjaan (opsional), kontak darurat, foto KTP (opsional).</li>
            <li>Data tagihan dan pembayaran: nominal, tanggal, metode, bukti transfer, catatan pengingat.</li>
            <li>Data pengeluaran dan laporan keuangan kos Anda.</li>
          </ul>
          <p className="mt-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Kami <strong>tidak</strong> menyimpan data kartu, dan uang sewa <strong>tidak pernah melewati</strong>{" "}
            KosKita — pembayaran langsung ke rekening Anda.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">KTP dan bukti bayar dijaga ketat</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Disimpan di penyimpanan <strong>privat</strong> (bukan publik) — hanya bocor lewat tautan berumur pendek yang Anda buka.</li>
            <li>Sebelum diunggah, foto diproses di ponsel Anda untuk membuang data lokasi (GPS/EXIF) dan memperkecil ukurannya.</li>
            <li>Petugas/penjaga kos tidak bisa melihat laporan keuangan maupun data pribadi di luar kebutuhan kerjanya.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">Berapa lama data disimpan</h2>
          <p>
            Foto KTP dihapus otomatis 30 hari setelah penghuni keluar/check-out (atau saat Anda
            mengarsipkan penghuni). Data tagihan dan pembukuan tetap tersimpan selama akun aktif —
            Anda bisa mengunduh laporan kapan saja dan menghapus data melalui permintaan ke kami.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">Siapa yang bisa melihat</h2>
          <p>
            Hanya Anda (pemilik), akun penjaga yang Anda unduh dengan hak terbatas, dan penghuni
            berkaitan dengan tagihan dan tautan portal miliknya. Kami hanya mengakses data
            untuk bantuan teknis yang Anda minta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">Hak Anda</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Meminta salinan data Anda kapan saja.</li>
            <li>Meminta koreksi atau penghapusan data.</li>
            <li>Menutup akun — data dihapus setelah periode retensi 30 hari.</li>
          </ul>
          <p className="mt-2 text-sm">
            Hubungi: <strong>dukungan@koskita.id</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">Penyedia pihak ketiga</h2>
          <p>
            Aplikasi ini berjalan di atas Supabase (basis data & penyimpanan) dan Vercel (hosting).
            Keduanya di-host di pusat data yang mendukung kepatuhan standar keamanan industri.
          </p>
        </section>
      </div>
    </main>
  );
}
