"use client";

import { useEffect, useRef, useState } from "react";
import type { Dir } from "@/lib/game/state";
import Icon from "@/components/ui/Icon";

/* ปุ่มลูกศรบนจอ (ยกจากไฟล์เดิม · เอกสารหัวข้อ 8 การควบคุม)
   ทั้งกรอบเป็นพื้นที่กด เลือกทิศตามมุมจากจุดกลาง (ตรงกลาง 8px ไม่นับ)
   กดค้างเกิน 280 มิลลิวินาทีเดินต่อเนื่องทุก 110 มิลลิวินาที · แตะค้างแล้วเลื่อนนิ้วเปลี่ยนทิศได้
   ชนกำแพงดังเฉพาะตอนกดครั้งแรก ไม่ดังตอนกดค้าง · ไอคอนวาดด้วย SVG (บั๊กข้อ 7) */

type Props = { onMove: (d: Dir) => boolean; onBump: () => void };

const BTNS: { d: Dir; label: string; area: string; icon: "up" | "down" | "left" | "right" }[] = [
  { d: "u", label: "ขึ้น", area: "1/2", icon: "up" },
  { d: "l", label: "ซ้าย", area: "2/1", icon: "left" },
  { d: "d", label: "ลง", area: "3/2", icon: "down" },
  { d: "r", label: "ขวา", area: "2/3", icon: "right" },
];

export default function DPad({ onMove, onBump }: Props) {
  const box = useRef<HTMLDivElement | null>(null);
  const [dir, setDir] = useState<Dir | null>(null);
  const st = useRef<{ d: Dir | null; pid: number | null; to: ReturnType<typeof setTimeout> | null; iv: ReturnType<typeof setInterval> | null }>({ d: null, pid: null, to: null, iv: null });
  const cb = useRef({ onMove, onBump });
  useEffect(() => { cb.current = { onMove, onBump }; }, [onMove, onBump]);

  const stopTimers = () => {
    const s = st.current;
    if (s.to) clearTimeout(s.to);
    if (s.iv) clearInterval(s.iv);
    s.to = null; s.iv = null;
  };
  useEffect(() => stopTimers, []);

  const dirAt = (e: React.PointerEvent): Dir | null => {
    const el = box.current;
    if (!el) return null;
    const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : dy > 0 ? "d" : "u";
  };

  const press = (d: Dir | null) => {
    const s = st.current;
    if (d === s.d) return;
    stopTimers();
    s.d = d;
    setDir(d);
    if (!d) return;
    if (!cb.current.onMove(d)) cb.current.onBump();
    s.to = setTimeout(() => { s.iv = setInterval(() => cb.current.onMove(d), 110); }, 280);
  };
  const release = () => { stopTimers(); st.current.d = null; st.current.pid = null; setDir(null); };

  return (
    <div
      ref={box}
      className="dpad"
      aria-label="ปุ่มเดิน"
      onPointerDown={(e) => { e.preventDefault(); st.current.pid = e.pointerId; try { box.current?.setPointerCapture(e.pointerId); } catch { /* ไม่เป็นไร */ } press(dirAt(e)); }}
      onPointerMove={(e) => { if (e.pointerId === st.current.pid) press(dirAt(e)); }}
      onPointerUp={(e) => { if (e.pointerId === st.current.pid) release(); }}
      onPointerCancel={(e) => { if (e.pointerId === st.current.pid) release(); }}
      onLostPointerCapture={(e) => { if (e.pointerId === st.current.pid) release(); }}
    >
      {BTNS.map((b) => (
        <button
          key={b.d}
          type="button"
          className={`dbtn${dir === b.d ? " on" : ""}`}
          aria-label={b.label}
          style={{ gridArea: b.area }}
          // กดด้วยคีย์บอร์ด (Enter หรือ Space) ได้ detail = 0
          onClick={(e) => { if (e.detail === 0) cb.current.onMove(b.d); }}
        >
          <Icon name={b.icon} size={30} />
        </button>
      ))}
      {/* วงกลมตรงกลาง แต่งให้เหมือนจอยเกม ไม่ใช่ปุ่ม (พี่กันสั่ง 21 ต.ค. 2569 "ใส่วงกลมตรงกลาง") · กดตรงนี้ไม่เดิน ตามจุดกลาง 8px เดิม */}
      <span className="dhub" aria-hidden="true" style={{ gridArea: "2/2" }} />
    </div>
  );
}
