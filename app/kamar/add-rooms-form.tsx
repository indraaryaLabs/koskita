"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus, Copy } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { addRoomsAction } from "@/app/actions";

export function AddRoomsForm({ compact = false }: { compact?: boolean }) {
  return (
    <ActionForm action={addRoomsAction} successMessage="Kamar ditambahkan." resetOnSuccess className="flex flex-wrap items-end gap-3" >
      <div className="flex-1 min-w-52">
        <label htmlFor={`names-${compact}`} className="label">Nomor kamar</label>
        <input id={`names-${compact}`} name="names" className="input" placeholder="101-110" />
      </div>
      <div className="w-44">
        <label htmlFor={`price-${compact}`} className="label">Harga per bulan</label>
        <input id={`price-${compact}`} name="price_idr" inputMode="numeric" className="input" placeholder="900000" />
      </div>
      <SubmitButton className="btn btn-primary">
        <Plus size={18} aria-hidden /> Tambah kamar
      </SubmitButton>
      <span className="sr-only" role="status" aria-live="polite" />
    </ActionForm>
  );
}
