// ตรวจตัวแปลภาษา: ข้อความไทยในไฟล์ขอบเขตของตัวที่ 1 (ข้อความผิดพลาดจากหลังบ้าน ข้อความของสมองเกม) แปลแล้วยังมีไทยเหลือไหม
// และวันที่ พ.ศ. เวลา 12 นาฬิกา แปลงถูกไหม
import { readFileSync } from "node:fs";
const L = await import("file:///C:/Users/PKH/maze-lab/lib/lang.ts");
const { EN, EN_RX } = await import("file:///C:/Users/PKH/maze-lab/lib/i18n-en.ts");
const THAI = /[฀-๿]/;

const files = [
  "lib/server/games.ts", "app/api/games/route.ts", "app/api/games/[id]/route.ts", "app/api/auth/route.ts", "app/api/status/route.ts",
  "middleware.ts", "lib/requireAuth.ts", "lib/net.ts", "lib/games.ts", "lib/game/state.ts", "lib/game/level.ts", "lib/maze/generators.ts",
];
const lits = new Map<string, string>();
for (const f of files) {
  const src = readFileSync("C:/Users/PKH/maze-lab/" + f, "utf8")
    .split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n"); // ข้ามบรรทัดคอมเมนต์
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    let s = m[1] ?? m[2];
    if (!s || !THAI.test(s)) continue;
    if (m[2] !== undefined) s = s.replace(/\$\{[^}]*\}/g, "12");
    if (/^\s*\[/.test(s)) continue;
    lits.set(s, f);
  }
}
const left: string[] = [];
for (const [s, f] of lits) {
  const out = L.toEn(s);
  if (THAI.test(out)) left.push(`${f} :: ${JSON.stringify(s)} -> ${JSON.stringify(out)}`);
}
console.log(`ข้อความไทยที่เจอ ${lits.size} ข้อความ · แปลแล้วยังมีไทย ${left.length}`);
for (const x of left) console.log("  " + x);

// วันที่และเวลา
const cases = ["21 ต.ค. 2569 19:05", "22 ต.ค. 2569 00:00", "1 ม.ค. 2569 12:09", "21 ต.ค. 2569", "19:05 น.", "00:30 น.", "12:30 น.", "21 ตุลาคม 2569", "เล่นวันที่ 21 ต.ค. 2569 19:05", "ดูย้อนเกมวันที่ 21 ต.ค. 2569 19:05 95 คะแนน", "1:02.3 นาที", "95 คะแนน เวลา 1:02.3 นาที เลี้ยวผิด 1 ครั้ง"];
for (const c of cases) console.log(`  ${JSON.stringify(c)} -> ${JSON.stringify(L.toEn(c))}`);
console.log("จำนวนกุญแจ", Object.keys(EN).length, "รูปแบบ", EN_RX.length);
