import type { AlgoId } from "../maze/generators.ts";
import { generate } from "../maze/generators.ts";
import { braidOps, build, cleanStubs, countChoices, countLoops, openNb, solve } from "../maze/grid.ts";

/* ════════════════════════════════════════════════════════════════════
   ค่าตั้งของแท็บเล่นเกม และการสร้างด่าน (ยกจากไฟล์เดิม ก้อนที่ 2 · เอกสารหัวข้อ 8)
   ════════════════════════════════════════════════════════════════════ */

export type Level = "easy" | "mid" | "hard" | "hell";

export const LEVEL_IDS: Level[] = ["easy", "mid", "hard", "hell"];
export const LEVEL_NAME: Record<Level, string> = { easy: "ง่าย", mid: "กลาง", hard: "ยาก", hell: "โหด" };
export const LEVELS: Record<Level, number> = { easy: 10, mid: 18, hard: 28, hell: 40 };
/** ทางหลอกต้องยาวอย่างน้อย ค่าเริ่ม */
export const LV_MINL: Record<Level, number> = { easy: 4, mid: 5, hard: 6, hell: 8 };
/** ทางหลอกต้องยาวอย่างน้อย ค่าสูงสุด */
export const LV_MAXL: Record<Level, number> = { easy: 6, mid: 9, hard: 14, hell: 20 };

export const GNOTE: Record<AlgoId, string> = {
  dfs: "ทางยาวคดเคี้ยวมาก แต่ทางหลอกยาวมีน้อย",
  hunt: "คล้าย DFS ทางยาว ทางหลอกไปกองช่วงบน",
  growing: "ผสม DFS กับ Prim เนื้อเขาวงกตเป็นหย่อม ๆ",
  prim: "แตกกิ่งถี่ เส้นทางเฉลยสั้นและตรง",
  kruskal: "ทางหลอกยาวมากเป็นอันดับต้น ๆ เนื้อเขาวงกตสม่ำเสมอ",
  ab: "ยุติธรรม ทางหลอกมาก สร้างช้าในด่านใหญ่",
  wilson: "ทางหลอกยาวมาก เนื้อเขาวงกตสม่ำเสมอทั้งกระดาน ไม่ลำเอียง (ค่าเริ่มต้น)",
  binary: "มีทางตรงโล่งยาวสองขอบ จับทางง่าย",
  sidewinder: "แถวบนเป็นทางตรงยาว จับทางง่าย",
  eller: "ทางหลอกมาก เนื้อเขาวงกตสม่ำเสมอ",
  division: "ทางหลอกยาวมาก กำแพงตรงยาวคล้ายผังอาคาร",
};

export const LOOPS: { name: string; p: number; note: string }[] = [
  { name: "ไม่มี", p: 0, note: "มีทางถูกเพียงทางเดียว หากหลงต้องเดินย้อนกลับเท่านั้น" },
  { name: "น้อย", p: 0.1, note: "มีทางลัดบ้าง บางครั้งหลงไปแล้วยังวนกลับมาทางถูกได้" },
  { name: "กลาง", p: 0.25, note: "มีหลายเส้นทางไปเส้นชัย ต้องเลือกว่าทางใดสั้นกว่า" },
  { name: "มาก", p: 0.5, note: "มีทางวนจำนวนมาก จำทางยากขึ้นเพราะวนกลับมาที่เดิมได้" },
  { name: "มากที่สุด", p: 1, note: "แทบไม่มีทางตัน คล้ายเมืองที่มีถนนเชื่อมกันทุกทิศ" },
];

export type Settings = { level: Level; algo: AlgoId; minLen: number; loops: number; fog: boolean };

/** ผังด่านหนึ่งด่าน · ตัวนี้คือสิ่งที่เก็บลงประวัติ เล่นซ้ำได้ด่านเดิมเป๊ะ */
export type MazeData = { n: number; R: Uint8Array; B: Uint8Array; ex: number };

/** สร้างด่าน: สร้างด้วยวิธีที่เลือก → เก็บกวาดซอกสั้น → ทุบทางวน → ย้ายทางออกไปไกลสุด
    สุ่ม 15 รอบ (หรือจนเกิน 0.9 วินาที) เก็บด่านที่ทางหลอกยาวมากสุด เท่ากันเอาทางเฉลยยาวกว่า */
export function makeLevel(s: Settings): MazeData {
  const n = LEVELS[s.level], lp = LOOPS[s.loops]?.p ?? 0, t0 = performance.now();
  let best: { m: MazeData; ch: number; len: number } | null = null;
  for (let t = 0; t < 15; t++) {
    const f = build(n, generate(n, s.algo));
    cleanStubs(n, f.R, f.B, s.minLen);
    braidOps(n, f.R, f.B, lp);
    const r = solve(n, f.R, f.B, true), ch = countChoices(n, f.R, f.B, r.path, s.minLen);
    if (!best || ch > best.ch || (ch === best.ch && r.path.length > best.len))
      best = { m: { n, R: f.R, B: f.B, ex: r.ex }, ch, len: r.path.length };
    if (performance.now() - t0 > 900) break;
  }
  return (best as { m: MazeData }).m;
}

export function mazeStats(m: MazeData, minLen: number): { choices: number; loopCount: number } {
  const r = solveTo(m);
  return { choices: countChoices(m.n, m.R, m.B, r, minLen), loopCount: countLoops(m.n, m.R, m.B) };
}

/** ทางเฉลยไปทางออกที่กำหนดไว้แล้ว (ไม่เลือกทางออกใหม่) · เรียงจากทางออกย้อนไปทางเข้า */
export function solveTo(m: MazeData): number[] {
  const { n, R, B } = m, s = n >> 1, e = n * (n - 1) + m.ex;
  const prev = new Int32Array(n * n).fill(-1);
  prev[s] = s;
  const q = [s];
  let h = 0;
  while (h < q.length) {
    const c = q[h++];
    for (const t of openNb(c, n, R, B)) if (prev[t] < 0) { prev[t] = c; q.push(t); }
  }
  // ทางออกไปไม่ถึง = ผังเสีย · เดิมไล่ย้อนต่อไปเรื่อย ๆ ไม่มีวันจบ เซิร์ฟเวอร์ค้างจนหน่วยความจำเต็ม (docs/BUGHUNT-2026-10-21.md ข้อ 1)
  if (prev[e] < 0) throw new Error("ทางออกไปไม่ถึงจากทางเข้า");
  const p: number[] = [];
  let c = e;
  while (c !== s) { p.push(c); c = prev[c]; }
  p.push(s);
  return p;
}
