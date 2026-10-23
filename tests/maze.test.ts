import { test } from "node:test";
import assert from "node:assert/strict";
import { ALGOS, DEF, PDEF, generate } from "../lib/maze/generators.ts";
import type { AlgoId } from "../lib/maze/generators.ts";
import { braidOps, build, cleanStubs, countChoices, countLoops, deadEnds, distFrom, openNb, shortStubs, solve, statMarks } from "../lib/maze/grid.ts";

/* ตรรกะเขาวงกต — ทุกช่องไปถึงได้ ไม่มีวง ตัวเก็บกวาดไม่ทำเขาวงกตพัง และนิยามทางหลอกยาวตามเอกสาร */

function allReachable(n: number, R: Uint8Array, B: Uint8Array): boolean {
  const d = distFrom(n, R, B, n >> 1);
  for (let c = 0; c < n * n; c++) if (d[c] < 0) return false;
  return true;
}

test("ทั้ง 11 วิธี ค่าตั้งต้น ทุกช่องไปถึงได้และไม่มีวง (เขาวงกตสมบูรณ์)", () => {
  for (const a of ALGOS) {
    for (const n of [5, 12, 25]) {
      for (let t = 0; t < 6; t++) {
        const f = build(n, generate(n, a.id));
        assert.ok(allReachable(n, f.R, f.B), `${a.id} ${n} มีช่องที่ไปไม่ถึง`);
        assert.equal(countLoops(n, f.R, f.B), 0, `${a.id} ${n} มีวง`);
      }
    }
  }
});

test("ทุกวิธี ทุกค่าตัวปรับ ทุกช่องไปถึงได้ · มีวงเฉพาะ Recursive Division ที่ตั้งห้องโล่งหรือประตูหลายช่อง", () => {
  for (const a of ALGOS) {
    for (const d of PDEF[a.id]) {
      const values = d.t === "range" ? [d.min, d.max] : d.opts.map((o) => o[0]);
      for (const v of values) {
        const P = { ...DEF(a.id), [d.k]: v };
        const n = 15, f = build(n, generate(n, a.id as AlgoId, P));
        assert.ok(allReachable(n, f.R, f.B), `${a.id} ${d.k}=${v}`);
        const loopsOk = a.id === "division" && ((d.k === "room" && Number(v) > 1) || (d.k === "doors" && Number(v) > 1));
        if (!loopsOk) assert.equal(countLoops(n, f.R, f.B), 0, `${a.id} ${d.k}=${v} มีวง`);
      }
    }
  }
});

test("เก็บกวาดซอกสั้นแล้ว ยังเป็นเขาวงกตสมบูรณ์", () => {
  for (const a of ["kruskal", "wilson", "division", "growing", "dfs"] as AlgoId[]) {
    for (let t = 0; t < 8; t++) {
      const n = 30, f = build(n, generate(n, a));
      cleanStubs(n, f.R, f.B, 8);
      assert.ok(allReachable(n, f.R, f.B), a);
      assert.equal(countLoops(n, f.R, f.B), 0, a);
    }
  }
});

/** ตัวนับอ้างอิงแบบตรงไปตรงมา: เดินลึกได้ L ช่องไหม (ค้นลึกพร้อมจำระยะ) */
function choicesByDepth(n: number, R: Uint8Array, B: Uint8Array, path: number[], L: number): number {
  const on = new Uint8Array(n * n);
  for (const c of path) on[c] = 1;
  let cnt = 0;
  for (const c of path)
    for (const q of openNb(c, n, R, B)) {
      if (on[q]) continue;
      const d = new Map<number, number>([[q, 1]]), st = [q];
      let deep = 1;
      while (st.length) {
        const x = st.pop() as number;
        for (const y of openNb(x, n, R, B))
          if (y !== c && !on[y] && !d.has(y)) { d.set(y, (d.get(x) as number) + 1); deep = Math.max(deep, d.get(y) as number); st.push(y); }
      }
      if (deep >= L) cnt++;
    }
  return cnt;
}

test("บั๊กข้อ 4: ทางหลอกยาวนับจากความลึกที่เดินเข้าไปได้ ตามเอกสารหัวข้อ 6", () => {
  for (const a of ["wilson", "kruskal", "prim", "dfs"] as AlgoId[]) {
    for (let t = 0; t < 30; t++) {
      const n = 18, f = build(n, generate(n, a)), s = solve(n, f.R, f.B, true);
      assert.equal(countChoices(n, f.R, f.B, s.path, 5), choicesByDepth(n, f.R, f.B, s.path, 5), a);
    }
  }
});

test("กิ่งที่มีช่องรวมเยอะแต่ตื้น ไม่นับเป็นทางหลอกยาว", () => {
  // กระดาน 5 × 5 ทางเฉลยลงตรงคอลัมน์ 2 · ช่อง 7 แตกกิ่งไปซ้าย ช่องรวม 4 แต่ลึกสุด 3
  const n = 5, R = new Uint8Array(n * n).fill(1), B = new Uint8Array(n * n).fill(1);
  const open = (a: number, b: number) => { const lo = Math.min(a, b), hi = Math.max(a, b); if (hi - lo === 1) R[lo] = 0; else B[lo] = 0; };
  for (let y = 0; y < n - 1; y++) open(y * n + 2, (y + 1) * n + 2);
  open(7, 6); open(6, 1); open(6, 11); open(1, 0);
  const path = [22, 17, 12, 7, 2];
  assert.equal(countChoices(n, R, B, path, 3), 1);
  assert.equal(countChoices(n, R, B, path, 4), 0, "ช่องรวม 4 แต่ลึกแค่ 3 ต้องไม่นับ");
});

test("การ์ดสถิติห้องทดลอง ช่องที่ไฮไลต์ (statMarks) นับได้เท่าตัวเลขบนการ์ดทุกใบ ทุกวิธี มีและไม่มีทางวน", () => {
  for (const a of ALGOS) {
    for (const n of [9, 25]) {
      for (const bp of [0, 0.5]) {
        for (const far of [false, true]) {
          const f = build(n, generate(n, a.id));
          if (bp) braidOps(n, f.R, f.B, bp);
          const r = solve(n, f.R, f.B, far);
          for (const L of [2, 5, 9]) {
            const m = statMarks(n, f.R, f.B, r.path, L, r.ex);
            assert.equal(m.dead.length, deadEnds(n, f.R, f.B, r.ex), a.id + " ทางตัน");
            assert.equal(m.len.length, r.path.length, a.id + " เส้นทางเฉลย");
            assert.equal(m.ch.length, countChoices(n, f.R, f.B, r.path, L), a.id + " ทางหลอกยาว L " + L);
            assert.equal(m.short.length, shortStubs(n, f.R, f.B, L, r.ex), a.id + " ทางตันสั้น L " + L);
          }
        }
      }
    }
  }
});
