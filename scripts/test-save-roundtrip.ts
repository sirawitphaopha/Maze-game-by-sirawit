// ═══════════════════════════════════════════════════════════════════════════
// ชุดทดสอบการบันทึก ส่งเกมจริงเข้าฐาน แล้วอ่านกลับมาเทียบทีละช่อง (สกิล save-status ชั้น ⑤)
//
// 1. เข้าสู่ระบบด้วยรหัสใน .env.local
// 2. สร้างด่านกับเล่นจนจบด้วยตรรกะเกมชุดเดียวกับหน้าเว็บ (มีเลี้ยวผิด ปักธง วาร์ป)
// 3. POST /api/games → อ่านกลับด้วย GET /api/games/[id] → เทียบทุกช่องกับที่คิดเองในเครื่อง
// 4. ส่งซ้ำรหัสก้อนเดิม → ต้องได้รหัสแถวเดิม duplicate = true ไม่เพิ่มแถว
// 5. ส่งของเสีย (บันทึกการเดินไม่ถึงทางออก ระดับผิด) → ต้องโดนปฏิเสธ 400
// แถวที่ชุดนี้สร้างติดธง is_test = true ไม่แสดงในหน้าประวัติ
//
// วิธีใช้  เปิด npm run dev ไว้ก่อน แล้ว  node scripts/test-save-roundtrip.ts
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { makeLevel, mazeStats, type Settings } from "../lib/game/level.ts";
import { backToFlag, move, newGame, result, setFlag, type Dir, type Game } from "../lib/game/state.ts";
import { packMoves, packWalls } from "../lib/game/encode.ts";
import { distFrom, openNb } from "../lib/maze/grid.ts";

const BASE = process.env.SAVE_TEST_URL || "http://127.0.0.1:3600";
const env = fs.readFileSync(".env.local", "utf8").split(/\r?\n/);
const pw = (env.find((l) => l.startsWith("MAZE_PASSWORD=")) || "").slice("MAZE_PASSWORD=".length).trim();

let pass = 0, fail = 0;
const ok = (cond: boolean, label: string) => { if (cond) { pass++; console.log("  ผ่าน  " + label); } else { fail++; console.log("  ตก    " + label); } };

const login = await fetch(BASE + "/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
ok(login.ok && cookie.startsWith("maze_auth="), "เข้าสู่ระบบได้บัตรผ่าน");
const H = { "content-type": "application/json", cookie };

// เล่นจนจบ · เลี้ยวผิดเข้ากิ่งแรกที่เจอ 2 ช่องแล้วเดินกลับ · ปักธงแล้ววาร์ปหนึ่งครั้ง
const settings: Settings = { level: "mid", algo: "wilson", minLen: 5, loops: 1, fog: false };
const G: Game = newGame(settings, makeLevel(settings));
const de = distFrom(G.n, G.R, G.B, G.e);
const dirTo = (a: number, b: number): Dir => (b - a === 1 ? "r" : b - a === -1 ? "l" : b - a === G.n ? "d" : "u");
let now = 50_000, wrongDone = false, warpDone = false;
while (G.status !== "won") {
  now += 150;
  const nb = openNb(G.pos, G.n, G.R, G.B);
  const off = nb.find((q) => !G.onBest[q] && G.onBest[G.pos]);
  if (!wrongDone && off !== undefined && G.steps > 3) {
    const home = G.pos;
    move(G, dirTo(home, off), (now += 150));
    move(G, dirTo(off, home), (now += 150));
    wrongDone = true;
    continue;
  }
  if (!warpDone && wrongDone && G.steps > 10) { setFlag(G, now); const q = nb.find((x) => de[x] < de[G.pos]) as number; move(G, dirTo(G.pos, q), (now += 150)); backToFlag(G, (now += 150)); warpDone = true; continue; }
  const q = nb.find((x) => de[x] < de[G.pos]) as number;
  move(G, dirTo(G.pos, q), now);
}
const r = result(G), st = mazeStats(G.maze, settings.minLen);
const saveKey = randomUUID();
const body = {
  saveKey, playedAt: new Date().toISOString(), appVersion: "test", level: settings.level, algo: settings.algo, minLen: settings.minLen,
  loops: settings.loops, fog: settings.fog, size: G.n, exitX: G.maze.ex, walls: packWalls(G.maze), moves: packMoves(G.events),
  timeMs: Math.round(G.el), replayOf: null, isTest: true,
};

console.log("① บันทึกเกม");
const p1 = await fetch(BASE + "/api/games", { method: "POST", headers: H, body: JSON.stringify(body) });
const j1 = (await p1.json()) as { ok?: boolean; id?: string; duplicate?: boolean; error?: string };
ok(p1.ok && !!j1.id && j1.duplicate === false, `ตอบสำเร็จพร้อมรหัสแถว (${p1.status}${j1.error ? " " + j1.error : ""})`);

console.log("② อ่านกลับเทียบทีละช่อง");
const g1 = await fetch(`${BASE}/api/games/${j1.id}`, { headers: H });
const row = ((await g1.json()) as { game?: Record<string, unknown> }).game || {};
const want: Record<string, unknown> = {
  level: "mid", size: G.n, algo: "wilson", min_len: 5, loops: 1, fog: false, walls: body.walls, exit_x: G.maze.ex, moves: body.moves,
  time_ms: body.timeMs, steps: G.steps, shortest: r.shortest, decisions: G.D, wrong: G.wrong, lost: G.lost, back: G.back, rewalk: G.rewalk,
  warps: G.warp, score: r.score, choices: st.choices, loop_count: st.loopCount, replay_of: null, app_version: "test",
};
for (const [k, v] of Object.entries(want)) ok(row[k] === v, `${k} = ${String(v).slice(0, 40)}${row[k] === v ? "" : ` แต่ในฐานเป็น ${String(row[k]).slice(0, 40)}`}`);
ok(G.wrong >= 1 && G.warp === 1, "เกมทดสอบมีเลี้ยวผิดและวาร์ปจริง");

console.log("③ ส่งซ้ำรหัสก้อนเดิม");
const p2 = await fetch(BASE + "/api/games", { method: "POST", headers: H, body: JSON.stringify(body) });
const j2 = (await p2.json()) as { id?: string; duplicate?: boolean };
ok(p2.ok && j2.id === j1.id && j2.duplicate === true, "ได้รหัสแถวเดิม ไม่เพิ่มแถว");

console.log("④ ของเสียต้องโดนปฏิเสธ");
const half = packMoves(G.events.slice(0, Math.floor(G.events.length / 2)));
const p3 = await fetch(BASE + "/api/games", { method: "POST", headers: H, body: JSON.stringify({ ...body, saveKey: randomUUID(), moves: half }) });
ok(p3.status === 400, `บันทึกการเดินไม่ถึงทางออก ได้ ${p3.status}`);
const p4 = await fetch(BASE + "/api/games", { method: "POST", headers: H, body: JSON.stringify({ ...body, saveKey: randomUUID(), level: "x" }) });
ok(p4.status === 400, `ระดับผิด ได้ ${p4.status}`);
const p5 = await fetch(BASE + "/api/games", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, saveKey: randomUUID() }) });
ok(p5.status === 401, `ไม่มีบัตรผ่าน ได้ ${p5.status}`);

console.log(`\nผ่าน ${pass} ตก ${fail} · แถวทดสอบรหัส ${j1.id} (is_test = true)`);
process.exit(fail ? 1 : 0);
