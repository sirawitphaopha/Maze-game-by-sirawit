"use client";

import { useCallback, useMemo } from "react";
import BoardCanvas2D from "@/components/board/BoardCanvas2D";
import { isAlgo } from "@/lib/maze/generators";
import { LEVEL_IDS, type Level } from "@/lib/game/level";
import { replay, type Game } from "@/lib/game/state";
import { unpackMoves, unpackWalls } from "@/lib/game/encode";
import type { GameSummary } from "@/lib/games";

/* ภาพย่อเขาวงกตที่เล่นจบ ใช้ในหน้าประวัติ ทั้งมุมมองภาพเรียงกันและป๊อปอัปตอนชี้ในมุมมองตาราง
   (พี่กันสั่ง 21 ต.ค. 2569 "ขอปุ่มเปลี่ยนมุมมอง ให้แสดงเป็นภาพวงกตที่เล่นเสร็จเรียงกัน และถ้าเป็นโหมดแถว เอาเมาส์ชี้ที่หัวข้อจะขึ้นป๊อปอัปวงกตด้วย")
   เล่นซ้ำจากบันทึกการเดินด้วยตรรกะเกมชุดเดียวกับตัวดูย้อน แล้ววาดด้วยตัววาดกระดานตัวเดียวกัน
   ภาพจึงเหมือนตอนจบเกมจริง เส้นที่เดิน ช่องสีแดงที่หลงเข้าไป และจุดแดงตรงที่เลี้ยวผิด */

/** เกมตอนจบจากแถวในรายการ · ผังหรือบันทึกเสีย = null (ภาพขึ้นว่าผังเสีย ไม่ทำให้ทั้งหน้าพัง) */
export function finishedGame(g: GameSummary): Game | null {
  if (!g.walls || !g.moves || !LEVEL_IDS.includes(g.level as Level) || !isAlgo(g.algo)) return null;
  const maze = unpackWalls(g.size, g.exit_x, g.walls), events = unpackMoves(g.moves);
  if (!maze || !events) return null;
  return replay({ level: g.level as Level, algo: g.algo, minLen: g.min_len, loops: g.loops, fog: g.fog }, maze, events);
}

export default function MazeThumb({ g, label }: { g: GameSummary; label: string }) {
  const G = useMemo(() => finishedGame(g), [g]);
  const getView = useCallback(() => (G ? { G, sol: null, fog: false, markers: G.wrongAt, now: 0 } : null), [G]);
  if (!G) return <div className="mthumb bad">ผังของเกมนี้เสีย วาดภาพไม่ได้</div>;
  return (
    <div className="mthumb">
      <BoardCanvas2D getView={getView} ariaLabel={label} />
    </div>
  );
}
