import type { MazeData, Settings } from "./level.ts";
import { solveTo } from "./level.ts";
import { distFrom, openNb } from "../maze/grid.ts";

/* ════════════════════════════════════════════════════════════════════
   สถานะเกม การเดิน ธง วาร์ป นาฬิกา คะแนน (ยกจากไฟล์เดิม ก้อนที่ 2 · เอกสารหัวข้อ 8)

   โค้ดล้วน ไม่แตะหน้าจอ · ตัวดูย้อนใช้ชุดนี้ซ้ำ สถิติตอนดูย้อนจึงเท่าตอนเล่นจริงเสมอ
   เวลาส่งเข้ามาจากข้างนอก (now) ทดสอบได้โดยไม่ต้องรอจริง

   เปลี่ยนจากไฟล์เดิม (บั๊กข้อ 1 · 2 · 5 ดู docs/AUDIT-2026-10-21.md)
   ① ชนะแล้วนับเลี้ยวผิดกับก้าวเกินจาก "เส้นทางสุดท้ายของผู้เล่นเอง" (settle) ไม่ใช่จากทางสั้นสุด
      เส้นทางสุดท้าย = เส้นจากทางเข้าถึงทางออกที่เหลือหลังตัดช่วงเดินย้อน วาร์ปกลับธง และเดินวนกลับมาช่องเดิม
      เสียคะแนนเฉพาะตอนพลาดจริง คือเข้าทางที่ต้องเดินย้อนออกมา หรือวนกลับมาช่องที่เคยผ่าน
      เลือกถนนอ้อมกว่าแต่ไม่ย้อนไม่วน ไม่หัก (พี่กันเคาะ 22 ต.ค. 2569 "ยังไงเราต้องได้เต็ม 100" แล้ว "ก็ตามนั้น ทำมา"
      หลังเล่นด่านโหดทางวนมากที่สุด ไม่ย้อนไม่วนเลยสักช่อง แต่ได้ 90 เพราะเส้นที่เลือกยาวกว่าทางสั้นสุด 52 ก้าว)
      โหมดไม่มีทางวน เส้นทางสุดท้ายคือทางเฉลยเส้นเดียว ตัวเลขทุกตัวเท่าไฟล์เดิม (มีชุดทดสอบเทียบ)
   ② เดิมรอบแรก (21 ต.ค. 2569) นับจาก onBest กับ nearest แก้บั๊กข้อ 1 กับ 2 ของไฟล์เดิม แต่โหมดทางวนยังหักเส้นที่อ้อมกว่า
      onBest ยังใช้ทาสีแดงตอนยอมแพ้ (ยังไม่มีเส้นทางของผู้เล่นถึงทางออก)
   ③ นาฬิกาหยุดได้ (pause/resume) ช่วงที่หยุดไม่นับเวลา และไม่นับในบันทึกการเดิน
   ④ เส้นทางเก็บเป็นปมต่อกัน (tc tp tip) ปักธงจำแค่ปมปลาย วาร์ปย้ายปมปลายกลับ ไม่ต้องคัดลอกทั้งเส้น
      เดิมปักธงทุกครั้งคัดลอกเส้นทางทั้งเส้น บันทึกปลอมที่เดินวนแล้วปักธงซ้ำทำให้เซิร์ฟเวอร์คิดนาน 7.8 วินาที (docs/BUGHUNT-2026-10-21.md ข้อ 20)
   ════════════════════════════════════════════════════════════════════ */

export type Dir = "u" | "d" | "l" | "r";
/** F ปักธง · X เอาธงออก (กดปักธงซ้ำตอนมีธง พี่กันสั่ง 22 ต.ค. 2569) · W วาร์ปกลับธง */
export type EventKind = Dir | "F" | "X" | "W";
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
  /** ช่องที่อยู่บนทางสั้นสุดเส้นไหนก็ได้ (ใช้ทาสีแดงตอนยอมแพ้) */
  onBest: Uint8Array;
  /** ช่องบนเส้นทางสุดท้ายของผู้เล่น · ตั้งตอนชนะ (settle) ยังไม่ชนะ = null */
  onRoute: Uint8Array | null;
  /** ความยาวเส้นทางสุดท้ายของผู้เล่น (ก้าว) · ยังไม่ชนะ = ทางสั้นสุด */
  route: number;
  /** ระยะเดินถึงทางออก */
  de: Int32Array;
  /** ความยาวทางสั้นสุด (ก้าว) */
  L: number;
  /** ทางแยกที่ต้องตัดสินใจ · เริ่มเกมนับบนทางเฉลย ชนะแล้วนับใหม่บนเส้นทางสุดท้ายของผู้เล่น */
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
  /** ก้าวที่สร้างแต่ละปม (ปมแรก = 0) · ตอนชนะใช้หาก้าวที่พาไปข้างหน้าจริง */
  ts: number[];
  /** ช่องต้นทางกับช่องปลายทางของแต่ละก้าว (ช่องที่ i = ก้าวที่ i + 1) */
  stepFrom: number[];
  stepTo: number[];
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
  /** ช่องที่เลี้ยวออกจากเส้นทางสุดท้ายไปทางที่ต้องย้อนหรือวนกลับ (ตำแหน่งที่เลี้ยวผิด) เรียงตามเวลา · ตั้งตอนชนะ */
  wrongAt: number[];
  /** ก้าวที่เลี้ยวผิดแต่ละครั้ง คู่กับ wrongAt (ตัวดูย้อนใช้นับ "ถึงตอนนี้") */
  wrongStep: number[];
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
    settings, maze, n, R, B, s, e, path, onPath, onBest, onRoute: null, route: L, de, L, D,
    pos: s, tc: [s], tp: [-1], tip: 0, ts: [0], stepFrom: [], stepTo: [], seen, steps: 0, status: "ready", flag: -1, flagTip: -1,
    get trail() { return trailOf(this); },
    wrong: 0, lost: 0, back: 0, rewalk: 0, warp: 0, wrongAt: [], wrongStep: [],
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
  if (G.status === "ready") { G.status = "play"; G.t0 = now; }
  resume(G, now);
  G.events.push({ t: Math.round(clock(G, now)), k: d });
  G.steps++;
  G.stepFrom.push(a);
  G.stepTo.push(b);
  const up = G.tp[G.tip], back = up >= 0 && G.tc[up] === b;
  if (back) G.tip = up;
  else { G.tc.push(b); G.tp.push(G.tip); G.ts.push(G.steps); G.tip = G.tc.length - 1; }
  G.pos = b;
  G.seen[b] = 1;
  const won = b === G.e;
  if (won) { G.el = clock(G, now); G.status = "won"; settle(G); }
  return { moved: true, back, won };
}

/** ชนะแล้ว หาเส้นทางสุดท้ายของผู้เล่น แล้วนับเลี้ยวผิด ก้าวเกิน และทางแยก จากเส้นนั้น
    · เส้นทางสุดท้าย = ปมจากทางเข้าถึงทางออก (ตัดช่วงเดินย้อนกับวาร์ปไปแล้วในตัว) แล้วตัดช่วงที่วนกลับมาช่องเดิมออก
    · ก้าวที่สร้างปมบนเส้นนี้ = ก้าวที่พาไปข้างหน้าจริง มีพอดีเท่าความยาวเส้น ก้าวอื่นทั้งหมดคือก้าวเกิน
      แตะช่องนอกเส้น = หลง · บนเส้นแต่ถอยไปทางทางเข้า = ถอย · ที่เหลือ = เดินซ้ำ · รวมกันเท่าก้าวเกินพอดีเสมอ
    · ก้าวจากช่องบนเส้นไปช่องนอกเส้น = เลี้ยวผิด · ทางแยก = ทางที่แยกออกจากเส้นนี้
    โหมดไม่มีทางวน เส้นนี้คือทางเฉลยเส้นเดียว ตัวเลขทุกตัวเท่าไฟล์เดิม (tests/score.test.ts) */
function settle(G: Game): void {
  const nodes: number[] = [];
  for (let k = G.tip; k >= 0; k = G.tp[k]) nodes.push(k);
  nodes.reverse();
  // ช่องที่ซ้ำในเส้น = เดินวนกลับมา ตัดกลับไปที่ปมแรกของช่องนั้น
  const keep: number[] = [], at = new Map<number, number>();
  for (const k of nodes) {
    const i = at.get(G.tc[k]);
    if (i === undefined) { at.set(G.tc[k], keep.length); keep.push(k); }
    else while (keep.length > i + 1) at.delete(G.tc[keep.pop() as number]);
  }
  const n = G.n, onR = new Uint8Array(n * n), idx = new Int32Array(n * n).fill(-1), fwd = new Uint8Array(G.steps + 1);
  keep.forEach((k, i) => { onR[G.tc[k]] = 1; idx[G.tc[k]] = i; if (i > 0) fwd[G.ts[k]] = 1; });
  G.wrong = G.lost = G.back = G.rewalk = 0;
  G.wrongAt = [];
  G.wrongStep = [];
  for (let i = 0; i < G.steps; i++) {
    const a = G.stepFrom[i], b = G.stepTo[i];
    if (onR[a] && !onR[b]) { G.wrong++; G.wrongAt.push(a); G.wrongStep.push(i + 1); }
    if (fwd[i + 1]) continue;
    if (!onR[a] || !onR[b]) G.lost++;
    else if (idx[b] < idx[a]) G.back++;
    else G.rewalk++;
  }
  let D = 0;
  for (const k of keep) for (const q of openNb(G.tc[k], n, G.R, G.B)) if (!onR[q]) D++;
  G.onRoute = onR;
  G.route = keep.length - 1;
  G.D = D;
}

/** ปักธง (ปักได้ทีละ 1 ธง ปักใหม่ธงย้าย) · ยังไม่เริ่มเดินก็ปักได้ ไม่เริ่มนาฬิกา */
export function setFlag(G: Game, now: number): boolean {
  if (!playing(G)) return false;
  G.flag = G.pos;
  G.flagTip = G.tip;
  G.events.push({ t: Math.round(clock(G, now)), k: "F" });
  return true;
}

/** เอาธงออก (กดปักธงซ้ำตอนมีธงอยู่แล้ว · พี่กันทัก 22 ต.ค. 2569 "ทำไมเรากดธงอีกรอบแล้วธงมันไม่หาย")
    เดิมกดซ้ำ = ย้ายธงมาช่องที่ยืน · ตอนนี้ย้ายธง = กดเอาออกแล้วกดปักใหม่ · บันทึกเป็นเหตุการณ์ X ของใหม่ เกมเก่าที่ F ซ้ำยังเล่นซ้ำได้ผลเดิม */
export function clearFlag(G: Game, now: number): boolean {
  if (!playing(G) || G.flag < 0) return false;
  G.flag = -1;
  G.flagTip = -1;
  G.events.push({ t: Math.round(clock(G, now)), k: "X" });
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
  /** ความยาวเส้นทางสุดท้ายของผู้เล่น · โหมดไม่มีทางวนเท่าทางสั้นสุดเสมอ */
  route: number;
  waste: number;
  D: number;
  W: number;
};

/** คะแนนเต็ม 100 = เส้นทางสุดท้าย ÷ ก้าวที่เดินจริง · มีก้าวเกินแม้ก้าวเดียว สูงสุด 99
    พี่กันเคาะ 22 ต.ค. 2569 *"เอาตามเรา"* ให้นับแค่ก้าว หลงลึกโดนหักหนักควรแล้ว *"ก็คุณไม่ปักธงเอง"*
    ปักธงแล้ววาร์ปกลับ ขากลับไม่นับก้าว ธงจึงช่วยประหยัดคะแนนได้จริง
    เดิม 80% จากทางแยกที่เลือกถูก + 20% จากระยะทาง (ไฟล์เดิม) ส่วน 80% นับจำนวนครั้งที่เลี้ยวผิด ปักธงหรือไม่ก็เท่ากัน
    ทางแยก (D) กับเลี้ยวผิด (W) ยังคิดไว้แสดงบนการ์ดและเก็บลงฐาน แต่ไม่ได้ใช้คิดคะแนนแล้ว */
export function result(G: Game): Result {
  const shortest = G.L, route = G.route, waste = G.steps - route;
  const D = Math.max(1, G.D), W = Math.min(G.wrong, D);
  // คูณ 100 ก่อนหาร · หารก่อนแล้วคูณ ค่าครึ่งพอดีเพี้ยนเป็น .4999 ปัดลงผิด (เส้น 23 ก้าว เดิน 40 ได้ 57 แทน 58 ชุดทดสอบจับได้)
  let score = Math.round(Math.min(100, (100 * route) / Math.max(1, G.steps)));
  if (score >= 100 && waste > 0) score = 99;
  // คำประเมินแบ่งตามคะแนน (เดิมแบ่งตามจำนวนครั้งที่เลี้ยวผิด) · ไม่เลี้ยวผิดเลยแต่มีถอยหรือเดินซ้ำยังขึ้นแบบเดิม
  const grade =
  // ทุกคำลงท้ายด้วย ! (พี่กันสั่ง 22 ต.ค. 2569 "ใส่เครื่องหมาย ! ด้วย" แล้ว "ทำไมไม่เอาใส่ให้ครบ")
    waste <= 0 ? "แม่นยำ ไม่หลงแม้แต่ก้าวเดียว!"
    : W === 0 ? "ไม่เลี้ยวผิด มีเดินถอยเล็กน้อย!"
    : score >= 90 ? "เกือบแม่นยำ เลี้ยวผิดเล็กน้อย!"
    : score >= 75 ? "เก่งมาก!"
    : score >= 55 ? "พอใช้ หลงหลายทาง!"
    : "หลงค่อนข้างมาก ลองใหม่อีกครั้ง!";
  return { score, grade, shortest, route, waste, D, W };
}

/** เล่นซ้ำจากบันทึกการเดิน k เหตุการณ์แรก (ไม่ส่ง k = ทั้งหมด) · ใช้ในตัวดูย้อนและชุดทดสอบ */
/** ช่องที่ปักธงแต่ละครั้ง พร้อมลำดับเหตุการณ์ (ตัวดูย้อนวาดธงจางตรงจุดที่เคยปัก) · เล่นซ้ำแบบเดียวกับ replay */
export function flagSpots(settings: Settings, maze: MazeData, events: GameEvent[]): { i: number; pos: number }[] {
  const G = newGame(settings, maze), out: { i: number; pos: number }[] = [];
  const T0 = 1_000_000;
  events.forEach((ev, i) => {
    const now = T0 + ev.t;
    if (ev.k === "F") { if (setFlag(G, now)) out.push({ i, pos: G.pos }); }
    else if (ev.k === "X") clearFlag(G, now);
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
    else if (ev.k === "X") clearFlag(G, now);
    else if (ev.k === "W") backToFlag(G, now);
    else move(G, ev.k, now);
  }
  if (G.status === "play" && to < events.length) {
    // ยังไม่จบ ตรึงนาฬิกาไว้ที่เหตุการณ์ล่าสุด
    G.el = to > 0 ? events[to - 1].t : 0;
  }
}
