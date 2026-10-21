"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/* ป๊อปยืนยันกลางจอ (สกิล pharmacy-web-logic ข้อ 18 ป๊อปอัปยืนยัน)
   · กดพื้นหลังไม่ปิด ต้องกดปุ่มเอง · Esc เท่ากับกดย้อนกลับ (ยกเว้นตอนกำลังทำงาน)
   · บอกว่ากำลังจะเสียอะไร ผ่าน lines · โฟกัสเริ่มที่ปุ่มย้อนกลับ กด Enter เผลอ ๆ ก็ไม่ลบ
   · dangerLeft = ชั้นที่ 2 ของการลบ ปุ่มยืนยันลบอยู่ซ้าย สลับตำแหน่งกับชั้นแรกโดยตั้งใจ กันกดซ้ำตำแหน่งเดิมจนเผลอลบ (ห้ามสลับกลับ) */

type Props = {
  title: string;
  lines: string[];
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  busyLabel?: string;
  dangerLeft?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ title, lines, confirmLabel, cancelLabel, busy, busyLabel, dangerLeft, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { cancelRef.current?.focus(); }, [title]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const confirm = (
    <button type="button" className="btn danger" onClick={onConfirm} disabled={busy}>{busy ? (busyLabel ?? confirmLabel) : confirmLabel}</button>
  );
  const cancel = (
    <button type="button" className="btn" ref={cancelRef} onClick={onCancel} disabled={busy}>{cancelLabel}</button>
  );
  // วาดไว้ใต้ body เสมอ ป๊อปที่เปิดจากแถบบน (ถามก่อนออกจากหน้าเล่นเกม) ไม่โดนกรอบของแถบบนตัดจนหัวข้อหายพ้นจอ
  return createPortal(
    <div className="cdback" role="presentation">
      <div className="cdbox" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-desc">
        <h3 id="cd-title">{title}</h3>
        <div id="cd-desc">{lines.map((l, i) => <p key={i}>{l}</p>)}</div>
        <div className="cdacts">{dangerLeft ? <>{confirm}{cancel}</> : <>{cancel}{confirm}</>}</div>
      </div>
    </div>,
    document.body,
  );
}
