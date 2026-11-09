import { describe, it, expect } from "vitest";
import { formatRupiah, formatTanggal, invoiceDisplay, todayISO } from "./constants";

/** Intl id-ID memakai spasi non-break (U+00A0) — rapikan agar perbandingan stabil lintas mesin. */
const norm = (s: string) => s.replaceAll("\u00a0", "");

describe("formatRupiah — uang selalu bigint rupiah, tanpa desimal", () => {
  it("format standar Indonesia", () => {
    expect(norm(formatRupiah(1234500))).toBe("Rp1.234.500");
    expect(norm(formatRupiah(0))).toBe("Rp0");
    expect(norm(formatRupiah(39_000))).toBe("Rp39.000");
  });

  it("nilai kosong menghasilkan Rp0 tanpa error", () => {
    expect(norm(formatRupiah(null))).toBe("Rp0");
    expect(norm(formatRupiah(undefined))).toBe("Rp0");
    expect(norm(formatRupiah(Number.NaN))).toBe("Rp0");
  });
});

describe("formatTanggal", () => {
  it("9 Nov 2026", () => {
    expect(formatTanggal("2026-11-09")).toBe("9 Nov 2026");
  });
  it("kosong → teks kosong", () => {
    expect(formatTanggal(null)).toBe("");
    expect(formatTanggal(undefined)).toBe("");
  });
});

describe("invoiceDisplay — kata sehari-hari sesuai PRD", () => {
  const TODAY = "2026-11-09";

  it("Lunas", () => {
    const d = invoiceDisplay("paid", "2026-11-01", 1000000, 1000000, TODAY);
    expect(d.label).toBe("Lunas");
    expect(d.tone).toBe("paid");
  });

  it("Belum bayar (jatuh tempo hari ini)", () => {
    const d = invoiceDisplay("issued", "2026-11-09", 1000000, 0, TODAY);
    expect(d.label).toBe("Belum bayar");
    expect(d.tone).toBe("due");
  });

  it("Telat 1 hari (tunggal)", () => {
    const d = invoiceDisplay("issued", "2026-11-08", 1000000, 0, TODAY);
    expect(d.label).toBe("Telat 1 hari");
    expect(d.tone).toBe("late");
  });

  it("Telat 5 hari (jamak)", () => {
    const d = invoiceDisplay("issued", "2026-11-04", 1000000, 0, TODAY);
    expect(d.label).toBe("Telat 5 hari");
    expect(d.tone).toBe("late");
  });

  it("Sebagian bayar → Sisa N", () => {
    const d = invoiceDisplay("partially_paid", "2026-11-01", 1000000, 300000, TODAY);
    expect(norm(d.label)).toBe(norm("Sisa Rp700.000"));
    expect(d.tone).toBe("due");
  });

  it("draft", () => {
    const d = invoiceDisplay("draft", "2026-11-09", 1000000, 0, TODAY);
    expect(d.label).toBe("Draft");
    expect(d.tone).toBe("vacant");
  });
});

describe("todayISO", () => {
  it("berformat YYYY-MM-DD", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
