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
  const parts = children.split(" ").filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="ph">{p}</span>
        </Fragment>
      ))}
    </>
  );
}
