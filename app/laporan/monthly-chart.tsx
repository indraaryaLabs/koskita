"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { formatRupiah, formatTanggal } from "@/lib/constants";

type Point = { month: string; income: number; expense: number };

/** Warna dari token desain — bukan warna bawaan recharts. */
export function MonthlyChart({ data }: { data: Point[] }) {
  return (
    <div style={{ width: "100%", height: 260 }} role="img" aria-label="Grafik pemasukan dan pengeluaran 12 bulan terakhir">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => formatTanggal(`${m}-01`).replace(/([0-9]) /, "$1 ")}
            stroke="var(--color-ink-muted)"
            fontSize={12}
          />
          <YAxis
            tickFormatter={(v: number) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)} jt` : v.toLocaleString("id-ID"))}
            stroke="var(--color-ink-muted)"
            fontSize={12}
            width={56}
          />
          <Tooltip
            formatter={(value) => formatRupiah(Number(value))}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              color: "var(--color-ink)",
            }}
          />
          <Legend />
          <Bar name="Pemasukan" dataKey="income" fill="var(--color-paid)" radius={[6, 6, 0, 0]} />
          <Bar name="Pengeluaran" dataKey="expense" fill="var(--color-due)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
