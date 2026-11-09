import { describe, it, expect } from "vitest";
import {
  buildWaLink,
  fillTemplate,
  DEFAULT_TEMPLATES,
  groupForToday,
  type TodayRow,
} from "./data";

describe("buildWaLink — nomor Indonesia ke format wa.me", () => {
  it("0 di depan → 62", () => {
    expect(buildWaLink("081234567890", "hai")).toContain("https://wa.me/6281234567890");
  });

  it("+62 langsung dipakai (tanpa +)", () => {
    expect(buildWaLink("+628123456789", "hai")).toContain("https://wa.me/628123456789");
  });

  it("pesan di-encode URI", () => {
    const url = buildWaLink("081234567890", "Halo Rina, tarif Rp100.000");
    expect(url).toContain(encodeURIComponent("Halo Rina, tarif Rp100.000"));
  });
});

describe("fillTemplate", () => {
  it("semua variabel diganti", () => {
    const out = fillTemplate("{nama} dari {kos}, {periode} jatuh tempo {tanggal} sebesar {total}: {portal_url}", {
      nama: "Rina",
      kos: "Kos Melati",
      periode: "Nov 2026",
      tanggal: "9 Nov 2026",
      total: "Rp900.000",
      portal_url: "https://app/portal/tok",
      telat: "2 hari",
    });
    expect(out).toBe("Rina dari Kos Melati, Nov 2026 jatuh tempo 9 Nov 2026 sebesar Rp900.000: https://app/portal/tok");
  });

  it("template tegas memakai {telat} menghitung keterlambatan", () => {
    const out = fillTemplate(DEFAULT_TEMPLATES.tegas, {
      nama: "Dika",
      kos: "Kos Melati",
      periode: "-",
      tanggal: "9 Nov 2026",
      total: "Rp100.000",
      portal_url: "u",
      telat: "5 hari",
    });
    expect(out).toContain("terlambat 5 hari");
    expect(out).not.toContain("{telat}");
  });

  it("tiga template bawaan tersedia dan memakai bahasa yang benar", () => {
    for (const key of ["ramah", "pengingat", "tegas"]) {
      expect(DEFAULT_TEMPLATES[key]).toBeTruthy();
      expect(DEFAULT_TEMPLATES[key]).toContain("{nama}");
      expect(DEFAULT_TEMPLATES[key]).toContain("{portal_url}");
    }
  });
});

describe("groupForToday — belah layar Hari ini", () => {
  const TODAY = "2026-11-09";
  const row = (due: string, rest: Partial<TodayRow> = {}): TodayRow => ({
    invoice_id: due,
    lease_id: "l",
    number: "INV/1",
    due_date: due,
    total_idr: 1000000,
    paid_idr: 0,
    status: "issued",
    tenant_name: "X",
    tenant_phone: "0812",
    tenant_token: "tok",
    room_name: "101",
    late_fee_idr: 0,
    ...rest,
  });

  it("telat, hari ini, dan 3 hari ke depan", () => {
    const g = groupForToday([row("2026-11-01"), row("2026-11-09"), row("2026-11-12"), row("2026-11-20")], TODAY);
    expect(g.late.map((r) => r.due_date)).toEqual(["2026-11-01"]);
    expect(g.dueToday.map((r) => r.due_date)).toEqual(["2026-11-09"]);
    expect(g.dueSoon.map((r) => r.due_date)).toEqual(["2026-11-12"]);
  });
});
