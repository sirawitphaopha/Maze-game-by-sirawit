// ═══════════════════════════════════════════════════════════════════════════
// เกมตัวอย่างค่ายาวสุด ลงฐานจริงหนึ่งเกม ให้เห็นในหน้าประวัติว่าการ์ดกับตารางรับค่ายาวสุดได้ไม่ทับกัน
// (พี่กันสั่ง 21 ต.ค. 2569 "ทำขึ้นมา 1 อัน" ต่อจากที่แคลร์ทดสอบด้วยค่าสมมุติในหน้าเว็บ)
//
// ด่านโหด 40 × 40 วิธี Sidewinder · เดินเข้าทุกทางแยกที่ผิดจนสุดแล้วถอยกลับ เลี้ยวผิดเยอะสุดเท่าที่ด่านมี
// เวลาที่ใช้รวม 59:59.9 นาที (ยาวสุดก่อนขึ้นหลักชั่วโมง) · เล่นจบ 30 ก.ย. 2569 23:59 น.
// ไม่ติดธง is_test จึงขึ้นในหน้าประวัติ · รหัสก้อนตายตัว รันซ้ำได้แถวเดิม ไม่เพิ่มแถว
// เซิร์ฟเวอร์คิดก้าว เลี้ยวผิด คะแนน ใหม่เองจากบันทึกการเดิน (lib/server/games.ts) ตัวเลขในฐานจึงเป็นของจริงตามตรรกะเกม
//
// วิธีใช้  เปิด npm run dev ไว้ก่อน แล้ว  node scripts/seed-sample-game.ts
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { makeLevel, type Settings } from "../lib/game/level.ts";
import { move, newGame, result, type Dir } from "../lib/game/state.ts";
import { packMoves, packWalls } from "../lib/game/encode.ts";
import { openNb } from "../lib/maze/grid.ts";

const BASE = process.env.SAVE_TEST_URL || "http://127.0.0.1:3600";
const env = fs.readFileSync(".env.local", "utf8").split(/\r?\n/);
const pw = (env.find((l) => l.startsWith("MAZE_PASSWORD=")) || "").slice("MAZE_PASSWORD=".length).trim();
const SAVE_KEY = "00000000-0000-4000-8000-0000000000a1";
const TOTAL_MS = 59 * 60_000 + 59_900;

const login = await fetch(BASE + "/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
if (!login.ok || !cookie) throw new Error("เข้าสู่ระบบไม่สำเร็จ ตรวจ MAZE_PASSWORD ใน .env.local");

const settings: Settings = { level: "hell", algo: "sidewinder", minLen: 8, loops: 0, fog: false };
const G = newGame(settings, makeLevel(settings));
const n = G.n;
const dirTo = (a: number, b: number): Dir => (b - a === 1 ? "r" : b - a === -1 ? "l" : b - a === n ? "d" : "u");

// ลำดับทิศ · บนทางถูกทุกช่อง เดินเข้ากิ่งที่ผิดทุกกิ่งจนสุดแล้วถอยกลับ ก่อนเดินต่อบนทางถูก
const dirs: Dir[] = [];
const explore = (from: number, cell: number) => {
  dirs.push(dirTo(from, cell));
  for (const q of openNb(cell, n, G.R, G.B)) if (q !== from) explore(cell, q);
  dirs.push(dirTo(cell, from));
};
// ทางถูกจากทางเข้าถึงทางออก เดินตามระยะถึงทางออกที่ลดลงทีละช่อง (ด่านไม่มีทางวน มีเส้นเดียว)
const path: number[] = [G.s];
while (path[path.length - 1] !== G.e) {
  const c = path[path.length - 1];
  path.push(openNb(c, n, G.R, G.B).find((q) => G.de[q] === G.de[c] - 1) as number);
}
for (let i = 0; i < path.length; i++) {
  const c = path[i], prev = path[i - 1], next = path[i + 1];
  for (const q of openNb(c, n, G.R, G.B)) if (q !== prev && q !== next) explore(c, q);
  if (next !== undefined) dirs.push(dirTo(c, next));
}

const dt = TOTAL_MS / dirs.length;
dirs.forEach((d, i) => move(G, d, Math.round((i + 1) * dt)));
if (G.status !== "won") throw new Error("เดินไม่ถึงทางออก");
const r = result(G);

const body = {
  saveKey: SAVE_KEY, playedAt: "2026-09-30T23:59:00+07:00", appVersion: "sample", level: settings.level, algo: settings.algo,
  minLen: settings.minLen, loops: settings.loops, fog: settings.fog, size: n, exitX: G.maze.ex, walls: packWalls(G.maze),
  moves: packMoves(G.events), timeMs: TOTAL_MS, replayOf: null, isTest: false,
};
const res = await fetch(BASE + "/api/games", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) });
const j = (await res.json()) as { id?: string; duplicate?: boolean; error?: string };
console.log(res.ok ? `บันทึกแล้ว รหัส ${j.id}${j.duplicate ? " (มีอยู่แล้ว ใช้แถวเดิม)" : ""}` : `ไม่สำเร็จ ${res.status} ${j.error}`);
if (res.ok && j.duplicate) {
  // แถวนี้มีอยู่แล้ว ด่านที่เพิ่งสุ่มไม่ได้บันทึก พิมพ์ตัวเลขของแถวในฐานแทน (เดิมพิมพ์ของด่านใหม่ หลอกคนตรวจ docs/BUGHUNT-2026-10-21.md ข้อ 15)
  const old = await fetch(`${BASE}/api/games/${j.id}`, { headers: { cookie } });
  const o = ((await old.json()) as { game?: { steps: number; shortest: number; wrong: number; score: number; time_ms: number } }).game;
  console.log(o ? `แถวในฐาน ก้าว ${o.steps} · ทางสั้นสุด ${o.shortest} · เลี้ยวผิด ${o.wrong} · คะแนน ${o.score} · เวลา ${o.time_ms} มิลลิวินาที` : `อ่านแถวเดิมไม่สำเร็จ ${old.status}`);
} else {
  console.log(`ก้าว ${G.steps} · ทางสั้นสุด ${r.shortest} · เลี้ยวผิด ${G.wrong} · คะแนน ${r.score} · เวลา ${TOTAL_MS} มิลลิวินาที`);
}
