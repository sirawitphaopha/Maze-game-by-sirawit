"use client";

/* แถบเลื่อนที่ทำงานเหมือนไฟล์เดิม · ลากแล้วตัวเลขเปลี่ยนทันที (onInput) · ปล่อยมือแล้วค่อยทำงานหนัก (onCommit)
   ไฟล์เดิมใช้เหตุการณ์ input กับ change ของเบราว์เซอร์ ส่วน React เรียก onChange ทุกครั้งที่ขยับ จึงต้องแยกเอง */

const MOVE_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

type Props = {
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onInput: (v: number) => void;
  onCommit: (v: number) => void;
};

export default function CommitRange({ id, min, max, step, value, onInput, onCommit }: Props) {
  const commit = (e: { currentTarget: HTMLInputElement }) => onCommit(+e.currentTarget.value);
  return (
    <input
      type="range"
      id={id}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onInput(+e.target.value)}
      // ปล่อยเมาส์หรือนิ้วแล้วเอาโฟกัสออกจากแถบ ไม่งั้นกดลูกศรเพื่อเดินกลายเป็นเลื่อนแถบและสร้างด่านใหม่ทุกครั้ง
      // (docs/BUGHUNT-2026-10-21.md ข้อ 22 · ติดมาจากไฟล์เดิม) · ใช้คีย์บอร์ดล้วนยังปรับแถบด้วยลูกศรได้ตามเดิม
      onPointerUp={(e) => { commit(e); e.currentTarget.blur(); }}
      // เฉพาะปุ่มที่ขยับแถบได้ กด Tab ผ่านแถบแล้วต้องไม่ทำงาน
      onKeyUp={(e) => { if (MOVE_KEYS.has(e.key)) commit(e); }}
    />
  );
}
