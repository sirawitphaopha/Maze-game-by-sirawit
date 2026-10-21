"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushPending, NODB_TEXT, pendingServerSnapshot, pendingSnapshot, subscribePending } from "@/lib/games";
import Icon from "./Icon";

/* ============================================================
   แถบรายการรอส่ง เห็นทุกหน้า (สกิล save-status ข้อ 4 · ยกจาก city-lab components/ui/PendingBar.tsx)
   ของที่ยังไม่เข้าระบบห้ามค้างเงียบ · บอกจำนวนและชื่อ · บอกว่าของไม่หาย · มีปุ่มส่งทันที
   ส่งซ้ำเอง ① ตัวจับเวลาถอยห่าง 20 40 80 160 300 วินาที ② ตอนเชื่อมต่อได้ ③ ตอนกลับมาที่หน้าต่างนี้และตอนเปิดหน้า
   ส่งเข้าระบบแล้ว = แถบเขียว หายเองใน 8 วินาที · ระบบไม่รับข้อมูล = แถบแดง ไม่หายเอง
   🔴 หน้าหนึ่งมีแถบนี้ได้ตัวเดียว (วางไว้ที่ app/layout.tsx) ไม่งั้นตัวจับเวลาสองตัวส่งซ้ำกัน
   ============================================================ */

const BACKOFF_S = [20, 40, 80, 160, 300];
const NODB_S = 300;

export default function PendingBar() {
  const items = useSyncExternalStore(subscribePending, pendingSnapshot, pendingServerSnapshot);
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [rejected, setRejected] = useState<Array<{ label: string; reason: string }>>([]);
  const [countdown, setCountdown] = useState<{ secs: number; tries: number } | null>(null);
  const busyRef = useRef(false);
  const plan = useRef<{ at: number; tries: number } | null>(null);

  const send = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const r = await flushPending();
      if (r.sent > 0) setOkMsg(`ส่งเข้าระบบแล้ว ${r.sent} เกม`);
      if (r.rejected.length > 0) setRejected((cur) => [...cur, ...r.rejected].slice(-12));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => { void send(); };
    const onVisible = () => { if (document.visibilityState === "visible") void send(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const first = setTimeout(() => { void send(); }, 0);
    return () => {
      clearTimeout(first);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [send]);

  const waiting = items.length > 0;
  const noDb = items[0]?.why === NODB_TEXT;
  useEffect(() => {
    if (!waiting) return;
    const tick = () => {
      const now = Date.now();
      if (!plan.current) plan.current = { at: now + (noDb ? NODB_S : BACKOFF_S[0]) * 1000, tries: 0 };
      const p = plan.current;
      if (now >= p.at && !busyRef.current) {
        const tries = p.tries + 1;
        const wait = noDb ? NODB_S : BACKOFF_S[Math.min(tries, BACKOFF_S.length - 1)];
        plan.current = { at: now + wait * 1000, tries };
        void send();
      }
      const q = plan.current;
      setCountdown({ secs: Math.max(0, Math.ceil((q.at - now) / 1000)), tries: q.tries });
    };
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); plan.current = null; };
  }, [waiting, noDb, send]);

  useEffect(() => {
    if (!okMsg) return;
    const t = setTimeout(() => setOkMsg(""), 8000);
    return () => clearTimeout(t);
  }, [okMsg]);

  return (
    <div className="noprint pendwrap">
      {rejected.length > 0 && (
        <div className="pendbar bad" role="alert">
          <Icon name="alert" size={16} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div><b>ระบบไม่รับข้อมูล {rejected.length} เกม ยังไม่เข้าระบบ</b></div>
            {rejected.map((x, i) => <div key={`${x.label}-${i}`} className="sub">{x.label}</div>)}
            {rejected.map((x, i) => <div key={`r-${x.label}-${i}`} className="sub">เหตุผล {x.reason}</div>)}
          </div>
          <button type="button" className="xbtn" aria-label="ปิดข้อความระบบไม่รับข้อมูล" onClick={() => setRejected([])}>
            <Icon name="x" size={15} />
          </button>
        </div>
      )}
      {waiting ? (
        <div className="pendbar wait" role="status" aria-live="polite">
          <Icon name="cloudoff" size={16} />
          <b>รอส่ง {items.length} เกม ยังไม่เข้าระบบ</b>
          <span className="sub">{items.slice(0, 3).map((x) => x.rec.label).join("  ")}{items.length > 3 ? `  และอีก ${items.length - 3} เกม` : ""}</span>
          <span className="sub">บันทึกไว้ในเครื่องนี้แล้ว ปิดหน้าต่างได้</span>
          <span className="sub">{noDb ? "ยังไม่ได้ตั้งค่าเชื่อมฐานข้อมูล ระบบจะส่งให้เมื่อตั้งค่าแล้ว" : "ระบบจะส่งให้อัตโนมัติเมื่อเชื่อมต่อได้"}</span>
          {countdown && !busy && <span className="sub">จะลองส่งอีกครั้งในอีก {countdown.secs} วินาที ลองแล้ว {countdown.tries} ครั้ง</span>}
          <button type="button" className="btn" onClick={() => void send()} disabled={busy}>
            {busy ? "กำลังส่ง" : "ส่งทันที"}
          </button>
        </div>
      ) : okMsg ? (
        <div className="pendbar done" role="status" aria-live="polite">
          <Icon name="check" size={16} />
          <b>{okMsg}</b>
        </div>
      ) : null}
    </div>
  );
}
