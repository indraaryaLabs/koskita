# ADR 0002 — Hosting dipindah ke Vercel

Tanggal: 2026-11-09 · Status: Diterima (pemilik produk: @Indra)

## Konteks
PRD (bagian 9) menargetkan Cloudflare Workers via OpenNext dan menyebut Vercel Hobby hanya untuk pratinjau karena tier lain non-komersial.

## Keputusan
Pemilik produk memilih **Vercel** untuk produksi, dengan database tetap **Supabase**.

## Konsekuensi
- Vercel Hobby = lisensi *non-komersial*. Aplikasi ini tujuannya komersial (bagian 4 PRD), jadi **sebelum menerima pelanggan berbayar, upgrade ke Vercel Pro** (~$20/bulan/team).
- Adapter OpenNext tidak diperlukan; build standar Next.js di Vercel.
- Fungsi terjadwal tetap berjalan di Supabase (pg_cron), bukan di Vercel.
