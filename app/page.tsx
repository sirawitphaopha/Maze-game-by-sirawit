"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* หน้าแรก = แท็บห้องทดลอง (ไฟล์เดิมเปิดมาเป็นห้องทดลอง) · วาดเฉพาะในเบราว์เซอร์
   ที่อยู่เดิม #play ของไฟล์เดิม พาไปหน้าเล่นเกมให้ */
// ไม่มีกล่องรอ โค้ดของทุกแท็บโหลดรอไว้ตั้งแต่เปิดเว็บ (components/ui/TopBar.tsx) · พี่กันสั่ง "ห้ามมีการโหลดแบบนี้ตอนเปลี่ยนแท็บ"
const LabView = dynamic(() => import("@/components/lab/LabView"), { ssr: false });

export default function LabPage() {
  const router = useRouter();
  useEffect(() => { if (window.location.hash === "#play") router.replace("/play"); }, [router]);
  return <LabView />;
}
