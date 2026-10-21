const { EN, EN_RX } = await import("file:///C:/Users/PKH/maze-lab/lib/i18n-en.ts");
const THAI = /[\u0E00-\u0E7F]/;
function toEn(s) {
  if (!THAI.test(s)) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const lead = m ? m[1] : "", core = (m ? m[2] : s).replace(/\s+/g, " "), tail = m ? m[3] : "";
  const hit = EN[core];
  if (hit !== undefined) return lead + hit + tail;
  for (const [rx, out] of EN_RX) { const r = core.match(rx); if (r) return lead + (typeof out === "function" ? out(r) : core.replace(rx, out)) + tail; }
  return "<<ไม่เจอ>> " + s;
}
for (const s of ["8 ช่อง ทางวนไม่มี ไฟฉาย", "8 ช่อง ทางวนไม่มี", "8 ช่อง ทางวนมากที่สุด ไฟฉาย", "กลาง Wilson 87 คะแนน 1:23.4", "กลาง Wilson 87 คะแนน 1:23.4  ง่าย DFS 100 คะแนน 0:12.0", "กำลังเปิดด่าน",
  new Date("2026-10-21T12:23:00Z").toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }),
  new Date("2026-10-21T12:23:00Z").toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  new Date("2026-10-21T02:05:00Z").toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.",
  new Date("2026-10-21T12:23:00Z").toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }),
  "ลบวงกตที่เล่นวันที่ " + new Date("2026-10-21T12:23:00Z").toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " น. แล้ว",
]) console.log(JSON.stringify(s), "=>", JSON.stringify(toEn(s)));
// ความคงที่ ทุกคำแปลที่ยังมีไทย แปลซ้ำแล้วเปลี่ยนอีกไหม (กันวนไม่จบ)
let bad = 0;
for (const [k, v] of Object.entries(EN)) if (THAI.test(v)) { bad++; console.log("ค่าแปลมีไทย:", k, "=>", v); }
console.log("ค่าแปลที่ยังมีไทย", bad);
