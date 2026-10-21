import type { MazeData, Settings } from "./level.ts";
import { solveTo } from "./level.ts";
import { distFrom, openNb } from "../maze/grid.ts";

/* ════════════════════════════════════════════════════════════════════
   สถานะเกม การเดิน ธง วาร์ป นาฬิกา คะแนน (ยกจากไฟล์เดิม ก้อนที่ 2 · เอกสารหัวข้อ 8)

   โค้ดล้วน ไม่แตะหน้าจอ · ตัวดูย้อนใช้ชุดนี้ซ้ำ สถิติตอนดูย้อนจึงเท่าตอนเล่นจริงเสมอ
   เวลาส่งเข้ามาจากข้างนอก (now) ทดสอบได้โดยไม่ต้องรอจริง

   เปลี่ยนจากไฟล์เดิม (บั๊กข้อ 1 · 2 · 5 ดู docs/AUDIT-2026-10-21.md)
   ① "ทางถูก" = ช่องที่อยู่บนทางสั้นสุดเส้นไหนก็ได้ (onBest) ไม่ใช่เส้นเดียวที่ระบบเลือก
      เดิมโหมดทางวน เดินอีกเส้นที่ยาวเท่ากันโดนนับเลี้ยวผิด หักคะแนน และทาสีแดง
   ② ความคืบหน้าดูจาก "ระยะถึงทางออกที่ใกล้ที่สุดเท่าที่เคยไป" (nearest) แทนตำแหน่งบนเส้นเฉลย
      เดิมหลงแล้วตัดกลับเข้าทางเฉลยช่วงหลัง ผลรวมที่มาของก้าวเกินไม่เท่าก้าวเกินจริง
      โหมดไม่มีทางวน onBest = เส้นเฉลยพอดี และ nearest เดินคู่กับจุดไกลสุดเดิม ตัวเลขทุกตัวเท่าเดิม (มีชุดทดสอบเทียบ)
   ③ นาฬิกาหยุดได้ (pause/resume) ช่วงที่หยุดไม่นับเวลา และไม่นับในบันทึกการเดิน
   ④ เส้นทางเก็บเป็นปมต่อกัน (tc tp tip) ปักธงจำแค่ปมปลาย วาร์ปย้ายปมปลายกลับ ไม่ต้องคัดลอกทั้งเส้น
      เดิมปักธงทุกครั้งคัดลอกเส้นทางทั้งเส้น บันทึกปลอมที่เดินวนแล้วปักธงซ้ำทำให้เซิร์ฟเวอร์คิดนาน 7.8 วินาที (docs/BUGHUNT-2026-10-21.md ข้อ 20)
   ════════════════════════════════════════════════════════════════════ */

export type Dir = "u" | "d" | "l" | "r";
export type EventKind = Dir | "F" | "W";
/** หนึ่งเหตุการณ์ในบันทึกการเดิน · t = มิลลิวินาทีนับจากก้าวแรก ไม่รวมช่วงที่หยุดนาฬิกา */
export type GameEvent = { t: number; k: EventKind };
export type GameStatus = "ready" | "play" | "won" | "gaveup";

export interface Game {
  settings: Settings;
  maze: MazeData;
  n: number;
  R: Uint8Array;
  B: Uint8Array;
  s: number;
  e: number;
  /** ทางเฉลยที่ระบบเลือก เรียงจากทางออกไปทางเข้า ใช้วาดเส้นชมพูและนับทางแยก */
  path: number[];
  onPath: Uint8Array;
  /** ช่องที่อยู่บนทางสั้นสุดเส้นไหนก็ได้ */
  onBest: Uint8Array;
  /** ระยะเดินถึงทางออก */
  de: Int32Array;
  /** ความยาวทางสั้นสุด (ก้าว) */
  L: number;
  /** ทางแยกที่ต้องตัดสินใจบนทางเฉลย */
  D: number;
  pos: number;
  /** เส้นทางที่ผ่านมา เรียงจากทางเข้าถึงตำแหน่งปัจจุบัน (คิดจากปมทุกครั้งที่อ่าน) */
  readonly trail: number[];
  /** ช่องของแต่ละปมในเส้นทาง */
  tc: number[];
  /** ปมก่อนหน้าของแต่ละปม (-1 = ปมแรก) */
  tp: number[];
  /** ปมปลายของเส้นทางตอนนี้ */
  tip: number;
  seen: Uint8Array;
  steps: number;
  status: GameStatus;
  flag: number;
  /** ปมปลายของเส้นทางตอนปักธง (-1 = ยังไม่ปัก) */
  flagTip: number;
  wrong: number;
  lost: number;
  back: number;
  rewalk: number;
  warp: number;
  nearest: number;
  /** ช่องที่ออกจากทางถูกไปทางผิด (ตำแหน่งที่เลี้ยวผิด) เรียงตามเวลา */
  wrongAt: number[];
  t0: number;
  pausedAt: number | null;
  pausedTotal: number;
  /** เวลาที่ใช้ตอนจบเกม */
  el: number;
  events: GameEvent[];
}

const STEP: Record<Dir, (n: number) => number> = { r: () => 1, l: () => -1, d: (n) => n, u: (n) => -n };

/** เส้นทางจากทางเข้าถึงปมปลาย */
export function trailOf(G: Pick<Game, "tc" | "tp" | "tip">): number[] {
  const out: number[] = [];
  for (let i = G.tip; i >= 0; i = G.tp[i]) out.push(G.tc[i]);
  return out.reverse();
}

export function newGame(settings: Settings, maze: MazeData): Game {
  const { n, R, B } = maze, s = n >> 1, e = n * (n - 1) + maze.ex;
  const path = solveTo(maze);
  const onPath = new Uint8Array(n * n);
  for (const c of path) onPath[c] = 1;
  const ds = distFrom(n, R, B, s), de = distFrom(n, R, B, e), L = ds[e];
  const onBest = new Uint8Array(n * n);
  for (let c = 0; c < n * n; c++) if (ds[c] >= 0 && ds[c] + de[c] === L) onBest[c] = 1;
  let D = 0;
  for (const c of path) for (const q of openNb(c, n, R, B)) if (!onBest[q]) D++;
  const seen = new Uint8Array(n * n);
  seen[s] = 1;
  return {
    settings, maze, n, R, B, s, e, path, onPath, onBest, de, L, D,
    pos: s, tc: [s], tp: [-1], tip: 0, seen, steps: 0, status: "ready", flag: -1, flagTip: -1,
    get trail() { return trailOf(this); },
    wrong: 0, lost: 0, back: 0, rewalk: 0, warp: 0, nearest: L, wrongAt: [],
    t0: 0, pausedAt: null, pausedTotal: 0, el: 0, events: [],
  };
}

export function canMove(G: Game, c: number, d: Dir): boolean {
  const n = G.n, x = c % n, y = (c / n) | 0;
  if (d === "r") return x < n - 1 && !G.R[c];
  if (d === "l") return x > 0 && !G.R[c - 1];
  if (d === "d") return y < n - 1 && !G.B[c];
  return y > 0 && !G.B[c - n];
}

export const playing = (G: Game | null): G is Game => !!G && (G.status === "ready" || G.status === "play");

/** เวลาที่เล่นไปแล้ว ไม่รวมช่วงที่หยุด */
export function clock(G: Game, now: number): number {
  if (G.status === "ready") return 0;
  if (G.status === "won" || G.status === "gaveup") return G.el;
  return now - G.t0 - G.pausedTotal - (G.pausedAt !== null ? now - G.pausedAt : 0);
}

/** หยุดนาฬิกา (สลับแท็บ ไปหน้าอื่น จอดับ) · คืน true ถ้าหยุดจริง */
export function pause(G: Game, now: number): boolean {
  if (G.status !== "play" || G.pausedAt !== null) return false;
  G.pausedAt = now;
  return true;
}

export function resume(G: Game, now: number): void {
  if (G.pausedAt === null) return;
  G.pausedTotal += now - G.pausedAt;
  G.pausedAt = null;
}

export type MoveResult = { moved: false } | { moved: true; back: boolean; won: boolean };

/** เดินหนึ่งก้าว · ชนกำแพงหรือเกมจบแล้ว = ไม่เดิน */
export function move(G: Game, d: Dir, now: number): MoveResult {
  if (!playing(G) || !canMove(G, G.pos, d)) return { moved: false };
  const a = G.pos, b = a + STEP[d](G.n);
  if (G.onBest[a] && !G.onBest[b]) { G.wrong++; G.wrongAt.push(a); }
  if (G.de[b] < G.nearest) G.nearest = G.de[b];
  else if (!G.onBest[a] || !G.onBest[b]) G.lost++;
  else if (G.de[b] > G.de[a]) G.back++;
  else G.rewalk++;
  if (G.status === "ready") { G.status = "play"; G.t0 = now; }
  resume(G, now);
  G.events.push({ t: Math.round(clock(G, now)), k: d });
  const up = G.tp[G.tip], back = up >= 0 && G.tc[up] === b;
  if (back) G.tip = up;
  else { G.tc.push(b); G.tp.push(G.tip); G.tip = G.tc.length - 1; }
  G.pos = b;
  G.seen[b] = 1;
  G.steps++;
  const won = b === G.e;
  if (won) { G.el = clock(G, now); G.status = "won"; }
  return { moved: true, back, won };
}

/** ปักธง (ปักได้ทีละ 1 ธง ปักใหม่ธงย้าย) · ยังไม่เริ่มเดินก็ปักได้ ไม่เริ่มนาฬิกา */
export function setFlag(G: Game, now: number): boolean {
  if (!playing(G)) return false;
  G.flag = G.pos;
  G.flagTip = G.tip;
  G.events.push({ t: Math.round(clock(G, now)), k: "F" });
  return true;
}

/** กลับไปที่ธง = วาร์ปทันที ไม่นับก้าว (การตัดสินใจของผู้สร้าง เอกสารหัวข้อ 8) */
export function backToFlag(G: Game, now: number): "noflag" | "same" | "ok" | "off" {
  if (!playing(G)) return "off";
  if (G.flag < 0) return "noflag";
  if (G.pos === G.flag) return "same";
  resume(G, now);
  G.warp++;
  G.pos = G.flag;
  G.tip = G.flagTip;
  G.events.push({ t: Math.round(clock(G, now)), k: "W" });
  return "ok";
}

export function giveUp(G: Game, now: number): boolean {
  if (!playing(G)) return false;
  G.el = clock(G, now);
  G.status = "gaveup";
  return true;
}

export type Result = {
  score: number;
  grade: string;
  shortest: number;
  waste: number;
  D: number;
  W: number;
};

/** คะแนนเต็ม 100 = 80% จากทางแยกที่เลือกถูก + 20% จากระยะทาง · มีก้าวเกินแม้ก้าวเดียว สูงสุด 99 */
export function result(G: Game): Result {
  const shortest = G.L, waste = G.steps - shortest;
  const D = Math.max(1, G.D), W = Math.min(G.wrong, D), dec = (D - W) / D, eff = Math.min(1, shortest / Math.max(1, G.steps));
  let score = Math.round(100 * (0.8 * dec + 0.2 * eff));
  if (score >= 100 && waste > 0) score = 99;
  const grade =
    waste <= 0 ? "แม่นยำ ไม่หลงแม้แต่ก้าวเดียว"
    : W === 0 ? "ไม่เลี้ยวผิด มีเดินถอยเล็กน้อย"
    : W <= 2 ? "เกือบแม่นยำ เลี้ยวผิดเล็กน้อย"
    : W / D <= 0.15 ? "เก่งมาก"
    : W / D <= 0.3 ? "พอใช้ หลงหลายทาง"
    : "หลงค่อนข้างมาก ลองใหม่อีกครั้ง";
  return { score, grade, shortest, waste, D, W };
}

/** เล่นซ้ำจากบันทึกการเดิน k เหตุการณ์แรก (ไม่ส่ง k = ทั้งหมด) · ใช้ในตัวดูย้อนและชุดทดสอบ */
/** ช่องที่ปักธงแต่ละครั้ง พร้อมลำดับเหตุการณ์ (ตัวดูย้อนวาดธงจางตรงจุดที่เคยปัก) · เล่นซ้ำแบบเดียวกับ replay */
export function flagSpots(settings: Settings, maze: MazeData, events: GameEvent[]): { i: number; pos: number }[] {
  const G = newGame(settings, maze), out: { i: number; pos: number }[] = [];
  const T0 = 1_000_000;
  events.forEach((ev, i) => {
    const now = T0 + ev.t;
    if (ev.k === "F") { if (setFlag(G, now)) out.push({ i, pos: G.pos }); }
    else if (ev.k === "W") backToFlag(G, now);
    else move(G, ev.k, now);
  });
  return out;
}

export function replay(settings: Settings, maze: MazeData, events: GameEvent[], k = events.length): Game {
  const G = newGame(settings, maze);
  replayStep(G, events, 0, k);
  return G;
}

/** เล่นต่อบนเกมเดิม จากเหตุการณ์ที่ from ถึงก่อน to · ตัวดูย้อนเดินทีละก้าวไม่ต้องเล่นจากต้นทุกครั้ง
    (เดิมเล่นซ้ำจากต้นทุกก้าว เกมยิ่งยาวยิ่งช้า docs/BUGHUNT-2026-10-21.md ข้อ 25) */
export function replayStep(G: Game, events: GameEvent[], from: number, to: number): void {
  const T0 = 1_000_000;
  for (let i = from; i < to && i < events.length; i++) {
    const ev = events[i], now = T0 + ev.t;
    if (ev.k === "F") setFlag(G, now);
    else if (ev.k === "W") backToFlag(G, now);
    else move(G, ev.k, now);
  }
  if (G.status === "play" && to < events.length) {
    // ยังไม่จบ ตรึงนาฬิกาไว้ที่เหตุการณ์ล่าสุด
    G.el = to > 0 ? events[to - 1].t : 0;
  }
}
