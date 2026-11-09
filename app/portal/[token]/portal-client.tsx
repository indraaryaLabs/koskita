"use client";

import { useState } from "react";
import { toast } from "sonner";
import { uploadPortalProof } from "@/lib/upload-client";
import { formatRupiah } from "@/lib/constants";
import { Send, Wrench, MessageCircleQuestion } from "lucide-react";

/** Form unggah bukti transfer/QRIS → masuk daftar "Perlu dicek" pemilik. */
export function PortalPayForm({
  token,
  invoiceId,
  remaining,
}: {
  token: string;
  invoiceId: string;
  remaining: number;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(String(remaining));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih gambar bukti transfer atau QRIS.");
      return;
    }
    setBusy(true);
    try {
      const path = await uploadPortalProof(token, file);
      const res = await fetch(`/api/portal/${token}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount: Number(amount.replace(/[^\d]/g, "")) || 0,
          method: "transfer",
          proof_path: path,
        }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Gagal mengirim");
      }
      toast.success("Bukti terkirim! Kwitansi keluar setelah pemilik mem-verifikasi.");
      setFile(null);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal kirim bukti.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`amt-${invoiceId}`} className="label">Nominal dibayar</label>
          <input
            id={`amt-${invoiceId}`}
            inputMode="numeric"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <p className="self-end text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Sisa tagihan {formatRupiah(remaining)} — boleh diisi sebagian.
        </p>
      </div>
      <label className="block">
        <span className="label">Unggah bukti transfer/QRIS</span>
        <input
          type="file"
          required
          accept="image/*,application/pdf"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        <Send size={18} aria-hidden />
        {busy ? "Mengunggah…" : "Kirim bukti"}
      </button>
    </form>
  );
}

type TicketRow = { id: string; category: string; description: string; status: string; notes: string; created_at: string };

const STATUS_LABEL: Record<string, string> = { baru: "Baru", diproses: "Diproses", selesai: "Selesai" };

/** Form lapor kerusakan + daftar status laporan milik penghuni ini. */
export function PortalReportForm({ token, tickets }: { token: string; tickets: TicketRow[] }) {
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    try {
      // Foto tidak wajib; jika diisi, terunggah lewat jalur privat yang sama dengan bukti bayar
      let photoPath: string | null = null;
      const photo = fd.get("photo");
      if (photo instanceof File && photo.size > 0) {
        photoPath = await uploadPortalProof(token, photo);
      }

      const res = await fetch(`/api/portal/${token}/tiket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: String(fd.get("category") ?? "lainnya"),
          description: String(fd.get("description") ?? "").slice(0, 1000),
          photo_path: photoPath,
        }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? "Gagal mengirim");
      toast.success("Laporan terkirim. Pemilik akan memperbaruinya.");
      formEl.reset();
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim laporan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card space-y-3 p-5">
        <div>
          <label htmlFor="rep-cat" className="label">Jenis kerusakan</label>
          <select id="rep-cat" name="category" className="input" defaultValue="kamar">
            <option value="kamar">Perabot kamar</option>
            <option value="listrik">Listrik</option>
            <option value="air">Air</option>
            <option value="pintu_jendela">Pintu/jendela</option>
            <option value="kamar_mandi">Kamar mandi</option>
            <option value="lainnya">Lainnya</option>
          </select>
        </div>
        <div>
          <label htmlFor="rep-desc" className="label">Ceritakan masalahnya</label>
          <textarea id="rep-desc" name="description" className="input min-h-24" rows={3} required placeholder="mis. Lampu mati sejak semalam" />
        </div>
        <div>
          <label htmlFor="rep-photo" className="label">Foto (opsional)</label>
          <input id="rep-photo" name="photo" type="file" accept="image/*" className="input" />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          <Wrench size={18} aria-hidden /> {busy ? "Mengirim…" : "Kirim laporan"}
        </button>
      </form>

      {tickets.length > 0 && (
        <div className="card divide-y" style={{ borderColor: "var(--color-border)" }}>
          {tickets.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 p-3">
              <div>
                <p className="font-semibold">{t.description}</p>
                <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
                  {t.created_at.slice(0, 10)}
                  {t.notes ? ` · Catatan pemilik: ${t.notes}` : ""}
                </p>
              </div>
              <span className="badge whitespace-nowrap" style={{ background: "var(--color-due-soft)", color: "var(--color-due)" }}>
                <MessageCircleQuestion size={14} aria-hidden /> {STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
