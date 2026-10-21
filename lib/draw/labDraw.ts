"use client";

import type { Op } from "@/lib/maze/grid";
import { carve, ufFind, wall } from "@/lib/maze/grid";
import type { SolRun } from "@/lib/game/solAnim";
import { drawArrows, drawWalls, geom, paintSol, tok } from "./paint";

/* สถานะกับตัววาดของแท็บห้องทดลอง (ยกจากไฟล์เดิม step · draw) · แอนิเมชันตอนสร้างทีละขั้น */

export type LabState = {
  n: number;
  ops: Op[];
  fin: { R: Uint8Array; B: Uint8Array };
  path: number[];
  ex: number;
  R: Uint8Array;
  B: Uint8Array;
  vis: Uint8Array;
  front: Uint8Array;
  cur: number;
  wk: number[];
  hunt: number;
  room: number[] | null;
  par: Int32Array | null;
  sz: Int32Array | null;
  i: number;
  done: boolean;
};

export function labStep(s: LabState, o: Op): void {
  const t = o[0];
  if (t === "c") {
    const a = o[1], b = o[2];
    if (a >= 0) {
      carve(s.R, s.B, a, b);
      s.vis[a] = 1;
      if (s.par && s.sz) { const ra = ufFind(s.par, a), rb = ufFind(s.par, b); if (ra !== rb) { s.par[ra] = rb; s.sz[rb] += s.sz[ra]; } }
    }
    s.vis[b] = 1; s.front[b] = 0; s.cur = b;
    if (o[3]) for (const q of o[3]) s.front[q] = 1;
  } else if (t === "m") { s.cur = o[1]; s.vis[o[1]] = 1; }
  else if (t === "u") s.front[o[1]] = 0;
  else if (t === "h") s.hunt = o[1];
  else if (t === "w") wall(s.R, s.B, o[1], o[2]);
  else if (t === "r") s.room = o[1] < 0 ? null : (o.slice(1) as number[]);
  else if (t === "wp") { s.wk.push(o[1]); s.cur = o[1]; }
  else if (t === "wt") { s.wk.length = o[1]; s.cur = s.wk[s.wk.length - 1]; }
  else if (t === "wx") s.wk = [];
}

export function labFinish(s: LabState): void {
  s.R = s.fin.R; s.B = s.fin.B; s.done = true; s.cur = -1; s.wk = []; s.hunt = -1; s.room = null;
}

export function drawLab(ctx: CanvasRenderingContext2D, W: number, s: LabState, sol: SolRun | null, now: number, pulse = false): void {
  const n = s.n, { pad, cs } = geom(W, n), N = n * n, cx = (c: number) => pad + (c % n) * cs, cy = (c: number) => pad + ((c / n) | 0) * cs;
  const C = { paper: tok("--surface"), ink: tok("--ink"), visit: tok("--visit"), front: tok("--front"), cur: tok("--cur"), path: tok("--path") };
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, W);
  if (!s.done) {
    if (s.room) { const [x, y, w, h] = s.room; ctx.fillStyle = tok("--room"); ctx.fillRect(pad + x * cs, pad + y * cs, w * cs, h * cs); }
    if (s.par && s.sz) {
      const S = tok("--set-s"), L = tok("--set-l");
      for (let c = 0; c < N; c++) {
        if (!s.vis[c]) continue;
        const r = ufFind(s.par, c);
        ctx.fillStyle = s.sz[r] > 1 ? `hsl(${(r * 137.508) % 360} ${S} ${L})` : C.visit;
        ctx.fillRect(cx(c), cy(c), cs + 0.5, cs + 0.5);
      }
    } else
      for (let c = 0; c < N; c++) {
        if (s.front[c]) { ctx.fillStyle = tok("--frontier"); ctx.fillRect(cx(c), cy(c), cs + 0.5, cs + 0.5); }
        else if (s.vis[c]) { ctx.fillStyle = C.visit; ctx.fillRect(cx(c), cy(c), cs + 0.5, cs + 0.5); }
      }
    if (s.hunt >= 0) { ctx.fillStyle = tok("--hunt"); ctx.fillRect(pad, pad + s.hunt * cs, n * cs, cs); }
    if (s.wk.length) {
      ctx.save();
      ctx.strokeStyle = tok("--b2"); ctx.lineWidth = Math.max(2, cs * 0.34); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      s.wk.forEach((c, i) => { const x = cx(c) + cs / 2, y = cy(c) + cs / 2; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.restore();
    }
    if (s.cur >= 0) { ctx.fillStyle = C.cur; ctx.fillRect(cx(s.cur) + cs * 0.15, cy(s.cur) + cs * 0.15, cs * 0.7, cs * 0.7); }
  }
  if (s.done && sol && sol.n === n) paintSol(ctx, sol, pad, cs, pad + n * cs, now);
  // กำแพงสีเดียวกับกระดานเกม น้ำเงินเข้ม ธีมมืดฟ้าสว่าง (พี่กันทัก "หน้าทดลอง สีเส้นยังดำอยู่เลย")
  drawWalls(ctx, n, s.R, s.B, s.ex, pad, cs, tok("--wall"));
  drawArrows(ctx, n, s.ex, pad, cs, C.path, C.path, pulse ? (now % 900) / 900 : undefined);
}
