import Link from "next/link";
import { OwnerShell } from "@/components/owner-shell";
import { Money, StatusBadge, EmptyState } from "@/components/ui";
import { getOwnerContext, sb } from "@/lib/supabase";
import { listRoomOverview, type RoomOverview } from "@/lib/data";
import { formatRupiah, todayISO } from "@/lib/constants";
import { DoorOpen, Plus, Wrench, UserRound, ShieldAlert } from "lucide-react";
import { AddRoomsForm } from "./add-rooms-form";
import { RoomCard } from "./room-card";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<RoomOverview["status"], { color: string; soft: string }> = {
  terisi: { color: "var(--color-paid)", soft: "var(--color-paid-soft)" },
  kosong: { color: "var(--color-vacant)", soft: "var(--color-vacant-soft)" },
  dipesan: { color: "var(--color-due)", soft: "var(--color-due-soft)" },
  perbaikan: { color: "var(--color-late)", soft: "var(--color-late-soft)" },
};

export default async function KamarPage() {
  const ctx = await getOwnerContext();
  if (!ctx?.org) {
    return (
      <OwnerShell title="Kamar" requireOrg={false}>
        <></>
      </OwnerShell>
    );
  }
  const client = await sb();
  if (!client) return <OwnerShell title="Kamar" requireOrg={false}><></></OwnerShell>;

  const rooms = await listRoomOverview(client, todayISO());
  const counts = {
    terisi: rooms.filter((r) => r.status === "terisi").length,
    kosong: rooms.filter((r) => r.status === "kosong").length,
    dipesan: rooms.filter((r) => r.status === "dipesan").length,
    perbaikan: rooms.filter((r) => r.status === "perbaikan").length,
  };

  return (
    <OwnerShell title="Kamar" requireOrg={false}>
      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 max-w-4xl">
        {(["terisi", "kosong", "dipesan", "perbaikan"] as const).map((k) => (
          <div key={k} className="card p-4">
            <span className="badge" style={{ background: STATUS_STYLE[k].soft, color: STATUS_STYLE[k].color }}>
              ● {k === "terisi" ? "Terisi" : k === "kosong" ? "Kosong" : k === "dipesan" ? "Dipesan" : "Perbaikan"}
            </span>
            <p className="mt-2 text-2xl font-extrabold money">{counts[k]}</p>
          </div>
        ))}
      </section>

      {rooms.length === 0 ? (
        <EmptyState title="Belum ada kamar" description="Bisa sekali tambah: tulis “101-114” plus harga sewa.">
          <AddRoomsForm />
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 max-w-4xl">
            <AddRoomsForm compact />
          </div>
          <div className="grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {rooms.map((r) => (
              <RoomCard key={r.id} room={r} />
            ))}
          </div>
        </>
      )}
    </OwnerShell>
  );
}
