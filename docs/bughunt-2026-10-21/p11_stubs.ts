// ห้องทดลองเปิด "ย้ายทางออกไปจุดที่ไกลสุด": ทางตันนับด้วยทางออกจริง แต่ทางตันสั้นนับด้วยทางออกกลาง
import { generate } from "file:///C:/Users/PKH/maze-lab/lib/maze/generators.ts";
import { build, solve, shortStubs, openNb } from "file:///C:/Users/PKH/maze-lab/lib/maze/grid.ts";
function shortStubsEx(n: number, R: Uint8Array, B: Uint8Array, L: number, ex: number) { // ตัวเดียวกันทุกบรรทัด เปลี่ยนแค่ e เป็นทางออกจริง
  const s = n >> 1, e = n * (n - 1) + ex; let k = 0;
  const deg = (c: number) => openNb(c, n, R, B).length + (c === s || c === e ? 1 : 0);
  for (let tip = 0; tip < n * n; tip++) {
    if (tip === s || tip === e || deg(tip) !== 1) continue;
    let len = 1, prev = -1, cur = tip;
    while (len < L) { const nx = openNb(cur, n, R, B).filter((q) => q !== prev); if (nx.length !== 1) break; const q = nx[0]; if (deg(q) >= 3 || q === s || q === e) break; len++; prev = cur; cur = q; }
    if (len < L) k++;
  }
  return k;
}
let diff = 0, tot = 0, maxd = 0;
for (let i = 0; i < 2000; i++) {
  const n = 25, f = build(n, generate(n, "wilson")), r = solve(n, f.R, f.B, true);
  const a = shortStubs(n, f.R, f.B, 5), b = shortStubsEx(n, f.R, f.B, 5, r.ex);
  tot++; if (a !== b) { diff++; maxd = Math.max(maxd, Math.abs(a - b)); }
}
console.log(`25 × 25 Wilson ทางออกไกลสุด ${tot} ด่าน · ตัวเลขทางตันสั้นบนจอไม่ตรงกับทางออกจริง ${diff} ด่าน ต่างสุด ${maxd}`);
