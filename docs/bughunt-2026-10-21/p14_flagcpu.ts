// บันทึกการเดินปลอม: เดินวนเป็นวงให้เส้นทาง (trail) ยาว แล้วปักธงซ้ำ ๆ · ทุกครั้งที่ปักธงคัดลอกเส้นทางทั้งเส้น
import { packWalls, unpackWalls, unpackMoves } from "file:///C:/Users/PKH/maze-lab/lib/game/encode.ts";
import { replay } from "file:///C:/Users/PKH/maze-lab/lib/game/state.ts";
const n = 60, N = n * n, open = { n, R: new Uint8Array(N), B: new Uint8Array(N), ex: 30 };
const walls = packWalls(open), maze = unpackWalls(n, 30, walls)!;
const settings = { level: "hell" as const, algo: "wilson" as const, minLen: 8, loops: 0, fog: false };
for (const [loopsN, flags] of [[10000, 15000], [40000, 59900]] as const) {
  const moves = "R0D0L0U0".repeat(loopsN / 4 * 4 / 4) + "F0".repeat(flags) + "D0".repeat(59);
  const ev = unpackMoves(moves)!;
  const t = performance.now(); const G = replay(settings, maze, ev); const ms = performance.now() - t;
  console.log(`ยาว ${moves.length} ตัวอักษร · เดินวน ${loopsN} ก้าว ปักธง ${flags} ครั้ง → เล่นซ้ำใช้ ${ms.toFixed(0)} ms · ชนะ=${G.status === "won"}`);
}
