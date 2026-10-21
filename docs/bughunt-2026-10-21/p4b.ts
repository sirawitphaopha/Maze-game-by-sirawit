const L = await import("file:///C:/Users/PKH/maze-lab/lib/lang.ts");
const { NOTES, PDEF } = await import("file:///C:/Users/PKH/maze-lab/lib/maze/generators.ts");
const THAI = /[฀-๿]/;
for (const [k, note] of Object.entries(NOTES) as any) {
  const sp = note.h.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  for (const part of [sp?.[1], sp?.[2], note.p, note.t]) if (part && THAI.test(L.toEn(part))) console.log("ยังเป็นไทย", k, JSON.stringify(part.slice(0, 60)));
}
for (const [a, defs] of Object.entries(PDEF) as any) for (const d of defs) {
  const vals = d.t === "range" ? Array.from({ length: Math.floor((d.max - d.min) / d.step) + 1 }, (_, i) => d.min + i * d.step) : [];
  for (const v of vals) { const s = d.fmt(v); if (THAI.test(L.toEn(s))) console.log("ค่าตัวปรับยังเป็นไทย", a, d.k, v, JSON.stringify(s)); }
  for (const s of [d.label, ...(d.ends ?? []), ...(d.opts ?? []).map((o: any) => o[1])]) if (THAI.test(L.toEn(s))) console.log("ป้ายยังเป็นไทย", a, JSON.stringify(s));
}
for (const s of ["ยังไม่ได้เข้าสู่ระบบ", "กรุณาเข้าสู่ระบบใหม่", "ไม่พบเกมนี้", "รหัสเกมไม่ถูกต้อง", "อ่านฐานข้อมูลไม่สำเร็จ ลองใหม่ภายหลัง", "ฐานข้อมูลไม่ตอบกลับ ลองใหม่ภายหลัง", "ลบไม่สำเร็จ ลองใหม่ภายหลัง", "ระบบยังไม่ได้ตั้งรหัสผ่าน ผู้ดูแลต้องตั้งค่าก่อนใช้งาน"]) console.log(JSON.stringify(s), "->", JSON.stringify(L.toEn(s)));
