"use client";

import type { Game } from "@/lib/game/state";
import type { SolRun } from "@/lib/game/solAnim";
import { drawArrows, drawWalls, geom, paintSol, tok } from "./paint";

/* ตัววาดกระดานเกมแบบ 2D (ยกจากไฟล์เดิม drawG) ใช้ทั้งหน้าเล่นเกมและตัวดูย้อน
   🔑 รอบหน้าทำ 3D ให้เขียนตัววาดใหม่ที่รับ BoardView ชุดเดียวกัน ตรรกะเกมไม่ต้องแตะ */

export type BoardView = {
  G: Game;
  sol: SolRun | null;
  fog: boolean;
  /** จุดแดงตรงช่องที่เลี้ยวผิด (ตัวดูย้อน) */
  markers?: number[] | null;
  now: number;
  /** ช่องที่เคยปักธงก่อนหน้า วาดเป็นธงจาง (ตัวดูย้อน) · ธงปัจจุบันวาดเต็มจาก G.flag */
  flagSpots?: number[] | null;
  /** ตัวผู้เล่นกะพริบวิบวับ (หน้าเล่นเกมตอนกำลังเล่น · ปิดเมื่อเครื่องตั้งลดการเคลื่อนไหว) */
  pulse?: boolean;
};

/** รอบกะพริบของตัวผู้เล่น มิลลิวินาที */
export const PULSE_MS = 1400;

/** สีโทเค็นแบบ #RRGGBB ใส่ความโปร่ง (ไล่เฉดของไฟฉายต้องใช้สีเดียวกันต่างความโปร่ง) */
function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return hex;
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
}

export function drawGame(ctx: CanvasRenderingContext2D, W: number, v: BoardView): void {
  const { G } = v, n = G.n, { pad, cs } = geom(W, n), E = pad + n * cs;
  const ctr = (c: number): [number, number] => [pad + ((c % n) + 0.5) * cs, pad + (((c / n) | 0) + 0.5) * cs];
  const C = { bg: tok("--surface"), ink: tok("--ink"), acc: tok("--accent"), path: tok("--path"), visit: tok("--visit"), fog: tok("--fog") };
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, W);
  const over = G.status === "won" || G.status === "gaveup", wrongC = tok("--wrong");
  // ช่องที่เดินผ่าน · จบเกมแล้วช่องนอกทางถูก (ทางสั้นสุดเส้นไหนก็ได้) เป็นสีแดงอ่อน
  for (let c = 0; c < n * n; c++)
    if (G.seen[c]) {
      ctx.fillStyle = over && !G.onBest[c] ? wrongC : C.visit;
      ctx.fillRect(pad + (c % n) * cs, pad + ((c / n) | 0) * cs, cs + 0.5, cs + 0.5);
    }
  // เส้นที่ลากตามตัว เดินถอยแล้วหดตาม
  ctx.save();
  // เส้นทึบสีฟ้าน้ำทะเล บางลงนิด คู่กับหัวสีชมพูแบบในไอคอน (พี่กันทัก "สีกับเส้นดูแปลก ๆ ไหม" เดิมโปร่ง 55% ทับช่องฟ้าอ่อนเลยออกฟ้าหม่น)
  ctx.globalAlpha = v.sol ? 0.3 : 1;
  ctx.strokeStyle = C.acc;
  ctx.lineWidth = Math.max(2, cs * 0.2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pad + ((n >> 1) + 0.5) * cs, pad * 0.4);
  for (const c of G.trail) ctx.lineTo(...ctr(c));
  ctx.stroke();
  ctx.restore();
  if (v.sol) paintSol(ctx, v.sol, pad, cs, E, v.now);
  // กำแพงใช้สีของมันเอง โหมดสว่างเท่าสีตัวหนังสือ โหมดมืดเป็นฟ้าสว่าง (พี่กันสั่ง 21 ต.ค. 2569 "ลองเปลี่ยนจากสีขาวเป็นสีสว่างโทนฟ้า")
  drawWalls(ctx, n, G.R, G.B, G.maze.ex, pad, cs, tok("--wall"));
  if (v.markers && v.markers.length) {
    ctx.fillStyle = tok("--wrong-dot");
    for (const c of v.markers) {
      const [x, y] = ctr(c);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2.5, cs * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ตัวผู้เล่นที่หัวเส้น สีชมพูเดียวกับจุดในไอคอนเว็บ (พี่กันสั่ง 21 ต.ค. 2569 "เปลี่ยนสีหัวเป็นสีเดียวกันกับ icon")
  const [px, py] = ctr(G.pos);
  const pr = Math.max(3, cs * 0.32), playerC = tok("--player");
  // วงแสงขยายออกแล้วจางหาย วนทุก 1.4 วินาที ตัวจุดพองขึ้นนิดเดียว (พี่กันสั่ง 21 ต.ค. 2569 "ขอกะพริบวิบวับนิด ๆ")
  const ph = v.pulse && !over ? (v.now % PULSE_MS) / PULSE_MS : -1;
  if (ph >= 0) {
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - ph);
    ctx.strokeStyle = playerC;
    ctx.lineWidth = Math.max(1.5, cs * 0.09);
    ctx.beginPath();
    ctx.arc(px, py, pr * (1.05 + 0.75 * ph), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = playerC;
  ctx.beginPath();
  ctx.arc(px, py, ph >= 0 ? pr * (1 + 0.07 * Math.sin(ph * Math.PI * 2)) : pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.bg;
  ctx.lineWidth = Math.max(1, cs * 0.07);
  ctx.stroke();
  // โหมดไฟฉาย มองเห็นแค่วงรอบตัว รัศมี max(3.2 ช่อง, 36px) · ธงมองเห็นทะลุความมืด (วาดทีหลัง)
  // แสงค่อย ๆ จางเข้าความมืดแบบไฟฉายจริง มีขอบแสงฟ้าจาง ๆ (พี่กันสั่ง 21 ต.ค. 2569 "โหมดนี้ขอสวยกว่านี้" เดิมเป็นวงตัดขาดมีแถบเทาคั่น)
  if (v.fog && !over) {
    const r = Math.max(cs * 3.2, 36);
    const beam = ctx.createRadialGradient(px, py, r * 0.5, px, py, r * 1.1);
    beam.addColorStop(0, alpha(C.fog, 0));
    beam.addColorStop(0.45, alpha(C.fog, 0.45));
    beam.addColorStop(0.8, alpha(C.fog, 0.9));
    beam.addColorStop(1, alpha(C.fog, 1));
    ctx.save();
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, W, W);
    ctx.strokeStyle = alpha(C.acc, 0.22);
    ctx.lineWidth = Math.max(2, cs * 0.14);
    ctx.beginPath();
    ctx.arc(px, py, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const flagAt = (c: number, op: number) => {
    const [fx, fy] = ctr(c), h = Math.max(10, cs * 0.7), w = h * 0.55, lx = fx - w * 0.35, top = fy - h * 0.55;
    ctx.save();
    ctx.globalAlpha = op;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(1.5, h * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx, top + h); ctx.stroke();
    ctx.fillStyle = tok("--front");
    ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx + w, top + h * 0.22); ctx.lineTo(lx, top + h * 0.44); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = Math.max(1, h * 0.05);
    ctx.stroke();
    ctx.restore();
  };
  // จุดที่เคยปักธงก่อนหน้าเป็นธงจาง ธงที่ปักอยู่ตอนนี้เต็ม (พี่กันสั่ง 21 ต.ค. 2569 "ใส่จุดที่วางธงด้วย")
  if (v.flagSpots) for (const c of new Set(v.flagSpots)) if (c !== G.flag) flagAt(c, 0.45);
  if (G.flag >= 0) flagAt(G.flag, 1);
  // ลูกศรทางออกกะพริบขึ้นลงเฉพาะตอนกำลังเล่น จังหวะ 0.9 วินาที คนละแบบกับวงแสงของตัวผู้เล่น
  drawArrows(ctx, n, G.maze.ex, pad, cs, C.acc, C.path, v.pulse && !over ? (v.now % 900) / 900 : undefined);
}

/** ช่องที่นิ้วชี้อยู่ · ต้องอยู่ในโซนกลางของช่อง (ห่างจากกลางไม่เกิน 35%) กันนิ้วสั่นตรงแนวกำแพง */
export function cellAt(cv: HTMLCanvasElement, n: number, clientX: number, clientY: number): number {
  const r = cv.getBoundingClientRect(), { pad, cs } = geom(r.width, n);
  const fx = (clientX - r.left - pad) / cs, fy = (clientY - r.top - pad) / cs, x = Math.floor(fx), y = Math.floor(fy);
  if (x < 0 || y < 0 || x >= n || y >= n) return -1;
  if (Math.abs(fx - x - 0.5) > 0.35 || Math.abs(fy - y - 0.5) > 0.35) return -1;
  return y * n + x;
}
