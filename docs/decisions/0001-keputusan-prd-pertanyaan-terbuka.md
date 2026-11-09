# ADR 0001 — Keputusan jawaban pertanyaan terbuka PRD (bagian 14)

Tanggal: 2026-11-09 · Status: Diterima (pemilik produk: @Indra)

## Keputusan

| # | Butir | Keputusan |
| - | ----- | --------- |
| 1 | Nama produk | **KosKita** (nama kerja "Kamar" diganti). Domain: diputuskan pada Fase 5 saat beli domain. |
| 2 | Model jatuh tempo default | **Anniversary** (tanggal masuk tiap penghuni). Tanggal tetap tetap tersedia sebagai opsi per properti. |
| 3 | Prorata | **Prorata harian**, opsi yang bisa dimatikan (level kontrak). |
| 4 | Denda default | **Nonaktif secara default**; pemilik mengaktifkan sendiri (flat atau per hari + batas maksimum) di pengaturan F1. |
| 5 | Prioritas listrik | Mode **token sendiri** paling didukung/diutamakan di F4; mode termasuk sewa dan meteran tetap tersedia. |
| 6 | Harga paket | Lanjut hipotesis PRD: Gratis (≤5 kamar) / Kos Rp39.000 / Kos Plus Rp79.000. Validasi dengan 8–10 pemilik kos berjalan paralel di fase 0–2. |
| 7 | Pembayaran langganan | Transfer/QRIS statis **atas nama pemilik produk (rekening pribadi)**; verifikasi manual oleh pemilik di konsol admin (role super-admin). |
| 8 | Akun layanan | **Pemilik produk mendaftar** akun (Supabase, Cloudflare, GitHub, lalu Resend/Sentry/PostHog saat dibutuhkan) dan mengundang agen sebagai kolaborator. Agen tidak membuat akun tanpa izin. |
| 9 | Uji pemilik nyata | Belum ada kandidat; pemilik akan mencari 2 pemilik kos. Agen menyiapkan naskah + daftar pertanyaan wawancara (bagian 15) untuk Fase 6 / `docs/field-test.md`. |

## Dampak pada rencana kerja

- Fase 0 dimulai hanya setelah pemilik menulis **"lanjut fase 0"** dan membuat akun Supabase/GitHub/Cloudflare (butir 8).
- Skema `billing_settings` (F1) default: model anniversary, denda nonaktif, masa tenggang 3 hari, terbit H-7.
- Nama "KosKita" dipakai di kwitansi berlabel merek (paket gratis/kos), landing page, dan CTA distribusi: "Kelola kos Anda dengan KosKita".

## Checklist pembuatan akun (dilakukan pemilik, sebelum "lanjut fase 0")

1. **GitHub** — buat repo `management-kost-app`, undang agen sebagai collaborator (Write).
2. **Supabase** — buat proyek baru (region terdekat: **Singapore**), undang agen via Team member / invite email.
3. **Cloudflare** — daftar akun gratis, tambahkan domain (jika sudah ada) atau siapkan Workers subdomain default.
4. (Fase berikutnya, boleh dibuat belakangan) **Resend**, **Sentry**, **PostHog** — daftar dan undang agen.
