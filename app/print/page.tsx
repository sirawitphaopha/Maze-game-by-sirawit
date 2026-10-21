"use client";

import dynamic from "next/dynamic";

/* หน้าใบงาน A4 · วาดเฉพาะในเบราว์เซอร์ (อ่านด่านจาก sessionStorage หรือ ?from=รหัสเกม) */
const WorksheetView = dynamic(() => import("@/components/print/WorksheetView"), { ssr: false });

export default function PrintPage() {
  return <WorksheetView />;
}
