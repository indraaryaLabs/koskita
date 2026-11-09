/** Status tagihan untuk tampilan portal (Bahasa sehari-hari). */
export function displayStatus(
  inv: { due_date: string; status: string; paid_idr: number },
  today: string,
): { label: string; tone: "late" | "due" | "paid" | "draft" | "vacant" } {
  if (inv.status === "paid") return { label: "Lunas", tone: "paid" };
  if (inv.status === "draft") return { label: "Menunggu rincian", tone: "draft" };
  const diff = Math.round(
    (Date.parse(inv.due_date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000,
  );
  if (diff >= 0) return { label: "Jatuh tempo " + formatShort(inv.due_date), tone: "due" };
  if (diff === -1) return { label: "Telat 1 hari", tone: "late" };
  return { label: `Telat ${Math.abs(diff)} hari`, tone: "late" };
}

function formatShort(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
