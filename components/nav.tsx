"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, DoorOpen, ReceiptText, BarChart3, Menu } from "lucide-react";

const items = [
  { href: "/", label: "Hari ini", icon: CalendarCheck },
  { href: "/kamar", label: "Kamar", icon: DoorOpen },
  { href: "/tagihan", label: "Tagihan", icon: ReceiptText },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/lainnya", label: "Lainnya", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname() || "/";
  return (
    <nav aria-label="Menu utama" className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div
        className="grid grid-cols-5 border-t"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[13px] font-semibold"
              style={{
                color: active ? "var(--color-primary)" : "var(--color-ink-muted)",
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname() || "/";
  return (
    <nav
      aria-label="Menu utama"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r p-4 md:flex"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="mb-6 px-2">
        <Link href="/" className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>
          KosKita
        </Link>
      </div>
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold"
            style={{
              background: active ? "var(--color-primary-soft)" : "transparent",
              color: active ? "var(--color-primary)" : "var(--color-ink)",
            }}
          >
            <Icon size={20} aria-hidden />
            {label}
          </Link>
        );
      })}
      <div className="mt-auto px-2 text-xs" style={{ color: "var(--color-ink-muted)" }}>
        Kelola kos Anda dengan tenang
      </div>
    </nav>
  );
}
