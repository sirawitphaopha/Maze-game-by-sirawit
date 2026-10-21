// จำลองลูปเดินตามเวลาใน components/history/ReplayView.tsx บรรทัด 141 ถึง 155
// ทุกครั้งที่ k เปลี่ยน effect เริ่มใหม่ ตั้ง clockRef = tNow (เวลาเหตุการณ์ล่าสุด) และ last = เวลาที่ effect ทำงาน
// สมมติ effect ทำงานหลังเฟรมที่ตั้ง k ไป D มิลลิวินาที (React วาดแล้ว useEffect ทำงานหลังจอวาด)
function sim(gap, speed, D, nEv = 300, frame = 1000 / 60) {
  const events = Array.from({ length: nEv }, (_, i) => ({ t: (i + 1) * gap }));
  let k = 0, real = 0;
  // เฟรมแรก
  let frameT = 0;
  while (k < events.length) {
    const tNow = k === 0 ? 0 : events[k - 1].t;
    let clock = tNow, last = frameT + D; // effect เริ่ม
    let nk = k;
    for (;;) {
      frameT += frame; // rAF ถัดไป
      clock += (frameT - last) * speed; last = frameT;
      while (nk < events.length && events[nk].t <= clock) nk++;
      if (nk !== k) break;
    }
    k = nk;
  }
  real = frameT;
  const ideal = events[events.length - 1].t / speed;
  return { gap, speed, D, real: Math.round(real), ideal: Math.round(ideal), slower: ((real / ideal - 1) * 100).toFixed(1) + "%" };
}
for (const [gap, speed] of [[110, 1], [110, 2], [110, 4], [110, 8], [200, 1], [200, 8], [60, 8]]) for (const D of [2, 8]) console.log(JSON.stringify(sim(gap, speed, D)));
