import { redirect } from "next/navigation";
import { OwnerShell } from "@/components/owner-shell";
import { EmptyState } from "@/components/ui";
import { getOwnerContext, sb, missingEnv, PLAN_LIMITS } from "@/lib/supabase";
import { formatRupiah } from "@/lib/constants";
import { CheckCircle2, MinusCircle } from "lucide-react";
import { PlanChoice, PendingProofList } from "./plan-parts";

export const dynamic = "force-dynamic";

const PLANS = [
  {
    id: "gratis",
    name: "Gratis",
    price: 0,
    rooms: 5,
    props: 1,
    caretaker: false,
    perks: ["Semua fitur inti", "Kwitansi berlabel KosKita"],
    icon: MinusCircle,
  },
  {
    id: "kos",
    name: "Kos",
    price: 39000,
    rooms: 15,
    props: 1,
    caretaker: false,
    perks: ["Sampai 15 kamar", "Kwitansi tanpa label merek"],
    icon: CheckCircle2,
  },
  {
    id: "kos_plus",
    name: "Kos Plus",
    price: 79000,
    rooms: 40,
    props: 3,
    caretaker: true,
    perks: ["Sampai 40 kamar · 3 properti", "1 akun penjaga", "Laporan gabungan"],
    icon: CheckCircle2,
  },
];

type PlanId = "gratis" | "kos" | "kos_plus";

export default async function PaketPage() {
  if (missingEnv()) {
    return <EmptyState title="Supabase belum terhubung" description="Lengkapi env dulu (lihat README)." />;
  }
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx?.org || ctx.org.role !== "owner") {
    return redirect("/lainnya");
  }
  const org = ctx.org;

  const { data } = await client
    .from("payment_proofs")
    .select("id, plan, status, amount_idr, created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  const { count: roomCount } = await client
    .from("rooms")
    .select("id", { count: "exact", head: true });

  return (
    <OwnerShell title="Paket langganan">
      <div className="max-w-4xl space-y-6">
        <p className="text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
          Kamar Anda sekarang: <strong>{roomCount ?? 0}</strong>. Bayar lewat transfer/QRIS pemilik produk,
          lalu unggah bukti — paket aktif lewat verifikasi manual (maksimal 1×24 jam).
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className="card p-5"
              style={p.id === org.plan ? { outline: "2px solid var(--color-primary)" } : undefined}
            >
              <p className="text-lg font-extrabold">{p.name}</p>
              <p className="my-1 text-3xl font-extrabold money">
                {p.price === 0 ? "Rp0" : formatRupiah(p.price)}
                <span className="text-sm font-semibold" style={{ color: "var(--color-ink-muted)" }}>
                  /bln
                </span>
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {p.perks.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <p.icon size={16} style={{ color: "var(--color-paid)" }} aria-hidden /> {f}
                  </li>
                ))}
                <li className="flex items-start gap-2" style={{ color: "var(--color-ink-muted)" }}>
                  Maks {p.rooms} kamar · {p.props} properti{p.caretaker ? " · akun penjaga" : ""}
                </li>
              </ul>
              {p.id === org.plan ? (
                <p className="btn btn-ghost mt-4 w-full" aria-current="true">
                  Paket saat ini
                </p>
              ) : (
                <PlanChoice plan={p.id} price={p.price} />
              )}
            </div>
          ))}
        </div>

        <PlanPlanInfo plan={org.plan} limits={PLAN_LIMITS} />
        <PendingProofList rows={(data ?? []) as { id: string; plan: string; status: string; amount_idr: number; created_at: string }[]} />

        <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Turun paket tidak menghapus data — kamar di atas batas jadi hanya-baca sampai Anda upgrade lagi.
        </p>
      </div>
    </OwnerShell>
  );
}

function PlanPlanInfo({ plan, limits }: { plan: string; limits: typeof PLAN_LIMITS }) {
  const l = limits[plan];
  return (
    <div className="card p-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
      Batas paket {plan}: {l.rooms} kamar · {l.properties} properti · akun penjaga {l.caretaker ? "1" : "tidak tersedia"}.
    </div>
  );
}
