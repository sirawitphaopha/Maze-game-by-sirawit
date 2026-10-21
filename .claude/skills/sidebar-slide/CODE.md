# โค้ดยกไปวางได้ — กดย่อขยายแถบเมนูแล้วลื่น

> อ่าน `SKILL.md` ก่อน เลือกเงื่อนไขให้ถูก (ก ตารางกว้างเกินจอ · ข ตารางพอดีจอมีคอลัมน์ยืด) แล้วค่อยยกโค้ดจากที่นี่
> ของจริงที่ทำงานอยู่ — เว็บ warfarin `app/drugs/page.tsx` (เงื่อนไข ก) · `app/sig/page.tsx` + `lib/useVisibleRows.ts` (เงื่อนไข ข)

---

## 0 · ของที่ต้องมีอยู่แล้วในโครงหน้า

กล่องเนื้อหาข้างแถบเมนูต้องตั้ง `--nav-w` และเลื่อนขอบซ้ายด้วยจังหวะ 0.2 วินาที

```tsx
<div style={{
  marginInlineStart: navOpen ? NAV_W_OPEN : NAV_W_MINI,
  ["--nav-w" as string]: `${navOpen ? NAV_W_OPEN : NAV_W_MINI}px`,
  transition: "margin-inline-start .2s ease",
} as React.CSSProperties}>
```

🔴 จังหวะ `.2s ease` ข้างล่างทุกตัวต้องตรงกับบรรทัด `transition` ตรงนี้ เปลี่ยนที่หนึ่งต้องเปลี่ยนทุกที่

---

## 1 · เงื่อนไข ก — ตารางกว้างเกินจอ

```tsx
const CARD_MIN = 1270; // กว้างกว่าพื้นที่เนื้อหาตอนกางแถบเมนูบนจอที่ใช้จริง

<div className="card" style={{
  width: "max(" + CARD_MIN + "px, calc(100vw - var(--nav-w, 0px) - " + PAGE_PAD * 2 + "px))",
}}>
  {/* ชิ้นที่ตรึงซ้ายขวา คิดตำแหน่งจากแถบเมนู ต้องไล่จังหวะเดียวกับแถบเมนู */}
  <div style={{
    position: "sticky", insetInlineStart: "calc(var(--nav-w, 0px) + 21px)",
    width: "calc(100vw - var(--nav-w, 0px) - 56px)",
    transition: "inset-inline-start .2s ease, width .2s ease",
  }}>หัวเรื่อง</div>

  <table className="tbl-grid">
    <colgroup>{/* ทุกคอลัมน์มีความกว้าง ไม่มีคอลัมน์ยืด */}</colgroup>
    ...
  </table>
</div>
```

```css
.tbl-grid { table-layout: fixed; width: 100%; transform: translateZ(0); will-change: transform }
```

---

## 2 · เงื่อนไข ข ชิ้น ① — ตัวแปรความกว้างแถบเมนูแบบค่อย ๆ เปลี่ยน

ไฟล์ธีม (ประกาศครั้งเดียว)

```css
/* 🔴 ไม่สืบทอด (inherits: false) ต้องตั้งที่ชิ้นที่ใช้ทีละชิ้น
   ห้ามเปลี่ยนเป็นสืบทอดแล้วตั้งที่กล่องนอกสุด คิดสไตล์ใหม่ทั้งหน้าทุกเฟรม 50 ถึง 80 ms */
@property --nav-w-ease { syntax: "<length>"; inherits: false; initial-value: 0px; }
```

ในหน้า

```tsx
/** ใส่ให้ทุกชิ้นที่คิดตำแหน่งหรือความกว้างจากแถบเมนู แล้วอ่าน --nav-w-ease แทน --nav-w */
const ตามแถบเมนู = {
  ["--nav-w-ease" as string]: "var(--nav-w, 0px)",
  transition: "--nav-w-ease .2s ease",
} as React.CSSProperties;

// การ์ด
<div className="card" style={{
  ...ตามแถบเมนู,
  width: "max(980px, calc(100vw - var(--nav-w-ease, 0px) - " + PAGE_PAD * 2 + "px))",
}}>

// ชิ้นที่ตรึงซ้ายขวา (หัวเรื่อง แถวแท็บ แถบเครื่องมือ) — 🔴 ไม่ต้องใส่ transition ของ inset หรือ width ซ้อนอีก
<div style={{
  ...ตามแถบเมนู,
  position: "sticky", insetInlineStart: "calc(var(--nav-w-ease, 0px) + 21px)",
  width: "calc(100vw - var(--nav-w-ease, 0px) - 56px)",
}}>
```

---

## 3 · เงื่อนไข ข ชิ้น ② — วาดเฉพาะแถวที่เห็น

### `lib/useVisibleRows.ts` ยกไปทั้งไฟล์

```ts
"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * วาดเฉพาะแถวที่เห็นในกรอบตาราง
 * วาดแถวที่อยู่ในกรอบตอนนี้ เผื่อบนล่างอย่างละหนึ่งจอ ที่เหลือแทนด้วยแถวเว้นที่ (บนหนึ่งแถว ล่างหนึ่งแถว)
 * แถวเว้นที่สูงเท่าแถวจริงที่มันแทน แถบเลื่อนจึงยาวเท่าเดิม เลื่อนแล้วตำแหน่งตรงเดิม
 * ความสูงแถวจริงวัดจากจอแล้วจำไว้ตามรหัสแถว แถวที่ยังไม่เคยวาดใช้ค่าเฉลี่ยของแถวที่วัดได้
 *
 * 🔴 ความสูงที่วัดได้ใหม่ เก็บเข้าหลังขนาดตารางนิ่งแล้ว 80 ms
 *    ระหว่างเลื่อนแถบเมนู ข้อความตัดบรรทัดใหม่ทุกเฟรม ถ้าเก็บทันทีหน้าทั้งหน้าต้องวาดใหม่ทุกเฟรม กลายเป็นกระตุกเอง
 * 🔴 ตำแหน่งเลื่อนเก็บเป็นขั้นละ ขั้นเลื่อน จุด ไม่ใช่ทุกจุด
 *    เลื่อนทีละนิดไม่ต้องวาดหน้าใหม่ วาดใหม่เฉพาะตอนข้ามขั้น ระยะเผื่อมากกว่าหนึ่งขั้นเสมอ ขอบแถวจึงไม่โผล่ให้เห็น
 */

/** ระยะเผื่อบนล่างอย่างน้อยเท่านี้ ถึงกรอบตารางจะเตี้ยกว่านี้ */
const เผื่ออย่างน้อย = 400;
/** เลื่อนครบขั้นละเท่านี้ ถึงจะคิดแถวที่ต้องวาดใหม่ */
const ขั้นเลื่อน = 100;
/** ยังไม่รู้ความสูงกรอบ (วาดรอบแรก) ถือว่าสูงเท่านี้ไปก่อน วาดรอบแรกจะได้เต็มจอเสมอ */
const สูงกรอบตั้งต้น = 1000;
/** ยังไม่เคยวัดแถวไหนเลย ถือว่าแถวสูงเท่านี้ไปก่อน */
const สูงแถวตั้งต้น = 40;

export function useVisibleRows<T>(rows: readonly T[], keyOf: (row: T) => string) {
  /* กรอบที่เลื่อนได้ กับตัว tbody · ใช้ state ไม่ใช่ ref เพราะตารางโผล่ทีหลัง (ตอนข้อมูลมาแล้ว) และหายไปตอนสลับแท็บ */
  const [กรอบ, setกรอบ] = useState<HTMLElement | null>(null);
  const [ตัวแถว, setตัวแถว] = useState<HTMLTableSectionElement | null>(null);
  /* el จำไว้ด้วยว่าค่านี้อ่านจากกรอบไหน สลับแท็บกลับมา กรอบใหม่เริ่มที่บนสุด ห้ามใช้ตำแหน่งของกรอบเก่า */
  const [มอง, setมอง] = useState<{ el: HTMLElement | null; บน: number; สูง: number }>({ el: null, บน: 0, สูง: 0 });
  const [สูงจริง, setสูงจริง] = useState<ReadonlyMap<string, number>>(() => new Map());

  useEffect(() => {
    if (!กรอบ) return;
    let คิว = 0;
    const อ่าน = () => {
      คิว = 0;
      const บน = Math.floor(กรอบ.scrollTop / ขั้นเลื่อน) * ขั้นเลื่อน;
      const สูง = กรอบ.clientHeight;
      setมอง((p) => (p.el === กรอบ && p.บน === บน && p.สูง === สูง ? p : { el: กรอบ, บน, สูง }));
    };
    const ขอ = () => { if (!คิว) คิว = requestAnimationFrame(อ่าน); };
    กรอบ.addEventListener("scroll", ขอ, { passive: true });
    const ro = new ResizeObserver(ขอ);
    ro.observe(กรอบ);
    return () => {
      กรอบ.removeEventListener("scroll", ขอ);
      ro.disconnect();
      cancelAnimationFrame(คิว);
    };
  }, [กรอบ]);

  /* วัดความสูงแถวจริงทุกครั้งที่ tbody เปลี่ยนขนาด (แถวชุดใหม่ ข้อความตัดบรรทัดใหม่ เปลี่ยนความสูงแถว) */
  useEffect(() => {
    if (!ตัวแถว) return;
    const ที่วัดได้ = new Map<string, number>();
    let ตั้งเวลา: ReturnType<typeof setTimeout> | undefined;
    const วัด = () => {
      for (const tr of Array.from(ตัวแถว.rows)) {
        const k = tr.dataset.k;
        if (k) ที่วัดได้.set(k, tr.getBoundingClientRect().height);
      }
      clearTimeout(ตั้งเวลา);
      ตั้งเวลา = setTimeout(() => {
        const ชุดนี้ = new Map(ที่วัดได้);
        ที่วัดได้.clear();
        setสูงจริง((เดิม) => {
          let ต่าง = false;
          for (const [k, h] of ชุดนี้) if (Math.abs((เดิม.get(k) ?? -1) - h) > 0.5) { ต่าง = true; break; }
          if (!ต่าง) return เดิม;
          const ใหม่ = new Map(เดิม);
          for (const [k, h] of ชุดนี้) ใหม่.set(k, h);
          return ใหม่;
        });
      }, 80);
    };
    const ro = new ResizeObserver(วัด);
    ro.observe(ตัวแถว);
    return () => {
      ro.disconnect();
      clearTimeout(ตั้งเวลา);
    };
  }, [ตัวแถว]);

  const สูงเฉลี่ย = useMemo(() => {
    if (!สูงจริง.size) return สูงแถวตั้งต้น;
    let รวม = 0;
    for (const h of สูงจริง.values()) รวม += h;
    return รวม / สูงจริง.size;
  }, [สูงจริง]);

  const สูงของ = (r: T) => สูงจริง.get(keyOf(r)) ?? สูงเฉลี่ย;
  const บน = มอง.el === กรอบ ? มอง.บน : 0;
  const สูงกรอบ = มอง.el === กรอบ && มอง.สูง ? มอง.สูง : สูงกรอบตั้งต้น;
  const เผื่อ = Math.max(เผื่ออย่างน้อย, สูงกรอบ);

  let y = 0;
  let เริ่ม = 0;
  while (เริ่ม < rows.length) {
    const h = สูงของ(rows[เริ่ม]);
    if (y + h > บน - เผื่อ) break;
    y += h;
    เริ่ม++;
  }
  const เว้นบน = y;
  let จบ = เริ่ม;
  /* บวกหนึ่งขั้นเลื่อน เพราะตำแหน่งที่เก็บปัดลงเป็นขั้น ขอบล่างจริงอาจเลยไปได้เกือบหนึ่งขั้น */
  while (จบ < rows.length && y < บน + สูงกรอบ + เผื่อ + ขั้นเลื่อน) {
    y += สูงของ(rows[จบ]);
    จบ++;
  }
  let เว้นล่าง = 0;
  for (let i = จบ; i < rows.length; i++) เว้นล่าง += สูงของ(rows[i]);

  /* 🔴 ชื่อตัวผูกห้ามขึ้นต้นด้วย ref และหน้าที่เรียกต้องแยกค่าออกมาเป็นตัวแปรทีละตัว
        ไม่งั้นตัวตรวจโค้ดของ React เข้าใจว่าทั้งก้อนเป็นตัวอ้างอิงหน้าเว็บ แล้วฟ้องทุกจุดที่อ่านค่าตอนวาด */
  return {
    /** ใส่ที่ ref ของกล่องที่เลื่อนได้ (กล่องที่มี overflowY auto) */
    ผูกกรอบ: setกรอบ,
    /** ใส่ที่ ref ของ tbody · แถวจริงทุกแถวต้องมี data-k เป็นรหัสแถว ตัววัดความสูงอ่านจากตรงนี้ */
    ผูกตัวแถว: setตัวแถว,
    แถว: rows.slice(เริ่ม, จบ),
    เว้นบน,
    เว้นล่าง,
  };
}
```

### ไฟล์ธีม — แถวเว้นที่

```css
/* แถวเว้นที่ แทนแถวที่ไม่ได้วาดเพราะอยู่นอกกรอบ ต้องว่างจริง ความสูงที่ตั้งไว้จะได้ตรงกับแถวจริงที่มันแทน
   overflow-anchor: none กันเบราว์เซอร์เลือกแถวนี้เป็นหลักยึดตอนรักษาตำแหน่งเลื่อน ต้องยึดแถวจริงเท่านั้น
   🔴 ตัวเลือกต้องเจาะจงกว่ากฎ td ของตารางเว็บนั้น ไม่งั้นระยะในกับเส้นของตารางชนะ แถวเว้นที่สูงเกิน
      ที่ warfarin เขียนเป็น .tbl-grid tbody tr.sig-pad td */
.tbl-grid tbody tr.vr-pad { pointer-events: none; overflow-anchor: none; content-visibility: visible; }
.tbl-grid tbody tr.vr-pad td { padding: 0; border: 0; box-shadow: none; background: transparent; }
```

### ในหน้า

```tsx
import { useVisibleRows } from "@/lib/useVisibleRows";

// 🔴 แยกค่าออกมาทีละตัว ห้ามเก็บทั้งก้อนไว้ในตัวแปรเดียวแล้วอ่าน .แถว .เว้นบน ตอนวาด
const { แถว: แถวในกรอบ, เว้นบน, เว้นล่าง, ผูกกรอบ, ผูกตัวแถว } = useVisibleRows(แถวทั้งหมด, (r) => r.id);

<div ref={ผูกกรอบ} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
  <table className="tbl-grid" style={{ ["--nav-w" as string]: "0px" } as React.CSSProperties /* ชิ้น ③ */}>
    <colgroup>...</colgroup>
    <thead>...</thead>
    <tbody ref={ผูกตัวแถว}>
      {เว้นบน > 0 && (
        <tr aria-hidden="true" className="vr-pad"><td colSpan={จำนวนคอลัมน์} style={{ height: เว้นบน }} /></tr>
      )}
      {แถวในกรอบ.map((r) => (
        <tr key={r.id} data-k={r.id}>...</tr>
      ))}
      {เว้นล่าง > 0 && (
        <tr aria-hidden="true" className="vr-pad"><td colSpan={จำนวนคอลัมน์} style={{ height: เว้นล่าง }} /></tr>
      )}
    </tbody>
  </table>
</div>

{/* 🔴 ตัวนับกับปุ่มแสดงทั้งหมด นับจากรายการเต็ม ไม่ใช่ แถวในกรอบ */}
```

---

## 4 · เงื่อนไข ข ชิ้น ③ — ตัวกันตารางคิดสไตล์ใหม่

อยู่ในโค้ดข้อ 3 แล้ว — `style={{ "--nav-w": "0px" }}` ที่ตัว `<table>`
🔴 ก่อนใส่ ค้นให้แน่ใจว่าไม่มีชิ้นไหนข้างในตารางอ่าน `--nav-w`

---

## 5 · สคริปต์วัดเฟรมจริง — วางในคอนโซลของแท็บโครมที่มองเห็นอยู่

```js
// 🔴 แท็บต้องมองเห็นอยู่ แท็บที่ถูกบังไม่วาดเฟรม ได้ตัวเลขหลอก
// ปุ่มพับแถบเมนูของเว็บ warfarin มีป้าย "ย่อแถบเมนู" / "ขยายแถบเมนู" เว็บอื่นแก้ตัวค้นปุ่มให้ตรง
async function วัดพับแถบเมนู() {
  const ปุ่ม = [...document.querySelectorAll("button")].find((b) => /แถบเมนู/.test(b.getAttribute("aria-label") || ""));
  const ยาว = [];
  const po = new PerformanceObserver((l) => ยาว.push(...l.getEntries()));
  po.observe({ type: "long-animation-frame" });
  const เวลา = []; let วิ่ง = true;
  const วน = (t) => { เวลา.push(t); if (วิ่ง) requestAnimationFrame(วน); };
  requestAnimationFrame(วน);
  await new Promise((r) => setTimeout(r, 300));
  const t0 = performance.now();
  ปุ่ม.click();
  await new Promise((r) => setTimeout(r, 700));
  วิ่ง = false; po.disconnect();
  const หลัง = เวลา.filter((x) => x >= t0);
  const ห่าง = หลัง.map((x, i) => +(x - (i ? หลัง[i - 1] : t0)).toFixed(1)).slice(0, 16);
  return {
    ทิศ: ปุ่ม.getAttribute("aria-label"),
    ช่วงห่างเฟรม: ห่าง.join(" "),          // 16.7 = ลื่น · 33 50 66 = หลุดเฟรม
    เฟรมเกิน20ms: ห่าง.filter((g) => g > 20).length,
    เฟรมยาว: ยาว.filter((e) => e.startTime >= t0 - 5)
      .map((e) => Math.round(e.duration) + "ms " + e.scripts.map((s) => s.sourceFunctionName || s.invoker).join(",")),
  };
}
await วัดพับแถบเมนู(); // เรียกสองครั้ง ได้ทั้งตอนย่อและตอนขยาย
```

หาตัวถ่วงด้วยการแปะ CSS ชั่วคราวในแท็บทดสอบ แล้ววัดซ้ำ — 🔴 รายงานทุกครั้งว่าแปะทับชั่วคราว ไม่แตะโค้ด

```js
const ลอง = (css) => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); return s; };
const s1 = ลอง("table.tbl-grid tbody{display:none!important}");        // ลื่น = ตัวถ่วงอยู่ที่แถว
s1.remove();
const s2 = ลอง("table.tbl-grid{width:940px!important}");               // ลื่น = ตัวถ่วงคือความกว้างที่เปลี่ยน
s2.remove();
```
