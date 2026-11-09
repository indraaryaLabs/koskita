import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { StatusBadge } from "@/components/ui";
import { toggleMaintenanceAction } from "@/app/actions";
import { CopyButton } from "@/components/remind-button";
import { formatRupiah } from "@/lib/constants";
import { buildWaLink, type RoomOverview } from "@/lib/data";
import { Hammer, UserRound, MessageCircle, Plus } from "lucide-react";

export function RoomCard({ room }: { room: RoomOverview }) {
  const statusText =
    room.status === "terisi" ? "Terisi" : room.status === "kosong" ? "Kosong" : room.status === "dipesan" ? "Dipesan (kontrak mulai nanti)" : "Perbaikan";

  return (
    <details className="card p-4" name={`room-${room.id}`}>
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <span className="text-xl font-extrabold money">{room.name}</span>
          <StatusBadge
            label={room.invoice_status?.label ?? statusText}
            tone={(room.under_maintenance
              ? "late"
              : (room.invoice_status?.tone ?? (room.status === "terisi" ? "paid" : "vacant"))) as "paid" | "due" | "late" | "draft" | "vacant"}
          />
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          {statusText}
          {room.tenant_name ? ` · ${room.tenant_name}` : ""}
        </p>
        <p className="mt-1 text-sm font-semibold money">{formatRupiah(room.price_idr)}/bln</p>
      </summary>

      <div className="mt-4 space-y-3 border-t pt-3 text-sm" style={{ borderColor: "var(--color-border)" }}>
        {room.tenant_token && (
          <div>
            <p className="font-semibold flex items-center gap-2">
              <UserRound size={16} aria-hidden /> Portal penghuni
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <CopyButton url={`/portal/${room.tenant_token}`} className="btn btn-ghost" />
              {room.tenant_name && (
                <a
                  href={buildWaLink("", `Portal sewa kamar ${room.name}: /portal/${room.tenant_token}`)}
                  className="btn btn-ghost"
                >
                  <MessageCircle size={16} aria-hidden /> Kirim tautan
                </a>
              )}
            </div>
          </div>
        )}

        {!room.tenant_name ? (
          <Link href={`/penghuni?kamar=${encodeURIComponent(room.name)}`} className="btn btn-ghost">
            <Plus size={16} aria-hidden /> isi penghuni
          </Link>
        ) : null}

        <ActionForm action={toggleMaintenanceAction} className="flex">
          <input type="hidden" name="id" value={room.id} />
          <input type="hidden" name="to" value={(!room.under_maintenance).toString()} />
          <SubmitButton className="btn btn-ghost w-full">
            <Hammer size={16} aria-hidden />
            {room.under_maintenance ? "Selesai perbaikan" : "Tandai Perbaikan"}
          </SubmitButton>
        </ActionForm>

        <div className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
          {room.facilities.length > 0 ? `Fasilitas: ${room.facilities.join(", ")}` : "Fasilitas tidak dicatat."}
        </div>
      </div>
    </details>
  );
}
