"use client";

import { useSyncExternalStore } from "react";
import { EN, EN_RX } from "./i18n-en";

/* ภาษาบนจอ ไทยหรืออังกฤษ (พี่กันสั่ง 21 ต.ค. 2569 "ขอปุ่มสลับภาษา ไทย อังกฤษ" · "แปลดี ๆ แบบคนอังกฤษอเมริกาอ่านแล้วไม่รู้ว่า AI แปล")
   · จำไว้ในเครื่อง localStorage "maze-lang" · ตั้งที่ <html data-lang lang> ตั้งแต่ก่อนจอวาดเฟรมแรก (สคริปต์ในหัวเว็บ app/layout.tsx)
   · โค้ดทั้งเว็บยังเขียนข้อความเป็นไทย ตัวแปลงอยู่ที่ tr() ซึ่งหาคำแปลจากพจนานุกรม lib/i18n-en.ts
     ข้อความทั้งก้อนตรงตัวก่อน ไม่เจอค่อยลองรูปแบบที่มีตัวเลข (EN_RX) ไม่เจอเลยคืนข้อความไทยเดิม
   · ตัวแปลข้อความบนจอทั้งหน้าอยู่ที่ components/ui/Translator.tsx */

export type Lang = "th" | "en";
export const LANG_KEY = "maze-lang";

export function getLang(): Lang {
  if (typeof document === "undefined") return "th";
  return document.documentElement.dataset.lang === "en" ? "en" : "th";
}

const subs = new Set<() => void>();
export function subscribeLang(cb: () => void): () => void {
  subs.add(cb);
  return () => { subs.delete(cb); };
}

export function setLang(l: Lang): void {
  const d = document.documentElement;
  d.dataset.lang = l;
  d.lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* จำไม่ได้ก็ยังสลับได้ในรอบนี้ */ }
  subs.forEach((f) => f());
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, () => "th");
}

/** ข้อความที่ยังไม่มีคำแปล เก็บไว้ไล่เติมพจนานุกรม (ดูได้ที่ window.__mzMissing ตอนทดสอบในเครื่อง) */
const missing = new Set<string>();
if (typeof window !== "undefined") (window as unknown as { __mzMissing: Set<string> }).__mzMissing = missing;

const THAI = /[฀-๿]/;

/** แปลข้อความไทยเป็นอังกฤษตามพจนานุกรม · ช่องว่างหน้าหลังคงไว้ · ไม่เจอคำแปลคืนของเดิม */
export function toEn(s: string): string {
  if (!THAI.test(s)) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const lead = m ? m[1] : "", core = (m ? m[2] : s).replace(/\s+/g, " "), tail = m ? m[3] : "";
  const hit = EN[core];
  if (hit !== undefined) return lead + hit + tail;
  for (const [rx, out] of EN_RX) {
    const r = core.match(rx);
    if (r) return lead + (typeof out === "function" ? out(r) : core.replace(rx, out)) + tail;
  }
  missing.add(core);
  return s;
}

/** แปลตามภาษาที่เลือกอยู่ */
export function tr(s: string): string {
  return getLang() === "en" ? toEn(s) : s;
}
