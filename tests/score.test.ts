import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLevel } from "../lib/game/level.ts";
import type { Level, Settings } from "../lib/game/level.ts";
import type { Dir, Game } from "../lib/game/state.ts";
import { backToFlag, clearFlag, clock, move, newGame, pause, replay, result, setFlag } from "../lib/game/state.ts";
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
    if (withFlags && Math.random() < 0.01) clearFlag(G, now);
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

test("บั๊กข้อ 2: ทุกขนาดด่าน ทุกระดับทางวน ผลรวมที่มาของก้าวเกิน = ก้าวเกินจริง (ก้าวที่เดิน ลบ เส้นทางสุดท้าย)", () => {
  // ก้าวเกินเทียบเส้นทางสุดท้ายของผู้เล่น ไม่ใช่ทางสั้นสุด (พี่กันเคาะ 22 ต.ค. 2569) · ด่านไม่มีทางวน เส้นทางสุดท้าย = ทางสั้นสุดเสมอ
  for (const [lv, games] of [["easy", 100], ["mid", 200], ["hard", 60], ["hell", 15]] as [Level, number][]) {
    for (const loops of [0, 1, 2, 3, 4]) {
      for (let t = 0; t < games; t++) {
        const s = S(lv, loops), G = newGame(s, makeLevel(s));
        randomPlay(G, t % 2 === 0);
        const r = result(G), tag = `${lv} ทางวนระดับ ${loops}`;
        assert.equal(G.lost + G.back + G.rewalk, G.steps - G.route, tag);
        assert.equal(r.waste, G.steps - G.route, tag);
        assert.ok(G.route >= G.L, tag);
        if (loops === 0) assert.equal(G.route, G.L, tag);
        // คะแนน = เส้นทางสุดท้าย ÷ ก้าวที่เดินจริง มีก้าวเกินสูงสุด 99 (พี่กันเคาะ 22 ต.ค. 2569 "เอาตามเรา")
        const want = r.waste === 0 ? 100 : Math.min(99, Math.round((100 * G.route) / G.steps));
        assert.equal(r.score, want, tag);
      }
    }
  }
});

/** เส้นทางจากทางเข้าถึงทางออกที่ไม่ผ่านช่องซ้ำ เลือกทางแบบสุ่ม (ค้นลึกแบบสุ่ม) */
function randomSimpleRoute(G: Game): number[] {
  const seen = new Uint8Array(G.n * G.n), route = [G.s];
  seen[G.s] = 1;
  while (route[route.length - 1] !== G.e) {
    const c = route[route.length - 1], nx = openNb(c, G.n, G.R, G.B).filter((q) => !seen[q]);
    if (!nx.length) { route.pop(); continue; }
    const q = nx[Math.floor(Math.random() * nx.length)];
    seen[q] = 1;
    route.push(q);
  }
  return route;
}

test("ทางวน: เลือกเส้นที่อ้อมกว่าทางสั้นสุด แต่ไม่ย้อนไม่วน ได้ 100 ไม่นับเลี้ยวผิด ไม่มีช่องแดง", () => {
  let longer = 0;
  for (const lv of ["easy", "mid", "hard", "hell"] as Level[]) {
    for (const loops of [1, 2, 3, 4]) {
      for (let t = 0; t < 6; t++) {
        const s = S(lv, loops), G = newGame(s, makeLevel(s)), route = randomSimpleRoute(G);
        let now = 1000;
        for (let i = 1; i < route.length; i++) move(G, dirTo(G, route[i - 1], route[i]), (now += 100));
        const r = result(G), tag = `${lv} ทางวนระดับ ${loops}`;
        assert.equal(G.status, "won", tag);
        assert.equal(G.route, route.length - 1, tag);
        assert.equal(r.waste, 0, tag);
        assert.equal(G.wrong, 0, tag);
        assert.equal(r.score, 100, tag);
        for (const cell of route) assert.equal(G.onRoute?.[cell], 1, `${tag} ช่องที่เดินต้องไม่ถูกทาสีแดง`);
        if (G.route > G.L) longer++;
      }
    }
  }
  assert.ok(longer >= 20, `เจอเส้นที่ยาวกว่าทางสั้นสุดแค่ ${longer} ด่าน`);
});

test("ทางวน: เดินวนรอบบล็อกกลับมาช่องเดิม นับเลี้ยวผิด 1 ครั้ง ก้าวที่วนเป็นก้าวเกินทั้งหมด", () => {
  let found = 0;
  for (let t = 0; t < 300 && found < 15; t++) {
    const s = S(t % 2 ? "mid" : "hard", 3 + (t % 2)), G = newGame(s, makeLevel(s)), path = G.path.slice().reverse();
    const onP = new Uint8Array(G.n * G.n);
    for (const c of path) onP[c] = 1;
    // หาวงที่ออกจากช่อง c บนทางเฉลย แล้ววนกลับมาที่ c โดยไม่แตะทางเฉลยช่องอื่น
    let loop: number[] | null = null, at = -1;
    for (let i = 1; i < path.length - 1 && !loop; i++) {
      const c = path[i];
      for (const q of openNb(c, G.n, G.R, G.B)) {
        if (onP[q]) continue;
        const prev = new Int32Array(G.n * G.n).fill(-2), qu = [q];
        prev[q] = -1;
        let hit = -1;
        while (qu.length && hit < 0) {
          const x = qu.shift() as number;
          for (const y of openNb(x, G.n, G.R, G.B)) {
            if (y === c && x !== q) { hit = x; break; }
            if (onP[y] || prev[y] !== -2) continue;
            prev[y] = x;
            qu.push(y);
          }
        }
        if (hit < 0) continue;
        const seg: number[] = [];
        for (let x = hit; x !== -1; x = prev[x]) seg.push(x);
        loop = [c, ...seg.reverse(), c];
        at = i;
        break;
      }
    }
    if (!loop) continue;
    found++;
    const walk = [...path.slice(0, at), ...loop, ...path.slice(at + 1)];
    let now = 1000;
    for (let i = 1; i < walk.length; i++) move(G, dirTo(G, walk[i - 1], walk[i]), (now += 100));
    const r = result(G), k = loop.length - 1;
    assert.equal(G.status, "won");
    assert.equal(G.route, G.L, "ตัดวงออกแล้วเหลือทางเฉลย");
    assert.equal(r.waste, k, "ก้าวที่วนทั้งหมดเป็นก้าวเกิน");
    assert.equal(G.lost, k);
    assert.equal(G.wrong, 1);
    assert.deepEqual(G.wrongAt, [loop[0]]);
    assert.ok(r.score < 100);
  }
  assert.ok(found >= 5, `เจอด่านที่มีวงให้เดินแค่ ${found} ด่าน`);
});

test("ปักธงก่อนเข้าทางตันแล้ววาร์ปกลับ ขากลับไม่นับก้าว คะแนนดีกว่าเดินย้อนออกมาเอง", () => {
  // "ก็คุณไม่ปักธงเอง" (พี่กันเคาะ 22 ต.ค. 2569 ให้นับแค่ก้าว) · คนไม่ปักธงเสียก้าวทั้งขาไปขากลับ คนปักธงเสียแค่ขาไป
  let found = 0;
  for (let t = 0; t < 200 && found < 10; t++) {
    const s = S(t % 2 ? "mid" : "hard", 0), m = makeLevel(s), G0 = newGame(s, m), path = G0.path.slice().reverse();
    const onP = new Uint8Array(G0.n * G0.n);
    for (const c of path) onP[c] = 1;
    // ทางตันที่แยกจากทางเฉลย เดินเข้าไปจนสุด
    let at = -1, branch: number[] = [];
    for (let i = 1; i < path.length - 1 && at < 0; i++) {
      const q = openNb(path[i], G0.n, G0.R, G0.B).find((x) => !onP[x]);
      if (q === undefined) continue;
      branch = [q];
      let prev = path[i], c = q;
      for (;;) {
        const nx = openNb(c, G0.n, G0.R, G0.B).filter((x) => x !== prev);
        if (!nx.length) break;
        prev = c;
        c = nx[0];
        branch.push(c);
      }
      at = i;
    }
    if (at < 0 || branch.length < 3) continue;
    found++;
    const play = (flag: boolean) => {
      const G = newGame(s, m);
      let now = 1000;
      const walk = (cells: number[]) => { for (let i = 1; i < cells.length; i++) move(G, dirTo(G, cells[i - 1], cells[i]), (now += 100)); };
      walk(path.slice(0, at + 1));
      if (flag) setFlag(G, (now += 100));
      walk([path[at], ...branch]);
      if (flag) assert.equal(backToFlag(G, (now += 100)), "ok");
      else walk([...branch.slice().reverse(), path[at]]);
      walk(path.slice(at));
      return { G, r: result(G) };
    };
    const a = play(false), b = play(true), d = branch.length;
    assert.equal(a.G.status, "won");
    assert.equal(b.G.status, "won");
    assert.equal(a.r.waste, 2 * d, "ไม่ปักธง เสียขาไปกับขากลับ");
    assert.equal(b.r.waste, d, "ปักธง เสียแค่ขาไป");
    assert.equal(a.G.wrong, 1);
    assert.equal(b.G.wrong, 1);
    assert.ok(b.r.score > a.r.score, `ปักธง ${b.r.score} ต้องมากกว่าไม่ปัก ${a.r.score}`);
  }
  assert.ok(found >= 5, `เจอทางตันให้ลองแค่ ${found} ด่าน`);
});

test("เกมจริง 22 ต.ค. 2569 ด่านโหดทางวนมากที่สุด เดิมได้ 90 ไม่ย้อนไม่วนเลย ต้องได้ 100", () => {
  // แถว 5afc7db0 ในตาราง mz_games (เดิน 154 ก้าว ทางสั้นสุด 102 ไม่เหยียบช่องซ้ำสักช่อง) · ผังกับบันทึกการเดินคัดลอกมาตรง ๆ
  const walls = "oGqoQRCDBqoEaqFqRibnrLphVlgMapiMRaoah6xzVshGGJehZiyjxZwzeSQ5h0WSGWZkxOpZhm7mjLNZaRVhFhmYKqNOcRHnWexxoaqMOsWVaXoaWxkaYeBlpoYiseZW5ISrWwwZ6Y6C6ipnGHjKFoYyHqFBmONhOJU6aehqeTGOzsas4eoR4QZpOGpsaqpGXgzJ4ZpqkZqqLHF6OEcUWi5mhONZxBE6e8TomKtFxGWVkcZlgaailxfLbqwe4aWGhWzsOFpieGkZSWlaGlNUkONReOaRxhTl6WVoXhqpZ2RcamrpWljkoBmTcejEgcR6hUu6BVOqpUUeWhWxhrOVoY475mQVhx5prKto4ERpMYXkURJhERt74cWmG-fsWaRxqGqpoRpFRppH6WpQGIdylp4mXhKR68ZgGK46WVjMiUaI65Gg4ZpxpCReFIana2E4mWtpZJUVhhpZURpRWulFIm5UOpdRXuhqlZqRF5Iel1ao4RU6F16sVKwWCmN5RBy6aFYqSZRJqru6qqq76rqr6g";
  const moves = "L0DbkLhkU7kL8gD13kD7cD5kD4wR4wUbkUk8RbmD9iR6gD69L6oD6fL68D8hD8vL69D7jR6gD6gR6xU53U61U5cR9aD7lD5dD4wR4fD74L68L6oL4qDrrD4vL3sLf4D4gD5sR6gU5kR5kD80D5sL5kD5sR6gD7sD68D9sR5lU6fR65U4kU6nR68D4gD7kR5kD4wL5lL5rD5cL5sD6oD5kDecDlDxR5iD6oL5gLe0U5oU7lL8gD6nD60L80D88R6pD7zL7kD6pR6fD7cL5kL6wU15sL60D7lD5rR4gR5kR54R5cU6gU5dR8fD7kR7fR65D5sR7cD5cD8wL68L8oDb4Dg0L4gU7cU5kL54L7hD65R6mD6oL60L5sU88L5cU68L68L5kU5kL69D6vL6oL6gU8gL60D6wD5tD4vL9cL6oL94L69D73R6pDcvLlsL6oL4gD6xD7rLcoLfl";
  const m = unpackWalls(40, 1, walls), ev = unpackMoves(moves);
  assert.ok(m && ev);
  const G = replay({ level: "hell", algo: "wilson", minLen: 20, loops: 4, fog: false }, m, ev), r = result(G);
  assert.equal(G.status, "won");
  assert.equal(G.steps, 154);
  assert.equal(G.L, 102);
  assert.equal(G.route, 154);
  assert.equal(r.waste, 0);
  assert.equal(G.wrong, 0);
  assert.equal(r.score, 100);
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
    assert.equal(r.grade, "แม่นยำ ไม่หลงแม้แต่ก้าวเดียว!");
    for (const cell of route) assert.equal(G.onRoute?.[cell], 1, "ช่องที่เดินต้องไม่ถูกทาสีแดง");
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
    assert.equal(G.steps, G.events.filter((e) => e.k !== "F" && e.k !== "X" && e.k !== "W").length, "วาร์ปกับปักธงไม่นับก้าว");
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
