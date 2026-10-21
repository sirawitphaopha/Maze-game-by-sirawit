import { generate, PDEF, ALGOS } from "file:///C:/Users/PKH/maze-lab/lib/maze/generators.ts";
import { build, cleanStubs, braidOps, solve, countLoops, distFrom } from "file:///C:/Users/PKH/maze-lab/lib/maze/grid.ts";
let bad = 0, cases = 0, loopsSeen = 0;
const t0 = Date.now();
while (Date.now() - t0 < 60000) {
  const a = ALGOS[(Math.random() * ALGOS.length) | 0].id, n = 5 + ((Math.random() * 56) | 0);
  const P: any = {};
  for (const d of PDEF[a]) P[d.k] = d.t === "range" ? d.min + d.step * ((Math.random() * ((d.max - d.min) / d.step + 1)) | 0) : d.opts[(Math.random() * d.opts.length) | 0][0];
  const f = build(n, generate(n, a, P));
  const expL = a === "division" && (P.room > 1 || P.doors > 1);
  const lp = countLoops(n, f.R, f.B);
  if (lp) loopsSeen++;
  if (distFrom(n, f.R, f.B, n >> 1).some((x) => x < 0)) { bad++; console.log("หลุด", a, n, JSON.stringify(P)); }
  if (!expL && lp !== 0) { bad++; console.log("วง", a, n, JSON.stringify(P), lp); }
  const L = 3 + ((Math.random() * Math.max(4, Math.round(n / 2) - 2)) | 0);
  if (Math.random() < 0.7) { cleanStubs(n, f.R, f.B, L); if (countLoops(n, f.R, f.B) !== lp || distFrom(n, f.R, f.B, n >> 1).some((x) => x < 0)) { bad++; console.log("เก็บกวาดพัง", a, n, L, JSON.stringify(P)); } }
  braidOps(n, f.R, f.B, [0, 0.1, 0.25, 0.5, 1][(Math.random() * 5) | 0]);
  if (distFrom(n, f.R, f.B, n >> 1).some((x) => x < 0)) { bad++; console.log("ทางวนพัง"); }
  solve(n, f.R, f.B, Math.random() < 0.5);
  cases++;
}
console.log(`สุ่มค่าตัวปรับ ${cases} รอบใน 60 วินาที · ผิด ${bad} · มีวงตามที่ตั้งใจ ${loopsSeen}`);
