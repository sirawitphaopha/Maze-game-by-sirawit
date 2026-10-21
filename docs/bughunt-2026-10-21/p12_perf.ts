import { generate, ALGOS } from "file:///C:/Users/PKH/maze-lab/lib/maze/generators.ts";
import { build, cleanStubs, braidOps, solve, countChoices, shortStubs } from "file:///C:/Users/PKH/maze-lab/lib/maze/grid.ts";
import { makeLevel } from "file:///C:/Users/PKH/maze-lab/lib/game/level.ts";
for (const { id } of ALGOS) {
  let worst = 0, ops = 0;
  for (let i = 0; i < 5; i++) { const t = performance.now(); const g = generate(60, id); const f = build(60, g); cleanStubs(60, f.R, f.B, 30); braidOps(60, f.R, f.B, 1); const r = solve(60, f.R, f.B, true); countChoices(60, f.R, f.B, r.path, 30); shortStubs(60, f.R, f.B, 30); worst = Math.max(worst, performance.now() - t); ops = Math.max(ops, g.ops.length); }
  console.log(`60 × 60 ${id.padEnd(10)} ช้าสุด ${worst.toFixed(0)} ms · ops สูงสุด ${ops}`);
}
for (const level of ["hell"] as const) for (const algo of ["ab", "wilson", "dfs"] as const) { const t = performance.now(); makeLevel({ level, algo, minLen: 20, loops: 4, fog: false }); console.log(`สร้างด่านโหด ${algo} ทางหลอก 20 ทางวนมากที่สุด ${(performance.now() - t).toFixed(0)} ms`); }
