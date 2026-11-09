"use client";

import { useEffect, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { chargeTicketAction } from "@/app/actions";
import { Wallet, ReceiptText } from "lucide-react";

/**
 * Dua pilihan sesuai F9: biaya perbaikan menjadi pengeluaran pemilik,
 * atau dibebankan ke tagihan berikutnya milik penghuni (dengan alasan).
 */
export function ChargeForm({ ticketId, propertyId }: { ticketId: string; propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<{ id: string; label: string }[]>([]);
  const [target, setTarget] = useState<"expense" | "invoice">("expense");

  useEffect(() => {
    if (open) {
      fetch("/api/open-invoices")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => setInvoices((d.invoices as { id: string; label: string }[]) ?? []))
        .catch(() => setInvoices([]));
    }
  }, [open]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-ghost">
        <Wallet size={16} aria-hidden /> Catat biaya perbaikan
      </button>
    );
  }

  return (
    <ActionForm action={chargeTicketAction} successMessage="Biaya kerusakan tercatat." resetOnSuccess className="card p-3 space-y-2 border" >
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="target" value={target} />
      <div className="flex gap-2">
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" checked={target === "expense"} onChange={() => setTarget("expense")} />
          Pengeluaran pemilik
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" checked={target === "invoice"} onChange={() => setTarget("invoice")} />
          Dibebankan ke penghuni
        </label>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <input name="amount_idr" inputMode="numeric" className="input" placeholder="Nominal biaya (Rp)" required />
        <input name="reason" className="input" placeholder="Alasan/keterangan" required />
      </div>
      {target === "invoice" && (
        <select name="invoice_id" className="input" defaultValue="" required>
          <option value="" disabled>Ke tagihan mana dibebankan?</option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>{i.label}</option>
          ))}
        </select>
      )}
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="btn btn-primary">
          {target === "expense" ? (
            <>
              <Wallet size={16} aria-hidden /> Simpan sebagai pengeluaran
            </>
          ) : (
            <>
              <ReceiptText size={16} aria-hidden /> Bebankan ke tagihan
            </>
          )}
        </SubmitButton>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Batal
        </button>
      </div>
    </ActionForm>
  );
}
