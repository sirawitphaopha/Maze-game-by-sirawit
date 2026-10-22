// ตัวเกมจริงของ Maze Lab (สมองกับตัววาด) รวมเป็นไฟล์เดียวให้หน้าทดลองกดเรียกผ่าน window.MZ (สร้างด้วย esbuild ดู README.md)
import { makeLevel, LV_MINL } from "../../lib/game/level.ts";
import { newGame, move, setFlag, backToFlag, pause, resume, clock, playing, canMove } from "../../lib/game/state.ts";
import { openNb } from "../../lib/maze/grid.ts";
import { drawGame, cellAt } from "../../lib/draw/gameDraw.ts";
import { fitCanvas } from "../../lib/draw/paint.ts";
(window as unknown as { MZ: unknown }).MZ = { makeLevel, LV_MINL, newGame, move, setFlag, backToFlag, pause, resume, clock, playing, canMove, openNb, drawGame, cellAt, fitCanvas };
