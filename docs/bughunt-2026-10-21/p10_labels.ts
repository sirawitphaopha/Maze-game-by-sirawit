const L = await import("file:///C:/Users/PKH/maze-lab/lib/lang.ts");
const { fmt } = await import("file:///C:/Users/PKH/maze-lab/lib/local.ts");
// ป้ายเกมในแถบรอส่ง (components/game/GameView.tsx:251) และการต่อป้ายใน components/ui/PendingBar.tsx:101
const a = `กลาง Wilson 90 คะแนน ${fmt(1900)}`, b = `โหด Recursive Division 100 คะแนน ${fmt(3599900)}`;
for (const s of [a, b, [a, b].join("  ")]) console.log(JSON.stringify(s), "->", JSON.stringify(L.toEn(s)));
// ระยะเวลาในหน้าประวัติ (components/history/HistoryView.tsx:33-38 ยกมาตรงตัว)
const dur = (ms: number) => { const s = Math.max(0, ms) / 1000; if (s < 60) return `${s.toFixed(1)} วินาที`; if (s < 3600) { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? "0" : ""}${r.toFixed(1)} นาที`; } const h = Math.floor(s / 3600); return `${h} ชม. ${Math.floor((s - h * 3600) / 60)} นาที`; };
for (const ms of [59960, 69960, 119960, 609960, 3599960]) console.log(ms, "ms ->", JSON.stringify(dur(ms)), "->", JSON.stringify(L.toEn(dur(ms))), "· แถบบนใช้ fmt =", fmt(ms));
