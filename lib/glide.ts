"use client";

/* เลื่อนหน้าไปให้เห็นกล่องที่ต้องการ ทีละเฟรม (ห้าม behavior smooth ตามความจำ knowledge_smooth_scroll_broken)
   ใช้บนมือถือ ตอนกดแล้วของที่เปลี่ยนอยู่นอกจอ เช่น ห้องทดลองเลือกวิธีแล้ววงกตสร้างใหม่ข้างบน ตัวดูย้อนกดดูเฉลยแล้วเส้นขึ้นบนกระดานข้างบน
   กล่องเห็นอยู่ทั้งกล่องแล้วไม่เลื่อน · ลดการเคลื่อนไหวไปทีเดียว */
import { reducedMotion } from "@/lib/draw/paint";

/** เลื่อนกล่องที่เลื่อนในตัวเอง (แผงซ้ายขวาของห้องทดลอง) ไปตำแหน่ง to ทีละเฟรม ตามสกิล web-craft ข้อ 6.21 ⑩ กดแล้วต้องเลื่อน ไม่วาร์บ
    ไกลขึ้นช้าลงนิดหน่อย 280 ถึง 620 มิลลิวินาที ออกช้า เร่งกลาง หยุดนุ่ม · หมุนล้อ แตะ กดคีย์ หยุดทันที
    แท็บที่ซ่อนอยู่ไม่ยิงจังหวะวาดจอ กับเครื่องที่ตั้งลดการเคลื่อนไหว ไปถึงทันที */
export function glideBox(el: HTMLElement, to: number): void {
  const start = el.scrollTop, end = Math.max(0, Math.min(to, el.scrollHeight - el.clientHeight)), dist = end - start;
  if (!dist) return;
  if (document.hidden || reducedMotion()) { el.scrollTop = end; return; }
  const dur = Math.min(620, Math.max(280, Math.abs(dist) * 0.42)), t0 = performance.now();
  let stop = false;
  const cancel = () => { stop = true; };
  el.addEventListener("wheel", cancel, { passive: true });
  el.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", cancel);
  const done = () => { el.removeEventListener("wheel", cancel); el.removeEventListener("touchstart", cancel); window.removeEventListener("keydown", cancel); };
  const step = (t: number) => {
    if (stop) return done();
    const k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    el.scrollTop = start + dist * e;
    if (k < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
}

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
