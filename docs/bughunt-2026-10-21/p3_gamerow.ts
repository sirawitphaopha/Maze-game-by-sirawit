// ① เล่นสุ่มหลายร้อยเกมแบบหน้าเว็บ (เดิน ปักธง วาร์ป หยุดนาฬิกา) แล้วส่งผ่าน gameRow ของจริง เทียบทุกตัวเลขกับตอนเล่น
// ② ข้อมูลขาเข้าที่ gameRow ยอมรับ แต่ฐานจะปฏิเสธ หรือไม่ตรงความจริง
const SG = await import("file:///C:/Users/PKH/maze-lab/lib/server/games.ts");
const { makeLevel, LEVELS, LV_MINL, LV_MAXL } = await import("file:///C:/Users/PKH/maze-lab/lib/game/level.ts");
const ST = await import("file:///C:/Users/PKH/maze-lab/lib/game/state.ts");
const { distFrom } = await import("file:///C:/Users/PKH/maze-lab/lib/maze/grid.ts");
const { packWalls, packMoves } = await import("file:///C:/Users/PKH/maze-lab/lib/game/encode.ts");
const { ALGOS } = await import("file:///C:/Users/PKH/maze-lab/lib/maze/generators.ts");
const { recordOf } = await import("file:///C:/Users/PKH/maze-lab/lib/games.ts");

const dirs = ["u", "d", "l", "r"] as const;
const step = (G: any, d: string) => (d === "r" ? 1 : d === "l" ? -1 : d === "d" ? G.n : -G.n);

function play(G: any) {
  const de = distFrom(G.n, G.R, G.B, G.e);
  let now = 5000 + Math.random() * 1000, guard = 0;
  if (Math.random() < 0.2) ST.setFlag(G, now); // ปักก่อนก้าวแรก
  while (G.status !== "won" && guard++ < 60000) {
    now += 30 + Math.random() * 400;
    const r = Math.random();
    if (r < 0.02) { ST.setFlag(G, now); continue; }
    if (r < 0.035) { ST.backToFlag(G, now); continue; }
    if (r < 0.045 && G.status === "play") { ST.pause(G, now); now += Math.random() * 60000; continue; }
    let d: string;
    if (Math.random() < 0.62) {
      const ok = dirs.filter((x) => ST.canMove(G, G.pos, x) && de[G.pos + step(G, x)] < de[G.pos]);
      d = ok.length ? ok[0] : dirs[(Math.random() * 4) | 0];
    } else d = dirs[(Math.random() * 4) | 0];
    ST.move(G, d as any, now);
  }
  return G;
}

let games = 0, mism = 0, rejected = 0;
const levels = ["easy", "mid", "hard", "hell"] as const;
for (const level of levels) for (const loops of [0, 1, 2, 3, 4]) for (let k = 0; k < 14; k++) {
  const algo = ALGOS[(Math.random() * ALGOS.length) | 0].id;
  const minLen = 3 + ((Math.random() * (LV_MAXL[level] - 2)) | 0);
  const settings = { level, algo, minLen, loops, fog: Math.random() < 0.5 };
  const maze = makeLevel(settings);
  const G = play(ST.newGame(settings, maze));
  if (G.status !== "won") continue;
  games++;
  const rec: any = recordOf(G, "x", null);
  delete rec.label;
  const out: any = SG.gameRow(rec);
  if ("error" in out) { rejected++; console.log("ปฏิเสธเกมจริง:", out.error, level, algo, minLen, loops); continue; }
  const row = out.row, r = ST.result(G);
  const want: any = { steps: G.steps, shortest: r.shortest, decisions: G.D, wrong: G.wrong, lost: G.lost, back: G.back, rewalk: G.rewalk, warps: G.warp, score: r.score };
  for (const k2 of Object.keys(want)) if (row[k2] !== want[k2]) { mism++; console.log("ไม่ตรง", k2, row[k2], want[k2]); }
  if (row.time_ms !== Math.round(G.el) && row.time_ms < Math.round(G.el)) { mism++; console.log("เวลาไม่ตรง", row.time_ms, G.el); }
  const RG = ST.replay(settings, maze, G.events);
  if (RG.wrongAt.join() !== G.wrongAt.join() || RG.trail.join() !== G.trail.join() || RG.flag !== G.flag || RG.seen.join() !== G.seen.join()) { mism++; console.log("ภาพตอนดูย้อนไม่ตรง"); }
  if (row.loop_count < 0) console.log("loop_count ติดลบ", row.loop_count);
}
console.log(`① เล่น ${games} เกม · เซิร์ฟเวอร์ปฏิเสธ ${rejected} · ตัวเลขไม่ตรง ${mism}`);

// ② ข้อมูลขาเข้าแปลก ๆ ที่ผ่าน gameRow
const base = (o: any) => ({ saveKey: crypto.randomUUID(), playedAt: new Date().toISOString(), appVersion: "1.0.0", level: "easy", algo: "wilson", minLen: 4, loops: 0, fog: false, timeMs: 1000, ...o });
function corridor(n: number) { // กำแพงปิดหมด เปิดแค่ทางตรงจากทางเข้าลงไปทางออก
  const N = n * n, R = new Uint8Array(N).fill(1), B = new Uint8Array(N).fill(1), x = n >> 1;
  for (let y = 0; y < n - 1; y++) B[y * n + x] = 0;
  return { n, R, B, ex: x };
}
const tryRow = (name: string, o: any) => { const r: any = SG.gameRow(base(o)); console.log(`  ${name}: ${"error" in r ? "ปฏิเสธ " + r.error : `ผ่าน · level=${r.row.level} size=${r.row.size} score=${r.row.score} loop_count=${r.row.loop_count} time_ms=${r.row.time_ms} played_at=${r.row.played_at} replay_of=${r.row.replay_of}`}`); };
const c10 = corridor(10), down9 = "D0".repeat(9);
console.log("② ข้อมูลขาเข้า");
tryRow("ทางตรงเส้นเดียว ช่องอื่นปิดตาย (10 × 10)", { size: 10, exitX: 5, walls: packWalls(c10), moves: down9 });
const c60 = corridor(60);
tryRow("ระดับง่าย แต่ขนาด 60 × 60", { level: "easy", size: 60, exitX: 30, walls: packWalls(c60), moves: "D0".repeat(59) });
const open = { n: 10, R: new Uint8Array(100), B: new Uint8Array(100), ex: 5 };
tryRow("กระดานโล่งไม่มีกำแพงเลย", { size: 10, exitX: 5, walls: packWalls(open), moves: down9 });
tryRow("เวลาก้าวสุดท้ายเกินจำนวนเต็มของฐาน", { size: 10, exitX: 5, walls: packWalls(open), moves: "D0".repeat(8) + "Dzzzzzzzzz" });
tryRow("replayOf ชี้รหัสที่ไม่มีในฐาน", { size: 10, exitX: 5, walls: packWalls(open), moves: down9, replayOf: crypto.randomUUID() });
tryRow("เวลาเล่นจบปี 9999", { size: 10, exitX: 5, walls: packWalls(open), moves: down9, playedAt: "9999-12-31T00:00:00Z" });
tryRow("ผังมีตัวอักษรเกินท้าย", { size: 10, exitX: 5, walls: packWalls(open) + "AAAAAAAAAAAAAAAAAAAA", moves: down9 });
