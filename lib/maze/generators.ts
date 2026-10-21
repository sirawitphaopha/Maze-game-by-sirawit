import type { GenResult, Op } from "./grid.ts";
import { neighbors } from "./grid.ts";
import { rnd, shuffle } from "./rng.ts";

/* ════════════════════════════════════════════════════════════════════
   วิธีสร้างเขาวงกต 11 วิธี พร้อมตัวปรับตามนิสัย (ยกจากไฟล์เดิม ก้อนที่ 1 ไม่เปลี่ยนตรรกะ)
   รายละเอียดแต่ละวิธีอยู่ใน docs/maze-lab-spec.md หัวข้อ 4

   เปลี่ยนจากไฟล์เดิมจุดเดียว: คำอธิบาย Growing Tree ตัดท่อน "แท็บเล่นเกมก็ใช้ตัวนี้" (บั๊กข้อ 3)
   เพราะเกมใช้ Wilson เป็นค่าเริ่มแล้วตั้งแต่เอกสารประวัติข้อ 2
   ════════════════════════════════════════════════════════════════════ */

export type AlgoId =
  | "dfs" | "hunt" | "growing" | "prim" | "kruskal" | "ab" | "wilson" | "binary" | "sidewinder" | "eller" | "division";
export type GroupId = "long" | "bushy" | "fair" | "row" | "wall";

// full = ชื่อเต็มของวิธีที่ชื่อเป็นตัวย่อ แสดงในวงเล็บข้างชื่อบนการ์ดขวาของห้องทดลอง (พี่กันสั่ง "ถ้ามีตัวเต็มให้เอามา")
export const ALGOS: { id: AlgoId; name: string; short: string; g: GroupId; full?: string }[] = [
  { id: "dfs", name: "DFS", short: "DFS", g: "long", full: "Depth-First Search" },
  { id: "hunt", name: "Hunt-and-Kill", short: "Hunt&Kill", g: "long" },
  { id: "growing", name: "Growing Tree", short: "Growing", g: "long" },
  { id: "prim", name: "Prim", short: "Prim", g: "bushy" },
  { id: "kruskal", name: "Kruskal", short: "Kruskal", g: "bushy" },
  { id: "ab", name: "Aldous-Broder", short: "Aldous-B.", g: "fair" },
  { id: "wilson", name: "Wilson", short: "Wilson", g: "fair" },
  { id: "binary", name: "Binary Tree", short: "Binary", g: "row" },
  { id: "sidewinder", name: "Sidewinder", short: "Sidewinder", g: "row" },
  { id: "eller", name: "Eller", short: "Eller", g: "row" },
  { id: "division", name: "Recursive Division", short: "Division", g: "wall" },
];

export const GROUPS: Record<GroupId, string> = {
  long: "ขุดทางยาว",
  bushy: "แตกกิ่งถี่",
  fair: "สุ่มแบบยุติธรรม",
  row: "สร้างทีละแถว",
  wall: "สร้างกำแพงแทนการขุด",
};

export const NOTES: Record<AlgoId, { h: string; p: string; t: string }> = {
  dfs: { h: "DFS (การค้นแบบลงลึกก่อน)", p: "หรือเรียกว่า recursive backtracker (ขุดแล้วถอยกลับ) ตัวขุดเดินสุ่มต่อไปจนพบทางตัน แล้วถอยย้อนทางเดิมเพื่อหาจุดที่ยังแตกทางได้ จากนั้นขุดต่อจนครบทุกช่อง", t: "นิสัย: ทางยาวคดเคี้ยว ทางตันน้อย เส้นทางเฉลยยาวมาก ปรับได้ว่าจะให้ทางตรงยาวหรือเลี้ยวถี่" },
  hunt: { h: "Hunt-and-Kill (ล่าแล้วฆ่า)", p: "ขุดแบบ DFS แต่พอเจอทางตันจะไม่ถอยกลับ แต่จะกวาดหาช่องที่ยังไม่ขุดซึ่งอยู่ติดกับส่วนที่ขุดแล้ว (แถบสีฟ้าคือแถวที่กำลังกวาด) เจอแล้วเชื่อมเข้าไปแล้วขุดต่อจากตรงนั้น", t: "นิสัย: คล้าย DFS แต่ถ้ากวาดไล่จากบนลงล่าง ทางแยกจะไปกองอยู่ช่วงบนของกระดานมากกว่า" },
  growing: { h: "Growing Tree (ต้นไม้ที่ค่อย ๆ งอก)", p: "เก็บรายการช่องที่ยังขุดต่อได้ (ช่องสีม่วงอ่อน) แล้วแต่ละรอบหยิบมาหนึ่งช่องเพื่อขุดต่อ หยิบช่องใหม่สุดจะได้นิสัยแบบ DFS หยิบแบบสุ่มจะได้นิสัยแบบ Prim ผสมกันได้ตามต้องการ", t: "นิสัย: ปรับนิสัยได้กว้างที่สุดในทุกวิธี" },
  prim: { h: "Prim (อัลกอริทึมของพริม)", p: "เริ่มจากช่องเดียว แล้วสุ่มหยิบช่องที่อยู่ติดขอบเขาวงกต (ช่องสีม่วงอ่อน) มาเชื่อมเข้ากับส่วนที่ขุดแล้ว ขยายออกรอบตัวเหมือนหมึกซึมบนกระดาษ", t: "นิสัย: แตกกิ่งถี่ ทางตันสั้นจำนวนมาก เส้นทางเฉลยมักสั้นและตรง ปรับจุดเริ่มกับแนวเอียงของทางได้" },
  kruskal: { h: "Kruskal (อัลกอริทึมของครุสกัล)", p: "สุ่มทุบกำแพงทั่วทั้งกระดาน แต่ยอมทุบเฉพาะกำแพงที่กั้นสองกลุ่มที่ยังไม่เชื่อมกัน (จำกลุ่มด้วย union-find แปลว่าระบบจับกลุ่ม) สีบนกระดานคือกลุ่มที่เชื่อมกันแล้ว กลุ่มจะค่อย ๆ รวมกันจนเหลือก้อนเดียว", t: "นิสัย: ทางตันสั้นจำนวนมาก กระจายสม่ำเสมอทั้งกระดาน ปรับให้ทางเอียงไปแนวนอนหรือแนวตั้งได้" },
  ab: { h: "Aldous-Broder (อัลดัส บรอเดอร์)", p: "ปล่อยตัวขุดเดินสุ่มไปทั่วกระดานแบบไม่มีเป้าหมาย เดินทับทางเดิมก็ได้ แต่จะทุบกำแพงเฉพาะตอนก้าวเข้าช่องที่ยังไม่เคยไป ช่วงท้ายจะช้ามากเพราะต้องเดินสุ่มจนกว่าจะบังเอิญพบช่องที่เหลือ", t: "นิสัย: ยุติธรรม เขาวงกตทุกแบบที่เป็นไปได้มีโอกาสออกเท่ากัน ปรับให้สลับไปใช้ Wilson ช่วงท้ายได้ จะเร็วขึ้นมาก" },
  wilson: { h: "Wilson (อัลกอริทึมของวิลสัน)", p: "เริ่มจากช่องเดียวเป็นต้นไม้ แล้วปล่อยตัวเดินสุ่มจากช่องอื่น (เส้นสีส้ม) จนชนต้นไม้ ถ้าระหว่างทางเดินวนมาชนรอยตัวเองจะลบวงนั้นทิ้งทันที ชนต้นไม้เมื่อไหร่ก็ขุดเส้นทางนั้นจริง", t: "นิสัย: ยุติธรรมเหมือน Aldous-Broder แต่กลับกัน คือช้าตอนแรกแล้วเร็วขึ้นเรื่อย ๆ" },
  binary: { h: "Binary Tree (ต้นไม้ไบนารี)", p: "วิธีที่ง่ายที่สุด ไล่ทีละช่อง แต่ละช่องสุ่มทุบกำแพงเพียง 2 ทิศที่กำหนด เช่น ขึ้นหรือขวา โดยไม่ต้องจำข้อมูลใด", t: "นิสัย: ลำเอียงชัดมาก ขอบสองด้านเป็นทางตรงโล่งยาว และทางทั้งหมดไหลเฉียงไปทางมุมเดียว" },
  sidewinder: { h: "Sidewinder (ไซด์ไวน์เดอร์)", p: "ชื่อมาจากงูหางกระดิ่งที่เลื้อยด้านข้าง ไล่ทีละแถว ขุดไปทางขวาเป็นช่วง ๆ แล้วสุ่มปิดช่วง พอปิดช่วงจะสุ่มเลือกหนึ่งช่องในช่วงนั้นทะลุไปแถวที่ทำเสร็จแล้ว", t: "นิสัย: ลำเอียงน้อยกว่า Binary Tree แถวแรกเป็นทางตรงยาว ทางมักไหลขึ้นลงเป็นแนวตั้ง" },
  eller: { h: "Eller (อัลกอริทึมของเอลเลอร์)", p: "ไล่ทีละแถวและจำเพียงแถวเดียว แต่ละแถวสุ่มเชื่อมช่องที่อยู่คนละกลุ่ม แล้วให้ทุกกลุ่มเปิดทางลงแถวล่างอย่างน้อยหนึ่งทาง แถวสุดท้ายเชื่อมทุกกลุ่มเข้าด้วยกัน สีบนกระดานคือกลุ่มที่เชื่อมกันแล้ว", t: "นิสัย: สร้างเขาวงกตยาวไม่มีที่สิ้นสุดได้เพราะจำเพียงแถวเดียว ปรับความถี่ทางนอนกับทางลงได้" },
  division: { h: "Recursive Division (แบ่งห้องซ้อนกัน)", p: "คิดกลับด้านกับวิธีอื่น เริ่มจากห้องโล่งไม่มีกำแพง แล้วสร้างกำแพงผ่าห้องเป็นสองส่วนพร้อมเจาะประตูไว้ จากนั้นผ่าห้องย่อยต่อไปเรื่อย ๆ (ช่องสีเขียวอ่อนคือห้องที่กำลังผ่า)", t: "นิสัย: กำแพงตรงยาว หน้าตาเหมือนผังอาคาร ถ้าหยุดผ่าเร็วจะเหลือห้องโล่ง ถ้าเจาะประตูหลายช่องจะเกิดทางวน" },
};

export type ParamValue = number | string;
export type Params = Record<string, ParamValue>;

export type ParamDef =
  | { k: string; t: "range"; label: string; min: number; max: number; step: number; v: number; fmt: (v: number) => string; ends?: [string, string] }
  | { k: string; t: "select"; label: string; opts: [string, string][]; v: string };

const pct = (v: number) => v + "%";
const dirFmt = (v: number) => (v === 0 ? "เท่ากัน" : v > 0 ? `แนวนอน +${v}%` : `แนวตั้ง +${-v}%`);
const strFmt = (v: number) => (v === 50 ? "สุ่มปกติ" : v > 50 ? `ตรงขึ้น ${(v - 50) * 2}%` : `คดขึ้น ${(50 - v) * 2}%`);
const START: [string, string][] = [["center", "กลางกระดาน"], ["corner", "มุมซ้ายบน"], ["random", "สุ่ม"]];

export const PDEF: Record<AlgoId, ParamDef[]> = {
  dfs: [{ k: "straight", t: "range", label: "ทางคดหรือทางตรง", min: 0, max: 100, step: 5, v: 50, fmt: strFmt, ends: ["เลี้ยวถี่", "ตรงยาว"] }],
  hunt: [
    { k: "straight", t: "range", label: "ทางคดหรือทางตรง", min: 0, max: 100, step: 5, v: 50, fmt: strFmt, ends: ["เลี้ยวถี่", "ตรงยาว"] },
    { k: "scan", t: "select", label: "วิธีหาช่องใหม่ตอนเจอทางตัน", opts: [["row", "กวาดไล่จากบนลงล่าง"], ["rand", "สุ่มหยิบจากทั่วกระดาน"]], v: "row" },
  ],
  growing: [
    { k: "pick", t: "select", label: "หยิบช่องจากรายการแบบไหน", opts: [["newest", "ใหม่สุด (นิสัย DFS)"], ["oldest", "เก่าสุด"], ["middle", "ตรงกลางรายการ"]], v: "newest" },
    { k: "mix", t: "range", label: "ผสมการหยิบแบบสุ่ม", min: 0, max: 100, step: 5, v: 25, fmt: pct, ends: ["ตามแบบที่เลือก", "สุ่มล้วนแบบ Prim"] },
  ],
  prim: [
    { k: "start", t: "select", label: "จุดเริ่มขุด", opts: START, v: "center" },
    { k: "dir", t: "range", label: "ทางเดินเอียงไปแนวไหน", min: -100, max: 100, step: 10, v: 0, fmt: dirFmt, ends: ["แนวตั้ง", "แนวนอน"] },
  ],
  kruskal: [{ k: "dir", t: "range", label: "ทางเดินเอียงไปแนวไหน", min: -100, max: 100, step: 10, v: 0, fmt: dirFmt, ends: ["แนวตั้ง", "แนวนอน"] }],
  ab: [{ k: "switch", t: "range", label: "สลับไปใช้ Wilson เมื่อสร้างได้", min: 10, max: 100, step: 5, v: 100, fmt: (v) => (v >= 100 ? "ไม่สลับ" : v + "%"), ends: ["สลับเร็ว", "ไม่สลับ"] }],
  wilson: [
    { k: "start", t: "select", label: "ต้นไม้เริ่มที่", opts: START, v: "random" },
    { k: "order", t: "select", label: "เลือกจุดปล่อยตัวเดินรอบถัดไป", opts: [["rand", "สุ่ม"], ["scan", "ไล่ตามแถวจากบนลงล่าง"]], v: "rand" },
  ],
  binary: [
    { k: "corner", t: "select", label: "ทิศที่ทุบได้", opts: [["ne", "ขึ้น กับ ขวา"], ["nw", "ขึ้น กับ ซ้าย"], ["se", "ลง กับ ขวา"], ["sw", "ลง กับ ซ้าย"]], v: "ne" },
    { k: "vert", t: "range", label: "โอกาสทุบทิศแนวตั้ง", min: 5, max: 95, step: 5, v: 50, fmt: pct, ends: ["ทางนอนมาก", "ทางตั้งมาก"] },
  ],
  sidewinder: [
    { k: "close", t: "range", label: "โอกาสปิดช่วงทางแนวนอน", min: 5, max: 95, step: 5, v: 50, fmt: pct, ends: ["ทางนอนยาว", "ทางนอนสั้น"] },
    { k: "flip", t: "select", label: "ทางตรงยาวอยู่ที่", opts: [["top", "ขอบบน"], ["bottom", "ขอบล่าง"]], v: "top" },
  ],
  eller: [
    { k: "join", t: "range", label: "โอกาสเชื่อมช่องข้างกัน", min: 5, max: 95, step: 5, v: 50, fmt: pct, ends: ["ทางตั้งมาก", "ทางนอนมาก"] },
    { k: "down", t: "range", label: "โอกาสเปิดทางลงเพิ่มจากขั้นต่ำ", min: 0, max: 90, step: 5, v: 30, fmt: pct, ends: ["ทางลงน้อย", "ทางลงมาก"] },
  ],
  division: [
    { k: "room", t: "range", label: "ขนาดห้องโล่งที่ปล่อยไว้", min: 1, max: 8, step: 1, v: 1, fmt: (v) => (v === 1 ? "ไม่มีห้องโล่ง" : `${v} × ${v}`), ends: ["ผ่าจนสุด", "ห้องใหญ่"] },
    { k: "doors", t: "range", label: "ประตูต่อกำแพงหนึ่งแนว", min: 1, max: 3, step: 1, v: 1, fmt: (v) => v + " ช่อง", ends: ["ทางเดียว", "มีทางวน"] },
    { k: "dir", t: "range", label: "กำแพงเอียงไปแนวไหน", min: -100, max: 100, step: 10, v: 0, fmt: dirFmt, ends: ["แนวตั้ง", "แนวนอน"] },
  ],
};

/** ค่าตั้งต้นของตัวปรับทุกตัวของวิธีนั้น */
export const DEF = (a: AlgoId): Params => Object.fromEntries(PDEF[a].map((d) => [d.k, d.v]));

const num = (P: Params, k: string) => Number(P[k]);
const str = (P: Params, k: string) => String(P[k]);

function startCell(n: number, m: string): number {
  return m === "center" ? (n >> 1) * n + (n >> 1) : m === "corner" ? 0 : rnd(n * n);
}

function chooseDir(c: number, from: number, nb: number[], s: number): number {
  if (from < 0 || nb.length < 2) return nb[rnd(nb.length)];
  const st = 2 * c - from;
  if (!nb.includes(st)) return nb[rnd(nb.length)];
  if (s >= 50) return Math.random() < (s - 50) / 50 ? st : nb[rnd(nb.length)];
  if (Math.random() < (50 - s) / 50) {
    const o = nb.filter((x) => x !== st);
    return o[rnd(o.length)];
  }
  return nb[rnd(nb.length)];
}

function wilsonPhase(n: number, inT: Uint8Array, ops: Op[], order: string): number {
  const N = n * n, rest: number[] = [], idx = new Int32Array(N).fill(-1), pos = new Int32Array(N).fill(-1);
  for (let c = 0; c < N; c++) if (!inT[c]) { idx[c] = rest.length; rest.push(c); }
  const drop = (c: number) => {
    const i = idx[c];
    if (i < 0) return;
    const l = rest.pop() as number;
    if (l !== c) { rest[i] = l; idx[l] = i; }
    idx[c] = -1;
  };
  let ptr = 0, steps = 0;
  while (rest.length) {
    let s: number;
    if (order === "scan") { while (inT[ptr]) ptr++; s = ptr; }
    else s = rest[rnd(rest.length)];
    const walk = [s];
    pos[s] = 0;
    ops.push(["wp", s]);
    let c = s;
    while (!inT[c]) {
      const nb = neighbors(c, n), q = nb[rnd(nb.length)];
      steps++;
      if (pos[q] >= 0) {
        for (let i = pos[q] + 1; i < walk.length; i++) pos[walk[i]] = -1;
        walk.length = pos[q] + 1;
        ops.push(["wt", walk.length]);
      } else {
        walk.push(q);
        pos[q] = walk.length - 1;
        ops.push(["wp", q]);
      }
      c = q;
    }
    for (let i = walk.length - 2; i >= 0; i--) { inT[walk[i]] = 1; drop(walk[i]); ops.push(["c", walk[i + 1], walk[i]]); }
    for (const w of walk) pos[w] = -1;
    ops.push(["wx"]);
  }
  return steps;
}

const GEN: Record<AlgoId, (n: number, P: Params) => GenResult> = {
  dfs(n, P) {
    const N = n * n, vis = new Uint8Array(N), from = new Int32Array(N).fill(-1), ops: Op[] = [], r = rnd(N), st = [r];
    vis[r] = 1;
    ops.push(["c", -1, r]);
    while (st.length) {
      const c = st[st.length - 1], nb = neighbors(c, n).filter((q) => !vis[q]);
      if (!nb.length) { st.pop(); if (st.length) ops.push(["m", st[st.length - 1]]); continue; }
      const p = chooseDir(c, from[c], nb, num(P, "straight"));
      vis[p] = 1; from[p] = c; ops.push(["c", c, p]); st.push(p);
    }
    return { ops };
  },
  hunt(n, P) {
    const N = n * n, vis = new Uint8Array(N), from = new Int32Array(N).fill(-1), rowCnt = new Int32Array(n), ops: Op[] = [];
    const mark = (c: number) => { vis[c] = 1; rowCnt[(c / n) | 0]++; };
    let c = rnd(N), left = N - 1, top = 0;
    mark(c);
    ops.push(["c", -1, c]);
    while (true) {
      let nb = neighbors(c, n).filter((q) => !vis[q]);
      while (nb.length) {
        const p = chooseDir(c, from[c], nb, num(P, "straight"));
        mark(p); from[p] = c; ops.push(["c", c, p]); left--; c = p;
        nb = neighbors(c, n).filter((q) => !vis[q]);
      }
      if (!left) break;
      let found = -1;
      const ok = (q: number) => !vis[q] && neighbors(q, n).some((k) => vis[k]);
      if (str(P, "scan") === "row") {
        while (top < n && rowCnt[top] === n) top++;
        for (let y = top; y < n && found < 0; y++) {
          ops.push(["h", y]);
          if (rowCnt[y] === n) continue;
          for (let x = 0; x < n; x++) if (ok(y * n + x)) { found = y * n + x; break; }
        }
      } else {
        const cand: number[] = [];
        for (let q = 0; q < N; q++) if (ok(q)) cand.push(q);
        found = cand[rnd(cand.length)];
      }
      const vn = neighbors(found, n).filter((k) => vis[k]), p = vn[rnd(vn.length)];
      mark(found); from[found] = p; ops.push(["h", -1], ["c", p, found]); left--; c = found;
    }
    return { ops };
  },
  growing(n, P) {
    const N = n * n, vis = new Uint8Array(N), ops: Op[] = [], r = rnd(N), A = [r], mix = num(P, "mix") / 100, pick = str(P, "pick");
    vis[r] = 1;
    ops.push(["c", -1, r, [r]]);
    while (A.length) {
      const i = Math.random() < mix ? rnd(A.length) : pick === "oldest" ? 0 : pick === "middle" ? A.length >> 1 : A.length - 1, c = A[i];
      const nb = neighbors(c, n).filter((q) => !vis[q]);
      if (!nb.length) { A.splice(i, 1); ops.push(["u", c]); continue; }
      const p = nb[rnd(nb.length)];
      vis[p] = 1; A.push(p); ops.push(["c", c, p, [p]]);
    }
    return { ops };
  },
  prim(n, P) {
    const N = n * n, inM = new Uint8Array(N), inF = new Uint8Array(N), F: number[] = [], ops: Op[] = [], wH = Math.pow(10, num(P, "dir") / 100);
    const add = (c: number) => { const ad: number[] = []; for (const q of neighbors(c, n)) if (!inM[q] && !inF[q]) { inF[q] = 1; F.push(q); ad.push(q); } return ad; };
    const r = startCell(n, str(P, "start"));
    inM[r] = 1;
    ops.push(["c", -1, r, add(r)]);
    while (F.length) {
      const k = rnd(F.length), f = F[k];
      F[k] = F[F.length - 1]; F.pop(); inF[f] = 0;
      const ins = neighbors(f, n).filter((q) => inM[q]), w = ins.map((q) => (Math.abs(q - f) === 1 ? wH : 1));
      let t = Math.random() * w.reduce((a, b) => a + b, 0), p = ins[0];
      for (let i = 0; i < ins.length; i++) { t -= w[i]; if (t <= 0) { p = ins[i]; break; } }
      inM[f] = 1;
      ops.push(["c", p, f, add(f)]);
    }
    return { ops };
  },
  kruskal(n, P) {
    const N = n * n, E: [number, number, number][] = [], b = num(P, "dir") / 100;
    for (let c = 0; c < N; c++) {
      if (c % n < n - 1) E.push([c, c + 1, Math.random() * Math.pow(4, -b)]);
      if (c < N - n) E.push([c, c + n, Math.random() * Math.pow(4, b)]);
    }
    E.sort((x, y) => x[2] - y[2]);
    const par = new Int32Array(N);
    for (let i = 0; i < N; i++) par[i] = i;
    const find = (a: number) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const ops: Op[] = [];
    for (const [a, c] of E) { const ra = find(a), rc = find(c); if (ra !== rc) { par[ra] = rc; ops.push(["c", a, c]); } }
    return { ops };
  },
  ab(n, P) {
    const N = n * n, vis = new Uint8Array(N), ops: Op[] = [];
    let c = rnd(N), left = N - 1, walk = 0;
    vis[c] = 1;
    ops.push(["c", -1, c]);
    const sw = num(P, "switch"), stopAt = sw >= 100 ? 0 : Math.floor(N * (1 - sw / 100));
    while (left > stopAt) {
      const nb = neighbors(c, n), q = nb[rnd(nb.length)];
      walk++;
      if (!vis[q]) { vis[q] = 1; left--; ops.push(["c", c, q]); } else ops.push(["m", q]);
      c = q;
    }
    if (left > 0) walk += wilsonPhase(n, vis, ops, "rand");
    return { ops, walk };
  },
  wilson(n, P) {
    const N = n * n, inT = new Uint8Array(N), ops: Op[] = [], s = startCell(n, str(P, "start"));
    inT[s] = 1;
    ops.push(["c", -1, s]);
    const walk = wilsonPhase(n, inT, ops, str(P, "order"));
    return { ops, walk };
  },
  binary(n, P) {
    const ops: Op[] = [], corner = str(P, "corner"), v = corner[0] === "n" ? -n : n, h = corner[1] === "e" ? 1 : -1, pv = num(P, "vert") / 100;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const c = y * n + x;
        ops.push(["m", c]);
        const cv = v < 0 ? y > 0 : y < n - 1, ch = h > 0 ? x < n - 1 : x > 0;
        const t = cv && ch ? (Math.random() < pv ? c + v : c + h) : cv ? c + v : ch ? c + h : -1;
        if (t >= 0) ops.push(["c", t, c]);
      }
    return { ops };
  },
  sidewinder(n, P) {
    const ops: Op[] = [], pc = num(P, "close") / 100, flip = str(P, "flip") === "bottom";
    for (let yy = 0; yy < n; yy++) {
      const y = flip ? n - 1 - yy : yy;
      let run: number[] = [];
      for (let x = 0; x < n; x++) {
        const c = y * n + x;
        ops.push(["m", c]);
        run.push(c);
        const first = yy === 0, close = x === n - 1 || (!first && Math.random() < pc);
        if (close) {
          if (!first) { const m = run[rnd(run.length)]; ops.push(["c", m + (flip ? n : -n), m]); }
          run = [];
        } else ops.push(["c", c, c + 1]);
      }
    }
    return { ops };
  },
  eller(n, P) {
    const ops: Op[] = [], pj = num(P, "join") / 100, pd = num(P, "down") / 100;
    let set = new Int32Array(n), next = 1;
    for (let y = 0; y < n; y++) {
      const last = y === n - 1;
      for (let x = 0; x < n; x++) if (!set[x]) set[x] = next++;
      for (let x = 0; x < n - 1; x++) {
        const c = y * n + x;
        ops.push(["m", c]);
        if (set[x] !== set[x + 1] && (last || Math.random() < pj)) {
          ops.push(["c", c, c + 1]);
          const o = set[x + 1], t = set[x];
          for (let k = 0; k < n; k++) if (set[k] === o) set[k] = t;
        }
      }
      ops.push(["m", y * n + n - 1]);
      if (last) break;
      const groups = new Map<number, number[]>();
      for (let x = 0; x < n; x++) { const g = groups.get(set[x]); if (g) g.push(x); else groups.set(set[x], [x]); }
      const ns = new Int32Array(n);
      for (const xs of groups.values()) {
        shuffle(xs);
        xs.forEach((x, i) => { if (i === 0 || Math.random() < pd) { const c = y * n + x; ops.push(["c", c, c + n]); ns[x] = set[x]; } });
      }
      set = ns;
    }
    return { ops };
  },
  division(n, P) {
    const ops: Op[] = [], k = num(P, "room"), b = num(P, "dir") / 100, nd = num(P, "doors"), st: [number, number, number, number][] = [[0, 0, n, n]];
    const doors = (len: number) => new Set(shuffle([...Array(len).keys()]).slice(0, Math.min(nd, len)));
    while (st.length) {
      const [x, y, w, h] = st.pop() as [number, number, number, number];
      if (w < 2 || h < 2 || (w <= k && h <= k)) continue;
      let pH = w < h ? 0.8 : w > h ? 0.2 : 0.5;
      pH = Math.min(0.95, Math.max(0.05, pH + b * 0.45));
      ops.push(["r", x, y, w, h]);
      if (Math.random() < pH) {
        const wy = y + rnd(h - 1), ds = doors(w);
        for (let i = 0; i < w; i++) if (!ds.has(i)) ops.push(["w", wy * n + x + i, (wy + 1) * n + x + i]);
        st.push([x, wy + 1, w, y + h - wy - 1], [x, y, w, wy - y + 1]);
      } else {
        const wx = x + rnd(w - 1), ds = doors(h);
        for (let i = 0; i < h; i++) if (!ds.has(i)) ops.push(["w", (y + i) * n + wx, (y + i) * n + wx + 1]);
        st.push([wx + 1, y, x + w - wx - 1, h], [x, y, wx - x + 1, h]);
      }
    }
    ops.push(["r", -1]);
    return { ops, open: true };
  },
};

/** สร้างเขาวงกตด้วยวิธี a · P ไม่ส่ง = ค่าตั้งต้นของวิธีนั้น */
export function generate(n: number, a: AlgoId, P?: Params): GenResult {
  return GEN[a](n, P || DEF(a));
}

export const isAlgo = (v: unknown): v is AlgoId => typeof v === "string" && ALGOS.some((a) => a.id === v);
