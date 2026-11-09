# PRD MVP — Manajemen Kos Kecil (5–30 Kamar)

Nov 9, 2026 · @Indra

## 1. Ringkasan produk

Aplikasi ini memastikan **uang sewa kos masuk tepat waktu tanpa pemilik harus menagih satu per satu dan mencatat di buku.** Nama kerja produk: **Kamar** (boleh diganti; agen wajib bertanya sebelum memakai nama final).

**Masalah.** Pemilik kos kecil biasanya mencatat di buku atau Excel dan menagih lewat chat pribadi. Masalah yang berulang: bukti transfer hilang di chat, rekap tagihan tidak akurat, sulit melacak siapa yang menunggak, lupa menagih biaya listrik atau tambahan, dan tidak tahu untung bersih per bulan.

**Tujuan produk.** Setiap bulan pemilik cukup membuka satu layar: siapa yang sudah bayar, siapa yang harus diingatkan hari ini (sekali ketuk), lalu bukti bayar diverifikasi dan kwitansi terkirim otomatis.

**Target user utama.**

- Pemilik kos 5–30 kamar yang mengelola sendiri atau dibantu 1 penjaga.
- Penghuni kos, melalui portal tanpa akun: melihat tagihan, membayar, mengunggah bukti, melapor kerusakan.

**Kenapa user mau bayar.** Satu kamar yang telat bayar sebulan nilainya ratusan ribu sampai jutaan rupiah. Produk ini mengurangi tunggakan dan waktu menagih, dengan harga per bulan setara sebagian kecil sewa satu kamar.

**Arah produk (bukan gimmick).**

- Pesaing besar (Mamikos, SuperKos) fokus pada pencarian kos atau fitur luas. Produk ini fokus pada satu hal: penagihan dan pembukuan kos kecil yang bisa disiapkan dalam 10 menit.
- Tidak memegang uang penghuni di MVP. Pembayaran langsung ke rekening atau QRIS pemilik, aplikasi mencatat dan memverifikasi.
- Fase berikutnya: pembayaran otomatis lewat payment gateway (VA/QRIS dinamis), meteran listrik per kamar, dan multi-properti untuk pengelola.

## 2. Aturan kerja untuk agen AI (wajib dibaca pertama)

Agen tidak menulis satu baris kode pun sebelum pemilik produk memberi izin tertulis untuk fase yang sedang berjalan. Dokumen ini adalah sumber kebenaran; kalau ada yang bertentangan atau belum jelas, agen bertanya, bukan menebak.

**Urutan kerja sebelum mulai**

1. Baca seluruh dokumen ini sampai habis.
2. Tulis ringkasan pemahaman maksimal 10 poin: tujuan produk, user, fitur MVP, stack, dan hal yang dianggap berisiko.
3. Ajukan semua pertanyaan di bagian 14 yang belum terjawab, plus pertanyaan baru yang muncul.
4. Tunggu jawaban dan kata **"lanjut fase X"** dari pemilik produk sebelum mengerjakan fase itu.

**Tindakan yang selalu butuh izin dulu**

- Memulai fase baru atau menambah fitur di luar bagian 5.
- Menambah dependency baru di luar daftar bagian 9.
- Mengubah skema database yang sudah di-migrate, atau menghapus data/file.
- Membuat akun layanan pihak ketiga, deploy ke produksi, atau apa pun yang bisa menimbulkan biaya.
- Mengganti keputusan desain (warna, font, layout utama) dari bagian 8.

**Format wajib saat bertanya.** Setiap pertanyaan berisi: konteks singkat, 2–3 opsi, rekomendasi agen beserta alasannya, dan dampak tiap opsi (waktu, biaya, kualitas). Pertanyaan dikelompokkan, bukan dikirim satu per satu.

**Larangan keras**

- Tombol, menu, atau halaman yang tidak berfungsi (fitur palsu). Kalau belum dibuat, jangan ditampilkan.
- Lorem ipsum atau data dummy di produksi.
- Menyimpan uang sebagai float. Semua nominal rupiah = integer (bigint) satuan rupiah.
- Hardcode secret/API key di kode. Semua lewat environment variable.
- Foto KTP atau bukti transfer bisa diakses publik. Semua file pribadi wajib di storage privat dengan URL bertanda tangan (signed URL) berumur pendek.
- Aplikasi memegang atau meneruskan uang penghuni di MVP.
- Mengurangi cakupan atau mengganti stack diam-diam demi cepat selesai.

**Laporan di akhir setiap fase.** Apa yang selesai, cara mengujinya langkah demi langkah, screenshot atau rekaman layar, hasil test, hal yang belum selesai beserta alasannya, dan keputusan yang perlu diambil pemilik produk.

**Definisi selesai (berlaku untuk setiap fitur)**

- [ ] Semua acceptance criteria di bagian 6 terpenuhi dan diuji.
- [ ] Ada state kosong, loading (skeleton), error, dan sukses yang dirancang.
- [ ] Responsif di 360 px (HP), 768 px, dan 1280 px; dashboard pemilik diutamakan HP.
- [ ] Lulus lint, type-check, unit test, dan E2E untuk alur utama.
- [ ] Tidak ada error di console; aksesibilitas dasar (kontras, fokus keyboard, label) lolos.
- [ ] Teks antarmuka Bahasa Indonesia yang natural dan mudah dipahami orang tua yang tidak terbiasa aplikasi.

**Konvensi repo.** Satu repo Git. Commit memakai Conventional Commits. Setiap keputusan teknis penting dicatat di `docs/decisions/` (format ADR singkat). README berisi cara setup lokal dalam kurang dari 10 langkah.

## 3. Persona dan job-to-be-done

Persona utama adalah pemilik kos yang mengelola sendiri dari HP. Setiap layar harus bisa dipakai oleh orang berusia 50-an tanpa pelatihan.

| Persona | Siapa | Pekerjaan yang ingin diselesaikan | Yang membuatnya frustrasi |
| --- | --- | --- | --- |
| Bu Ratna (utama) | Pemilik kos 14 kamar dekat kampus, 52 tahun, mengelola dari HP | "Saya mau tahu siapa yang belum bayar tanpa membuka buku dan chat satu per satu." | Lupa siapa yang sudah transfer; sungkan menagih berulang; bukti transfer tenggelam di chat |
| Mas Fajar | Pemilik 2 rumah kos (total 26 kamar), pekerja kantoran | "Saya mau laporan pemasukan dan pengeluaran tiap bulan tanpa rekap manual." | Tidak sempat datang; data di penjaga kos tidak rapi |
| Pak Udin | Penjaga kos | "Saya mau mencatat bayar tunai dan laporan kerusakan dengan mudah." | Harus lapor ke pemilik lewat telepon |
| Nadia | Penghuni, mahasiswi | "Saya mau tahu tagihan bulan ini dan kirim bukti bayar tanpa ribet." | Tidak dapat kwitansi; rincian tagihan listrik tidak jelas |

**Job utama:** *Setiap awal bulan, saya ingin semua penghuni ditagih dengan rincian yang jelas dan pembayaran tercatat otomatis, supaya uang masuk tepat waktu tanpa saya harus menagih dengan canggung.*

**Job pendukung:**

- Saat ada kamar kosong atau penghuni keluar, saya ingin status kamar dan deposit terurus rapi.
- Di akhir bulan, saya ingin tahu untung bersih kos saya.

## 4. Model bisnis dan paket harga

Modelnya freemium dengan harga sesuai jumlah kamar. Gratis permanen untuk kos sangat kecil adalah pembeda dari pesaing: menurut [ulasan aplikasi kos 2026](https://kamaru-landing-page.pages.dev/blog/articles/best-kos-management-apps-2026), SuperKos sekitar $0,35/kamar/bulan dengan uji coba 30 hari, dan KelolaPro sekitar $6/bulan untuk premium. SuperKos [tidak punya paket gratis permanen](https://kamaru-landing-page.pages.dev/blog/articles/aplikasi-kos-selain-mamikos).

| Paket | Harga (hipotesis, divalidasi di bagian 15) | Batas | Untuk siapa |
| --- | --- | --- | --- |
| Gratis | Rp0 | Maks. 5 kamar, 1 properti, semua fitur inti | Kos kecil dan masa mencoba |
| Kos | Rp39.000/bulan | Maks. 15 kamar, 1 properti, kwitansi tanpa label merek | Bu Ratna |
| Kos Plus | Rp79.000/bulan | Maks. 40 kamar, 3 properti, 1 akun penjaga, laporan gabungan | Mas Fajar |

Bayar tahunan = gratis 2 bulan. 30 pelanggan pertama mendapat harga founder 50% selama 12 bulan.

**Momen nilai (aha moment).** Pemilik memasukkan kamar dan penghuni (impor dari daftar sederhana), lalu melihat layar "Bulan ini: 12 dari 14 kamar sudah ditagih, 3 perlu diingatkan hari ini" dan bisa mengirim pengingat sekali ketuk. Target: tercapai dalam kurang dari 10 menit.

**Pemicu upgrade yang jujur.**

- Kamar lebih dari 5 → paket Kos.
- Punya penjaga kos atau properti kedua → Kos Plus.
- Ingin kwitansi tanpa label merek aplikasi → paket berbayar.

**Penagihan langganan di MVP (Rp0).** Transfer bank atau QRIS statis milik pemilik produk. User mengunggah bukti, admin memverifikasi di konsol admin, lalu paket aktif. Payment gateway masuk fase 2.

**Distribusi tanpa iklan.** Setiap kwitansi dan portal penghuni memuat tautan kecil "Kelola kos Anda dengan Kamar". Penghuni adalah calon pemilik kos atau kenal pemilik kos lain. Ditambah grup Facebook pemilik kos dan kunjungan langsung ke area kos dekat kampus.

## 5. Cakupan MVP

MVP berisi 11 fitur. Kode fitur (F1–F11) dipakai di seluruh dokumen, di nama branch, dan di laporan fase.

| Kode | Fitur | Prioritas | Paket |
| --- | --- | --- | --- |
| F1 | Akun, properti, dan pengaturan (rekening, QRIS, aturan denda) | Wajib | Semua |
| F2 | Kamar: tipe, harga, fasilitas, status | Wajib | Semua |
| F3 | Penghuni dan kontrak sewa (termasuk deposit) | Wajib | Semua |
| F4 | Tagihan otomatis berulang + komponen tambahan + denda | Wajib | Semua |
| F5 | Pengingat tagihan sekali ketuk lewat wa.me | Wajib | Semua |
| F6 | Portal penghuni tanpa akun (tautan aman) | Wajib | Semua |
| F7 | Verifikasi pembayaran + kwitansi PDF bernomor | Wajib | Semua |
| F8 | Pengeluaran dan laporan keuangan bulanan | Wajib | Semua |
| F9 | Laporan kerusakan/keluhan | Wajib | Semua |
| F10 | Check-out penghuni dan pengembalian deposit | Wajib | Semua |
| F11 | Langganan manual + konsol admin; akun penjaga (Kos Plus) | Wajib | Internal/Plus |

**Tidak masuk MVP (jangan dikerjakan, jangan ditampilkan sebagai "segera hadir")**

- Pembayaran otomatis (VA/QRIS dinamis, payment gateway). Fase 2.
- Iklan/pencarian kos untuk calon penghuni (wilayah Mamikos; bukan fokus).
- Integrasi meteran listrik pintar. MVP hanya input angka meteran atau nominal manual.
- Pengiriman otomatis WhatsApp API (berbayar per pesan).
- Aplikasi native. MVP = web app responsif yang bisa dipasang sebagai PWA.

## 6. Spesifikasi fitur dan acceptance criteria

Semua nominal adalah integer rupiah. Semua tanggal disimpan UTC dan ditampilkan sesuai zona waktu properti (WIB/WITA/WIT). Tagihan selalu dihitung oleh server, tidak pernah oleh browser.

### F1 — Akun, properti, dan pengaturan

- [ ] Masuk dengan email + magic link atau Google.
- [ ] Properti: nama, alamat, jenis (putra/putri/campur), foto (opsional).
- [ ] Info pembayaran: beberapa rekening bank (bank, nomor, atas nama) dan gambar QRIS statis milik pemilik.
- [ ] Aturan tagihan: model jatuh tempo (tanggal masuk tiap penghuni atau tanggal tetap), terbit tagihan H-7 (bisa diubah), masa tenggang (default 3 hari), denda (flat atau per hari, dengan batas maksimum).
- [ ] Peraturan kos (teks) yang tampil di portal penghuni.

### F2 — Kamar

- [ ] Kamar: nomor/nama, lantai, tipe, harga bulanan, fasilitas (checklist: AC, kamar mandi dalam, kasur, lemari, wifi, dll.), foto opsional.
- [ ] Status otomatis dari kontrak: Kosong, Terisi, Dipesan (kontrak mulai di masa depan); status Perbaikan diatur manual.
- [ ] Tampilan grid kamar dengan warna status dan ringkasan pembayaran bulan ini per kamar (lunas, belum, terlambat). Status tidak hanya ditandai warna.
- [ ] Tambah banyak kamar sekaligus (contoh: "101–110, harga Rp900.000").

### F3 — Penghuni dan kontrak

- [ ] Penghuni: nama, nomor WhatsApp, pekerjaan/kampus, kontak darurat, foto KTP opsional (storage privat).
- [ ] Kontrak: kamar, tanggal masuk, periode bayar (bulanan, 3 bulan, 6 bulan, tahunan), harga sewa yang disepakati, deposit, biaya tetap tambahan (wifi, parkir, laundry), cara hitung listrik (termasuk / per kWh dari meteran / token sendiri).
- [ ] Satu kamar hanya boleh punya satu kontrak aktif pada tanggal yang sama (validasi di database, bukan hanya di UI).
- [ ] Impor penghuni lama dari daftar sederhana (tempel teks atau CSV), termasuk tanggal jatuh tempo berikutnya dan tunggakan awal.
- [ ] Riwayat semua kontrak per kamar dan per penghuni.

### F4 — Tagihan otomatis

- [ ] Job terjadwal harian membuat tagihan untuk setiap kontrak aktif sesuai aturan F1. Job aman dijalankan berulang (idempoten): kunci unik kontrak + awal periode.
- [ ] Nomor tagihan: `INV/{kode-properti}/{YYYYMM}/{urut}`.
- [ ] Rincian tagihan: sewa, biaya tetap, listrik (angka meteran awal-akhir × tarif, atau nominal manual), tambahan sekali (perbaikan kerusakan, tamu menginap), diskon dengan alasan.
- [ ] Jika ada komponen variabel yang belum diisi (meteran), tagihan berstatus Draf dan masuk daftar "perlu dilengkapi".
- [ ] Status: Draf → Terbit → Dibayar sebagian → Lunas; plus Jatuh tempo dan Terlambat dihitung dari tanggal.
- [ ] Denda ditambahkan otomatis setelah masa tenggang sesuai aturan dan berhenti di batas maksimum. Pemilik bisa menghapus denda dengan alasan (tercatat di log).
- [ ] Unit test untuk minimal 20 skenario: tanggal 29–31, bulan Februari, periode 3/6/12 bulan, penghuni masuk di tengah bulan (prorata opsional), denda dengan batas.

### F5 — Pengingat sekali ketuk

- [ ] Layar "Hari ini" mengelompokkan: jatuh tempo 3 hari lagi, jatuh tempo hari ini, terlambat (dengan jumlah hari).
- [ ] Ketuk "Ingatkan" → WhatsApp terbuka dengan pesan sopan yang sudah terisi: nama, nominal, rincian singkat, tautan portal. Waktu pengingat terakhir tercatat.
- [ ] 3 nada template: ramah (H-3), pengingat (hari H), tegas tapi sopan (terlambat). Semua bisa diedit.
- [ ] Tidak ada pesan yang terkirim otomatis tanpa pemilik menekan tombol.

### F6 — Portal penghuni

- [ ] Setiap penghuni punya tautan rahasia (token acak minimal 24 karakter) yang bisa diganti pemilik kapan saja. Tidak perlu akun atau password.
- [ ] Isi portal: tagihan aktif dengan rincian, cara bayar (salin nomor rekening, gambar QRIS), unggah bukti bayar (gambar/PDF maks. 5 MB), riwayat pembayaran, unduh kwitansi, lapor kerusakan, peraturan kos.
- [ ] Halaman ringan dan jelas di HP kelas bawah; tidak menampilkan data penghuni lain.

### F7 — Verifikasi pembayaran dan kwitansi

- [ ] Bukti baru masuk ke daftar "Perlu dicek" dengan lencana jumlah di navigasi.
- [ ] Layar verifikasi: gambar bukti di samping rincian tagihan. Pemilik memilih Terima (nominal, tanggal bayar, metode) atau Tolak (alasan, terlihat oleh penghuni).
- [ ] Pembayaran tunai bisa dicatat langsung oleh pemilik atau penjaga.
- [ ] Setelah diterima, kwitansi PDF bernomor `KW/{kode-properti}/{YYYYMM}/{urut}` dibuat otomatis, muncul di portal, dan bisa dikirim lewat wa.me.
- [ ] Pembayaran sebagian didukung; sisa tagihan tetap terlihat jelas.

### F8 — Pengeluaran dan laporan

- [ ] Catat pengeluaran: kategori (listrik PLN, air, wifi, kebersihan, perbaikan, pajak, gaji penjaga, lainnya), nominal, tanggal, foto nota opsional, berulang bulanan.
- [ ] Laporan bulanan: pemasukan (berdasarkan tanggal bayar), pengeluaran, laba bersih, tingkat hunian, dan tunggakan berdasarkan umur (0–30, 31–60, >60 hari).
- [ ] Grafik 12 bulan: pemasukan vs pengeluaran.
- [ ] Export Excel dan PDF laporan bulanan.

### F9 — Laporan kerusakan

- [ ] Penghuni membuat laporan dari portal: kategori, deskripsi, foto.
- [ ] Status: Baru → Diproses → Selesai, dengan catatan; penghuni melihat status di portal.
- [ ] Biaya perbaikan bisa langsung dicatat sebagai pengeluaran atau dibebankan ke tagihan penghuni (dengan alasan).

### F10 — Check-out dan deposit

- [ ] Alur check-out: tanggal keluar, meteran terakhir, tagihan yang belum lunas, potongan kerusakan, lalu hitung pengembalian deposit.
- [ ] Dokumen rincian check-out (PDF) yang bisa dikirim ke penghuni.
- [ ] Kamar otomatis menjadi Kosong; data penghuni diarsipkan dan foto KTP dihapus otomatis 30 hari setelah check-out (bisa diatur).

### F11 — Langganan, konsol admin, dan akun penjaga

- [ ] Pilih paket → instruksi transfer/QRIS → unggah bukti → verifikasi di konsol admin (role super-admin) → paket aktif dengan tanggal berakhir.
- [ ] Turun paket tidak menghapus data; kamar di atas batas menjadi hanya-baca sampai upgrade.
- [ ] Akun penjaga (Kos Plus): bisa mencatat bayar tunai, meteran, dan laporan kerusakan; tidak bisa melihat laporan keuangan, pengaturan, atau menghapus data.

## 7. Alur pengguna dan onboarding

Onboarding membawa pemilik ke layar "Hari ini" yang sudah berisi tagihan nyata dalam kurang dari 10 menit.

**Alur pertama kali (pemilik baru)**

1. Landing page → "Mulai gratis untuk 5 kamar".
2. Daftar → nama kos + alamat.
3. Tambah kamar sekaligus ("101–114, Rp900.000").
4. Tambah penghuni: tempel daftar sederhana atau isi satu per satu, termasuk tanggal jatuh tempo berikutnya.
5. Isi info pembayaran (rekening/QRIS).
6. Layar "Hari ini" menampilkan tagihan yang akan datang dan yang perlu diingatkan.
7. Ajakan kirim tautan portal ke setiap penghuni lewat wa.me.

**Alur bulanan pemilik:** buka "Hari ini" → lengkapi meteran (jika ada) → ingatkan yang jatuh tempo → cek bukti bayar → terima → kwitansi terkirim → akhir bulan lihat laporan.

**Alur penghuni:** terima tautan portal → lihat tagihan → transfer/scan QRIS → unggah bukti → dapat kwitansi setelah diverifikasi.

**Struktur navigasi (navigasi bawah di HP, maksimal 5 menu)**

- Hari ini
- Kamar
- Tagihan
- Laporan
- Lainnya (penghuni, pengeluaran, kerusakan, pengaturan, paket)

**Prinsip UX yang wajib**

- Dirancang mobile-first untuk pemilik berusia 50-an: teks dasar 16 px, target sentuh minimal 44 px, label teks pada ikon.
- Satu aksi utama per layar; angka uang besar dan jelas.
- Kata-kata sehari-hari ("Sudah bayar", "Belum bayar", "Telat 5 hari"), bukan istilah akuntansi.
- Setiap aksi uang (terima pembayaran, hapus denda) bisa dibatalkan dalam 10 detik lewat toast "Urungkan".

## 8. Panduan UI/UX

Arah desain: **"rumah yang tertata"** — hangat, tenang, dan sangat jelas, seperti aplikasi bank digital yang ramah untuk orang tua. Mengikuti tren 2026 [desain tenang yang mengurangi beban kognitif](https://saasui.design/blog/7-saas-ui-design-trends-2026): satu layar menjawab satu pertanyaan ("siapa yang belum bayar?").

**Referensi global (pelajari polanya, jangan meniru visualnya)**

| Produk | Yang dipelajari |
| --- | --- |
| [Baselane](https://www.baselane.com) | Pembukuan sewa properti untuk pemilik kecil |
| [TurboTenant](https://www.turbotenant.com) | Alur penagihan sewa dan portal penyewa |
| [Stessa](https://www.stessa.com) | Laporan pemasukan dan pengeluaran properti |
| [Airbnb Hosting](https://www.airbnb.com/hosting) | Layar "Hari ini" untuk tuan rumah, tugas yang jelas |
| [Mercury](https://mercury.com) | Angka uang yang terasa rapi dan premium |
| [Monzo](https://monzo.com) | Bahasa sederhana dan status pembayaran yang jelas |

**Palet warna (light mode utama; dark mode tersedia)**

| Token | Light | Dark | Dipakai untuk |
| --- | --- | --- | --- |
| `bg` | #FAF7F2 | #12100E | Latar halaman (krem hangat) |
| `surface` | #FFFFFF | #1D1A17 | Kartu, panel |
| `border` | #E9E2D8 | #2D2824 | Garis 1 px |
| `text` | #1F2933 | #F5F1EB | Teks utama |
| `text-muted` | #6B7280 | #A8A29E | Label |
| `primary` | #C2410C | #FB923C | Tombol utama (terakota) |
| `paid` | #15803D | #4ADE80 | Lunas |
| `due` | #B45309 | #FBBF24 | Jatuh tempo / belum bayar |
| `late` | #B91C1C | #F87171 | Terlambat |
| `vacant` | #64748B | #94A3B8 | Kamar kosong |

Status tidak pernah hanya ditunjukkan dengan warna: selalu ada teks ("Lunas", "Telat 5 hari") dan ikon. Kontras minimal 4,5:1.

**Tipografi.** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans), karya desainer Indonesia, mudah dibaca. Teks dasar 16 px (bukan 14), angka uang 24–32 px berat 600 dengan `tabular-nums`. Format `Rp900.000`.

**Tata letak.** Mobile-first: navigasi bawah 5 menu di HP, sidebar di desktop. Grid 8 px, radius kartu 16 px, target sentuh minimal 44 px. Grid kamar berupa kartu kecil per kamar dengan nomor besar dan status.

**Animasi (Motion, dengan tujuan)**

- 150–220 ms untuk interaksi; kartu tagihan yang ditandai lunas bergeser keluar dari daftar "Belum bayar" dengan animasi yang memuaskan, disertai toast "Urungkan".
- Lembar bawah (bottom sheet) untuk aksi cepat di HP, dengan gerakan pegas yang natural.
- Angka ringkasan bulan berhitung naik; grafik 12 bulan tumbuh dari sumbu.
- Hanya animasikan `transform` dan `opacity`; hormati `prefers-reduced-motion`; mulus di HP kelas menengah.

**Daftar "anti AI slop" (dilarang)**

- Gradien ungu-biru, glassmorphism, blob 3D, ilustrasi rumah stok.
- Tampilan bawaan shadcn/ui tanpa diubah; emoji sebagai ikon (pakai [Lucide](https://lucide.dev)).
- Dashboard penuh grafik yang tidak menjawab pertanyaan pemilik.
- Teks kecil abu-abu muda yang sulit dibaca orang tua.
- Landing page dengan mockup generik. Tampilkan layar "Hari ini", portal penghuni, dan kwitansi asli.

**Langkah wajib sebelum membangun fitur.** Agen membuat halaman `/design` berisi token, komponen dasar, dan 3 layar kunci statis (Hari ini, Grid kamar, Portal penghuni) di HP dan desktop. Pemilik produk menyetujui dulu sebelum fase fitur dimulai.

## 9. Stack teknologi dan arsitektur

Pilihan utama: **Next.js + Supabase**, di-deploy ke Cloudflare. Alasannya: satu bahasa (TypeScript), job terjadwal (pg\_cron) bawaan Supabase untuk membuat tagihan dan denda secara otomatis, storage privat untuk bukti bayar dan KTP, dan semua bagian punya tier gratis yang boleh dipakai komersial.

&#91;embedded content: arsitektur · perangkat, server, database\]

Pembuatan tagihan dan denda berjalan sebagai fungsi Postgres terjadwal yang dites, sehingga hasilnya sama walaupun tidak ada yang membuka aplikasi.

| Lapisan | Pilihan | Catatan |
| --- | --- | --- |
| Framework | Next.js (App Router) + React 19 + TypeScript strict | Versi stabil terbaru dicek di fase 0 |
| UI | Tailwind CSS v4, shadcn/ui (Radix) yang di-theme ulang, Motion, Lucide, Sonner, Vaul (bottom sheet) | Lihat bagian 8 |
| Form & validasi | React Hook Form + Zod |  |
| Data & tabel | TanStack Query, TanStack Table |  |
| Grafik | Recharts dengan token warna sendiri | Laporan 12 bulan |
| PWA | Serwist (service worker) | Bisa dipasang di layar utama HP |
| PDF | @react-pdf/renderer | Kwitansi, laporan, rincian check-out |
| Tanggal | date-fns + date-fns-tz | Kasus tanggal 29–31 dan Februari dites |
| Database, auth, storage, cron | Supabase: Postgres, RLS, Auth, Storage privat + signed URL, pg\_cron | Migrasi SQL lewat Supabase CLI |
| Email | Resend (SMTP kustom untuk Supabase Auth) | Tier gratis |
| Pemantauan | Sentry, PostHog | Tier gratis |
| Testing | Vitest, Testing Library, Playwright, axe-core, pgTAP untuk fungsi tagihan | Lihat bagian 12 |
| Hosting | Cloudflare Workers lewat adapter OpenNext | Lihat catatan di bawah |

**Catatan hosting (penting).** Vercel Hobby gratis tetapi [khusus penggunaan pribadi non-komersial](https://vercel.com/docs/plans/hobby-plan). Target produksi adalah Cloudflare Workers; Vercel Hobby hanya untuk pratinjau selama pengembangan. Di fase 0, agen wajib menguji build OpenNext di Cloudflare; jika ada kendala, agen berhenti dan menyajikan opsi.

**Batas tier gratis.** Agen mengecek batas terbaru Supabase (database, storage, jeda proyek tidak aktif) di dokumentasi resmi saat fase 0 dan mencatatnya di `docs/decisions/`. Foto bukti bayar dikompres di browser (maks. 300 KB) agar storage cukup untuk ratusan kos.

**Kenapa tidak ada backend terpisah.** Logika tagihan ada di fungsi Postgres yang dites dan dijalankan pg\_cron. Satu deploy, satu database, biaya Rp0.

## 10. Model data

Data dipisah per organisasi (akun pemilik). Semua tabel bisnis membawa `org_id` atau `property_id` dan dilindungi Row Level Security. Portal penghuni tidak membaca tabel langsung; ia memanggil fungsi yang memvalidasi token portal. Ini rancangan awal: perubahan skema wajib minta izin.

| Tabel | Kolom penting | Aturan |
| --- | --- | --- |
| `organizations` | id, name, plan, plan\_expires\_at |  |
| `org_members` | org\_id, user\_id, role (owner/caretaker) | Penjaga = caretaker |
| `properties` | id, org\_id, name, code, address, type, timezone, billing\_settings (jsonb), rules\_text | code 3–5 huruf untuk nomor tagihan |
| `payment_methods` | id, property\_id, kind (bank/qris), bank\_name, account\_no, account\_name, qris\_path |  |
| `rooms` | id, property\_id, name, floor, room\_type, price\_idr, facilities, under\_maintenance | Unik: property\_id + name |
| `tenants` | id, org\_id, name, phone\_e164, occupation, emergency\_contact, id\_card\_path, portal\_token, archived\_at | Token unik, minimal 24 karakter |
| `leases` | id, room\_id, tenant\_id, start\_date, end\_date, period\_months (1/3/6/12), rent\_idr, deposit\_idr, electricity\_mode, electricity\_rate\_idr, status | Exclusion constraint: tidak ada dua kontrak aktif tumpang tindih di satu kamar |
| `lease_charges` | id, lease\_id, name, amount\_idr | Biaya tetap tambahan |
| `invoices` | id, property\_id, lease\_id, number, period\_start, period\_end, due\_date, status, total\_idr, paid\_idr, late\_fee\_idr, issued\_at | Unik: lease\_id + period\_start; nomor unik |
| `invoice_items` | id, invoice\_id, kind, description, qty, unit\_price\_idr, amount\_idr, meter\_start, meter\_end |  |
| `payments` | id, invoice\_id, amount\_idr, paid\_on, method, proof\_path, status, reject\_reason, recorded\_by, receipt\_number | Nomor kwitansi unik |
| `reminders` | id, invoice\_id, template, sent\_by, sent\_at | Log pengingat |
| `expenses` | id, property\_id, category, amount\_idr, spent\_on, note, receipt\_path, recurring |  |
| `tickets` | id, property\_id, room\_id, tenant\_id, category, description, photo\_path, status, cost\_idr |  |
| `checkouts` | id, lease\_id, checkout\_date, final\_meter, deductions (jsonb), deposit\_refund\_idr, statement\_path |  |
| `doc_counters` | property\_id, doc\_type, period, last\_no | Penomoran berurutan dengan row lock |
| `payment_proofs` | id, org\_id, plan, amount\_idr, proof\_path, status, reviewed\_by | Langganan aplikasi |
| `audit_log` | id, org\_id, actor\_id, action, entity, before, after, created\_at | Semua aksi uang |

**Aturan wajib**

- Uang = `bigint` rupiah. ID memakai UUID; token portal terpisah dari ID dan bisa diganti.
- Fungsi terjadwal `generate_invoices(date)` dan `apply_late_fees(date)` idempoten dan dites dengan pgTAP untuk semua skenario di F4.
- Semua file (KTP, bukti bayar, nota) di bucket privat; akses lewat signed URL berumur maks. 10 menit.
- RLS aktif di semua tabel; test otomatis memastikan penjaga tidak bisa membaca laporan keuangan, penghuni hanya melihat datanya sendiri, dan organisasi A tidak bisa membaca data organisasi B.

## 11. Keamanan, privasi, dan performa

Aplikasi ini menyimpan data pribadi penghuni (nomor HP, foto KTP opsional) dan catatan keuangan pemilik. Aturan di bawah tidak boleh dilewati.

**Keamanan**

- RLS di semua tabel + test isolasi antar-organisasi, antar-penghuni, dan untuk peran penjaga di CI.
- Token portal penghuni minimal 24 karakter acak, bisa diganti, dan setiap akses dicatat. Portal tidak menampilkan data penghuni lain.
- Kunci `service_role` hanya di server. Validasi Zod di setiap Server Action. Header keamanan (CSP, HSTS, Referrer-Policy).
- Rate limit untuk login, unggah bukti, dan portal.
- Unggahan divalidasi jenis dan ukurannya; metadata EXIF dihapus.
- Semua aksi uang (terima/tolak pembayaran, hapus denda, ubah tagihan) tercatat di `audit_log`.

**Privasi (mengacu UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi)**

- Foto KTP opsional, disimpan privat, dan dihapus otomatis 30 hari setelah check-out (bisa diatur pemilik).
- Penghuni dapat meminta penghapusan datanya lewat pemilik; pemilik punya tombol hapus data penghuni yang sudah keluar.
- Portal penghuni diberi `noindex`.
- Halaman Kebijakan Privasi dan Syarat Layanan dalam Bahasa Indonesia (agen menyiapkan draf; pemilik produk meninjau).

**Cadangan data.** Job GitHub Actions mingguan menjalankan `pg_dump` terenkripsi ke penyimpanan privat (misalnya Cloudflare R2). Prosedur pemulihan ditulis di `docs/runbook.md` dan diuji sebelum peluncuran.

**Anggaran performa**

| Ukuran | Target |
| --- | --- |
| Layar "Hari ini" tampil (HP kelas menengah, 4G) | < 2 detik |
| Portal penghuni | LCP < 2,5 detik, JavaScript < 120 KB gzip |
| Job tagihan harian untuk 1.000 kontrak | < 30 detik |
| Kwitansi PDF dibuat | < 3 detik |
| Lighthouse (performa, aksesibilitas) | ≥ 90 |

## 12. Testing dan QA

Tagihan yang salah tanggal atau salah nominal membuat pemilik malu di depan penghuni. Karena itu mesin tagihan diuji dengan skenario kalender yang sulit, dan setiap PR wajib lulus CI.

| Lapisan | Alat | Yang wajib dites |
| --- | --- | --- |
| Unit | Vitest | Hitung listrik dari meteran, prorata, format rupiah, template pengingat, kalkulasi deposit check-out |
| Database | pgTAP | `generate_invoices` dan `apply_late_fees` untuk ≥ 20 skenario (tanggal 29–31, Februari, periode 3/6/12 bulan, denda dengan batas, dijalankan dua kali), exclusion constraint kontrak, RLS penghuni/penjaga/organisasi |
| Komponen | Testing Library | Grid kamar, kartu tagihan, layar verifikasi |
| E2E | Playwright (Pixel 7 emulasi + desktop) | Onboarding → tambah kamar → penghuni → tagihan terbit → pengingat → penghuni unggah bukti → pemilik terima → kwitansi; check-out |
| Waktu | Test dengan jam palsu (fake timers / tanggal disuntikkan) | Simulasi 13 bulan berjalan untuk 5 kontrak berbeda |
| Aksesibilitas | axe-core | Hari ini, Kamar, Portal tanpa pelanggaran serius |

**Uji pemilik nyata sebelum rilis.** Minimal 2 pemilik kos memakai aplikasi selama satu siklus tagihan penuh dengan penghuni asli. Masukan dicatat di `docs/field-test.md`.

**QA manual.** Agen menyiapkan `docs/qa-checklist.md`; pemilik produk mencoba sendiri dari HP.

## 13. Rencana fase pengerjaan

Pekerjaan dibagi 7 fase berurutan. Setiap fase diakhiri laporan (bagian 2) dan **gerbang persetujuan**: fase berikutnya hanya dimulai setelah pemilik produk menulis "lanjut fase X". Perkiraan hari kerja adalah perkiraan kasar untuk pengerjaan dengan agen AI.

1. **Fase 0 — Persiapan teknis (1–2 hari).** Repo, CI, proyek Supabase, deploy "hello world" + login ke Cloudflare lewat OpenNext, uji pg\_cron, cek versi dan batas tier gratis.
   - Gerbang: aplikasi kosong dengan login berjalan di URL produksi; job pg\_cron contoh berjalan.
2. **Fase 1 — Sistem desain (2–3 hari).** Halaman `/design`: token, komponen dasar, layar Hari ini, Grid kamar, Portal penghuni (HP dan desktop).
   - Gerbang: pemilik produk menyetujui tampilan.
3. **Fase 2 — Fondasi data (2–3 hari).** Skema + migrasi + RLS + test, F1 properti & pengaturan, F2 kamar, F3 penghuni & kontrak.
   - Gerbang: test RLS dan exclusion constraint lulus.
4. **Fase 3 — Mesin tagihan (5–7 hari).** F4 tagihan otomatis + denda, F5 pengingat, F6 portal penghuni, F7 verifikasi + kwitansi.
   - Gerbang: ≥ 20 skenario pgTAP lulus; simulasi 13 bulan benar; aha moment < 10 menit.
5. **Fase 4 — Operasional (3–4 hari).** F8 pengeluaran & laporan, F9 kerusakan, F10 check-out & deposit.
   - Gerbang: laporan bulanan cocok dengan perhitungan manual.
6. **Fase 5 — Monetisasi dan peluncuran publik (3–4 hari).** F11 langganan manual + konsol admin + akun penjaga, landing page, Kebijakan Privasi & Syarat Layanan, PostHog dan Sentry.
   - Gerbang: alur bayar → verifikasi → paket aktif berjalan end-to-end.
7. **Fase 6 — QA, uji pemilik nyata, rilis beta (3–5 hari + 1 siklus tagihan).** E2E lengkap, aksesibilitas, performa, cadangan data, 2 pemilik kos nyata.
   - Gerbang: semua definisi selesai terpenuhi; pemilik produk memutuskan rilis.

## 14. Pertanyaan terbuka (wajib ditanyakan agen sebelum fase 0)

Agen menanyakan semua butir ini dalam satu pesan berkelompok, dengan rekomendasinya. Butir yang sudah dijawab dicentang dan jawabannya ditulis di bawahnya.

- [ ] **Nama produk dan domain.** Pakai nama kerja "Kamar" atau nama lain? Domain apa yang sudah dimiliki?
- [ ] **Model jatuh tempo default.** Tanggal masuk tiap penghuni (anniversary) atau tanggal tetap (misalnya tanggal 1)?

  Rekomendasi: anniversary sebagai default karena paling umum di kos, tanggal tetap sebagai pilihan.
- [ ] **Prorata.** Jika penghuni masuk di tengah bulan dengan model tanggal tetap, apakah bulan pertama dihitung prorata?

  Rekomendasi: prorata harian sebagai opsi yang bisa dimatikan.
- [ ] **Denda default.** Flat atau per hari? Berapa batas maksimum?

  Rekomendasi: denda nonaktif secara default; pemilik mengaktifkan sendiri.
- [ ] **Listrik.** Mode apa yang paling sering dipakai pemilik kos target: termasuk sewa, token per kamar, atau meteran per kamar?
- [ ] **Harga paket.** Setuju dengan harga hipotesis di bagian 4, atau ingin divalidasi dulu dengan 5 pemilik kos?
- [ ] **Rekening/QRIS penerima pembayaran paket.** Atas nama siapa, dan siapa yang memverifikasi?
- [ ] **Akun layanan.** Siapa yang membuat akun Supabase, Cloudflare, Resend, Sentry, PostHog, GitHub? Agen tidak membuat akun tanpa izin.
- [ ] **Pemilik kos untuk uji nyata.** Siapa 2 pemilik kos yang bersedia mencoba selama satu siklus tagihan?

## 15. Metrik sukses dan validasi

Produk dianggap layak dilanjutkan jika dalam 90 hari setelah rilis beta ada **minimal 20 pemilik kos berbayar**. Siklus kos bulanan, jadi waktu validasinya lebih panjang dari produk lain.

**Validasi sebelum dan selama pembangunan (dikerjakan pemilik produk, paralel dengan fase 0–2)**

1. Wawancara 8–10 pemilik kos (datangi area kos dekat kampus): cara menagih sekarang, berapa kamar sering telat, alat yang dipakai.
2. Tunjukkan prototipe layar "Hari ini" dan portal penghuni; minta mereka mencoba mengirim pengingat.
3. Tawarkan harga founder 50% dengan bayar tahunan di muka.
4. **Kriteria lanjut:** minimal 3 pemilik bersedia memakai dengan penghuni asli, dan minimal 2 membayar di muka. Jika tidak tercapai, evaluasi ulang sebelum fase 4.

**Metrik produk (dipantau di PostHog)**

| Metrik | Definisi | Target 90 hari |
| --- | --- | --- |
| Aktivasi | Pemilik baru dengan ≥ 3 kontrak aktif dalam 48 jam | ≥ 40% |
| Waktu ke aha moment | Daftar → layar Hari ini berisi tagihan nyata | Median < 10 menit |
| Adopsi portal | Pembayaran yang buktinya diunggah lewat portal | ≥ 50% |
| Konversi berbayar | Pemilik dengan > 5 kamar yang upgrade | ≥ 30% |
| Retensi | Pemilik berbayar yang aktif di bulan ketiga | ≥ 80% |
| Tunggakan | Rata-rata hari keterlambatan dibanding bulan pertama | Turun |

## Sumber

- [Ulasan aplikasi manajemen kos 2026 (harga SuperKos, KelolaPro)](https://kamaru-landing-page.pages.dev/blog/articles/best-kos-management-apps-2026)
- [Ulasan aplikasi kos selain Mamikos](https://kamaru-landing-page.pages.dev/blog/articles/aplikasi-kos-selain-mamikos)
- [JSCR — masalah pencatatan tagihan indekos](https://ojs.widyakartika.ac.id/index.php/jscr/article/download/948/809/2441)
- [Vercel — batasan paket Hobby](https://vercel.com/docs/plans/hobby-plan)
- [SaaSUI — tren desain SaaS 2026](https://saasui.design/blog/7-saas-ui-design-trends-2026)
