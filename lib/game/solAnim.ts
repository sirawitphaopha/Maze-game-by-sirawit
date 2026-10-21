import { openNb } from "../maze/grid.ts";

/* แอนิเมชันเฉลย ส่วนคิด (ยกจากไฟล์เดิม solRun · เอกสารหัวข้อ 9) ใช้ร่วมห้องทดลอง เกม และตัวดูย้อน
   กระจายจากทางเข้า จดทุกเส้นเชื่อม [จาก, ไป, สี, ความลึก]
   เส้นบนทางเฉลยสีชมพู (0) · ทางแยกที่แตกออกจากทางเฉลยได้สีใหม่วน 4 สี · ในกิ่งเดียวกันทางแรกสีเดิม ทางถัดไปสีใหม่
   ทุกกิ่งวิ่งพร้อมกันด้วยความเร็วเท่ากันจนสุดทางจริง · เวลาวิ่ง clamp(ความลึกสูงสุด ÷ 45, 2.5, 8) วินาที */

export type SolRun = {
  n: number;
  s: number;
  e: number;
  edges: [number, number, number, number][];
  D: number;
  De: number;
  t0: number;
  dur: number;
  done: boolean;
};

export function solRun(n: number, R: Uint8Array, B: Uint8Array, s: number, e: number, onPath: Uint8Array, now: number): SolRun {
  const N = n * n, depth = new Int32Array(N).fill(-1), col = new Int8Array(N), edges: [number, number, number, number][] = [];
  depth[s] = 0;
  const q = [s];
  let h = 0, nc = 0;
  while (h < q.length) {
    const c = q[h++];
    let kept = false;
    for (const k of openNb(c, n, R, B)) {
      if (depth[k] >= 0) continue;
      depth[k] = depth[c] + 1;
      if (onPath[k]) col[k] = 0;
      else if (!onPath[c] && !kept) { col[k] = col[c]; kept = true; }
      else col[k] = 1 + (nc++ % 4);
      edges.push([c, k, col[k], depth[k]]);
      q.push(k);
    }
  }
  let D = 0;
  for (const x of edges) if (x[3] > D) D = x[3];
  return { n, s, e, edges, D, De: depth[e], t0: now, dur: Math.min(8, Math.max(2.5, D / 45)) * 1000, done: false };
}
