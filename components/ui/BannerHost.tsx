"use client";

import { useEffect } from "react";
import { bannerStore, closeBanner } from "@/lib/banner";
import { useStore } from "@/lib/store";
import Icon from "./Icon";

/* แถบบอกผลกลางล่างจอ วาดจุดเดียวที่ app/layout.tsx (สกิล save-status ข้อ 3 · ยกจาก city-lab SaveBanner)
   สำเร็จหายเองใน 6 วินาที · ผิดพลาดค้างจนกดปิด · ข้อความหลายท่อนแยกเป็นบรรทัดจริง */

export default function BannerHost() {
  const state = useStore(bannerStore, (s) => s.state);
  const ok = state.kind === "ok";
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(closeBanner, 6000);
    return () => clearTimeout(t);
  }, [ok, state]);
  if (state.kind === "idle") return null;
  const icon = ok ? "check" : state.kind === "progress" ? "cloud" : "alert";
  return (
    <div className={`banner ${state.kind} noprint`} role="status" aria-live="polite">
      <span style={{ marginTop: 2 }}><Icon name={icon} size={17} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t">{state.title}</div>
        {state.kind !== "ok" && state.lines && (
          <div className="l">{state.lines.map((l) => <div key={l}>{l}</div>)}</div>
        )}
      </div>
      <button type="button" className="xbtn" onClick={closeBanner} aria-label="ปิดข้อความ">
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}
