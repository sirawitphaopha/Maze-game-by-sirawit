/* ตัวสุ่มของเขาวงกต (ยกจากไฟล์เดิม ก้อนที่ 1 ไม่เปลี่ยนพฤติกรรม)
   ยังใช้ตัวสุ่มของระบบ ไม่ทำรหัสสุ่ม (seed) เพราะประวัติเกมเก็บผังกำแพงจริงไว้ทั้งกระดาน
   แก้วิธีสร้างทีหลังแล้วเกมเก่ายังดูย้อนได้เหมือนเดิม */

export const rnd = (k: number): number => Math.floor(Math.random() * k);

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
