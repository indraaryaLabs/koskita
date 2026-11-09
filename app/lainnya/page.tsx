import Link from "next/link";
import { OwnerShell } from "@/components/owner-shell";
import { getOwnerContext } from "@/lib/supabase";
import {
  Users,
  Wallet,
  Wrench,
  DoorOpen,
  Settings,
  CreditCard,
  ShieldCheck,
  LogOut,
} from "lucide-react";

const menu = [
  { href: "/penghuni", label: "Penghuni & kontrak", icon: Users },
  { href: "/pengeluaran", label: "Pengeluaran", icon: Wallet, ownerOnly: true },
  { href: "/kerusakan", label: "Laporan kerusakan", icon: Wrench },
  { href: "/checkout", label: "Check-out & deposit", icon: DoorOpen },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, ownerOnly: true },
  { href: "/paket", label: "Paket langganan", icon: CreditCard, ownerOnly: true },
];

export default async function LainnyaPage() {
  const ctx = await getOwnerContext();
  const owner = (ctx?.org?.role ?? "owner") === "owner";

  return (
    <OwnerShell title="Lainnya">
      <div className="max-w-4xl grid gap-3 md:grid-cols-2">
        {menu
          .filter((m) => !m.ownerOnly || owner)
          .map((m) => (
            <Link key={m.href} href={m.href} className="card flex items-center gap-3 p-4 font-bold">
              <m.icon size={22} style={{ color: "var(--color-primary)" }} aria-hidden />
              {m.label}
            </Link>
          ))}

        <div className="card p-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          <ShieldCheck size={22} aria-hidden /> <strong>Privasi</strong> — KTP penghuni opsional
          dan tersimpan terlindungi; dihapus otomatis 30 hari setelah check-out.
        </div>

        <form action="/signout" className="card p-4">
          <button className="btn btn-ghost w-full">
            <LogOut size={18} aria-hidden /> Keluar
          </button>
        </form>
      </div>
    </OwnerShell>
  );
}
