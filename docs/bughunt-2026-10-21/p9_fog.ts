const L = await import("file:///C:/Users/PKH/maze-lab/lib/lang.ts");
const { LOOPS } = await import("file:///C:/Users/PKH/maze-lab/lib/game/level.ts");
// ข้อความเดียวกับ components/history/HistoryView.tsx บรรทัด 50
for (const loops of [0, 2, 4]) for (const fog of [false, true]) {
  const s = `${5} ช่อง ทางวน${LOOPS[loops].name}${fog ? " ไฟฉาย" : ""}`;
  console.log(JSON.stringify(s), "->", JSON.stringify(L.toEn(s)));
}
