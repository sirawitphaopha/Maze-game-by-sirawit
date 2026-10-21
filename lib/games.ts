"use client";

/* ============================================================
   บันทึกเกมที่เล่นจบขึ้นฐาน พร้อมคิวรอส่งในเครื่อง (ยกโครงจาก city-lab lib/cloud.ts)

   🔴 สกิล save-status และ offline-resilience
      ① เกมจบ = สร้างใบบันทึกพร้อมรหัสก้อน (saveKey) แล้วส่งทันที ลองซ้ำเองเมื่อเชื่อมต่อสะดุด
      ② ส่งไม่ถึงเพราะเชื่อมต่อไม่ได้ หมดเวลา หรือฐานยังไม่ได้ตั้งค่า = เก็บทั้งใบไว้ในเครื่อง ส่งให้เองทีหลัง
         เซิร์ฟเวอร์ปฏิเสธข้อมูล = ไม่เข้าคิว (ส่งกี่รอบก็ได้คำตอบเดิม)
      ③ ส่งซ้ำรหัสก้อนเดิม เซิร์ฟเวอร์ตอบสำเร็จโดยไม่เพิ่มแถว
      ④ ใบบันทึกเกมไม่มีข้อมูลผู้ป่วย เก็บทั้งใบใน localStorage ได้ (ใบละราว 2 ถึง 20 KB) อายุ 30 วัน
   ============================================================ */

import type { Game } from "./game/state";
import { packMoves, packWalls } from "./game/encode";
import { askServer, type Ask } from "./net";
import { APP_VERSION } from "./version";

export interface GameRecord {
  saveKey: string;
  playedAt: string;
  appVersion: string;
  level: string;
  algo: string;
  minLen: number;
  loops: number;
  fog: boolean;
  size: number;
  exitX: number;
  walls: string;
  moves: string;
  timeMs: number;
  replayOf: string | null;
  /** ป้ายชื่อในแถบรอส่ง (ไม่ส่งขึ้นฐาน) */
  label: string;
}

/** รายการในหน้าประวัติ */
export interface GameSummary {
  id: string;
  played_at: string;
  level: string;
  size: number;
  algo: string;
  min_len: number;
  loops: number;
  fog: boolean;
  time_ms: number;
  steps: number;
  shortest: number;
  wrong: number;
  decisions: number;
  score: number;
  replay_of: string | null;
  /** ผังกำแพงกับบันทึกการเดินแบบแพ็ก ใช้วาดภาพย่อในหน้าประวัติ */
  walls: string;
  exit_x: number;
  moves: string;
}

export interface GameFull extends GameSummary {
  lost: number;
  back: number;
  rewalk: number;
  warps: number;
  choices: number;
  loop_count: number;
  app_version: string;
}

export function newKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function recordOf(G: Game, label: string, replayOf: string | null): GameRecord {
  return {
    saveKey: newKey(),
    playedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    level: G.settings.level,
    algo: G.settings.algo,
    minLen: G.settings.minLen,
    loops: G.settings.loops,
    fog: G.settings.fog,
    size: G.n,
    exitX: G.maze.ex,
    walls: packWalls(G.maze),
    moves: packMoves(G.events),
    timeMs: Math.round(G.el),
    replayOf,
    label,
  };
}

/* ── คิวรอส่ง ── */

const KEY = "maze-pending-v1";
const EVT = "maze-pending-changed";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface PendingItem { rec: GameRecord; at: number; tries: number; why: string }

function read(): PendingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as PendingItem[];
    if (!Array.isArray(list)) return [];
    return list.filter((x) => x && x.rec && typeof x.at === "number" && Date.now() - x.at < MAX_AGE_MS);
  } catch {
    return [];
  }
}

/** คืน false เมื่อเครื่องเก็บไม่ได้ (ที่เก็บเต็ม หรือเบราว์เซอร์ปิดที่เก็บ) · คนเรียกต้องบอกผู้ใช้ตามจริง ห้ามบอกว่าเก็บแล้ว */
function write(list: PendingItem[]): boolean {
  if (typeof window === "undefined") return false;
  let ok = true;
  try {
    if (list.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(list));
  } catch { ok = false; /* เขียนไม่ได้ ไม่ทำให้หน้าเว็บล้ม แต่ส่งผลกลับให้คนเรียกรู้ */ }
  window.dispatchEvent(new CustomEvent(EVT));
  return ok;
}

let snapRaw: string | null = null;
let snapList: PendingItem[] = [];
const EMPTY: PendingItem[] = [];

export function pendingSnapshot(): PendingItem[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { raw = null; }
  if (raw !== snapRaw) { snapRaw = raw; snapList = read(); }
  return snapList;
}
export function pendingServerSnapshot(): PendingItem[] { return EMPTY; }
export function subscribePending(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", cb); };
}

function queue(rec: GameRecord, why: string): boolean {
  const list = read().filter((x) => x.rec.saveKey !== rec.saveKey);
  list.push({ rec, at: Date.now(), tries: 0, why });
  return write(list);
}

function drop(saveKey: string): void {
  write(read().filter((x) => x.rec.saveKey !== saveKey));
}

export const NODB_TEXT = "ยังไม่ได้ตั้งค่าเชื่อมฐานข้อมูล";

function reasonOf(r: Exclude<Ask<unknown>, { ok: true }>): string {
  if (r.why === "nodb") return NODB_TEXT;
  if (r.why === "offline") return "เชื่อมต่อระบบไม่สำเร็จ";
  if (r.why === "timeout") return "ระบบตอบช้าเกินกำหนด";
  if (r.why === "auth") return "ต้องเข้าสู่ระบบใหม่";
  return r.error || "ระบบปฏิเสธข้อมูล";
}

const bodyOf = (rec: GameRecord) => {
  const { label: _label, ...body } = rec;
  void _label;
  return body;
};

export type UploadResult = { ok: true; id: string } | { ok: false; queued: boolean; reason: string };

/** ส่งหนึ่งเกมขึ้นฐาน · ไม่ถึงเพราะเชื่อมต่อ ฐานยังไม่ตั้งค่า หรือบัตรผ่านหมดอายุ = เก็บไว้ในเครื่อง */
export async function uploadGame(rec: GameRecord): Promise<UploadResult> {
  const r = await askServer<{ ok: true; id: string }>("/api/games", bodyOf(rec), { waitMs: 20000, retry: 3 });
  if (r.ok) { drop(rec.saveKey); forgetLists(); return { ok: true, id: r.data.id }; }
  const reason = reasonOf(r);
  if (r.why === "offline" || r.why === "timeout" || r.why === "nodb" || r.why === "auth") {
    // ตรวจทานรอบท้าย 21 ต.ค. 2569 · เดิมไม่ดูผลการเก็บ เก็บไม่ได้ก็ยังบอกว่า "บันทึกไว้ในเครื่องแล้ว" (สกิล save-status)
    if (queue(rec, reason)) return { ok: false, queued: true, reason };
    return { ok: false, queued: false, reason: `${reason} และเครื่องนี้เก็บเกมไว้ให้ไม่ได้ (ที่เก็บของเบราว์เซอร์เต็มหรือถูกปิด)` };
  }
  return { ok: false, queued: false, reason };
}

export interface FlushResult { sent: number; failed: number; rejected: Array<{ label: string; reason: string }> }

/** ส่งทุกเกมที่ค้างในคิว */
export async function flushPending(): Promise<FlushResult> {
  let sent = 0, failed = 0;
  const rejected: Array<{ label: string; reason: string }> = [];
  for (const item of read()) {
    const r = await askServer<{ ok: true; id: string }>("/api/games", bodyOf(item.rec), { waitMs: 20000 });
    if (r.ok) { drop(item.rec.saveKey); forgetLists(); sent++; continue; }
    const reason = reasonOf(r);
    if (r.why === "offline" || r.why === "timeout" || r.why === "nodb" || r.why === "auth") {
      write(read().map((x) => (x.rec.saveKey === item.rec.saveKey ? { ...x, tries: x.tries + 1, why: reason } : x)));
      failed++;
      if (r.why !== "offline" && r.why !== "timeout") break;
    } else {
      drop(item.rec.saveKey);
      rejected.push({ label: item.rec.label, reason });
    }
  }
  return { sent, failed, rejected };
}

/* ── จำข้อมูลที่ดึงมาแล้วในหน่วยความจำของหน้าเว็บ (สกิล web-craft โหลดครั้งเดียว) ──
   พี่กันเจอ 21 ต.ค. 2569 "ประวัติ กดเปิดไปเปิดมาโหลดทุกครั้ง มันควรจะโหลดครั้งเดียว"
   · รายการหน้าประวัติ จำทีละหน้า · กลับมาเปิดหน้าเดิม วาดจากของที่จำทันที ไม่ขึ้นโครงจาง
     จำไว้นานกว่า LIST_FRESH_MS ค่อยดึงใหม่เงียบ ๆ ข้างหลัง ระหว่างนั้นของเดิมยังอยู่บนจอ (เผื่อเล่นจากอีกเครื่อง)
   · บันทึกเกมใหม่สำเร็จ = ลืมรายการทั้งหมด รอบหน้าดึงใหม่ เกมใหม่จึงขึ้นทันที
   · เกมเดียวในตัวดูย้อนแก้ไม่ได้อยู่แล้ว จำถาวรจนปิดหน้าต่าง
   · อยู่ในหน่วยความจำอย่างเดียว ไม่เขียนลงที่เก็บของเบราว์เซอร์ ออกจากระบบแล้วโหลดหน้าใหม่ทั้งหน้าจึงหายเอง */

type ListData = { games: GameSummary[]; total: number; page: number; pageSize: number };
const listMem = new Map<number, { data: ListData; at: number }>();
const gameMem = new Map<string, GameFull>();
export const LIST_FRESH_MS = 60_000;

export function cachedList(page: number): { data: ListData; at: number } | null { return listMem.get(page) ?? null; }
export function cachedGame(id: string): GameFull | null { return gameMem.get(id) ?? null; }
function forgetLists(): void { listMem.clear(); }

export async function listGames(page: number): Promise<Ask<ListData>> {
  const r = await askServer<ListData>(`/api/games?page=${page}`, undefined, { retry: 2 });
  if (r.ok) listMem.set(page, { data: r.data, at: Date.now() });
  return r;
}

/** ลบเกม (ประทับเวลาลบที่ฐาน) · สำเร็จแล้วล้างรายการกับเกมที่จำไว้ หน้าประวัติดึงใหม่ */
export async function deleteGame(id: string): Promise<Ask<{ ok: true; id: string; already?: boolean }>> {
  const r = await askServer<{ ok: true; id: string; already?: boolean }>(`/api/games/${encodeURIComponent(id)}`, undefined, { retry: 2, method: "DELETE" });
  if (r.ok) { gameMem.delete(id); forgetLists(); }
  return r;
}

export async function getGame(id: string): Promise<Ask<{ game: GameFull }>> {
  const hit = gameMem.get(id);
  if (hit) return { ok: true, data: { game: hit } };
  const r = await askServer<{ game: GameFull }>(`/api/games/${encodeURIComponent(id)}`, undefined, { retry: 2 });
  if (r.ok) gameMem.set(id, r.data.game);
  return r;
}
