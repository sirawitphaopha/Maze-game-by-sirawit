"use client";

/* เลื่อนหน้าไปให้เห็นกล่องที่ต้องการ ทีละเฟรม (ห้าม behavior smooth ตามความจำ knowledge_smooth_scroll_broken)
   ใช้บนมือถือ ตอนกดแล้วของที่เปลี่ยนอยู่นอกจอ เช่น ห้องทดลองเลือกวิธีแล้ววงกตสร้างใหม่ข้างบน ตัวดูย้อนกดดูเฉลยแล้วเส้นขึ้นบนกระดานข้างบน
   กล่องเห็นอยู่ทั้งกล่องแล้วไม่เลื่อน · ลดการเคลื่อนไหวไปทีเดียว */
import { reducedMotion } from "@/lib/draw/paint";

export function glideIntoView(el: Element | null): void {
  if (!el) return;
  const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bar-h")) || 56;
  const r = el.getBoundingClientRect();
  if (r.top >= bar && r.bottom <= window.innerHeight) return;
  const y0 = window.scrollY, y1 = Math.max(0, y0 + r.top - bar - 8);
  const t0 = performance.now(), D = reducedMotion() ? 0 : 320;
  const step = (t: number) => {
    const k = D ? Math.min(1, (t - t0) / D) : 1;
    window.scrollTo(0, y0 + (y1 - y0) * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
