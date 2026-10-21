import "server-only";
import { NextResponse } from "next/server";
import { dbConfigured, supabaseAdmin, TABLES } from "@/lib/supabaseAdmin";
import { isAlgo } from "@/lib/maze/generators";
import { LEVEL_IDS, LV_MAXL, mazeStats } from "@/lib/game/level";
import type { Level, Settings } from "@/lib/game/level";
import { replay, result } from "@/lib/game/state";
import { unpackMoves, unpackWalls } from "@/lib/game/encode";

/* ============================================================
   ตัวช่วยของเส้นทางหลังบ้าน /api/games (ยกโครงจาก city-lab lib/server/cloudRows.ts)

   🔴 ตัวแปลงกลางประตูเดียว (สกิล db-safety ทางเข้าฐาน ①) รับเฉพาะช่องที่อนุญาต ช่องแปลกปลอมทิ้งหมด
   🔴 ตัวเลขผลทุกตัว (ก้าว เลี้ยวผิด คะแนน ฯลฯ) เซิร์ฟเวอร์คิดเองจากผังกำแพงกับบันทึกการเดิน
      ด้วยตรรกะเกมชุดเดียวกับหน้าเว็บ (lib/game/state.ts) ไม่เชื่อตัวเลขที่หน้าเว็บส่งมา
      บันทึกการเดินที่ไปไม่ถึงทางออก = ปฏิเสธ
   🔴 ข้อความผิดพลาดจากฐานไม่ส่งกลับหน้าเว็บ จดลงบันทึกของเซิร์ฟเวอร์แทน
   ============================================================ */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const BODY_LIMIT = 256 * 1024;

export function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function noDb() {
  return bad("ยังไม่ได้ตั้งค่าเชื่อมฐานข้อมูล", 503);
}

export function dbFail(where: string, detail: unknown, message = "ฐานข้อมูลไม่ตอบกลับ ลองใหม่ภายหลัง") {
  console.error(`[games] ${where}`, detail);
  return bad(message, 500);
}

export async function readBody(req: Request): Promise<{ body: Record<string, unknown> } | { res: Response }> {
  const len = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(len) && len > BODY_LIMIT) return { res: bad("ข้อมูลที่ส่งมาใหญ่เกินกำหนด", 413) };
  let text: string;
  try { text = await req.text(); } catch { return { res: bad("อ่านข้อมูลที่ส่งมาไม่สำเร็จ") }; }
  if (new TextEncoder().encode(text).length > BODY_LIMIT) return { res: bad("ข้อมูลที่ส่งมาใหญ่เกินกำหนด", 413) };
  try {
    const j: unknown = JSON.parse(text);
    if (typeof j === "object" && j !== null && !Array.isArray(j)) return { body: j as Record<string, unknown> };
  } catch { /* ตอบข้างล่าง */ }
  return { res: bad("ข้อมูลที่ส่งมาไม่ใช่ JSON") };
}

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);
const int = (v: unknown, lo: number, hi: number): number | null => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : null);

/** ตรวจและแปลงเกมหนึ่งเกมจากหน้าเว็บเป็นแถวของฐาน */
export function gameRow(b: Record<string, unknown>): { row: Record<string, unknown> } | { error: string } {
  const saveKey = str(b.saveKey, 64);
  if (!saveKey || !UUID.test(saveKey)) return { error: "รหัสก้อนการบันทึกไม่ถูกต้อง" };
  const playedAt = str(b.playedAt, 40);
  if (!playedAt || Number.isNaN(Date.parse(playedAt))) return { error: "เวลาที่เล่นจบไม่ถูกต้อง" };
  const appVersion = str(b.appVersion, 20);
  if (!appVersion) return { error: "ไม่มีรุ่นของเกม" };
  const level = str(b.level, 8);
  if (!level || !LEVEL_IDS.includes(level as Level)) return { error: "ระดับไม่ถูกต้อง" };
  const algo = b.algo;
  if (!isAlgo(algo)) return { error: "วิธีสร้างไม่ถูกต้อง" };
  const minLen = int(b.minLen, 3, LV_MAXL[level as Level]);
  if (minLen === null) return { error: "ทางหลอกขั้นต่ำไม่ถูกต้อง" };
  const loops = int(b.loops, 0, 4);
  if (loops === null) return { error: "ระดับทางวนไม่ถูกต้อง" };
  if (typeof b.fog !== "boolean") return { error: "ค่าโหมดไฟฉายไม่ถูกต้อง" };
  const size = int(b.size, 5, 60), exitX = int(b.exitX, 0, 59);
  const walls = str(b.walls, 2000), moves = str(b.moves, 200000);
  if (size === null || exitX === null || !walls || moves === null) return { error: "ผังด่านหรือบันทึกการเดินไม่ครบ" };
  const maze = unpackWalls(size, exitX, walls);
  if (!maze) return { error: "ผังกำแพงเสีย" };
  const events = unpackMoves(moves);
  if (!events || events.length === 0) return { error: "บันทึกการเดินเสีย" };
  const timeMs = int(b.timeMs, 0, 24 * 60 * 60 * 1000);
  if (timeMs === null) return { error: "เวลาที่ใช้ไม่ถูกต้อง" };
  let replayOf: string | null = null;
  if (b.replayOf !== undefined && b.replayOf !== null) {
    const r = str(b.replayOf, 64);
    if (!r || !UUID.test(r)) return { error: "รหัสเกมต้นทางไม่ถูกต้อง" };
    replayOf = r;
  }

  // เล่นซ้ำจากบันทึกด้วยตรรกะเดียวกับหน้าเว็บ แล้วคิดผลเอง
  const settings: Settings = { level: level as Level, algo, minLen, loops, fog: b.fog };
  const G = replay(settings, maze, events);
  if (G.status !== "won") return { error: "บันทึกการเดินไปไม่ถึงทางออก" };
  const r = result(G), st = mazeStats(maze, minLen);

  return {
    row: {
      save_key: saveKey,
      played_at: new Date(playedAt).toISOString(),
      app_version: appVersion,
      level, size, algo, min_len: minLen, loops, fog: b.fog,
      walls, exit_x: exitX, moves,
      // เวลาที่หน้าเว็บจับได้ต้องไม่น้อยกว่าเวลาของก้าวสุดท้ายในบันทึก
      time_ms: Math.max(timeMs, events[events.length - 1].t),
      steps: G.steps, shortest: r.shortest, decisions: G.D, wrong: G.wrong,
      lost: G.lost, back: G.back, rewalk: G.rewalk, warps: G.warp, score: r.score,
      choices: st.choices, loop_count: st.loopCount,
      replay_of: replayOf,
      is_test: b.isTest === true,
    },
  };
}

/** คอลัมน์ที่หน้าประวัติใช้ · ส่งผังกำแพงกับบันทึกการเดินมาด้วย ให้วาดภาพย่อเขาวงกตที่เล่นจบได้ (พี่กันสั่ง 21 ต.ค. 2569 มุมมองภาพเขาวงกต)
    ผัง 40 × 40 ราว 550 ตัวอักษร บันทึกการเดินไม่กี่ร้อย หน้าละ 50 เกมรวมไม่ถึง 100 KB */
export const LIST_COLS = "id, played_at, level, size, algo, min_len, loops, fog, time_ms, steps, shortest, wrong, decisions, score, replay_of, walls, exit_x, moves";
export const FULL_COLS = LIST_COLS + ", lost, back, rewalk, warps, choices, loop_count, app_version";

export function dbReady(): Response | null {
  return dbConfigured() ? null : noDb();
}

export { supabaseAdmin, TABLES };
