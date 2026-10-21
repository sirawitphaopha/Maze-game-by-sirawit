"use client";

import { useEffect } from "react";
import { subscribeLang, getLang, toEn } from "@/lib/lang";

/* ตัวแปลข้อความบนจอทั้งหน้าเป็นภาษาอังกฤษ ตอนเลือกภาษาอังกฤษ (lib/lang.ts)
   · เปลี่ยนค่าในโหนดข้อความเดิมตรงตัว ไม่สร้างโหนดใหม่ React จึงยังจัดการหน้าเว็บได้ตามปกติ
     (ตัวแปลของเบราว์เซอร์ที่พังกับ React เพราะเอาแท็กใหม่ไปห่อ ตัวนี้ไม่ทำแบบนั้น)
   · React เปลี่ยนข้อความเมื่อไหร่ ตัวเฝ้า (MutationObserver) แปลซ้ำทันทีก่อนจอวาด จึงไม่เห็นภาษาไทยแวบ
   · จำข้อความไทยของแต่ละโหนดไว้ สลับกลับเป็นไทยแล้วคืนของเดิมทุกจุด
   · แปลแอตทริบิวต์ที่คนอ่านหรือโปรแกรมอ่านจอใช้ด้วย title aria-label placeholder alt
   · ไม่แตะของในแท็กที่ติด data-notr (ปุ่มสลับภาษาเขียนชื่อภาษาของตัวเอง) */

const THAI = /[฀-๿]/;
const ATTRS = ["title", "aria-label", "placeholder", "alt"];
const origText = new WeakMap<Text, string>();
const origAttr = new WeakMap<Element, Record<string, string>>();
let origTitle: string | null = null;

const skip = (el: Element | null) => !el || !!el.closest("script, style, [data-notr]");

function doText(n: Text) {
  const v = n.nodeValue || "";
  if (!THAI.test(v) || skip(n.parentElement)) return;
  origText.set(n, v);
  const e = toEn(v);
  if (e !== v) n.nodeValue = e;
}

function doAttrs(el: Element) {
  if (skip(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || !THAI.test(v)) continue;
    const rec = origAttr.get(el) || {};
    rec[a] = v;
    origAttr.set(el, rec);
    const e = toEn(v);
    if (e !== v) el.setAttribute(a, e);
  }
}

function doTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { doText(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  doAttrs(el);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
    else doAttrs(n as Element);
  }
}

// เปลี่ยนเฉพาะเมื่อได้คำแปลจริง ตั้งค่าเดิมซ้ำก็นับเป็นการเปลี่ยน ตัวเฝ้าจะเรียกตัวเองวนไม่จบจนหน้าค้าง (เจอจริงตอนทดสอบ)
function doTitle() {
  const v = document.title;
  if (!THAI.test(v)) return;
  const e = toEn(v);
  if (e !== v) { origTitle = v; document.title = e; }
}

function restoreAll() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const o = origText.get(n as Text);
      if (o !== undefined && !THAI.test(n.nodeValue || "")) n.nodeValue = o;
    } else {
      const rec = origAttr.get(n as Element);
      if (rec) for (const [a, v] of Object.entries(rec)) { const cur = (n as Element).getAttribute(a); if (cur && !THAI.test(cur)) (n as Element).setAttribute(a, v); }
    }
  }
  if (origTitle && !THAI.test(document.title)) document.title = origTitle;
}

export default function Translator() {
  useEffect(() => {
    let mo: MutationObserver | null = null;
    const start = () => {
      if (mo) return;
      doTree(document.body);
      doTitle();
      mo = new MutationObserver((recs) => {
        for (const r of recs) {
          if (r.type === "characterData") doText(r.target as Text);
          else if (r.type === "attributes") doAttrs(r.target as Element);
          else r.addedNodes.forEach((n) => doTree(n));
        }
        doTitle();
      });
      mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      // หัวแท็บเบราว์เซอร์เปลี่ยนตามหน้า
      const t = document.querySelector("title");
      if (t) mo.observe(t, { childList: true, characterData: true, subtree: true });
    };
    const stop = () => { mo?.disconnect(); mo = null; restoreAll(); };
    const sync = () => (getLang() === "en" ? start() : stop());
    sync();
    const un = subscribeLang(sync);
    return () => { un(); mo?.disconnect(); };
  }, []);
  return null;
}
