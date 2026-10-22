import type { MazeData } from "./level.ts";
import type { EventKind, GameEvent } from "./state.ts";

/* ════════════════════════════════════════════════════════════════════
   แพ็กผังกำแพงกับบันทึกการเดินเป็นข้อความสั้น สำหรับเก็บลงฐาน

   ผังกำแพง: ทุกช่องมี 2 บิต (กำแพงขวา กำแพงล่าง) เรียงเป็นไบต์แล้วแปลงเป็น base64url
             40 × 40 = 3,200 บิต = 400 ไบต์ = ราว 540 ตัวอักษร · 60 × 60 ราว 1,200 ตัวอักษร
   บันทึกการเดิน: เหตุการณ์ละ "ตัวอักษรชนิด + เวลาห่างจากเหตุการณ์ก่อน (มิลลิวินาที เลขฐาน 36)"
             เช่น U0R1kD2a · ชนิด U D L R = เดิน · F = ปักธง · W = วาร์ปกลับธง

   🔴 เก็บผังจริง ไม่เก็บรหัสสุ่ม เพราะแก้วิธีสร้างทีหลัง รหัสเดิมจะได้ด่านคนละแบบ ประวัติจะดูย้อนไม่ได้
   ════════════════════════════════════════════════════════════════════ */

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToB64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : 0, c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const v = (a << 16) | (b << 8) | c;
    out += B64[(v >> 18) & 63] + B64[(v >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(v >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[v & 63];
  }
  return out;
}

function b64ToBytes(s: string, len: number): Uint8Array | null {
  const out = new Uint8Array(len);
  let bits = 0, acc = 0, o = 0;
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      if (o < len) out[o++] = (acc >> bits) & 255;
    }
  }
  return o === len ? out : null;
}

export function packWalls(m: MazeData): string {
  const N = m.n * m.n, bytes = new Uint8Array(Math.ceil((N * 2) / 8));
  for (let c = 0; c < N; c++) {
    if (m.R[c]) bytes[(c * 2) >> 3] |= 1 << ((c * 2) & 7);
    if (m.B[c]) bytes[(c * 2 + 1) >> 3] |= 1 << ((c * 2 + 1) & 7);
  }
  return bytesToB64(bytes);
}

/** แกะผังกำแพง · ข้อมูลเสีย = null */
export function unpackWalls(n: number, ex: number, s: string): MazeData | null {
  if (!Number.isInteger(n) || n < 5 || n > 60 || !Number.isInteger(ex) || ex < 0 || ex >= n) return null;
  const N = n * n, bytes = b64ToBytes(s, Math.ceil((N * 2) / 8));
  if (!bytes) return null;
  const R = new Uint8Array(N), B = new Uint8Array(N);
  for (let c = 0; c < N; c++) {
    R[c] = (bytes[(c * 2) >> 3] >> ((c * 2) & 7)) & 1;
    B[c] = (bytes[(c * 2 + 1) >> 3] >> ((c * 2 + 1) & 7)) & 1;
  }
  return { n, R, B, ex };
}

/* 🔴 ชนิดเหตุการณ์ต้องเป็นตัวพิมพ์ใหญ่ เพราะเลขฐาน 36 ใช้ตัวพิมพ์เล็ก a ถึง z
   เดิมใช้ u d l r ตัวพิมพ์เล็ก ไปซ้ำกับเลขเวลา (เช่น r1l) แกะกลับแล้วเพี้ยน ชุดทดสอบจับได้ 21 ต.ค. 2569 */
const KIND_CHAR: Record<EventKind, string> = { u: "U", d: "D", l: "L", r: "R", F: "F", X: "X", W: "W" };
const CHAR_KIND: Record<string, EventKind> = { U: "u", D: "d", L: "l", R: "r", F: "F", X: "X", W: "W" };

export function packMoves(events: GameEvent[]): string {
  let out = "", prev = 0;
  for (const ev of events) {
    const dt = Math.max(0, Math.round(ev.t - prev));
    out += KIND_CHAR[ev.k] + dt.toString(36);
    prev = Math.max(prev, ev.t);
  }
  return out;
}

/** แกะบันทึกการเดิน · ข้อมูลเสีย = null */
export function unpackMoves(s: string): GameEvent[] | null {
  if (!/^(?:[UDLRFXW][0-9a-z]+)*$/.test(s)) return null;
  const out: GameEvent[] = [];
  let t = 0;
  for (const m of s.matchAll(/([UDLRFXW])([0-9a-z]+)/g)) {
    t += parseInt(m[2], 36);
    out.push({ t, k: CHAR_KIND[m[1]] });
  }
  return out;
}
