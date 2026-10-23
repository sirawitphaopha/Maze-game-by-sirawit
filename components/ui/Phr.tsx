"use client";

import { Fragment } from "react";
import { toEn, useLang } from "@/lib/lang";

/* ตัดบรรทัดได้เฉพาะตรงช่องว่างระหว่างวลี (พี่กันสั่ง 21 ต.ค. 2569 "เช็คการตัดบรรทัด")
   ข้อความไทยบนจอของเว็บนี้เว้นวรรคระหว่างวลีแทนจุลภาคอยู่แล้ว แต่เบราว์เซอร์ตัดคำไทยตามพจนานุกรมของมันเอง
   ได้ "(ค่าเริ่ม" บรรทัดหนึ่ง "ต้น)" อีกบรรทัด · word-break: keep-all ใช้กับภาษาไทยในโครมไม่ได้ (ลองแล้ว ความสูงไม่เปลี่ยน)
   จึงห่อทีละวลีไม่ให้ขึ้นบรรทัดใหม่กลางวลี · ใช้กับข้อความอธิบายที่เป็นข้อความล้วน
   ภาษาอังกฤษแปลทั้งประโยคในคราวเดียว (แปลทีละวลีจะได้คำเรียงกันไม่เป็นประโยค) และไม่ต้องห่อ เบราว์เซอร์ตัดคำอังกฤษถูกอยู่แล้ว */
export default function Phr({ children }: { children: string }) {
  const lang = useLang();
  if (lang === "en") return <>{toEn(children)}</>;
  // ข้อความในวงเล็บรวมเป็นก้อนเดียว (pg) ห้ามหั่นกลางวงเล็บเสมอ แม้ในคำอธิบายที่กระจายแบบไทยซึ่งปล่อยวลีอื่นขึ้นบรรทัดตามคำ
  // (พี่กันสั่ง 23 ต.ค. 2569 "การกระจายแบบไทย" · เดิมสั่งไว้ว่าวงเล็บระดับไม่ถูกหั่นกลาง · app/globals.css)
  // วงเล็บที่ยาวกว่า 32 ตัวเป็นประโยคย่อย ปล่อยขึ้นบรรทัดได้ ไม่งั้นล้นกล่องแคบ (Kruskal "(จำกลุ่มด้วย union-find แปลว่าระบบจับกลุ่ม)" ล้นที่จอ 1366 × 768)
  const SHORT = 32;
  const words = children.split(" ").filter(Boolean);
  const parts: { t: string; g: boolean }[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i].startsWith("(") && !words[i].endsWith(")")) {
      let j = i;
      while (j < words.length - 1 && !words[j].endsWith(")")) j++;
      const t = words.slice(i, j + 1).join(" ");
      if (t.length <= SHORT) { parts.push({ t, g: true }); i = j; }
      else parts.push({ t: words[i], g: false });
    } else parts.push({ t: words[i], g: words[i].startsWith("(") && words[i].length <= SHORT });
  }
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {/* data-notr ตัวแปลไม่แปลทีละวลีตอนสลับเป็นอังกฤษ รอ Phr วาดใหม่ทั้งประโยค (เดิมคำละวลีไปรกรายการคำที่ขาด docs/BUGHUNT-2026-10-21.md ข้อ 31) */}
          <span className={p.g ? "ph pg" : "ph"} data-notr="">{p.t}</span>
        </Fragment>
      ))}
    </>
  );
}
