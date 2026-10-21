import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLevel } from "../lib/game/level.ts";
import type { Level, Settings } from "../lib/game/level.ts";
import type { Dir, Game } from "../lib/game/state.ts";
import { backToFlag, clock, move, newGame, pause, replay, result, setFlag } from "../lib/game/state.ts";
import { distFrom, openNb } from "../lib/maze/grid.ts";
import { packMoves, packWalls, unpackMoves, unpackWalls } from "../lib/game/encode.ts";

/* การนับก้าว คะแนน นาฬิกา และการเล่นซ้ำ (บั๊กข้อ 1 · 2 · 5) */

const S = (level: Level, loops: number): Settings => ({ level, algo: "wilson", minLen: 5, loops, fog: false });
const dirTo = (G: Game, a: number, b: number): Dir => (b - a === 1 ? "r" : b - a === -1 ? "l" : b - a === G.n ? "d" : "u");

/** ผู้เล่นสุ่ม: 60% เดินเข้าหาทางออก ที่เหลือสุ่มทิศ · ปักธงและวาร์ปบ้าง */
function randomPlay(G: Game, withFlags = false): void {
  const de = distFrom(G.n, G.R, G.B, G.e);
  let now = 1000, guard = 0;
  while (G.status !== "won" && guard++ < 50000) {
    now += 120;
    if (withFlags && Math.random() < 0.03) setFlag(G, now);
    if (withFlags && Math.random() < 0.02) backToFlag(G, now);
    const nb = openNb(G.pos, G.n, G.R, G.B), toward = nb.filter((q) => de[q] < de[G.pos]);
    const q = Math.random() < 0.6 && toward.length ? toward[0] : nb[Math.floor(Math.random() * nb.length)];
    move(G, dirTo(G, G.pos, q), now);
  }
  assert.equal(G.status, "won");
}

/** ตรรกะเดิมของไฟล์ maze-lab.html ทุกบรรทัด ใช้เทียบว่าโหมดไม่มีทางวนได้ตัวเลขเท่าเดิม */
function oldAccounting(G0: Game, dirs: Dir[]) {
  const n = G0.n, path = G0.path, onPath = new Uint8Array(n * n), pidx = new Int32Array(n * n).fill(-1);
  path.forEach((c, i) => { onPath[c] = 1; pidx[c] = path.length - 1 - i; });
  let D = 0;
  for (const c of path) for (const q of openNb(c, n, G0.R, G0.B)) if (!onPath[q]) D++;
  let pos = n >> 1, wrong = 0, lost = 0, back = 0, rewalk = 0, maxP = 0;
  const step = { r: 1, l: -1, d: n, u: -n };
  for (const d of dirs) {
    const nx = pos + step[d];
    if (onPath[pos] && !onPath[nx]) wrong++;
    if (!onPath[pos] || !onPath[nx]) lost++;
    else if (pidx[nx] < pidx[pos]) back++;
    else if (pidx[nx] <= maxP) rewalk++;
    else maxP = pidx[nx];
    pos = nx;
  }
  return { D, wrong, lost, back, rewalk };
}

test("โหมดไม่มีทางวน ตรรกะใหม่ได้ตัวเลขเท่าตรรกะเดิมทุกตัว", () => {
  for (const lv of ["easy", "mid"] as Level[]) {
    for (let t = 0; t < 60; t++) {
      const s = S(lv, 0), m = makeLevel(s), G = newGame(s, m);
      randomPlay(G);
      const dirs = G.events.filter((e) => e.k !== "F" && e.k !== "W").map((e) => e.k as Dir);
      const o = oldAccounting(newGame(s, m), dirs);
      assert.deepEqual({ D: G.D, wrong: G.wrong, lost: G.lost, back: G.back, rewalk: G.rewalk }, o);
    }
  }
});

test("บั๊กข้อ 2: ทุกระดับทางวน ผลรวมที่มาของก้าวเกิน = ก้าวเกินจริง (200 ด่านต่อระดับ)", () => {
  for (const loops of [0, 1, 2, 3, 4]) {
    for (let t = 0; t < 200; t++) {
      const s = S("mid", loops), G = newGame(s, makeLevel(s));
      randomPlay(G, t % 2 === 0);
      assert.equal(G.lost + G.back + G.rewalk, G.steps - G.L, `ทางวนระดับ ${loops}`);
    }
  }
});

test("บั๊กข้อ 1: เดินทางสั้นสุดอีกเส้นที่ยาวเท่ากัน ได้ 100 ไม่นับเลี้ยวผิด ไม่มีช่องแดง", () => {
  let found = 0;
  for (let t = 0; t < 400 && found < 12; t++) {
    const s = S(t % 2 ? "mid" : "hard", 2 + (t % 3)), G = newGame(s, makeLevel(s));
    const ds = distFrom(G.n, G.R, G.B, G.s);
    // เดินตามทางสั้นสุด เลือกช่องที่ไม่อยู่บนเส้นเฉลยของระบบก่อนเสมอ
    let c = G.s, diff = false;
    const route = [c];
    while (c !== G.e) {
      const nx = openNb(c, G.n, G.R, G.B).filter((q) => ds[q] === ds[c] + 1 && G.onBest[q]);
      const off = nx.filter((q) => !G.onPath[q]), q = off.length ? off[0] : nx[0];
      if (!G.onPath[q]) diff = true;
      route.push(q);
      c = q;
    }
    if (!diff) continue;
    found++;
    let now = 1000;
    for (let i = 1; i < route.length; i++) move(G, dirTo(G, route[i - 1], route[i]), (now += 100));
    const r = result(G);
    assert.equal(G.status, "won");
    assert.equal(r.waste, 0);
    assert.equal(G.wrong, 0);
    assert.equal(r.score, 100);
    assert.equal(r.grade, "แม่นยำ ไม่หลงแม้แต่ก้าวเดียว");
    for (const cell of route) assert.equal(G.onBest[cell], 1, "ช่องที่เดินต้องไม่ถูกทาสีแดง");
  }
  assert.ok(found >= 5, `เจอด่านที่มีทางสั้นสุดสองเส้นแค่ ${found} ด่าน`);
});

test("บั๊กข้อ 5: หยุดนาฬิกาแล้ว ช่วงที่หยุดไม่นับเวลา และไม่นับในบันทึกการเดิน", () => {
  const s = S("easy", 0), G = newGame(s, makeLevel(s));
  const de = distFrom(G.n, G.R, G.B, G.e);
  const nextDir = () => { const q = openNb(G.pos, G.n, G.R, G.B).find((x) => de[x] < de[G.pos]) as number; return dirTo(G, G.pos, q); };
  move(G, nextDir(), 10_000);
  move(G, nextDir(), 11_000);
  assert.equal(clock(G, 11_000), 1000);
  assert.ok(pause(G, 11_500));
  assert.equal(clock(G, 20_000), 1500, "ระหว่างหยุด นาฬิกาต้องค้าง");
  move(G, nextDir(), 25_000); // เดินต่อ = นาฬิกาเดินต่อเอง
  assert.equal(G.events[2].t, 1500 + 0, "ก้าวแรกหลังหยุดต้องต่อจากเวลาที่หยุด");
  assert.equal(clock(G, 26_000), 2500);
});

test("วาร์ปไม่นับก้าว และเล่นซ้ำจากบันทึกได้สถิติเท่าตอนเล่นจริง", () => {
  for (let t = 0; t < 40; t++) {
    const s = S(t % 2 ? "mid" : "easy", t % 5), G = newGame(s, makeLevel(s));
    randomPlay(G, true);
    const R = replay(s, G.maze, G.events);
    for (const k of ["steps", "wrong", "lost", "back", "rewalk", "warp", "status", "pos"] as const) assert.equal(R[k], G[k], k);
    assert.deepEqual(R.wrongAt, G.wrongAt);
    assert.equal(R.el, G.events[G.events.length - 1].t);
    assert.deepEqual(result(R), result(G));
    assert.equal(G.steps, G.events.filter((e) => e.k !== "F" && e.k !== "W").length, "วาร์ปกับปักธงไม่นับก้าว");
  }
});

test("แพ็กผังกำแพงกับบันทึกการเดิน แล้วแกะกลับได้ของเดิมเป๊ะ", () => {
  for (const lv of ["easy", "mid", "hard", "hell"] as Level[]) {
    const s = S(lv, 1), G = newGame(s, makeLevel(s));
    randomPlay(G, true);
    const w = packWalls(G.maze), back = unpackWalls(G.n, G.maze.ex, w);
    assert.ok(back);
    assert.deepEqual(Array.from(back.R), Array.from(G.R));
    assert.deepEqual(Array.from(back.B), Array.from(G.B));
    const ev = unpackMoves(packMoves(G.events));
    assert.deepEqual(ev, G.events.map((e) => ({ t: e.t, k: e.k })));
    if (lv === "hell") assert.ok(w.length < 600, `ผัง 40 × 40 ยาว ${w.length} ตัวอักษร`);
  }
  assert.equal(unpackWalls(10, 3, "!!"), null, "ข้อมูลเสียต้องได้ null");
  assert.equal(unpackMoves("x12"), null);
});
