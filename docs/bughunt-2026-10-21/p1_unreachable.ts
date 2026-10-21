// พิสูจน์: ผังกำแพงที่ทางออกไปไม่ถึง ทำให้ replay (ตัวเดียวกับที่เซิร์ฟเวอร์เรียกใน gameRow) วนไม่รู้จบ
import { packWalls, unpackWalls, unpackMoves } from "file:///C:/Users/PKH/maze-lab/lib/game/encode.ts";
import { replay } from "file:///C:/Users/PKH/maze-lab/lib/game/state.ts";

const n = 10, N = n * n;
// ปิดกำแพงทุกด้าน = ทางเข้าไม่มีทางไปไหนเลย
const m = { n, R: new Uint8Array(N).fill(1), B: new Uint8Array(N).fill(1), ex: 5 };
const walls = packWalls(m);
const maze = unpackWalls(n, 5, walls);
console.log("ผังผ่านตัวแกะของเซิร์ฟเวอร์ =", !!maze, "ยาว", walls.length, "ตัวอักษร");
const events = unpackMoves("D0");
console.log("บันทึกการเดินผ่านตัวแกะ =", !!events);
const t0 = Date.now();
setTimeout(() => {}, 0);
// ถ้าไม่ค้าง บรรทัดหลัง replay ต้องพิมพ์ออกมา
const settings = { level: "easy" as const, algo: "wilson" as const, minLen: 4, loops: 0, fog: false };
console.log("เริ่ม replay ...");
const G = replay(settings, maze!, events!);
console.log("replay จบ ใช้เวลา", Date.now() - t0, "ms status", G.status);
