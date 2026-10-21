"use client";

import { useState } from "react";

/* หน้าเข้าสู่ระบบ (ยกกลไกจาก ME-DRP app/login/page.tsx · หน้าตาใช้ธีมของเกม)
   แบบฟอร์มจริงพร้อมปุ่ม submit กด Enter ในช่องแล้วส่งได้ · ข้อความเตือนในหน้า ไม่ใช้กล่องเด้งของเบราว์เซอร์ */

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    if (!pw || busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      // โหลดหน้าใหม่ทั้งหน้าโดยตั้งใจ ให้ทุกส่วนเริ่มใหม่พร้อมบัตรผ่าน
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch (e) {
      setErr(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "เชื่อมต่อระบบไม่สำเร็จ ลองอีกครั้ง");
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form onSubmit={(e) => { e.preventDefault(); void go(); }} noValidate>
        {/* eslint-disable-next-line @next/next/no-img-element -- ไอคอนเว็บ app/icon.svg ไฟล์เล็ก ประตูปล่อยผ่านโดยไม่ต้องเข้าสู่ระบบ */}
        <img className="logo" src="/icon.svg" alt="" width={56} height={56} />
        <h1>ห้องทดลองเขาวงกต</h1>
        <label htmlFor="maze-pw">
          รหัสผ่าน
          <input id="maze-pw" name="password" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus placeholder="กรอกรหัสผ่าน" />
        </label>
        <label className="chk"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> แสดงรหัสผ่าน</label>
        {err && <div className="err" role="alert">{err}</div>}
        <button type="submit" className="btn primary" disabled={!pw || busy}>{busy ? "กำลังตรวจสอบ" : "เข้าสู่ระบบ"}</button>
        {!pw && <p className="foot" style={{ textAlign: "center" }}>กรอกรหัสผ่านก่อน ปุ่มเข้าสู่ระบบจึงจะกดได้</p>}
      </form>
    </div>
  );
}
