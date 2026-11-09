"use client";

import { toast } from "sonner";
import { openWindowSafe } from "@/lib/open";

/**
 * Menyamber tombol "Ingatkan": membuka WhatsApp dengan pesan yang terisi
 * dan mencatat log pengingat di server. TANPA tombol = tanpa kirim (PRD F5).
 */
export function RemindButton({
  waUrl,
  invoiceId,
  template,
  className,
  disabled,
  children,
}: {
  waUrl: string;
  invoiceId: string;
  template: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  async function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (disabled) return;
    openWindowSafe(waUrl);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: invoiceId, template }),
    });
    if (!res.ok) {
      toast.error("Pengingat tidak tercatat. Coba lagi.");
    } else {
      toast.success("Pengingat tercatat. WhatsApp terbuka di tab baru.");
    }
  }

  return (
    <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className} aria-disabled={disabled}>
      {children}
    </a>
  );
}

export function CopyButton({ url, className }: { url: string; className?: string }) {
  async function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tautan portal tersalin.");
    } catch {
      toast.error("Tidak bisa menyalin. Salin manual dari kolom.");
    }
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      Salin tautan
    </button>
  );
}
