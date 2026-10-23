"use client";

import { useEffect, useState, type RefObject } from "react";
import Icon from "./Icon";
import { glideBox } from "@/lib/glide";

/* ปุ่มขึ้นบนสุด ลงล่างสุด (สกิล web-craft ข้อ 6.21 กฎกลางทุกเว็บ)
   · ส่ง box = กล่องที่เลื่อนในตัวเอง วางเป็นลูกตัวสุดท้ายของกล่อง ติดขอบล่างด้วย sticky
     ใช้กับแผงซ้ายขวาของห้องทดลองจอคอม (พี่กันสั่ง 23 ต.ค. 2569 "หน้าห้องทดลอง ที่ฝั่งซ้ายขวามันเลื่อนขึ้นลงได้ เราขอปุ่มขึ้นสุดลงสุดด้วย สร้างตามสกิลนะ")
   · ไม่ส่ง box = ทั้งหน้า ปุ่มลอยมุมล่างขวาจอ ใช้กับหน้าประวัติทั้งจอคอมและมือถือ (พี่กันสั่ง "ปุ่มขึ้นสุดลงสุด ทำที่หน้าประวัติด้วย")
     แถบบอกผลล่างจอ (.banner) กว้างจนทับมุมขวาเมื่อไหร่ ยกปุ่มขึ้นพ้นแถบ · มีหน้าต่างซ้อน (aria-modal) เปิดอยู่ ปุ่มหายทั้งคู่ (ข้อ ⑧)
   · ปุ่มโผล่ตามตำแหน่ง บนสุดเหลือปุ่มลง ล่างสุดเหลือปุ่มขึ้น เนื้อหาพอดีที่ ไม่มีปุ่มเลย
   · เพิ่งเลื่อนภายใน 1.5 วินาทีชัดเต็ม หยุดแล้วจาง 30% ยังกดได้ · ปุ่มที่ซ่อนกดไม่ได้ · ชี้แล้วกลับมาชัด
   · ทวนตำแหน่งใหม่เมื่อเนื้อหาเปลี่ยนขนาดโดยไม่ปลุกปุ่ม · รวบการเลื่อนด้วย requestAnimationFrame เขียนสถานะเฉพาะตอนค่าเปลี่ยน
   · กดแล้วค่อย ๆ เลื่อนด้วย glideBox (lib/glide.ts) · หน้าตาทั้งหมดอยู่ใน CSS .jumpwrap .jumpbtn (app/globals.css) */
export default function JumpButtons({ box }: { box?: RefObject<HTMLElement | null> }) {
  const page = !box;
  const [pos, setPos] = useState({ up: false, down: false });
  const [awake, setAwake] = useState(false);
  const [modal, setModal] = useState(false);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const el = box ? box.current : (document.scrollingElement as HTMLElement | null);
    if (!el) return;
    let raf = 0, timer = 0;
    const measure = () => {
      raf = 0;
      const max = el.scrollHeight - el.clientHeight, st = el.scrollTop, fits = max <= 8;
      const up = !fits && st > 8, down = !fits && st < max - 8;
      setPos((p) => (p.up === up && p.down === down ? p : { up, down }));
      if (!page) return;
      setModal(!!document.querySelector('[aria-modal="true"]'));
      // แถบบอกผลที่ทับมุมขวาล่าง (มือถือแถบกว้างเกือบเต็มจอ) ยกปุ่มพ้นขอบบนของแถบ 8 จุด
      let b = 0;
      for (const n of document.querySelectorAll<HTMLElement>(".banner")) {
        const r = n.getBoundingClientRect();
        if (r.height && r.right > innerWidth - 16 - 44) b = Math.max(b, innerHeight - r.top + 8);
      }
      setLift(b);
    };
    const later = () => { if (!raf) raf = requestAnimationFrame(measure); };
    const onScroll = () => {
      later();
      setAwake(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => setAwake(false), 1500);
    };
    const src: HTMLElement | Window = box ? el : window;
    src.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(later);
    const watch = () => { if (box) { ro.observe(el); for (const c of el.children) ro.observe(c); } else ro.observe(document.body); };
    watch();
    // กล่อง ดูลูกที่เพิ่มหรือหาย · ทั้งหน้า ดูหน้าต่างซ้อนกับแถบบอกผลที่วาดใต้ body ด้วย
    const mo = new MutationObserver(() => { watch(); later(); });
    if (box) mo.observe(el, { childList: true });
    else mo.observe(document.body, { childList: true, subtree: true });
    if (page) window.addEventListener("resize", later);
    measure();
    return () => {
      src.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", later);
      ro.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer);
    };
  }, [box, page]);

  const up = pos.up && !modal, down = pos.down && !modal;
  const go = (top: boolean) => {
    const el = box ? box.current : (document.scrollingElement as HTMLElement | null);
    if (el) glideBox(el, top ? 0 : el.scrollHeight);
  };
  return (
    <div className={`jumpwrap noprint${page ? " page" : ""}`} style={page && lift ? { bottom: lift } : undefined}>
      <button type="button" className="jumpbtn up" data-show={up} data-awake={awake} tabIndex={up ? 0 : -1} aria-hidden={!up} aria-label="ขึ้นบนสุด" title="ขึ้นบนสุด" onClick={() => go(true)}>
        <Icon name="up" size={15} />
      </button>
      <button type="button" className="jumpbtn down" data-show={down} data-awake={awake} tabIndex={down ? 0 : -1} aria-hidden={!down} aria-label="ลงล่างสุด" title="ลงล่างสุด" onClick={() => go(false)}>
        <Icon name="down" size={15} />
      </button>
    </div>
  );
}
