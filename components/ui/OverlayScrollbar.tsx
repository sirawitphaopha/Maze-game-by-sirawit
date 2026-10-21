"use client";

import { useEffect } from "react";

/**
 * เกมเขาวงกต ยกจาก warfarin-dash components/ui/OverlayScrollbar.tsx ทั้งไฟล์ (สกิล web-craft ข้อ 6.23 กฎกลางทุกเว็บ)
 * แถบเลื่อนลอย — ยกระบบมาจากเว็บ TB Dashboard ทั้งชุด (เจ้าของงานสั่งเอง 16 ก.ย. 2569)
 *
 * แถบเลื่อนของเบราว์เซอร์ถูกซ่อนทั้งเว็บใน globals.css แล้ววาดขึ้นมาใหม่เองด้วยตัวนี้
 *
 * 🔑 ทำไมต้องวาดเอง ไม่ใช้ของเบราว์เซอร์แล้วแต่งสีเอา
 *   ① WebKit ไม่ยอมค่อย ๆ จางสีของแถบเลื่อน สั่งได้แค่โผล่ปุ๊บหายปั๊บ
 *      ของที่วาดเองจึงจางเข้าจางออกได้เนียน
 *   ② แถบเลื่อนของเบราว์เซอร์ **กินที่จริง** พอโผล่มาทีเนื้อหาข้าง ๆ ขยับทั้งแถบ
 *      ของที่วาดเองลอยทับอยู่ข้างบน ไม่เบียดใครเลย
 *   ③ ตัวเดียวคุมทุกกล่องในเว็บ — หน้าใหม่ที่มีของให้เลื่อนไม่ต้องทำอะไรเพิ่มเลย
 *
 * จังหวะ — เลื่อนแล้วโผล่ใน 0.6 วิ · หยุด 0.4 วิแล้วเริ่มจาง · จางหมดใน 1.3 วิ
 *          เอาเมาส์ไปชี้หรือกำลังลากอยู่ = ค้างไว้ไม่จาง
 */

/** กล่องที่ตัวลากตัวนี้กำลังเกาะอยู่ + ธงสถานะ เก็บติดไว้กับตัว div เลย */
type Thumb = HTMLDivElement & {
  _el?: HTMLElement;
  _k?: ReturnType<typeof setTimeout>;
  /** ตัวจับเวลาตัดการรับเมาส์ — ต้องรอจนจางหมดจริงก่อน ห้ามตัดตั้งแต่เริ่มจาง */
  _k2?: ReturnType<typeof setTimeout>;
  _drag?: boolean;
  _hov?: boolean;
};

/** ระยะที่ถือว่าเมาส์ "เข้าใกล้ขอบ" แล้วให้แถบโผล่มาเอง */
const NEAR = 16;
/** หนาของตัวลากแนวตั้ง */
const THICK = 7;
/**
 * หนาของตัวลากแนวนอน — เท่าแนวตั้งเสมอ (เจ้าของงานสั่ง 21 ก.ย. 2569)
 * 🔴 เจ้าของงานสั่ง 21 ก.ย. 2569 *"แถบเลื่อนซ้ายขวาจะหายไปไหน มันเลื่อนยาก ให้มันแสดงตลอดสิ"*
 */
const THICK_H = THICK;
/** สั้นสุดของตัวลาก — สั้นกว่านี้จับยากเกินไป */
const MIN_LEN = 24;
/** สั้นสุดของตัวลากแนวนอน — ตารางกว้างมากจะได้ตัวลากสั้นจิ๋ว ต้องกันไว้ให้จับได้ */
const MIN_LEN_H = 40;

export default function OverlayScrollbar() {
  useEffect(() => {
    const make = (): Thumb => {
      const d = document.createElement("div") as Thumb;
      d.className = "ovthumb";
      document.body.appendChild(d);
      return d;
    };

    // แยกตัวลากแนวตั้งกับแนวนอน เพราะกล่องเดียวอาจเลื่อนได้ทั้งสองทาง
    const vt = make();
    vt.style.width = `${THICK}px`;
    const ht = make();
    ht.style.height = `${THICK_H}px`;
    ht.classList.add("ovthumb-h");

    /** ไล่หากล่องที่เลื่อนแนวตั้งได้ เริ่มจากตัวที่เมาส์ชี้แล้วเดินขึ้นไปหาแม่ */
    const scrollableV = (el: HTMLElement | null): HTMLElement | null => {
      while (el && el !== document.body) {
        if (el.scrollHeight > el.clientHeight + 1) {
          const o = getComputedStyle(el).overflowY;
          if (o === "auto" || o === "scroll") return el;
        }
        el = el.parentElement;
      }
      /**
       * 🔴🔴 ไม่เจอกล่องไหน = หน้านี้เลื่อนทั้งหน้า ตัวที่เลื่อนคือเอกสาร ไม่ใช่กล่องใน
       *    เดิมคืนค่าว่างตรงนี้ ผลคือเอาเมาส์ไปใกล้ขอบขวาของหน้าแล้วแถบไม่ยอมโผล่
       *    ซึ่งเป็นท่าปกติที่ทุกคนใช้กับแถบเลื่อน (เจ้าของงานเจอเอง 21 ก.ย. 2569)
       */
      const root = (document.scrollingElement || document.documentElement) as HTMLElement;
      if (root && root.scrollHeight > root.clientHeight + 1) return root;
      return null;
    };

    const scrollableH = (el: HTMLElement | null): HTMLElement | null => {
      while (el && el !== document.body) {
        if (el.scrollWidth > el.clientWidth + 1) {
          const o = getComputedStyle(el).overflowX;
          if (o === "auto" || o === "scroll") return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    /**
     * 🔴 กรอบของกล่อง — ต้องแยกกรณี "เลื่อนทั้งหน้า" ออกมาต่างหาก
     *    เพราะตัวเอกสารมีขอบบนติดลบทันทีที่เลื่อนลง (เลื่อนไป 9 จุด ขอบบนก็เป็น -9)
     *    เอาค่านั้นไปวางตัวลาก มันจะหลุดออกนอกจอด้านบนตามไปด้วย
     *    วัดได้จริงว่าโผล่ที่ -8.8 คือมองไม่เห็นเลย — ของต้นแบบก็มีจุดนี้ ลอกมาทั้งดุ้นไม่ได้
     *    เลื่อนทั้งหน้าต้องยึดกรอบของ "จอ" ไม่ใช่กรอบของเอกสาร
     */
    const boxOf = (el: HTMLElement) => {
      const root = el === document.documentElement || el === document.body;
      if (root) {
        return { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
      }
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    };

    /**
     * ความสูงของหัวตารางที่ตรึงอยู่ในกล่องนี้ ถ้ามี
     *
     * 🔴 เจ้าของงานสั่ง 23 ก.ย. 2569 ว่าแถบเลื่อนต้องเริ่มใต้หัวคอลัมน์
     *    หัวตารางที่ตรึงไว้จะลอยทับอยู่บนสุดของกล่องตลอดเวลา
     *    ถ้าแถบเริ่มที่ขอบบนของกล่อง มันจะไปเริ่มที่ระดับเดียวกับหัวคอลัมน์
     *    ซึ่งดูเหมือนแถบพาดทับหัวตาราง ทั้งที่ของที่เลื่อนจริงคือแถวข้อมูลที่อยู่ใต้หัว
     * 🚨 กล่องที่ไม่มีหัวตรึงจะได้ 0 จึงไม่กระทบหน้าอื่นเลยสักหน้า
     */
    const สูงหัวตรึง = (el: HTMLElement) => {
      const th = el.querySelector("thead th");
      if (!th) return 0;
      if (getComputedStyle(th).position !== "sticky") return 0;
      return Math.round(th.getBoundingClientRect().height);
    };

    /** วางตัวลากแนวตั้งให้ตรงกับตำแหน่งที่กล่องเลื่อนไปถึง */
    const posV = (el: HTMLElement) => {
      const r = boxOf(el);
      const หัว = สูงหัวตรึง(el);
      // พื้นที่ที่แถบเดินได้จริง คือส่วนที่เหลือหลังหักหัวตารางที่ตรึงไว้ออก
      const ช่อง = Math.max(MIN_LEN, el.clientHeight - หัว);
      // ยาวของตัวลาก = สัดส่วนที่มองเห็นเทียบกับของทั้งหมด
      const len = Math.max(MIN_LEN, (ช่อง * el.clientHeight) / el.scrollHeight);
      const run = el.scrollHeight - el.clientHeight;
      const at = run > 0 ? (el.scrollTop / run) * (ช่อง - len) : 0;
      const top = r.top + หัว + at;
      const left = r.right - THICK - 2;

      /**
       * 🔴🔴 กล่องเลื่อนพ้นจอไปแล้ว = ซ่อนแถบ ห้ามบีบให้กลับเข้ามาเด็ดขาด
       *    เคยใช้วิธีบีบค่าให้อยู่ในช่วง 0 ถึงความสูงจอ ผลคือพอกล่องเลื่อนพ้นขอบบน
       *    ค่าที่ได้ติดลบแล้วถูกบีบเป็น 0 แถบเลยไปกองเป็นเส้นพาดขอบบนของจอ
       *    ดูเหมือนเว็บพัง ทั้งที่แค่ควรจะหายไปเฉย ๆ — เจ้าของงานเจอเองแล้วถามว่า "อะไรเนี่ย"
       *    ของที่อยู่นอกจอต้องหายไป ไม่ใช่ถูกลากกลับมาให้เห็น
       */
      if (top + len < 0 || top > window.innerHeight || left < 0 || left > window.innerWidth) {
        hideNow(vt);
        return;
      }

      vt.style.height = `${len}px`;
      vt.style.top = `${top}px`;
      vt.style.left = `${left}px`;
      vt._el = el;
    };

    const posH = (el: HTMLElement) => {
      const r = boxOf(el);
      /**
       * 🔴 แถบเลื่อนของทั้งหน้า ต้องเริ่มหลังแถบเมนูซ้าย ห้ามลากพาดทับแถบเมนู
       *    เจ้าของงานทักเอง 21 ก.ย. 2569 *"สโครลมันควรเลยมาไหม"* — ไม่ควร
       *    แถบเมนูเป็นของลอยตรึงอยู่กับที่ ไม่ได้เลื่อนไปกับหน้า แถบเลื่อนจึงไม่เกี่ยวกับมัน
       */
      const nav = document.querySelector("[data-navbar]");
      const bandL = el === document.scrollingElement && nav ? nav.getBoundingClientRect().right : r.left;
      const bandW = Math.max(40, r.right - bandL);
      const len = Math.max(MIN_LEN_H, (bandW * el.clientWidth) / el.scrollWidth);
      const run = el.scrollWidth - el.clientWidth;
      const at = run > 0 ? (el.scrollLeft / run) * (bandW - len) : 0;
      const left = bandL + at;
      const top = r.bottom - THICK_H - 2;

      // 🔴 เช่นเดียวกับแนวตั้ง — พ้นจอแล้วต้องซ่อน ห้ามบีบกลับ
      if (left + len < 0 || left > window.innerWidth || top < 0 || top > window.innerHeight) {
        hideNow(ht);
        return;
      }

      ht.style.width = `${len}px`;
      ht.style.left = `${left}px`;
      ht.style.top = `${top}px`;
      ht._el = el;
    };

    /**
     * 🔴 ซ่อนทันที ไม่รอจาง — ใช้ตอนกล่องที่แถบเกาะอยู่หายไปจากจอ
     *    เช่นปิดเมนูที่กางอยู่ กล่องข้างในหายไปพร้อมเมนู
     *    ถ้าปล่อยให้จางตามปกติ แถบจะค้างลอยอยู่กลางหน้าเว็บอีกเป็นวินาที
     *    ทั้งที่ของที่มันเกาะอยู่ไม่มีแล้ว — เจ้าของงานเจอเองจากเมนูเลือกเภสัชกร
     */
    const hideNow = (t: Thumb) => {
      if (t._k) clearTimeout(t._k);
      t.style.transition = "none";
      t.style.opacity = "0";
      t.style.pointerEvents = "none";
      t._el = undefined;
    };


    /** โผล่ขึ้นมา แล้วตั้งเวลาจางลง — กำลังลากหรือเอาเมาส์ชี้อยู่ ให้ค้างไว้ */
    const show = (t: Thumb) => {
      t.style.transition = "opacity .6s ease";
      t.style.opacity = "1";
      t.style.pointerEvents = "auto";
      if (t._k) clearTimeout(t._k);
      if (t._k2) clearTimeout(t._k2);
      /**
       * 🔴🔴 แถบแนวนอนไม่จางหายเด็ดขาด เจ้าของงานสั่งเอง 21 ก.ย. 2569
       *    *"ไอ้แถบเลื่อนซ้ายขวาแม่งจะหายไปไหน มันเลื่อนยาก ให้มันแสดงตลอดสิ"*
       *
       *    แนวตั้งจางได้ เพราะทุกคนรู้อยู่แล้วว่าหน้าเว็บเลื่อนลงได้ และล้อเมาส์ก็เลื่อนให้
       *    แต่แนวนอนไม่มีใครเดาออกว่ามีของซ่อนอยู่ทางขวา และล้อเมาส์ก็เลื่อนไม่ได้
       *    ต้องลากแถบอย่างเดียว ถ้าแถบหายไปคือเลื่อนไม่ได้เลย
       */
      if (t === ht) return;
      t._k = setTimeout(() => {
        if (t._drag || t._hov) return;
        t.style.transition = "opacity 1.3s ease";
        t.style.opacity = "0";
        /**
         * 🔴🔴 ห้ามตัดการรับเมาส์ตรงนี้ — ระหว่างไล่จาง 1.3 วินาที แถบยังมองเห็นอยู่
         *    ตัดทันทีแล้วคนที่เห็นแถบกำลังจางแล้วรีบเอาเมาส์ไปโดน จะโดนไม่ติด
         *    มันจางต่อจนหายไปต่อหน้าต่อตา (เจ้าของงานเจอเอง 21 ก.ย. 2569)
         *    ต้องรอจนจางหมดจริงก่อนถึงตัด และถ้าเมาส์มาโดนระหว่างนั้นก็ยกเลิกไปเลย
         */
        t._k2 = setTimeout(() => {
          if (t._drag || t._hov) return;
          t.style.pointerEvents = "none";
        }, 1350);
      }, 400);
    };

    /**
     * 🔴🔴 แถบแนวนอนของทั้งหน้า ต้องโผล่เองตั้งแต่เปิดหน้า ไม่ต้องรอให้ใครไปเลื่อนก่อน
     *    เจ้าของงานสั่ง 21 ก.ย. 2569 — หน้าคลังยากว้างเกินจอ แต่แถบไม่โผล่จนกว่าจะเลื่อน
     *    ซึ่งเลื่อนไม่ได้อยู่แล้วถ้าไม่มีแถบให้ลาก กลายเป็นไก่กับไข่
     *
     * 🔑 เกาะกล่องที่เลื่อนทั้งหน้าเท่านั้น กล่องข้างในที่เลื่อนได้เองยังทำงานแบบเดิม
     *    (เอาเมาส์เข้าใกล้ขอบล่างของกล่องนั้นแล้วแถบจะย้ายไปเกาะให้)
     */
    const keepH = () => {
      if (ht._drag) return;
      /* 🔴 มีหน้าต่างซ้อนเปิดอยู่ = ซ่อนแถบทิ้ง ฉากหลังถูกล็อกไม่ให้เลื่อนอยู่แล้ว
         ปล่อยไว้จะเห็นแถบลอยพาดทับหน้าต่างซ้อน ดูเหมือนแถบโผล่มาจากไหนไม่รู้
         (เจ้าของงานเจอเอง 21 ก.ย. 2569 ตอนเปิดดรอปดาวน์ในป๊อปแก้ยา) */
      if (document.querySelector("[role=dialog]")) { hideNow(ht); return; }
      const root = (document.scrollingElement || document.documentElement) as HTMLElement;
      const wide = root.scrollWidth > root.clientWidth + 1;
      if (wide) { posH(root); show(ht); }
      else if (!ht._el || ht._el === root) hideNow(ht);
    };

    /**
     * 🔴🔴 แถบแนวตั้งต้องตามตำแหน่งใหม่ด้วยเมื่อผังหน้าเปลี่ยน ไม่ใช่เฉพาะตอนเลื่อน
     *    ย่อหน้าต่างหรือพับแถบเมนูซ้าย ขอบขวาของกล่องที่แถบเกาะอยู่ขยับทันที
     *    ถ้าไม่วางใหม่ แถบจะค้างอยู่ที่เดิม เห็นเป็นเส้นลอยอยู่กลางหน้าเว็บ
     *    (เจ้าของงานเจอเอง 21 ก.ย. 2569 ตอนพับเมนูซ้าย)
     *    เดิมตัวฟังการเปลี่ยนขนาดเรียกแต่ keepH ของแนวนอน แนวตั้งจึงไม่เคยถูกวางใหม่เลย
     */
    const keepV = () => {
      if (vt._drag) return;
      const el = vt._el;
      if (el && el.isConnected) posV(el);
      else hideNow(vt);
    };

    const onScroll = (e: Event) => {
      let el = e.target as HTMLElement | Document | null;
      // เลื่อนทั้งหน้า ตัวที่ยิงมาคือเอกสาร ไม่ใช่กล่อง ต้องแปลงเป็นตัวที่วัดขนาดได้
      if (el === document) el = (document.scrollingElement || document.documentElement) as HTMLElement;
      const box = el as HTMLElement | null;
      if (!box || !box.getBoundingClientRect) return;
      if (box.scrollHeight > box.clientHeight + 1) { posV(box); show(vt); }
      if (box.scrollWidth > box.clientWidth + 1) { posH(box); show(ht); }
    };

    /** เมาส์เข้าใกล้ขอบกล่องที่เลื่อนได้ → แถบโผล่มาให้ลากได้เลย โดยไม่ต้องเลื่อนก่อน */
    const onMove = (e: MouseEvent) => {
      if (vt._drag || ht._drag) return;
      const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!under || under === vt || under === ht) return;

      const ev = scrollableV(under);
      if (ev) {
        /* 🔑 ใช้ boxOf ไม่ใช่กรอบของตัวเอง — หน้าที่กว้างเกินจอ กรอบเอกสารจะกว้างกว่าจอ
           เทียบกับตำแหน่งเมาส์แล้วจะไม่มีวันเข้าเงื่อนไข แถบเลยไม่โผล่ */
        const r = boxOf(ev);
        if (e.clientX >= r.right - NEAR && e.clientX <= r.right + 4 && e.clientY >= r.top && e.clientY <= r.bottom) {
          posV(ev); show(vt);
        }
      }
      const eh = scrollableH(under);
      if (eh) {
        const r = boxOf(eh);
        if (e.clientY >= r.bottom - NEAR && e.clientY <= r.bottom + 4 && e.clientX >= r.left && e.clientX <= r.right) {
          posH(eh); show(ht);
        }
      }
    };

    const hoverOn = (t: Thumb) => () => {
      t._hov = true;
      t.style.transition = "opacity .6s ease";
      t.style.opacity = "1";
      t.style.pointerEvents = "auto";
    };
    const hoverOff = (t: Thumb) => () => { t._hov = false; show(t); };

    const onVEnter = hoverOn(vt), onVLeave = hoverOff(vt);
    const onHEnter = hoverOn(ht), onHLeave = hoverOff(ht);
    vt.addEventListener("mouseenter", onVEnter);
    vt.addEventListener("mouseleave", onVLeave);
    ht.addEventListener("mouseenter", onHEnter);
    ht.addEventListener("mouseleave", onHLeave);

    /** ลากตัวแถบเพื่อเลื่อนกล่อง — ไม่มีอันนี้ แถบจะเป็นแค่ของประดับที่กดไม่ได้ */
    const dragV = (e: MouseEvent) => {
      e.preventDefault();
      const el = vt._el;
      if (!el) return;
      vt._drag = true;
      const startY = e.clientY, startTop = el.scrollTop;
      const len = vt.offsetHeight;
      const run = el.scrollHeight - el.clientHeight;
      const track = el.clientHeight - len;
      const move = (ev: MouseEvent) => {
        if (track > 0) el.scrollTop = startTop + ((ev.clientY - startY) / track) * run;
      };
      const up = () => {
        vt._drag = false;
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        show(vt);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    };

    const dragH = (e: MouseEvent) => {
      e.preventDefault();
      const el = ht._el;
      if (!el) return;
      ht._drag = true;
      const startX = e.clientX, startLeft = el.scrollLeft;
      const len = ht.offsetWidth;
      const run = el.scrollWidth - el.clientWidth;
      const track = el.clientWidth - len;
      const move = (ev: MouseEvent) => {
        if (track > 0) el.scrollLeft = startLeft + ((ev.clientX - startX) / track) * run;
      };
      const up = () => {
        ht._drag = false;
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        show(ht);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    };

    vt.addEventListener("mousedown", dragV);
    ht.addEventListener("mousedown", dragH);

    /**
     * 🔴 ของที่แถบเกาะอยู่ถูกถอดออกจากหน้าเมื่อไหร่ ให้แถบหายทันที
     *
     *    ปิดดรอปดาวน์ กล่องรายการข้างในถูกถอดออกไปเลย ไม่มีเหตุการณ์เลื่อนใด ๆ เกิดขึ้น
     *    ไม่มีตัวฟัง แถบจะค้างลอยอยู่กลางหน้าเว็บจนกว่าจะมีคนไปเลื่อนอะไรสักอย่าง
     *
     * 🔑 ใช้ตัวฟังการเปลี่ยนแปลงของหน้า ไม่ใช่ตัวจับเวลาหรือวนทุกเฟรม
     *    เพราะมันทำงานทันทีที่ของถูกถอด — แถบจึงหายพร้อมดรอปดาวน์ในจังหวะเดียวกัน
     *    เคยลองตัวจับเวลา 150 มิลลิวินาที เจ้าของงานเห็นว่าช้า "ประมาณเสี้ยววิ"
     */
    let วางคิว = 0;
    const ตามผัง = () => {
      if (วางคิว) return;
      วางคิว = window.requestAnimationFrame(() => { วางคิว = 0; keepH(); keepV(); });
    };

    const gone = new MutationObserver(() => {
      for (const t of [vt, ht]) {
        if (t._el && !t._el.isConnected) hideNow(t);
      }
      // หน้าเปลี่ยนเนื้อหา ตารางกว้างขึ้นหรือแคบลงได้ แถบทั้งสองทิศต้องตามให้ทัน
      ตามผัง();
    });
    gone.observe(document.body, { childList: true, subtree: true });

    /**
     * 🔴🔴 ขนาดหน้าต่างเปลี่ยน หรือแถบเมนูซ้ายพับ ความกว้างที่เลื่อนได้ก็เปลี่ยนตาม
     *    แต่การพับแถบเมนูเป็นการไล่ความกว้างทีละนิด ตัวเฝ้าขนาดจึงยิงทุกเฟรมตลอดช่วงนั้น
     *    ถ้าคำนวณตำแหน่งแถบใหม่ทุกครั้งที่ยิง = อ่านตำแหน่งกล่องจริงทุกเฟรม
     *    เบราว์เซอร์ต้องคำนวณผังหน้าใหม่ทั้งหน้าที่มีสี่ร้อยกว่าแถว เว็บจึงกระตุก
     *    (เจ้าของงานเจอเอง 21 ก.ย. 2569 ตอนพับแถบเมนู)
     * 🔑 รวบให้เหลือครั้งเดียวต่อเฟรมด้วย requestAnimationFrame
     *    เรียกกี่ครั้งในเฟรมเดียวก็คิดหนเดียว ผลที่ได้เหมือนเดิมทุกอย่าง
     */
    const onResize = ตามผัง;
    window.addEventListener("resize", onResize);
    const bodyRo = new ResizeObserver(ตามผัง);
    bodyRo.observe(document.body);
    /**
     * 🔴🔴 ต้องเฝ้าแถบเมนูซ้ายด้วย ไม่ใช่เฝ้าแค่ตัวหน้า
     *    แถบเมนูเป็นของลอยตรึงอยู่กับที่ พับหรือกางแล้ว "ขนาดของหน้าไม่เปลี่ยน"
     *    ตัวเฝ้าหน้าจึงไม่ยิงเลย แถบเลื่อนแนวนอนค้างอยู่ที่ขอบเมนูอันเก่า
     *    เห็นเป็นแถบลากพาดทับแถบเมนู (เจ้าของงานเจอเอง 21 ก.ย. 2569)
     *    ความกว้างของมันยังไล่ทีละนิด 0.2 วินาที ตัวเฝ้าจึงยิงหลายครั้ง
     *    แต่ ตามผัง รวบให้เหลือครั้งเดียวต่อเฟรมอยู่แล้ว จึงไม่หนัก
     */
    const navEl = document.querySelector("[data-navbar]");
    const navRo = navEl ? new ResizeObserver(ตามผัง) : null;
    if (navEl && navRo) navRo.observe(navEl);
    keepH();

    // 🔑 ต้องดักแบบ capture เพราะเหตุการณ์เลื่อนของกล่องข้างในไม่ลอยขึ้นมาถึงหน้าต่าง
    //    ไม่ใส่ true เมื่อไหร่ แถบจะทำงานเฉพาะตอนเลื่อนทั้งหน้า ส่วนกล่องข้างในเงียบสนิท
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      bodyRo.disconnect();
      if (navRo) navRo.disconnect();
      gone.disconnect();
      vt.removeEventListener("mouseenter", onVEnter);
      vt.removeEventListener("mouseleave", onVLeave);
      ht.removeEventListener("mouseenter", onHEnter);
      ht.removeEventListener("mouseleave", onHLeave);
      vt.removeEventListener("mousedown", dragV);
      ht.removeEventListener("mousedown", dragH);
      // 🔴 ตัวจับเวลาต้องล้างด้วย ไม่งั้นมันไปสั่งของที่ถูกเก็บไปแล้ว
      if (vt._k) clearTimeout(vt._k);
      if (ht._k) clearTimeout(ht._k);
      vt.remove();
      ht.remove();
    };
  }, []);

  return null;
}
