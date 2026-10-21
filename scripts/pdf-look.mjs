// แปลงไฟล์ PDF เป็นภาพ เพื่อดูของจริงด้วยตา (ยกจากเว็บยาคืน · เครื่องนี้ไม่มี poppler อ่าน PDF ตรง ๆ ไม่ได้)
// วิธีใช้  node scripts/pdf-look.mjs out/worksheet.pdf
import fs from "fs";
import path from "path";
import { pdf } from "pdf-to-img";

const file = process.argv[2];
if (!file) { console.error("ใส่ชื่อไฟล์ PDF มาด้วย"); process.exit(1); }
const OUT = "out/look";
fs.mkdirSync(OUT, { recursive: true });
const doc = await pdf(file, { scale: 1.5 });
let n = 0;
for await (const img of doc) {
  n += 1;
  const p = path.join(OUT, "page-" + n + ".png");
  fs.writeFileSync(p, img);
  console.log("หน้า " + n + " → " + p);
}
console.log("ทั้งหมด " + n + " หน้า");
