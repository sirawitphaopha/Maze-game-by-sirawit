"use client";

/* ที่เก็บในเครื่องของเกม (localStorage) · ทุกการอ่านเขียนครอบ try/catch เหมือนไฟล์เดิม
   คีย์เวลาดีสุดชุดเดิม maze-best-{ระดับ}-{วิธี}-m{L}-l{ทางวน}-{ไฟฉาย 0/1} เก็บมิลลิวินาที
   คีย์คะแนนดีสุด (เพิ่มใหม่) maze-bestscore-... คีย์ชุดเดียวกัน · คีย์เสียง maze-sound = "0" หรือ "1" */

import type { Settings } from "@/lib/game/level";

const suffix = (s: Settings) => `${s.level}-${s.algo}-m${s.minLen}-l${s.loops}-${s.fog ? 1 : 0}`;

function getNum(key: string): number | null {
  try { const v = localStorage.getItem(key); return v ? +v : null; } catch { return null; }
}
function setNum(key: string, v: number): void {
  try { localStorage.setItem(key, String(Math.round(v))); } catch { /* เก็บไม่ได้ ไม่ทำให้เกมล้ม */ }
}

export const getBestTime = (s: Settings) => getNum(`maze-best-${suffix(s)}`);
export const setBestTime = (s: Settings, ms: number) => setNum(`maze-best-${suffix(s)}`, ms);
export const getBestScore = (s: Settings) => getNum(`maze-bestscore-${suffix(s)}`);
export const setBestScore = (s: Settings, v: number) => setNum(`maze-bestscore-${suffix(s)}`, v);

export function getSound(): boolean {
  try { return localStorage.getItem("maze-sound") !== "0"; } catch { return true; }
}
export function setSound(on: boolean): void {
  try { localStorage.setItem("maze-sound", on ? "1" : "0"); } catch { /* ไม่เป็นไร */ }
}

/** เวลาแบบ ม:วว.ท */
export function fmt(ms: number): string {
  const t = Math.floor(ms / 100), d = t % 10, s = Math.floor(t / 10) % 60, m = Math.floor(t / 600);
  return `${m}:${String(s).padStart(2, "0")}.${d}`;
}

/** ระดับสีของคะแนน 95 ขึ้นไปเขียว 80 ถึง 94 ฟ้าน้ำทะเล ต่ำกว่า 80 ส้ม · ใช้ทั้งแถบคะแนนหน้าประวัติและเลขคะแนนในการ์ดผล ให้สีตรงกันทุกที่ */
export const scoreTone = (s: number): "hi" | "mid" | "lo" => (s >= 95 ? "hi" : s >= 80 ? "mid" : "lo");

export const th = (v: number) => Math.round(v).toLocaleString("th-TH");
