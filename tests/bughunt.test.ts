import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLevel, solveTo } from "../lib/game/level.ts";
import type { MazeData, Settings } from "../lib/game/level.ts";
import type { Dir, GameEvent } from "../lib/game/state.ts";
import { backToFlag, move, newGame, replay, setFlag } from "../lib/game/state.ts";
import { openNb, solve } from "../lib/maze/grid.ts";

/* บั๊กจากรายงานหาบั๊ก docs/BUGHUNT-2026-10-21.md */

const S: Settings = { level: "mid", algo: "wilson", minLen: 5, loops: 2, fog: false };

test("รายงานหาบั๊กข้อ 1: ผังที่ทางออกไปไม่ถึง หาทางแล้วหยุดทันที ไม่วนไม่จบ", () => {
  const n = 10, N = n * n;
  const m: MazeData = { n, R: new Uint8Array(N).fill(1), B: new Uint8Array(N).fill(1), ex: 5 };
  assert.throws(() => solveTo(m), /ทางออกไปไม่ถึง/);
  assert.throws(() => solve(n, m.R, m.B), /ทางออกไปไม่ถึง/);
  assert.throws(() => newGame(S, m), /ทางออกไปไม่ถึง/);
});

test("รายงานหาบั๊กข้อ 20: เส้นทางแบบปมต่อกัน ได้เส้นเดียวกับแบบคัดลอกทั้งเส้นของเดิมทุกก้าว", () => {
  for (let round = 0; round < 40; round++) {
    const G = newGame(S, makeLevel(S));
    // ตรรกะเดิม: อาร์เรย์เส้นทาง ปักธงคัดลอกทั้งเส้น วาร์ปคัดลอกกลับ
    let trail = [G.s], flagTrail: number[] | null = null, now = 1000;
    for (let i = 0; i < 3000 && G.status !== "won"; i++) {
      now += 50;
      const r = Math.random();
      if (r < 0.04) { if (setFlag(G, now)) flagTrail = trail.slice(); }
      else if (r < 0.07) { if (backToFlag(G, now) === "ok") trail = (flagTrail as number[]).slice(); }
      else {
        const nb = openNb(G.pos, G.n, G.R, G.B), q = nb[Math.floor(Math.random() * nb.length)];
        const d: Dir = q - G.pos === 1 ? "r" : q - G.pos === -1 ? "l" : q - G.pos === G.n ? "d" : "u";
        const res = move(G, d, now);
        if (res.moved) { if (res.back) trail.pop(); else trail.push(q); }
      }
      assert.deepEqual(G.trail, trail);
    }
  }
});

test("รายงานหาบั๊กข้อ 20: บันทึกปลอมที่เดินวนแล้วปักธงหลายหมื่นครั้ง เล่นซ้ำเสร็จในไม่ถึง 1 วินาที", () => {
  // กระดานโล่ง 18 × 18 ไม่มีกำแพง เดินวนสี่เหลี่ยม เส้นทางยาวขึ้นทุกก้าว
  const n = 18, N = n * n, m: MazeData = { n, R: new Uint8Array(N), B: new Uint8Array(N), ex: n >> 1 };
  const ev: GameEvent[] = [];
  let t = 0;
  for (let i = 0; i < 10000; i++) for (const k of ["r", "d", "l", "u"] as Dir[]) ev.push({ t: t++, k });
  for (let i = 0; i < 59900; i++) ev.push({ t: t++, k: "F" });
  for (let i = 0; i < n; i++) ev.push({ t: t++, k: "d" });
  const t0 = performance.now(), G = replay(S, m, ev);
  assert.equal(G.status, "won");
  assert.ok(performance.now() - t0 < 1000, `ใช้เวลา ${Math.round(performance.now() - t0)} ms`);
});
