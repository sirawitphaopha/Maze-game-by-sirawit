import { packWalls, unpackWalls, packMoves, unpackMoves } from "file:///C:/Users/PKH/maze-lab/lib/game/encode.ts";
let bad = 0, n0 = 0;
for (let n = 5; n <= 60; n++) for (let k = 0; k < 40; k++) {
  const N = n * n, R = new Uint8Array(N), B = new Uint8Array(N);
  const p = Math.random();
  for (let c = 0; c < N; c++) { R[c] = Math.random() < p ? 1 : 0; B[c] = Math.random() < p ? 1 : 0; }
  const ex = (Math.random() * n) | 0, s = packWalls({ n, R, B, ex }), m = unpackWalls(n, ex, s);
  n0++;
  if (!m || m.R.join() !== R.join() || m.B.join() !== B.join() || m.ex !== ex) { bad++; console.log("ผังไม่ตรง n=", n); }
  if (s.length > 2000) { bad++; console.log("ผังยาวเกิน 2000", n, s.length); }
  // ตัดท้ายหนึ่งตัวต้องปฏิเสธ
  if (unpackWalls(n, ex, s.slice(0, -1))) { bad++; console.log("ผังขาดท้ายแต่ยังรับ n=", n); }
}
const kinds = ["u", "d", "l", "r", "F", "W"] as const;
for (let k = 0; k < 20000; k++) {
  let t = 0; const ev: any[] = [];
  const len = (Math.random() * 60) | 0;
  for (let i = 0; i < len; i++) { t += Math.random() < 0.2 ? 0 : Math.round(Math.random() ** 4 * 4e6); ev.push({ t, k: kinds[(Math.random() * 6) | 0] }); }
  const s = packMoves(ev), back = unpackMoves(s);
  if (!back || back.length !== ev.length || back.some((e, i) => e.t !== ev[i].t || e.k !== ev[i].k)) { bad++; if (bad < 10) console.log("บันทึกไม่ตรง", s); }
}
// ข้อมูลเสียต้องได้ null ไม่โยนข้อผิดพลาด
for (const s of ["u1", "U", "U1x", "U-1", "U1.5", "หนึ่ง", "U1 D2", "\u0000"]) { try { const r = unpackMoves(s); if (r) { bad++; console.log("รับข้อมูลเสีย", JSON.stringify(s)); } } catch (e) { bad++; console.log("โยนข้อผิดพลาด", s); } }
for (const s of ["", "!!!!", "ก".repeat(30)]) { try { if (unpackWalls(10, 5, s)) { bad++; console.log("รับผังเสีย", s); } } catch { bad++; } }
console.log(`ผัง ${n0} ชุด · บันทึกการเดิน 20000 ชุด · ผิด ${bad}`);
// ความยาวสูงสุดจริง 60 × 60
const N = 3600; console.log("ผัง 60 × 60 ยาว", packWalls({ n: 60, R: new Uint8Array(N).fill(1), B: new Uint8Array(N).fill(1), ex: 0 }).length, "ตัวอักษร");
