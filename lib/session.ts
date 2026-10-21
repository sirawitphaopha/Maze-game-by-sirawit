"use client";

/* ความจำระหว่างสลับแท็บ (หน่วยความจำของหน้าเว็บ หายเมื่อรีเฟรชหรือปิดหน้าต่าง)
   ไฟล์เดิมเป็นหน้าเดียว สลับแท็บแล้วเกมที่เล่นค้างกับเขาวงกตในห้องทดลองยังอยู่
   ตอนนี้แท็บเป็นหน้าแยก จึงต้องจำไว้ที่นี่ ไม่งั้นกดไปห้องทดลองแล้วกลับมา เกมที่เล่นค้างหาย */

import type { Game } from "@/lib/game/state";
import type { Level } from "@/lib/game/level";
import type { AlgoId, Params } from "@/lib/maze/generators";

export type PlayPrefs = { level: Level; algo: AlgoId; minLen: number; loops: number; fog: boolean };

export const playMem: {
  G: Game | null;
  prefs: PlayPrefs | null;
  replayOf: string | null;
  /** เกมนี้เริ่มบันทึกขึ้นฐานไปแล้วหรือยัง (กันบันทึกซ้ำตอนกลับมาหน้าเดิม) */
  saved: boolean;
} = { G: null, prefs: null, replayOf: null, saved: false };

export type LabPrefs = {
  algo: AlgoId;
  n: number;
  PV: Record<AlgoId, Params>;
  animate: boolean;
  speed: number;
  minL: number;
  clean: boolean;
  braid: number;
  tries: number;
  farExit: boolean;
};

export const labMem: { prefs: LabPrefs | null } = { prefs: null };
