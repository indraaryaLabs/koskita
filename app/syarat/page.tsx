import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat Layanan — KosKita",
  description: "Ketentuan penggunaan aplikasi KosKita.",
};

export default function SyaratPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-10 leading-relaxed">
      <nav className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>
          KosKita
        </Link>
        <Link href="/privasi" className="text-sm underline" style={{ color: "var(--color-ink-muted)" }}>
          Kebijakan Privasi
        </Link>
      </nav>

      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold">Syarat Layanan</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Berlaku sejak 9 November 2026.
          </p>
        </header>

        <section>
          <h2 className="text-xl font-extrabold">1. Apa itu KosKita</h2>
          <p>
            KosKita adalah alat bantu pencatatan untuk pemilik kos kecil (5–30 kamar): tagihan
            otomatis, pengingat WhatsApp, verifikasi bukti bayar, kwitansi PDF, dan pembukuan.
            KosKita <strong>bukan</strong> perantara pembayaran, bukan penasihat hukum/pajak, dan
            tidak menerima uang atas nama Anda.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">2. Akun dan tanggung jawab</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gunakan data yang benar saat mendaftar dan jaga akses ke email akun.</li>
            <li>Data penghuni adalah tanggung jawab Anda; pastikan Anda berhak memasukkannya.</li>
            <li>Nomor kwitansi dan tagihan dibuat otomatis dan tidak boleh diubah manual di database.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">3. Langganan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Paket Gratis: maksimal 5 kamar, 1 properti, tanpa akun penjaga.</li>
            <li>Paket Kos Rp39.000/bulan dan Kos Plus Rp79.000/bulan, dibayar manual lewat transfer
              ke rekening yang ditunjuk, lalu diverifikasi tim kami (maksimal 1×24 jam).</li>
            <li>Paket berlaku 30 kalender sejak persetujuan; tidak ada penagihan otomatis.</li>
            <li>Batalkan kapan saja — fitur premium berhenti di akhir periode, data Anda tidak dihapus.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">4. Yang tidak boleh dilakukan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mengunggah konten melanggar hukum termasuk KTP milik orang lain tanpa izin.</li>
            <li>Menjual ulang akses atau menggunakan aplikasi untuk mengelola kos milik orang lain tanpa otorisasi.</li>
            <li>Mencoba menembus data organisasi milik pengguna lain (sistem kami menghalangi ini dan mencatat upayanya).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">5. Ketersediaan & batasan</h2>
          <p>
            Kami berupaya menjaga aplikasi aktif, tetapi layanan diberikan “sebagaimana adanya”.
            Backup basis data harian; bila ada gangguan, pemulihan berdasarkan backup terakhir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">6. Perubahan syarat</h2>
          <p>
            Perubahan penting diumumkan di aplikasi minimal 14 hari sebelum berlaku. Melanjutkan
            pemakaian berarti Anda menyetujui versi terbaru.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-extrabold">7. Kontak</h2>
          <p>
            Pertanyaan tentang syarat ini: <strong>dukungan@koskita.id</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
