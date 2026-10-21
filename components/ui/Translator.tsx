"use client";

import { useEffect } from "react";
import { subscribeLang, getLang, toEn } from "@/lib/lang";

/* ตัวแปลข้อความบนจอทั้งหน้าเป็นภาษาอังกฤษ ตอนเลือกภาษาอังกฤษ (lib/lang.ts)
   · เปลี่ยนค่าในโหนดข้อความเดิมตรงตัว ไม่สร้างโหนดใหม่ React จึงยังจัดการหน้าเว็บได้ตามปกติ
     (ตัวแปลของเบราว์เซอร์ที่พังกับ React เพราะเอาแท็กใหม่ไปห่อ ตัวนี้ไม่ทำแบบนั้น)
   · React เปลี่ยนข้อความเมื่อไหร่ ตัวเฝ้า (MutationObserver) แปลซ้ำทันทีก่อนจอวาด จึงไม่เห็นภาษาไทยแวบ
   · จำข้อความไทยของแต่ละโหนดไว้ สลับกลับเป็นไทยแล้วคืนของเดิมทุกจุด
   · แปลแอตทริบิวต์ที่คนอ่านหรือโปรแกรมอ่านจอใช้ด้วย title aria-label placeholder alt label (label = หัวกลุ่มในช่องเลือก)
   · คืนไทยเฉพาะโหนดที่ค่ายังเป็นคำแปลที่ตัวแปลตั้งไว้ · React เปลี่ยนค่าไปแล้ว (เช่นเวลาดีสุดจาก ไม่มี เป็น 0:45.3) ห้ามเอาไทยเก่ามาทับ
     เดิมคืนทุกโหนดที่ไม่มีอักษรไทย ตัวเลขใหม่โดนคำไทยเก่าทับ (docs/BUGHUNT-2026-10-21.md ข้อ 6)
   · คำแปลที่ยังมีไทยปน ห้ามจำเป็นต้นฉบับ (เดิมจำทับ สลับกลับไทยแล้วค้างภาษาผสม ข้อ 7)
   · ไม่แตะของในแท็กที่ติด data-notr (ปุ่มสลับภาษาเขียนชื่อภาษาของตัวเอง) */

const THAI = /[฀-๿]/;
// data-label = ป้ายหัวคอลัมน์ในการ์ดหน้าประวัติบนมือถือ (app/mobile.css แสดงด้วย attr())
const ATTRS = ["title", "aria-label", "placeholder", "alt", "label", "data-label"];
const origText = new WeakMap<Text, string>();
const origAttr = new WeakMap<Element, Record<string, string>>();
/** ค่าที่ตัวแปลตั้งไว้เอง ใช้แยกว่าค่าบนจอตอนนี้เป็นคำแปลของเรา หรือ React เปลี่ยนไปแล้ว */
const setText = new WeakMap<Text, string>();
const setAttr = new WeakMap<Element, Record<string, string>>();
let origTitle: string | null = null;

const skip = (el: Element | null) => !el || !!el.closest("script, style, [data-notr]");

function doText(n: Text) {
  const v = n.nodeValue || "";
  if (v === setText.get(n)) return; // ค่าที่ตัวแปลตั้งเอง (คำแปลที่ยังมีไทยปน)
  if (!THAI.test(v) || skip(n.parentElement)) { origText.delete(n); setText.delete(n); return; }
  origText.set(n, v);
  const e = toEn(v);
  if (e !== v) { setText.set(n, e); n.nodeValue = e; }
  else setText.delete(n);
}

function doAttrs(el: Element) {
  if (skip(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    const mine = setAttr.get(el) || {};
    if (v !== null && v === mine[a]) continue;
    const rec = origAttr.get(el) || {};
    if (!v || !THAI.test(v)) { delete rec[a]; delete mine[a]; continue; }
    rec[a] = v;
    origAttr.set(el, rec);
    const e = toEn(v);
    if (e !== v) { mine[a] = e; setAttr.set(el, mine); el.setAttribute(a, e); }
    else delete mine[a];
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
      const o = origText.get(n as Text), mine = setText.get(n as Text);
      if (o !== undefined && mine !== undefined && n.nodeValue === mine) n.nodeValue = o;
      origText.delete(n as Text); setText.delete(n as Text);
    } else {
      const rec = origAttr.get(n as Element), mine = setAttr.get(n as Element) || {};
      if (rec) for (const [a, v] of Object.entries(rec)) { if (mine[a] !== undefined && (n as Element).getAttribute(a) === mine[a]) (n as Element).setAttribute(a, v); }
      origAttr.delete(n as Element); setAttr.delete(n as Element);
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
      // แปลรอบแรกเสร็จแล้ว เปิดให้เห็นหน้า (โหมดอังกฤษซ่อนหน้าไว้จนถึงตอนนี้ ไม่ให้เห็นไทยแวบ docs/BUGHUNT-2026-10-21.md ข้อ 30 · app/globals.css)
      document.documentElement.classList.add("mz-tr");
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
