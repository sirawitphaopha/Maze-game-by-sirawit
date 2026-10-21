"use client";

import { useSyncExternalStore } from "react";
import Icon from "./Icon";

/* ปุ่มสลับโหมดมืด บนแถบบน (พี่กันสั่ง 21 ต.ค. 2569 "เอาปุ่มเปิดดาร์กโหมดด้วย")
   · ยังไม่เคยกด = ตามเครื่อง (สีทั้งชุดอยู่ใน globals.css ทั้ง prefers-color-scheme และ data-theme)
   · กดแล้วตั้ง data-theme ที่ <html> และจำไว้ใน localStorage "maze-theme" เปิดเว็บครั้งหน้าได้โหมดเดิม
   · ตั้งค่าก่อนจอวาดเฟรมแรกด้วยสคริปต์ในหัวเว็บ (app/layout.tsx) จอจึงไม่กะพริบสว่างแล้วค่อยมืด
   · กระดานวาดสีใหม่เองเพราะตัววาดเฝ้า data-theme อยู่แล้ว (BoardCanvas2D · LabView) */

export const THEME_KEY = "maze-theme";
type Mode = "dark" | "light";

function current(): Mode {
  const t = document.documentElement.dataset.theme;
  if (t === "dark" || t === "light") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(cb: () => void): () => void {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => { mo.disconnect(); mq.removeEventListener("change", cb); };
}

export default function ThemeToggle() {
  const mode = useSyncExternalStore<Mode>(subscribe, current, () => "light");
  const toDark = mode !== "dark";
  const label = toDark ? "เปลี่ยนเป็นโหมดมืด" : "เปลี่ยนเป็นโหมดสว่าง";

  const toggle = () => {
    const next: Mode = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* จำไม่ได้ก็ยังสลับได้ในรอบนี้ */ }
  };

  return (
    // ชี้แล้ววาบเป็นสีของโหมดที่จะเปลี่ยนไป (พี่กันสั่ง 21 ต.ค. 2569 โหมดมืดชี้ปุ่มอาทิตย์ให้สว่างวาบ และกลับกันในโหมดสว่าง)
    <button type="button" className={`iconbtn themebtn ${toDark ? "to-dark" : "to-light"}`} onClick={toggle} aria-label={label} title={label}>
      <Icon name={toDark ? "moon" : "sun"} size={16} />
    </button>
  );
}
