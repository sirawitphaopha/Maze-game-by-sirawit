"use client";

import { setLang, useLang } from "@/lib/lang";

/* ปุ่มสลับภาษาไทยกับอังกฤษ ข้างปุ่มสลับโหมดมืดบนแถบบน (พี่กันสั่ง 21 ต.ค. 2569 "ขอปุ่มสลับภาษา ไทย อังกฤษ")
   ป้ายบนปุ่มคือภาษาที่จะเปลี่ยนไป เขียนเป็นภาษานั้นเอง (data-notr ตัวแปลไม่แตะ) */
export default function LangToggle() {
  const lang = useLang();
  const toEn = lang !== "en";
  return (
    <button type="button" className="iconbtn langbtn" data-notr onClick={() => setLang(toEn ? "en" : "th")}
      aria-label={toEn ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"} title={toEn ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}>
      {toEn ? "EN" : "TH"}
    </button>
  );
}
