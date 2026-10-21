const L = await import("file:///C:/Users/PKH/maze-lab/lib/lang.ts");
for (const s of ["ยังไม่ได้เข้าสู่ระบบ", "5 ช่อง ทางวนกลาง", "5 ช่อง ทางวนกลาง ไฟฉาย", "กลาง Wilson 90 คะแนน 0:01.9", "กำลังเปิดด่าน", "ขุดทางยาว", "1:010.0 นาที"]) console.log(JSON.stringify(s), "->", JSON.stringify(L.toEn(s)));
