// ตัวสร้าง 11 วิธี × ค่าตัวปรับสุดขั้ว × ขนาด 5 ถึง 60 × เก็บกวาด L ทุกค่า × ทางวนทุกระดับ
// ตรวจ: ทุกช่องไปถึงได้ · ไม่มีวงเมื่อไม่ควรมี · เก็บกวาดแล้วยังสมบูรณ์ · ทางเฉลยต่อกันจริง · ทางออกอยู่แถวล่าง
import { generate, PDEF, ALGOS, DEF } from "file:///C:/Users/PKH/maze-lab/lib/maze/generators.ts";
import { build, cleanStubs, braidOps, solve, countLoops, distFrom, openNb, countChoices, shortStubs, deadEnds } from "file:///C:/Users/PKH/maze-lab/lib/maze/grid.ts";

let cases = 0, bad = 0;
const fail = (m: string) => { bad++; if (bad < 40) console.log("❌", m); };
const sizes = [5, 6, 7, 8, 11, 25, 41, 60];

function variants(a: string): Record<string, any>[] {
  const out: Record<string, any>[] = [DEF(a as any)];
  for (const d of PDEF[a as keyof typeof PDEF]) {
    const vals = d.t === "range" ? [d.min, d.max] : d.opts.map((o) => o[0]);
    for (const v of vals) out.push({ ...DEF(a as any), [d.k]: v });
  }
  return out;
}
const expectLoops = (a: string, P: any) => a === "division" && (Number(P.room) > 1 || Number(P.doors) > 1);

for (const { id: a } of ALGOS) for (const n of sizes) for (const P of variants(a)) {
  const reps = n >= 41 ? 1 : 3;
  for (let r = 0; r < reps; r++) {
    cases++;
    const g = generate(n, a as any, P), f = build(n, g);
    const d0 = distFrom(n, f.R, f.B, n >> 1);
    if (d0.some((x) => x < 0)) fail(`${a} n=${n} ${JSON.stringify(P)} มีช่องไปไม่ถึง`);
    const lp = countLoops(n, f.R, f.B);
    if (!expectLoops(a, P) && lp !== 0) fail(`${a} n=${n} ${JSON.stringify(P)} มีวง ${lp}`);
    // เก็บกวาด L สุ่มในช่วงห้องทดลอง 3 ถึง max(6, round(n/2)) และช่วงเกมสูงสุด 20
    const Lmax = Math.max(6, Math.round(n / 2));
    for (const L of [3, Lmax, 20]) {
      const R = f.R.slice(), B = f.B.slice();
      cleanStubs(n, R, B, L);
      const d1 = distFrom(n, R, B, n >> 1);
      if (d1.some((x) => x < 0)) fail(`${a} n=${n} L=${L} ${JSON.stringify(P)} เก็บกวาดแล้วมีช่องหลุด`);
      if (countLoops(n, R, B) !== lp) fail(`${a} n=${n} L=${L} ${JSON.stringify(P)} เก็บกวาดแล้ววงเปลี่ยน ${lp} → ${countLoops(n, R, B)}`);
      for (const p of [0.1, 1]) {
        const R2 = R.slice(), B2 = B.slice();
        braidOps(n, R2, B2, p);
        const d2 = distFrom(n, R2, B2, n >> 1);
        if (d2.some((x) => x < 0)) fail(`${a} n=${n} braid=${p} มีช่องหลุด`);
        for (const far of [false, true]) {
          const s = solve(n, R2, B2, far);
          if (s.ex < 0 || s.ex >= n) fail(`ทางออกนอกกระดาน ${s.ex}`);
          const path = s.path;
          if (path[0] !== n * (n - 1) + s.ex || path[path.length - 1] !== (n >> 1)) fail(`${a} n=${n} หัวท้ายทางเฉลยผิด`);
          for (let i = 0; i + 1 < path.length; i++) if (!openNb(path[i], n, R2, B2).includes(path[i + 1])) { fail(`${a} n=${n} ทางเฉลยทะลุกำแพง`); break; }
          if (path.length - 1 !== d2[path[0]]) fail(`${a} n=${n} ทางเฉลยไม่ใช่ทางสั้นสุด ${path.length - 1} vs ${d2[path[0]]}`);
          const ch = countChoices(n, R2, B2, path, L), ss = shortStubs(n, R2, B2, L), de = deadEnds(n, R2, B2, s.ex);
          if (!(ch >= 0 && ss >= 0 && de >= 0)) fail("ตัวชี้วัดติดลบ");
        }
      }
    }
  }
}
console.log(`ตรวจ ${cases} เขาวงกต · ผิด ${bad}`);
