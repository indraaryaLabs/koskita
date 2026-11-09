/** "101-104,201" → ["101","102","103","104","201"] — juga dipakai mesin tambah kamar & onboarding. */
export function expandRoomNames(input: string): string[] {
  const result: string[] = [];
  for (const part of input.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\w+)-(\w+)$/);
    if (m) {
      const [, a, b] = m;
      const matchA = a.match(/^(\D*)(\d+)$/);
      const matchB = b.match(/^(\D*)(\d+)$/);
      if (matchA && matchB) {
        const [, preA, numA] = matchA;
        const [, preB, numB] = matchB;
        if (preA === preB && numA.length === numB.length) {
          const start = parseInt(numA, 10);
          const end = parseInt(numB, 10);
          if (start <= end) {
            for (let i = start; i <= end && result.length < 50; i++) {
              result.push(preA + String(i).padStart(numB.length, "0"));
            }
          }
          continue;
        }
        result.push(a, b);
      } else {
        result.push(a, b);
      }
    } else {
      result.push(part);
    }
  }
  return result.slice(0, 50);
}
