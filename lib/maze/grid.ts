import { rnd, shuffle } from "./rng.ts";

/* ════════════════════════════════════════════════════════════════════
   ตารางเขาวงกตกับฟังก์ชันพื้นฐาน (ยกจากไฟล์เดิม ก้อนที่ 1)

   กระดาน n × n · ช่อง c = y * n + x
   R[c] = 1 มีกำแพงด้านขวาของช่อง c · B[c] = 1 มีกำแพงด้านล่างของช่อง c
   ขอบนอกกระดานวาดเสมอ ไม่เก็บในอาร์เรย์
   ทางเข้า = ช่อง n >> 1 แถวบนสุด · ทางออก = ช่องแถวล่างสุดที่คอลัมน์ ex

   เปลี่ยนจากไฟล์เดิมจุดเดียว: countChoices นับจากความลึกที่เดินเข้าไปได้ (บั๊กข้อ 4 ดู docs/AUDIT-2026-10-21.md)
   ════════════════════════════════════════════════════════════════════ */

export type Op =
  | ["c", number, number, number[]?]
  | ["m", number]
  | ["u", number]
  | ["h", number]
  | ["w", number, number]
  | ["r", number, number?, number?, number?]
  | ["wp", number]
  | ["wt", number]
  | ["wx"];

export type GenResult = { ops: Op[]; open?: boolean; walk?: number };

export type Walls = { R: Uint8Array; B: Uint8Array };

/** ช่องข้างเคียงทั้ง 4 ทิศที่อยู่ในกระดาน ไม่สนกำแพง */
export function neighbors(c: number, n: number): number[] {
  const x = c % n, y = (c / n) | 0, a: number[] = [];
  if (y > 0) a.push(c - n);
  if (x < n - 1) a.push(c + 1);
  if (y < n - 1) a.push(c + n);
  if (x > 0) a.push(c - 1);
  return a;
}

/** ช่องข้างเคียงที่เดินไปได้จริง */
export function openNb(c: number, n: number, R: Uint8Array, B: Uint8Array): number[] {
  const x = c % n, y = (c / n) | 0, a: number[] = [];
  if (x < n - 1 && !R[c]) a.push(c + 1);
  if (x > 0 && !R[c - 1]) a.push(c - 1);
  if (y < n - 1 && !B[c]) a.push(c + n);
  if (y > 0 && !B[c - n]) a.push(c - n);
  return a;
}

/** ทุบกำแพงระหว่าง a กับ b (a < 0 ไม่ทำอะไร) */
export function carve(R: Uint8Array, B: Uint8Array, a: number, b: number): void {
  if (a < 0) return;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  if (hi - lo === 1) R[lo] = 0;
  else B[lo] = 0;
}

/** สร้างกำแพงระหว่าง a กับ b */
export function wall(R: Uint8Array, B: Uint8Array, a: number, b: number): void {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  if (hi - lo === 1) R[lo] = 1;
  else B[lo] = 1;
}

/** สร้างกำแพงจริงจากผลของตัวสร้าง */
export function build(n: number, g: GenResult): Walls {
  const N = n * n, R = new Uint8Array(N).fill(g.open ? 0 : 1), B = new Uint8Array(N).fill(g.open ? 0 : 1);
  for (const o of g.ops) {
    if (o[0] === "c") carve(R, B, o[1], o[2]);
    else if (o[0] === "w") wall(R, B, o[1], o[2]);
  }
  return { R, B };
}

export function ufFind(par: Int32Array, a: number): number {
  while (par[a] !== a) {
    par[a] = par[par[a]];
    a = par[a];
  }
  return a;
}

/** ทุบทางตันให้กลายเป็นทางวน ตามโอกาส p */
export function braidOps(n: number, R: Uint8Array, B: Uint8Array, p: number): Op[] {
  if (p <= 0) return [];
  const ops: Op[] = [], s = n >> 1, e = n * (n - 1) + (n >> 1);
  const deg = (c: number) => openNb(c, n, R, B).length + (c === s || c === e ? 1 : 0);
  for (const c of shuffle([...Array(n * n).keys()])) {
    if (deg(c) !== 1 || Math.random() >= p) continue;
    const op = openNb(c, n, R, B), closed = neighbors(c, n).filter((q) => !op.includes(q));
    if (!closed.length) continue;
    const de = closed.filter((q) => deg(q) === 1), pool = de.length ? de : closed, q = pool[rnd(pool.length)];
    carve(R, B, c, q);
    ops.push(["c", c, q]);
  }
  return ops;
}

/** จำนวนวง = จำนวนช่องเปิด ลบ (n² − 1) · เขาวงกตสมบูรณ์ได้ 0 */
export function countLoops(n: number, R: Uint8Array, B: Uint8Array): number {
  let e = 0;
  for (let c = 0; c < n * n; c++) {
    if (c % n < n - 1 && !R[c]) e++;
    if (c < n * n - n && !B[c]) e++;
  }
  return e - (n * n - 1);
}

/** ระยะเดินจากช่อง src ไปทุกช่อง (การค้นแบบกระจายทีละชั้น) · ไปไม่ถึง = -1 */
export function distFrom(n: number, R: Uint8Array, B: Uint8Array, src: number): Int32Array {
  const d = new Int32Array(n * n).fill(-1);
  d[src] = 0;
  const q = [src];
  let h = 0;
  while (h < q.length) {
    const c = q[h++];
    for (const t of openNb(c, n, R, B)) if (d[t] < 0) { d[t] = d[c] + 1; q.push(t); }
  }
  return d;
}

/** ทางสั้นที่สุด คืน path เรียงจากทางออกย้อนไปทางเข้า · far = ย้ายทางออกไปช่องแถวล่างที่ไกลที่สุด */
export function solve(n: number, R: Uint8Array, B: Uint8Array, far = false): { path: number[]; ex: number } {
  const s = n >> 1, prev = new Int32Array(n * n).fill(-1), dist = new Int32Array(n * n);
  prev[s] = s;
  const q = [s];
  let h = 0;
  while (h < q.length) {
    const c = q[h++];
    for (const t of openNb(c, n, R, B)) if (prev[t] < 0) { prev[t] = c; dist[t] = dist[c] + 1; q.push(t); }
  }
  let ex = n >> 1;
  if (far) for (let x = 0; x < n; x++) if (dist[n * (n - 1) + x] > dist[n * (n - 1) + ex]) ex = x;
  const e = n * (n - 1) + ex, p: number[] = [];
  let c = e;
  while (c !== s) { p.push(c); c = prev[c]; }
  p.push(s);
  return { path: p, ex };
}

/** นับทางตัน (ช่องที่มีทางเปิดทางเดียว นับทางเข้าออกเป็นทางเปิดด้วย) */
export function deadEnds(n: number, R: Uint8Array, B: Uint8Array, ex = n >> 1): number {
  const s = n >> 1, e = n * (n - 1) + ex;
  let d = 0;
  for (let c = 0; c < n * n; c++) {
    let k = openNb(c, n, R, B).length;
    if (c === s || c === e) k++;
    if (k === 1) d++;
  }
  return d;
}

/** ทางหลอกยาวบนทางเฉลย
    ทุกช่องบนทางเฉลย ดูทุกทางเปิดที่ออกนอกทางเฉลย นับเป็น 1 ถ้าเดินเข้าไปได้ลึกอย่างน้อย minLen ช่อง โดยไม่เดินกลับเข้าทางเฉลย
    🔴 ความลึก = ระยะเดินจากปากทางเข้าไป (นับปากทางเป็นช่องที่ 1) ไม่ใช่จำนวนช่องรวมในกิ่ง
       ไฟล์เดิมนับจำนวนช่องรวม กิ่งที่แตกเป็นซอกสั้นหลายซอกจึงถูกนับเป็นทางหลอกยาว ไม่ตรงกับเอกสารหัวข้อ 6 (บั๊กข้อ 4) */
export function countChoices(n: number, R: Uint8Array, B: Uint8Array, path: number[], minLen: number): number {
  const on = new Uint8Array(n * n);
  for (const c of path) on[c] = 1;
  let cnt = 0;
  const depth = new Int32Array(n * n);
  const mark: number[] = [];
  for (const c of path) {
    for (const q of openNb(c, n, R, B)) {
      if (on[q]) continue;
      // กระจายทีละชั้นจากปากทาง หยุดทันทีที่ลึกถึง minLen
      for (const m of mark) depth[m] = 0;
      mark.length = 0;
      depth[q] = 1;
      mark.push(q);
      const qu = [q];
      let h = 0, deep = 1;
      while (h < qu.length && deep < minLen) {
        const x = qu[h++];
        for (const y of openNb(x, n, R, B)) {
          if (y === c || on[y] || depth[y]) continue;
          depth[y] = depth[x] + 1;
          mark.push(y);
          if (depth[y] > deep) deep = depth[y];
          qu.push(y);
        }
      }
      if (deep >= minLen) cnt++;
    }
  }
  for (const m of mark) depth[m] = 0;
  return cnt;
}

/** ซอกตันสั้น จากปลายตันทุกช่อง เดินย้อนจนถึงจุดแยก ถ้ายาวไม่ถึง L นับเป็น 1 */
export function shortStubs(n: number, R: Uint8Array, B: Uint8Array, L: number): number {
  const s = n >> 1, e = n * (n - 1) + (n >> 1);
  let k = 0;
  const deg = (c: number) => openNb(c, n, R, B).length + (c === s || c === e ? 1 : 0);
  for (let tip = 0; tip < n * n; tip++) {
    if (tip === s || tip === e || deg(tip) !== 1) continue;
    let len = 1, prev = -1, cur = tip;
    while (len < L) {
      const nx = openNb(cur, n, R, B).filter((q) => q !== prev);
      if (nx.length !== 1) break;
      const q = nx[0];
      if (deg(q) >= 3 || q === s || q === e) break;
      len++;
      prev = cur;
      cur = q;
    }
    if (len < L) k++;
  }
  return k;
}

/** เก็บกวาดซอกตันสั้น ย้ายไปต่อกับปลายตันของซอกอื่นให้เป็นทางหลอกยาว · เขาวงกตยังสมบูรณ์ */
export function cleanStubs(n: number, R: Uint8Array, B: Uint8Array, L: number): Op[] {
  const s = n >> 1, e = n * (n - 1) + (n >> 1), ops: Op[] = [];
  const deg = (c: number) => openNb(c, n, R, B).length + (c === s || c === e ? 1 : 0);
  const walk = (tip: number): { cells: number[]; j: number } | null => {
    const cells = [tip];
    let prev = -1, cur = tip;
    while (true) {
      const nx = openNb(cur, n, R, B).filter((q) => q !== prev);
      if (nx.length !== 1) return null;
      const q = nx[0];
      if (deg(q) >= 3) return { cells, j: q };
      if (q === s || q === e) return null;
      cells.push(q);
      prev = cur;
      cur = q;
    }
  };
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    const tips: number[] = [];
    for (let c = 0; c < n * n; c++) if (c !== s && c !== e && deg(c) === 1) tips.push(c);
    for (const tip of shuffle(tips)) {
      if (deg(tip) !== 1) continue;
      const st = walk(tip);
      if (!st || st.cells.length >= L) continue;
      const set = new Set(st.cells), root = st.cells[st.cells.length - 1], cand: [number, number][] = [];
      for (const c of st.cells)
        for (const q of neighbors(c, n)) if (!set.has(q) && q !== st.j && q !== s && q !== e && deg(q) === 1) cand.push([c, q]);
      if (!cand.length) continue;
      const [c, q] = cand[rnd(cand.length)];
      wall(R, B, root, st.j);
      carve(R, B, c, q);
      ops.push(["w", root, st.j], ["c", c, q]);
      changed = true;
    }
    if (!changed) break;
  }
  return ops;
}
