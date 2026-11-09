"use client";

import { useState } from "react";
import { toast } from "sonner";
import { requestPlanAction } from "@/app/actions";
import { uploadPlanProof } from "@/lib/upload-client";

export function PlanChoice({ plan, price }: { plan: string; price: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onSubmit() {
    if (!file) {
      toast.error("Unggah bukti transfer dulu.");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadPlanProof(file);
      const fd = new FormData();
      fd.set("plan", plan);
      fd.set("proof_path", path);
      const res = await requestPlanAction(fd);
      if (!res || (res as { ok: boolean; error?: string }).ok === false) {
        toast.error((res as { error?: string })?.error ?? "Gagal mengirim bukti. Coba lagi.");
      } else {
        toast.success("Bukti terkirim. Verifikasi maksimal 1×24 jam.");
        setFile(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah bukti.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <label className="block">
        <span className="label">Bukti transfer (JPG/PNG/PDF, maks 5 MB)</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <button className="btn btn-primary w-full" onClick={onSubmit} disabled={uploading || !file}>
        {uploading ? "Mengunggah…" : `Kirim bukti ${plan}`}
      </button>
    </div>
  );
}

export function PendingProofList({
  rows,
}: {
  rows: { id: string; plan: string; status: string; amount_idr: number; created_at: string }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="card p-4">
      <h2 className="text-lg font-extrabold mb-2">Riwayat permintaan paket</h2>
      <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {r.plan} · {r.amount_idr.toLocaleString("id-ID")} · {r.created_at.slice(0, 10)}
            </span>
            <strong style={{ color: r.status === "approved" ? "var(--color-paid)" : r.status === "rejected" ? "var(--color-late)" : "var(--color-due)" }}>
              {r.status === "approved" ? "Disetujui" : r.status === "rejected" ? "Ditolak" : "Menunggu"}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
