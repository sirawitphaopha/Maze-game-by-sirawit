// เวลา CPU ที่เซิร์ฟเวอร์ใช้ตรวจหนึ่งเกม (gameRow) · Cloudflare Workers แผนฟรีให้ CPU 10 ms ต่อคำขอ
const SG = await import("file:///C:/Users/PKH/maze-lab/lib/server/games.ts");
const { makeLevel } = await import("file:///C:/Users/PKH/maze-lab/lib/game/level.ts");
const ST = await import("file:///C:/Users/PKH/maze-lab/lib/game/state.ts");
const { openNb } = await import("file:///C:/Users/PKH/maze-lab/lib/maze/grid.ts");
const { recordOf } = await import("file:///C:/Users/PKH/maze-lab/lib/games.ts");
function bigGame(level: "easy" | "hell") {
  const settings = { level, algo: "sidewinder" as const, minLen: 8, loops: 0, fog: false };
  const G = ST.newGame(settings, makeLevel(settings)), n = G.n;
  const dirTo = (a: number, b: number) => (b - a === 1 ? "r" : b - a === -1 ? "l" : b - a === n ? "d" : "u");
  const dirs: string[] = [];
  const explore = (from: number, cell: number) => { dirs.push(dirTo(from, cell)); for (const q of openNb(cell, n, G.R, G.B)) if (q !== from) explore(cell, q); dirs.push(dirTo(cell, from)); };
  const path = [G.s]; while (path[path.length - 1] !== G.e) { const c = path[path.length - 1]; path.push(openNb(c, n, G.R, G.B).find((q: number) => G.de[q] === G.de[c] - 1)); }
  for (let i = 0; i < path.length; i++) { const c = path[i], p = path[i - 1], x = path[i + 1]; for (const q of openNb(c, n, G.R, G.B)) if (q !== p && q !== x) explore(c, q); if (x !== undefined) dirs.push(dirTo(c, x)); }
  dirs.forEach((d, i) => ST.move(G, d as any, 1000 + i * 300));
  const rec: any = recordOf(G, "x", null); delete rec.label; return { rec, steps: G.steps };
}
for (const lv of ["easy", "hell"] as const) {
  const { rec, steps } = bigGame(lv);
  const t0 = performance.now(); SG.gameRow(rec); const cold = performance.now() - t0;
  let warm = 0; for (let i = 0; i < 20; i++) { const t = performance.now(); SG.gameRow({ ...rec }); warm = Math.max(warm, performance.now() - t); }
  console.log(`${lv} ${steps} ก้าว · ครั้งแรก ${cold.toFixed(1)} ms · ครั้งถัดไปช้าสุด ${warm.toFixed(1)} ms`);
}
