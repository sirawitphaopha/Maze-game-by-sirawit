"use client";

import dynamic from "next/dynamic";

/* หน้าเล่นเกม · วาดเฉพาะในเบราว์เซอร์ (ใช้ canvas เสียง และที่เก็บในเครื่องตั้งแต่ตอนเริ่ม) */
// ไม่มีกล่องรอ โค้ดของทุกแท็บโหลดรอไว้ตั้งแต่เปิดเว็บ (components/ui/TopBar.tsx) · พี่กันสั่ง "ห้ามมีการโหลดแบบนี้ตอนเปลี่ยนแท็บ"
const GameView = dynamic(() => import("@/components/game/GameView"), { ssr: false });

export default function PlayPage() {
  return <GameView />;
}
