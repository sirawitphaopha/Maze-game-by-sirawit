"use client";

import type { SolRun } from "@/lib/game/solAnim";

/* ตัวช่วยวาดบน canvas ที่ใช้ร่วมห้องทดลอง เกม ตัวดูย้อน (ยกจากไฟล์เดิม)
   สีทุกสีอ่านจากโทเค็นใน :root ทุกครั้งที่วาด ธีมเปลี่ยนแล้ววาดใหม่ได้สีถูก */

export function tok(v: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

/** ตั้งขนาด canvas ตามจอกับความละเอียดของจอ · คืนความกว้างที่ใช้วาด (หน่วย CSS px) */
export function fitCanvas(cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D): number {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 400;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return W;
}

export function geom(W: number, n: number) {
  // ขอบในตัวกระดาน พอให้ลูกศรทางเข้าออกไม่ล้น (พี่กันสั่ง 21 ต.ค. 2569 "ลดขอบกว่านี้" เดิม 4% อย่างน้อย 14)
  const pad = Math.max(10, W * 0.024);
  return { pad, cs: (W - 2 * pad) / n };
}

/** กำแพงทั้งกระดาน ขอบนอก ช่องทางเข้าออก */
export function drawWalls(ctx: CanvasRenderingContext2D, n: number, R: Uint8Array, B: Uint8Array, ex: number, pad: number, cs: number, ink: string): void {
  const N = n * n, E = pad + n * cs;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.min(3, Math.max(1, cs * 0.12));
  ctx.lineCap = "square";
  ctx.beginPath();
  for (let c = 0; c < N; c++) {
    const x = pad + (c % n) * cs, y = pad + ((c / n) | 0) * cs;
    if (R[c] && c % n < n - 1) { ctx.moveTo(x + cs, y); ctx.lineTo(x + cs, y + cs); }
    if (B[c] && c < N - n) { ctx.moveTo(x, y + cs); ctx.lineTo(x + cs, y + cs); }
  }
  const g0 = pad + (n >> 1) * cs, b0 = pad + ex * cs;
  ctx.moveTo(pad, pad); ctx.lineTo(g0, pad); ctx.moveTo(g0 + cs, pad); ctx.lineTo(E, pad);
  ctx.moveTo(pad, E); ctx.lineTo(b0, E); ctx.moveTo(b0 + cs, E); ctx.lineTo(E, E);
  ctx.moveTo(pad, pad); ctx.lineTo(pad, E); ctx.moveTo(E, pad); ctx.lineTo(E, E);
  ctx.stroke();
}

/** ลูกศรทางเข้า (บน) กับทางออก (ล่าง) ชี้ลงทั้งคู่ ขนาดเท่ากัน
    (พี่กันสั่ง 21 ต.ค. 2569 "อันนี้ขอใหญ่ขึ้น และกะพริบ ที่กะพริบไม่เหมือนหัววงกลม"
    แล้วทักว่าหน้าห้องทดลอง "ตัวลูกศรชมพูที่เป็นทางเข้าออกทำไมไม่ขยับ และไม่ใหญ่ตามที่เคยสั่ง" จึงทำทั้งสองลูกศรทุกกระดาน)
    ใช้ขอบกระดานเต็มความสูง และล้ำเข้าช่องทางเข้าออกได้ 15% ของช่อง ซึ่งยังไม่ถึงตัวผู้เล่น (ตัวผู้เล่นห่างขอบช่อง 18%)
    phase 0 ถึง 1 = ขยับขึ้นลงพร้อมจางสลับ · ไม่ส่ง = นิ่ง (จบเกมแล้ว หรือเครื่องตั้งลดการเคลื่อนไหว) */
export function drawArrows(ctx: CanvasRenderingContext2D, n: number, ex: number, pad: number, cs: number, inColor: string, outColor: string, phase?: number): void {
  const E = pad + n * cs, tx = pad + (n >> 1) * cs + cs / 2, bx = pad + ex * cs + cs / 2;
  const span = pad + cs * 0.15, amp = Math.max(1.5, span * 0.1), h = Math.min(span - 2 * amp - 1, 24), hw = h * 0.9;
  const wave = phase === undefined ? 0 : Math.sin(phase * Math.PI * 2), bob = wave * amp;
  const tip = span - amp - 1 + bob, base = E - cs * 0.15 + amp + bob;
  ctx.save();
  ctx.globalAlpha = phase === undefined ? 1 : 0.775 + 0.225 * wave;
  ctx.fillStyle = inColor;
  ctx.beginPath(); ctx.moveTo(tx - hw, tip - h); ctx.lineTo(tx + hw, tip - h); ctx.lineTo(tx, tip); ctx.fill();
  ctx.fillStyle = outColor;
  ctx.beginPath(); ctx.moveTo(bx - hw, base); ctx.lineTo(bx + hw, base); ctx.lineTo(bx, base + h); ctx.fill();
  ctx.restore();
}

/** วาดแอนิเมชันเฉลย ณ เวลา now (ยกจากไฟล์เดิม paintSol) */
export function paintSol(ctx: CanvasRenderingContext2D, S: SolRun, pad: number, cs: number, E: number, now: number): void {
  const el = now - S.t0, n = S.n, ctr = (c: number): [number, number] => [pad + ((c % n) + 0.5) * cs, pad + (((c / n) | 0) + 0.5) * cs];
  let dcur = S.D, fade = 1;
  if (!S.done) { if (el < S.dur) { dcur = (el / S.dur) * S.D; fade = 0; } else fade = Math.min(1, (el - S.dur) / 600); }
  const pal = [tok("--path"), tok("--b1"), tok("--b2"), tok("--b3"), tok("--b4")], paths = pal.map(() => new Path2D());
  const top: [number, number] = [pad + ((n >> 1) + 0.5) * cs, pad * 0.4];
  paths[0].moveTo(top[0], top[1]);
  paths[0].lineTo(...ctr(S.s));
  for (const [a, b, c, d] of S.edges) {
    if (d > dcur + 1) break;
    const f = Math.min(1, dcur - (d - 1));
    if (f <= 0) continue;
    const p = ctr(a), t = ctr(b);
    paths[c].moveTo(p[0], p[1]);
    paths[c].lineTo(p[0] + (t[0] - p[0]) * f, p[1] + (t[1] - p[1]) * f);
  }
  if (dcur >= S.De) { const ex = ctr(S.e); paths[0].moveTo(ex[0], ex[1]); paths[0].lineTo(ex[0], E + pad * 0.6); }
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.globalAlpha = 0.9 - 0.5 * fade;
  ctx.lineWidth = Math.max(1.5, cs * 0.22);
  for (let i = 1; i < 5; i++) { ctx.strokeStyle = pal[i]; ctx.stroke(paths[i]); }
  const hit = dcur >= S.De ? Math.min(1, (dcur - S.De) / 6 + 0.4) : 0;
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = Math.max(2, cs * (0.3 + 0.1 * Math.max(fade, hit)));
  ctx.strokeStyle = pal[0];
  ctx.stroke(paths[0]);
  ctx.restore();
}

/** แอนิเมชันเฉลยวิ่งจบแล้วหรือยัง (รวมช่วงจางลง 0.6 วินาที) */
export const solFinished = (S: SolRun, now: number) => S.done || now - S.t0 > S.dur + 700;

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
