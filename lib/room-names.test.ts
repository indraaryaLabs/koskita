import { describe, it, expect } from "vitest";
import { expandRoomNames } from "./room-names";

describe("expandRoomNames", () => {
  it("meluaskan rentang 101-104", () => {
    expect(expandRoomNames("101-104")).toEqual(["101", "102", "103", "104"]);
  });

  it("menerima koma dan rentang sekaligus", () => {
    expect(expandRoomNames("101-102, 201,202")).toEqual(["101", "102", "201", "202"]);
  });

  it("mempertahankan awalan huruf (A01-A03)", () => {
    expect(expandRoomNames("A01-A03")).toEqual(["A01", "A02", "A03"]);
  });

  it("mengisi nol depan dengan benar (09-11)", () => {
    expect(expandRoomNames("09-11")).toEqual(["09", "10", "11"]);
  });

  it("nomor beda panjang diperlakukan sebagai dua nama", () => {
    expect(expandRoomNames("10-107")).toEqual(["10", "107"]);
  });

  it("rentang terbalik (105-103) tidak menghasilkan kamar", () => {
    expect(expandRoomNames("105-103")).toEqual([]);
  });

  it("membatasi maksimal 50 kamar (101-999 → 50 pertama)", () => {
    const out = expandRoomNames("101-999");
    expect(out.length).toBe(50);
    expect(out[0]).toBe("101");
    expect(out[49]).toBe("150");
  });

  it("bagian kosong dilewati", () => {
    expect(expandRoomNames(" 101 ,, 102 ")).toEqual(["101", "102"]);
  });
});
