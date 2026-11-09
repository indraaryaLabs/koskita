# Field test — uji lapangan pakai dua telefonsunggu (PRD bagian 2)

Tujuan: memastikan aplikasi dipakai nyata oleh pemilik dan penghuni sebelum pelanggan
berbayar. Tidak ada data dummy di produksi — semua tes memakai data uji nyata, lalu kosong.

## Persiapan

- 2 pemilik uji kos sungguhan (bukan tim internal) dengan masing-masing 5–10 kamar.
- 1–2 penghuni nyata per kos, termasuk yang awam teknologi (menguji portal & unggah bukti).
- Catat semua temuan di tabel di bawah; screenshot bila macet.

## Skenario pemilik (± 25 menit, HP)

1. Buka tautan, masuk via email; nama kos & alamat; tambah kamar `101-110`.
2. Isi 3 penghuni (1 via impor daftar). Kirim tautan portal ke penghuni via WhatsApp.
3. Tunggu/buat tagihan; buka layar Hari ini; tekan "Ingatkan" ke penghuni telat.
4. Catat 1 biaya pengeluaran; laporkan 1 kerusakan (penghuni); update statusnya ke selesai.
5. Catat 1 bayar tunai; verifikasi 1 bukti transfer; unduh kwitansi; cek pembacaannya (PDF terbuka di HP).
6. Buka Laporan; unduh CSV; pastikan angkanya masuk akal vs data nyata kos.
7. Cek Pengaturan: ubah masa tenggang & aturan kos; simpan, buka lagi — tersimpan.

**Ukur**: waktu sampai penghuni pertama mendapat pengingat; kesalahan yang muncul;
kalimat UI yang membingungkan (kata-kata harus familiar nyata bagi pemilik kos).

## Skenario penghuni (± 10 menit, HP mereka)

1. Buka tautan portal dari WhatsApp (tanpa login/password).
2. Pahami tagihan tanpa bertanya; buka tombol unggah bukti transfer; kirim foto screenshoot bukti.
3. Baca status "Sedang dicek". Setelah diverifikasi, unduh kwitansi.
4. Laporkan 1 kerusakan dengan foto; baca balasan catatan pemilik.

**Ukur**: langkah yang gagal dipahami; ukuran foto gagap; apakah status kwitansi jelas.

## Kriteria lulus untuk rilis ke pelanggan berbayar

- Semua langkah inti selesai tanpa bantuan teknisi.
- Tidak ada keutamaan data uang terselip/berubah sendiri (rekonsiliasi = 0 selisih).
- Umpan balik pemilik ≥ "cukup mudah"; penghuni portal tanpa bantuan.
- Bug tingkat-high: 0 (crash, data salah, uang salah). Bug minor dicatat + jadwal perbaikan.

## Tabel temuan

| # | Skenario/langkah | Temuan | Tingkat | Status |
|---|---|---|---|---|
| 1 |  |  |  |  |
