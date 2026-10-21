// ตัวหาร D (ทางแยกที่ต้องตัดสินใจ) เทียบกับสิ่งที่ผู้เล่นเจอจริง
// (ก) ทางแยกที่ช่องทางออก ถูกนับใน D แต่ผู้เล่นไม่มีวันเลี้ยวผิดตรงนั้น (ถึงทางออก = ชนะทันที)
// (ข) โหมดทางวน เลี้ยวผิดจากช่องทางถูกที่ไม่อยู่บนเส้นเฉลยที่ระบบเลือก นับใน W แต่ทางแยกนั้นไม่อยู่ใน D
// (ค) โหมดทางวน เดินทางสั้นสุดอีกเส้น เจอทางแยกจำนวนไม่เท่า D
import { makeLevel } from "file:///C:/Users/PKH/maze-lab/lib/game/level.ts";
import { newGame, move, canMove, result } from "file:///C:/Users/PKH/maze-lab/lib/game/state.ts";
import { openNb, distFrom } from "file:///C:/Users/PKH/maze-lab/lib/maze/grid.ts";

const dirs = ["u", "d", "l", "r"] as const;
const stepOf = (n: number, d: string) => (d === "r" ? 1 : d === "l" ? -1 : d === "d" ? n : -n);

for (const level of ["easy", "mid", "hard", "hell"] as const) for (const loops of [0, 2, 4]) {
  let games = 0, exitBranch = 0, exitBranchCnt = 0, offPathWrong = 0, allWrong = 0, capped = 0, altDiff = 0, altGames = 0, maxAltGap = 0;
  for (let k = 0; k < 60; k++) {
    const settings = { level, algo: "wilson" as const, minLen: 5, loops, fog: false };
    const m = makeLevel(settings), G = newGame(settings, m), n = G.n;
    games++;
    const atExit = openNb(G.e, n, G.R, G.B).filter((q) => !G.onBest[q]).length;
    if (atExit) { exitBranch++; exitBranchCnt += atExit; }
    // (ค) ทางสั้นสุดอีกเส้น: เดินตามช่อง onBest โดยเลือกเพื่อนบ้านสุ่ม แล้วนับทางแยกตามนิยามเดียวกับ D
    const ds = distFrom(n, G.R, G.B, G.s);
    let c = G.s, Dalt = 0; const alt = [c];
    while (c !== G.e) { const nx = openNb(c, n, G.R, G.B).filter((q) => G.onBest[q] && ds[q] === ds[c] + 1); c = nx[(Math.random() * nx.length) | 0]; alt.push(c); }
    for (const x of alt) for (const q of openNb(x, n, G.R, G.B)) if (!G.onBest[q]) Dalt++;
    if (alt.join() !== G.path.slice().reverse().join()) { altGames++; if (Dalt !== G.D) altDiff++; maxAltGap = Math.max(maxAltGap, Math.abs(Dalt - G.D)); }
    // (ข) ผู้เล่นสุ่ม
    const de = G.de; let now = 1000, guard = 0;
    const onPath = G.onPath;
    while (G.status !== "won" && guard++ < 40000) {
      now += 100;
      let d: string;
      if (Math.random() < 0.6) { const ok = dirs.filter((x) => canMove(G, G.pos, x) && de[G.pos + stepOf(n, x)] < de[G.pos]); d = ok.length ? ok[(Math.random() * ok.length) | 0] : dirs[(Math.random() * 4) | 0]; }
      else d = dirs[(Math.random() * 4) | 0];
      const before = G.wrong, a = G.pos;
      move(G, d as any, now);
      if (G.wrong > before) { allWrong++; if (!onPath[a]) offPathWrong++; }
    }
    if (G.wrong > G.D) capped++;
  }
  console.log(`${level} ทางวน${loops}: ทางออกมีทางแยก ${exitBranch}/${games} ด่าน (รวม ${exitBranchCnt} ทาง) · เลี้ยวผิดนอกเส้นเฉลยที่เลือก ${offPathWrong}/${allWrong} · W เกิน D ถูกตัด ${capped}/${games} · ทางสั้นสุดเส้นอื่นมี ${altGames} ด่าน D ต่างกัน ${altDiff} ด่าน ต่างสุด ${maxAltGap}`);
}
