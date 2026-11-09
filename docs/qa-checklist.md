# Checklist QA — KosKita MVP

Dipakai sebelum rilis apa pun. Semua item harus ✅ sebelum merge/publish.

## 0. Build & tes otomatis

- [ ] `npm run typecheck` tanpa error
- [ ] `npm run build` sukses (SSG/dynamic sesuai rencana)
- [ ] `npm test` lulus semua (unit lib)
- [ ] `supabase test db` lulus semua pgTAP (25 asersi) di lingkungan staging

## 1. Integrasi Supabase

- [ ] Tiga migrasi 0001–0003 diterapkan tanpa error (`supabase db push`)
- [ ] pg_cron jalan: tabel `cron.job` berisi `generate_invoices` & `apply_late_fees`
- [ ] `org_members` terisi; polisi RLS aktif untuk **semua** tabel uang
- [ ] Bucket `private-files` privat; posting folder org/penghuni tidak bisa dibaca org lain

## 2. Fungsional inti (jalur manual, 2 akun uji nyata)

- [ ] **Onboarding**: buat kos + kamar "101-110" → layar Hari ini tampil
- [ ] **Kamar**: tambah/update/tandai perbaikan; warna status + teks
- [ ] **Penghuni**: isi manual & impor daftar `;` — token portal unik per penghuni
- [ ] **Tagihan**: terbit H-7; anniversary & tanggal tetap; prorata bulan pertama; listrik per kWh → status Draft lalu Terbit setelah meteran diisi
- [ ] **Uang**: semua nominal bilangan bulat rupiah, tidak ada `.00` / desimal
- [ ] **Portal penghuni** (dari ponsel nyata + koneksi seluler): lihat tagihan, unggah bukti, lapor kerusakan, unduh kwitansi setelah verifikasi
- [ ] **Verifikasi**: bukti menunggu → Terima (kwitansi bernomor KW) / Tolak (alasan terlihat penghuni)
- [ ] **Catat tunai** → status Lunas + kwitansi tersedia
- [ ] **Pengingat**: tombol Ingatkan → wa.me terbuka dengan pesan terisi; log tercatat
- [ ] **Pengeluaran & kerusakan**: catat, hapus (log audit), bebankan ke tagihan
- [ ] **Check-out**: deposit − potongan − sisa tagihan = refund; kamar jadi kosong; PDF bisa diunduh
- [ ] **Laporan**: 12 bulan, pengeluaran & tunggakan konsisten di CSV dan PDF
- [ ] **Paket**: unggah bukti → muncul di `/admin` → approve → batas paket aktif

## 3. Keamanan

- [ ] Penjaga tidak bisa buka `/pengeluaran`, `/laporan`, data kamar harga
- [ ] Token portal salah/tinta kadaluarsa → "Tautan tidak berlaku", tanpa data bocor
- [ ] `/api/cron/run` menolak tanpa CRON_SECRET
- [ ] `SUPABASE_SERVICE_ROLE_KEY` hanya di env server (periksa bundle browser tidak berisinya)
- [ ] Portal `noindex`; bukti/KTP hanya via signed URL ≤ 10 menit

## 4. Desain & aksesibilitas (PRD bagian 8)

- [ ] Dasar 16px; target sentuh ≥ 44px; fokus ring terlihat
- [ ] Halaman baru memakai terakota + krem; bahasa Indonesia yang benar (tanpa typo mixed)
- [ ] Dark mode terbaca (uji di perangkat 50+ tahun, font nyaman)
- [ ] Icon berstatus selalu disertai teks
