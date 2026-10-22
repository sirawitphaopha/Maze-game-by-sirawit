"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BoardCanvas2D, { type BoardHandle } from "@/components/board/BoardCanvas2D";
import DPad from "./DPad";
import Phr from "@/components/ui/Phr";
import CommitRange from "@/components/ui/CommitRange";
import ResultCard from "./ResultCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ALGOS, GROUPS, type AlgoId } from "@/lib/maze/generators";
import { GNOTE, LEVEL_IDS, LEVEL_NAME, LEVELS, LOOPS, LV_MAXL, LV_MINL, makeLevel, type Level, type MazeData, type Settings } from "@/lib/game/level";
import { backToFlag, canMove, clearFlag, clock, giveUp, move, newGame, pause, playing, result, resume, setFlag, type Dir, type Game, type Result } from "@/lib/game/state";
import Icon, { type IconName } from "@/components/ui/Icon";
import { solRun, type SolRun } from "@/lib/game/solAnim";
import { openNb } from "@/lib/maze/grid";
import { packWalls, unpackWalls } from "@/lib/game/encode";
import { cellAt } from "@/lib/draw/gameDraw";
import { reducedMotion, solFinished } from "@/lib/draw/paint";
import { SFX, setSoundEnabled } from "@/lib/audio/sfx";
import { fmt, getBestScore, getBestTime, getSound, setBestScore, setBestTime, setSound, th } from "@/lib/local";
import { getGame, recordOf, uploadGame } from "@/lib/games";
import { failText } from "@/lib/net";
import { showBanner } from "@/lib/banner";
import { playMem, type PlayPrefs } from "@/lib/session";

/* ════════════════════════════════════════════════════════════════════
   แท็บเล่นเกม (ยกจากไฟล์เดิม ก้อนที่ 2 · เอกสารหัวข้อ 8)
   ตรรกะเกมอยู่ที่ lib/game/state.ts · กระดานวาดด้วย components/board/BoardCanvas2D.tsx
   เพิ่มจากของเดิม หยุดนาฬิกาเมื่อไม่ได้ดูหน้านี้ (บั๊กข้อ 5) · คะแนนดีสุด · บันทึกเกมที่เล่นจบเข้าระบบ ·
   เล่นด่านเดิมจากประวัติ (?from=รหัสเกม) · พิมพ์ใบงาน
   ════════════════════════════════════════════════════════════════════ */

/** หน้าจอแบบมือถือ (คลาสที่ html ตั้งโดยสคริปต์ในหัวเว็บ app/layout.tsx) */
const onMobile = () => document.documentElement.classList.contains("mz-mobile");

const SOL_MSG = "เส้นชมพูคือทางที่ไปถึงเส้นชัย เส้นสีอื่นคือทางแยกที่แตกออกไปแล้วไม่ถึง";
const DEFAULT_PREFS: PlayPrefs = { level: "mid", algo: "wilson", minLen: LV_MINL.mid, loops: 0, fog: false };

type SaveState =
  | { kind: "none" }
  | { kind: "saving" }
  | { kind: "ok"; id: string }
  | { kind: "queued"; reason: string }
  | { kind: "bad"; reason: string };

type WinInfo = { r: Result; recTime: boolean; recScore: boolean };

const algoName = (a: AlgoId) => ALGOS.find((x) => x.id === a)?.name ?? a;
const settingsOf = (p: PlayPrefs): Settings => ({ level: p.level, algo: p.algo, minLen: p.minLen, loops: p.loops, fog: p.fog });

// ไม่มีข้อความบอกทางหลอกตอนเริ่มด่านแล้ว (พี่กันสั่ง 21 ต.ค. 2569 "ไม่ต้องบอก" แล้ว "กูให้มึงเอาตรงนี้ออก")

function readFromId(): string | null {
  const v = new URLSearchParams(window.location.search).get("from");
  return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

export default function GameView() {
  const router = useRouter();
  const [fromId] = useState<string | null>(() => readFromId());
  const [prefs, setPrefs] = useState<PlayPrefs>(() => playMem.prefs ?? DEFAULT_PREFS);
  const [sound, setSoundState] = useState<boolean>(() => getSound());
  // เกมเริ่มต้น · จำเกมที่เล่นค้างไว้ตอนสลับแท็บ (lib/session.ts) · มาจากประวัติ = รอโหลดผังก่อน
  const [boot] = useState(() => {
    if (fromId) return { G: null as Game | null, msg: "กำลังเปิดด่านจากประวัติ" };
    if (playMem.G) {
      const g = playMem.G;
      // เกมที่กดดูเฉลยไว้ กลับมาแล้วเฉลยกับคำอธิบายยังอยู่ (เดิมหายและกดดูเฉลยอีกไม่ได้ docs/BUGHUNT-2026-10-21.md ข้อ 35)
      const msg = g.status === "play" ? "หยุดเวลาไว้ระหว่างที่ไม่ได้อยู่หน้านี้ กดเดินเพื่อเล่นต่อ" : g.status === "gaveup" ? SOL_MSG + " รอบนี้ไม่นับสถิติ" : "";
      return { G: g, msg };
    }
    const s = settingsOf(playMem.prefs ?? DEFAULT_PREFS), m = makeLevel(s), g = newGame(s, m);
    playMem.G = g; playMem.replayOf = null; playMem.saved = false;
    return { G: g, msg: "" };
  });
  const G = useRef<Game | null>(boot.G);
  // เกมที่หน้าจอวาด (ตัวเดียวกับ G แต่เป็น state ให้ React รู้ว่าเปลี่ยนเกมแล้ว) · ตัวเกมแก้ในที่ ver บอกให้วาดใหม่
  const [game, setGame] = useState<Game | null>(boot.G);
  const sol = useRef<SolRun | null>(null);
  const raf = useRef(0);
  const board = useRef<BoardHandle>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  const [ver, setVer] = useState(0);
  // นับครั้งที่ปักธง ใช้เป็น key ให้วงคลื่นบนปุ่มปักธงเล่นใหม่ทุกครั้งที่ปัก (ปักใหม่ธงย้าย ก็วอ้งอีกรอบ)
  const [flagPulse, setFlagPulse] = useState(0);
  const [status, setStatus] = useState(boot.msg);
  const [time, setTime] = useState(() => (boot.G ? clock(boot.G, performance.now()) : 0));
  const [win, setWin] = useState<WinInfo | null>(() => (boot.G && boot.G.status === "won" ? { r: result(boot.G), recTime: false, recScore: false } : null));
  const [solOn, setSolOn] = useState(() => boot.G?.status === "gaveup");
  const [save, setSave] = useState<SaveState>({ kind: "none" });
  // ป้ายบันทึกแล้วข้างหัวข้อการ์ดชนะ มือถือเท่านั้น (พี่กันสั่ง 22 ต.ค. 2569 "ปุ่มที่ขึ้นว่า บันทึกเข้าเกม มันค้างนานไป ลองย้ายได้มั้ย
  // ให้เป็นเหมือนในเว็บ warfarin ที่มันจะขึ้นเล็กๆ เอาขึ้นข้างๆออกจากเขาวงกต")
  const [savedPill, setSavedPill] = useState(false);
  const pillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ป๊อปถามก่อนเริ่มด่านใหม่หรือยอมแพ้ระหว่างเล่น มือถือเท่านั้น (รายงานมือถือข้อ 2) · sliderKey ตั้งแถบเลื่อนกลับค่าเดิมเมื่อกดเล่นต่อ
  const [askNew, setAskNew] = useState<null | { kind: "new" | "giveup"; go: () => void }>(null);
  const [sliderKey, setSliderKey] = useState(0);
  // หน้าต่างเด้งวิธีเล่นของจอคอม (พี่กันสั่ง 22 ต.ค. 2569 "เปลี่ยน เป็นกดแล้วเป็น popup แสดง")
  const [helpPop, setHelpPop] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [snap, setSnap] = useState(() => snapOf(boot.G, prefs));
  // พักเกม (พี่กันสั่ง 21 ต.ค. 2569 "มันควรมีปุ่มกดหยุดเกมชั่วคราว") · นาฬิกาหยุดด้วย pause ตัวเดียวกับตอนสลับแท็บ
  // ระหว่างพักกระดานถูกปิดไว้ ไม่ให้แอบดูทางโดยไม่เสียเวลา · เดิน ปักธง กลับไปที่ธง ใช้ไม่ได้จนกว่าจะกดเล่นต่อ
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);
  /* หยุดเวลาเองเพราะไม่ได้ดูหน้านี้ (สลับแอป จอดับ หรือไปหน้าอื่นแล้วกลับมา) · หายเมื่อเดินได้ กดเล่นต่อ พักเกม หรือเริ่มด่านใหม่
     มือถือแสดงเป็นแผ่นทับวงกตแบบปุ่มเริ่มเกม แทนบรรทัดสถานะที่ดันวงกตกับปุ่มลงทั้งจอ (พี่กันสั่ง 22 ต.ค. 2569 "ห้ามขึ้นตรงนี้ ... ไปเอามันพาดทับวงกต เหมือนปุ่มกดเริ่มเกม")
     จอคอมยังขึ้นในบรรทัดสถานะเหมือนเดิม (แผ่นซ่อนด้วย hidden · app/mobile.css เปิดให้เห็น) */
  const [away, setAway] = useState(() => boot.G?.status === "play");
  /* มือถือเท่านั้น (พี่กันสั่ง 21 ต.ค. 2569)
     · ปุ่มเริ่มเกม "ถ้ายังไม่กดเริ่มเกม เราจะสัมผัสอะไรทั้งเอานิ้วลาก ทั้งกดแป้น เราจะทำไม่ได้" เดิมเลื่อนหน้าแล้วนิ้วโดนวงกต เกมเริ่มเอง
       ก่อนกดเริ่ม (armed) ลากนิ้ว ปักธง คีย์บอร์ด ไม่ทำงาน และแตะวงกตแล้วเลื่อนหน้าได้
       ปุ่มลูกศรบนจอแตะครั้งแรกแล้วเริ่มเกมพร้อมเดินเลย (padMove · พี่กันตอบ "เอา" 22 ต.ค. 2569 หน้าทดลองกดบน iPhone เจอแตะลูกศรก่อนกดเริ่มแล้วเงียบ 23 ครั้งใน 4 รอบ)
     · แผ่นตั้งค่าด่านกับวิธีเล่น "ทำเป็นปุ่มกดดู จะไม่อยู่หน้าเล่นเกม" กดปุ่มแล้วเลื่อนขึ้นจากขอบล่าง (sheet)
     จอคอมไม่ใช้ทั้งสองอย่าง (isMobile เป็นเท็จ ปุ่มกับแผ่นซ่อนด้วย hidden · app/mobile.css เปิดให้เห็น) */
  // เปลี่ยนขนาดจอข้ามเส้นมือถือแล้ววาดหน้าใหม่ (ค่าไม่ได้ใช้ตรง ๆ แล้ว ตัวล็อกปุ่มเริ่มเกมใช้ทั้งสองจอ)
  const [, setIsMobile] = useState(false);
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const [sheet, setSheet] = useState<null | "set">(null);
  /** ยังไม่กดเริ่มเกม และยังไม่เริ่มเดิน = ห้ามเล่น ทั้งมือถือและจอคอม (จอคอมเพิ่ม 22 ต.ค. 2569 พี่กันสั่ง "เพิ่มปุ่มเริ่มที่เดสท็อปด้วย") */
  const locked = useCallback(() => !armedRef.current && G.current?.status === "ready", []);

  const sync = useCallback(() => {
    setVer((v) => v + 1);
    board.current?.draw();
  }, []);

  const setHold = useCallback((on: boolean) => {
    const g = G.current;
    if (!g) return;
    const now = performance.now();
    if (on) {
      // กดเริ่มเกมแล้วแต่ยังไม่เดินก้าวแรก (นาฬิกายังไม่เดิน) ก็พักได้ ม่านพักปิดวงกตเหมือนกัน
      // (พี่กันทัก 22 ต.ค. 2569 "เรากดแบ็กสเปซหยุดเกมไม่ได้" · เดิมพักได้เฉพาะหลังเดินก้าวแรก พอมีปุ่มเริ่มเกมบนจอคอม ช่วงหลังกดเริ่มก่อนเดินจึงพักไม่ได้)
      if (g.status !== "play" && !(g.status === "ready" && armedRef.current)) return;
      if (g.status === "play") { pause(g, now); setTime(clock(g, now)); }
      setStatus("พักเกมไว้ เวลาไม่เดิน กดเล่นต่อเมื่อพร้อม");
    } else {
      if (!heldRef.current) return;
      resume(g, now);
      setStatus("");
    }
    heldRef.current = on;
    setHeld(on);
    setAway(false);
  }, []);

  /** ปุ่มเล่นต่อบนแผ่นหยุดเวลา (มือถือ) · นาฬิกาเดินต่อจากเดิม ช่วงที่หยุดไม่นับ */
  const resumeAway = useCallback(() => {
    const g = G.current;
    if (!g) return;
    const now = performance.now();
    resume(g, now);
    setTime(clock(g, now));
    setStatus("");
    setAway(false);
  }, []);

  useEffect(() => { setSnap(snapOf(G.current, prefs)); }, [ver, prefs]);

  const getView = useCallback(() => (G.current ? { G: G.current, sol: sol.current, fog: G.current.settings.fog, now: performance.now(), pulse: !reducedMotion() } : null), []);

  const say = useCallback((t: string) => {
    setStatus(t);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => { if (G.current && G.current.status === "play") setStatus(""); }, 2600);
  }, []);

  const stopSol = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    sol.current = null;
  }, []);

  const startSol = useCallback(() => {
    stopSol();
    const g = G.current;
    if (!g) return;
    sol.current = solRun(g.n, g.R, g.B, g.s, g.e, g.onPath, performance.now());
    if (reducedMotion()) { sol.current.done = true; board.current?.draw(); return; }
    const tick = () => {
      const S = sol.current;
      if (!S) return;
      board.current?.draw();
      if (solFinished(S, performance.now())) { S.done = true; board.current?.draw(); raf.current = 0; }
      else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [stopSol]);

  // กลับมาที่เกมที่กดดูเฉลยไว้ วาดเฉลยเต็มทันที ไม่เล่นแอนิเมชันซ้ำ (docs/BUGHUNT-2026-10-21.md ข้อ 35)
  useEffect(() => {
    const g = G.current;
    if (!g || g.status !== "gaveup" || sol.current) return;
    sol.current = solRun(g.n, g.R, g.B, g.s, g.e, g.onPath, performance.now());
    sol.current.done = true;
    board.current?.draw();
  }, []);

  /** เริ่มเกมด้วยผังที่ให้มา (ด่านใหม่ หรือด่านเดิมจากประวัติ) */
  const begin = useCallback((s: Settings, m: MazeData, replayOf: string | null) => {
    stopSol();
    const g = newGame(s, m);
    G.current = g;
    setGame(g);
    playMem.G = g; playMem.replayOf = replayOf; playMem.saved = false;
    setWin(null); setSolOn(false); setSave({ kind: "none" }); setTime(0);
    heldRef.current = false; setHeld(false);
    armedRef.current = false; setArmed(false);
    setAway(false);
    setStatus("");
    sync();
  }, [stopSol, sync]);

  const newLevel = useCallback((p: PlayPrefs) => {
    const s = settingsOf(p);
    begin(s, makeLevel(s), null);
  }, [begin]);

  // มาจากประวัติ ?from=รหัสเกม · โหลดผังแล้วเริ่มด่านเดิม
  useEffect(() => {
    if (!fromId) return;
    let alive = true;
    const before = G.current;
    void getGame(fromId).then((r) => {
      if (!alive) return;
      // ระหว่างรอผู้เล่นเริ่มด่านอื่นเองแล้ว ทิ้งผลที่มาทีหลัง (เดิมทับด่านที่เพิ่งเลือก docs/BUGHUNT-2026-10-21.md ข้อ 36)
      if (G.current !== before) { window.history.replaceState(null, "", "/play"); return; }
      if (!r.ok) { setLoadErr(r.error || failText(r.why)); setStatus(""); return; }
      const g = r.data.game, m = unpackWalls(g.size, g.exit_x, g.walls);
      if (!m) { setLoadErr("ผังด่านของเกมนี้เสีย เปิดไม่ได้"); return; }
      const p: PlayPrefs = { level: g.level as Level, algo: g.algo as AlgoId, minLen: g.min_len, loops: g.loops, fog: g.fog };
      playMem.prefs = p;
      setPrefs(p);
      begin(settingsOf(p), m, fromId);
      window.history.replaceState(null, "", "/play");
    });
    return () => { alive = false; };
  }, [fromId, begin]);

  useEffect(() => { playMem.prefs = prefs; }, [prefs]);

  useEffect(() => {
    const html = document.documentElement;
    const read = () => setIsMobile(html.classList.contains("mz-mobile"));
    read();
    const mo = new MutationObserver(read);
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  // แผ่นเปิดอยู่ กด Esc ปิด
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setSheet(null); setHelpPop(false); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]);

  /** กดเริ่มเกม (มือถือ) · เลื่อนหน้ากลับขึ้นบนสุดทีละเฟรม ให้เห็นวงกตกับปุ่มเดินเต็มจอ (ห้ามใช้ behavior smooth ความรู้ทั่วไป knowledge_smooth_scroll_broken) */
  const start = () => {
    armedRef.current = true;
    setArmed(true);
    const y0 = window.scrollY;
    if (y0 <= 0) return;
    const t0 = performance.now(), D = reducedMotion() ? 0 : 260;
    const step = (t: number) => {
      const k = D ? Math.min(1, (t - t0) / D) : 1;
      window.scrollTo(0, y0 * (1 - (1 - (1 - k) ** 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  /** ปุ่มลูกศรบนจอ · มือถือก่อนกดเริ่มเกม แตะลูกศรครั้งแรกเริ่มเกมให้เองแล้วเดินทิศนั้นเลย ไม่ต้องกดปุ่มเริ่มเกมก่อน (ปุ่มเริ่มเกมยังกดได้)
      ลากนิ้วบนวงกต ปักธง แป้นพิมพ์ ยังต้องเริ่มก่อนเหมือนเดิม · จอคอมไม่มีการล็อก ทำงานเหมือนเดิม */
  const padMove = (d: Dir) => { if (locked()) start(); return doMove(d); };

  // ทางให้ชุดทดสอบอ่านสถานะเกมตอนรันในเครื่องเท่านั้น · ตอนสร้างเว็บจริงเงื่อนไขนี้เป็นเท็จ โค้ดส่วนนี้ถูกตัดทิ้ง
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __mazeG?: () => Game | null }).__mazeG = () => G.current;
  }, []);
  useEffect(() => { setSoundEnabled(sound); }, [sound]);

  // นาฬิกาบนจอ ทุก 0.1 วินาที
  useEffect(() => {
    const t = setInterval(() => {
      const g = G.current;
      if (g && g.status === "play" && g.pausedAt === null) setTime(clock(g, performance.now()));
    }, 100);
    return () => clearInterval(t);
  }, []);

  // บั๊กข้อ 5 · หยุดนาฬิกาเมื่อสลับแท็บของเบราว์เซอร์ จอดับ หรือออกจากหน้านี้
  useEffect(() => {
    const onVis = () => {
      const g = G.current;
      if (document.visibilityState === "hidden" && g && pause(g, performance.now())) {
        setStatus("หยุดเวลาไว้ระหว่างที่ไม่ได้ดูหน้านี้ กดเดินเพื่อเล่นต่อ");
        setAway(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      const g = G.current;
      if (g) pause(g, performance.now());
    };
  }, []);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); if (msgTimer.current) clearTimeout(msgTimer.current); }, []);

  // ตัวผู้เล่นกะพริบวิบวับ วาดกระดานซ้ำราว 20 ครั้งต่อวินาที เฉพาะตอนกำลังเล่น ไม่พัก และเห็นหน้าอยู่
  // เครื่องตั้งลดการเคลื่อนไหว = ไม่วาดซ้ำ (ตัววาดก็ไม่วาดวงแสงด้วย) · ตัวกะพริบอยู่ใน lib/draw/gameDraw.ts
  useEffect(() => {
    let id = 0, last = 0;
    const tick = (t: number) => {
      id = requestAnimationFrame(tick);
      if (t - last < 50) return;
      last = t;
      const g = G.current;
      if (!g || (g.status !== "ready" && g.status !== "play") || heldRef.current || document.hidden || reducedMotion()) return;
      board.current?.draw();
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  /** เกมจบ คิดผล เก็บสถิติดีสุด แล้วบันทึกเข้าระบบ */
  const onWin = useCallback((g: Game) => {
    SFX.win();
    const r = result(g), s = g.settings;
    const oldT = getBestTime(s), oldS = getBestScore(s);
    const recTime = oldT === null || g.el < oldT, recScore = oldS === null || r.score > oldS;
    if (recTime) setBestTime(s, g.el);
    if (recScore) setBestScore(s, r.score);
    setWin({ r, recTime, recScore });
    // ช่องเวลาด้านบนต้องเท่ากับเวลาในการ์ดผล (เดิมค้างค่าของรอบนับล่าสุด ช้ากว่า 0.1 วินาทีได้)
    setTime(g.el);
    setStatus("");
    if (playMem.saved) return;
    playMem.saved = true;
    const rec = recordOf(g, `${LEVEL_NAME[s.level]} ${algoName(s.algo)} ${r.score} คะแนน ${fmt(g.el)}`, playMem.replayOf);
    setSave({ kind: "saving" });
    // กำลังบันทึกกับบันทึกสำเร็จขึ้นเป็นป้ายเล็กข้างหัวข้อการ์ด (savedPill) แทนแถบลอยล่างจอที่ค้างนานบังปุ่ม ทั้งมือถือและจอคอม
    // (พี่กันสั่ง 22 ต.ค. 2569 มือถือก่อน แล้วตามด้วยจอคอม "ไปปรับในเดสท็อปด้วย") · ไม่สำเร็จหรือยังไม่เข้าระบบยังใช้แถบล่างจอที่ค้างจนกดปิด (สกิล save-status)
    void uploadGame(rec).then((res) => {
      // ผลมาถึงตอนเริ่มเกมใหม่ไปแล้ว ห้ามเปลี่ยนการ์ดของเกมใหม่ บอกผลของเกมเก่าพร้อมชื่อเกมแทน
      // เดิมผลของเกมก่อนหน้ามาทับการ์ดเกมใหม่ (docs/BUGHUNT-2026-10-21.md ข้อ 4)
      if (playMem.G !== g) {
        if (res.ok) showBanner({ kind: "ok", title: "บันทึกเกมก่อนหน้าเข้าระบบแล้ว" });
        else if (!res.queued) showBanner({ kind: "error", title: "บันทึกเกมก่อนหน้าไม่สำเร็จ ข้อมูลยังไม่เข้าระบบ", lines: [rec.label, res.reason] });
        return;
      }
      if (res.ok) {
        setSave({ kind: "ok", id: res.id });
        // ป้ายบันทึกแล้วค้าง 3 วินาทีแล้วหาย แบบป้ายมุมบนขวาของเว็บ warfarin
        if (pillTimer.current) clearTimeout(pillTimer.current);
        setSavedPill(true);
        pillTimer.current = setTimeout(() => setSavedPill(false), 3000);
      } else if (res.queued) {
        setSave({ kind: "queued", reason: res.reason });
        showBanner({ kind: "warn", title: "บันทึกเกมนี้ไว้ในเครื่องแล้ว ยังไม่เข้าระบบ", lines: [res.reason, "ปิดหน้าต่างได้ ระบบจะส่งให้เองเมื่อเชื่อมต่อได้"] });
      } else {
        setSave({ kind: "bad", reason: res.reason });
        showBanner({ kind: "error", title: "บันทึกไม่สำเร็จ ข้อมูลยังไม่เข้าระบบ", lines: [res.reason] });
      }
    });
    setTimeout(() => document.getElementById("wincard-anchor")?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" }), 60);
  }, []);

  const doMove = useCallback((d: Dir): boolean => {
    const g = G.current;
    if (!g || heldRef.current || locked()) return false;
    const wasReady = g.status === "ready", wasPaused = g.pausedAt !== null;
    const r = move(g, d, performance.now());
    if (!r.moved) return false;
    // หยุดนาฬิกาไว้แล้วก้าวต่อ นาฬิกาเดินแล้ว ข้อความหยุดเวลาต้องหายด้วย (เดิมค้าง docs/BUGHUNT-2026-10-21.md ข้อ 9)
    if (wasReady || wasPaused) { setStatus(""); setAway(false); }
    if (!r.won) SFX.step(r.back);
    if (r.won) onWin(g);
    sync();
    return true;
  }, [onWin, sync, locked]);

  const bump = useCallback(() => { if (playing(G.current) && !heldRef.current && !locked()) SFX.bump(); }, [locked]);

  const doFlag = useCallback(() => {
    const g = G.current;
    if (!g || heldRef.current || locked()) return;
    // มีธงอยู่แล้ว กดอีกครั้ง = เอาธงออก ปุ่มกลับเป็นสีปกติ (พี่กันทัก 22 ต.ค. 2569 "ทำไมเรากดธงอีกรอบแล้วธงมันไม่หาย" เดิมกดซ้ำ = ย้ายธง)
    if (g.flag >= 0) {
      if (!clearFlag(g, performance.now())) return;
      SFX.flag();
      say("เอาธงออกแล้ว");
      sync();
      return;
    }
    if (!setFlag(g, performance.now())) return;
    SFX.flag();
    setFlagPulse((n) => n + 1);
    say("ปักธงแล้ว หากพบทางตันให้กดกลับไปที่ธง");
    sync();
  }, [say, sync, locked]);

  const doBack = useCallback(() => {
    const g = G.current;
    if (!g || heldRef.current || locked()) return;
    const r = backToFlag(g, performance.now());
    if (r === "noflag") { SFX.bump(); say("ยังไม่ได้ปักธง ควรปักไว้ที่ทางแยกก่อน"); return; }
    if (r !== "ok") return;
    SFX.warp();
    say("กลับมาที่ธงแล้ว วาร์ปไม่นับก้าว");
    sync();
  }, [say, sync, locked]);

  const doGiveUp = useCallback(() => {
    const g = G.current;
    if (!g || !giveUp(g, performance.now())) return;
    // กดดูเฉลยระหว่างพักเกม เอาม่านพักออก (เดิมเฉลยวิ่งอยู่ใต้ม่าน กดเล่นต่อแล้วคำอธิบายเฉลยหาย docs/BUGHUNT-2026-10-21.md ข้อ 23)
    if (heldRef.current) { heldRef.current = false; setHeld(false); }
    SFX.giveUp();
    setStatus(SOL_MSG + " รอบนี้ไม่นับสถิติ");
    setSolOn(true);
    startSol();
    sync();
  }, [startSol, sync]);

  const toggleSol = () => {
    if (solOn) { stopSol(); setSolOn(false); setStatus(""); board.current?.draw(); }
    else { startSol(); setSolOn(true); setStatus(SOL_MSG); }
  };

  // คีย์บอร์ด ลูกศร หรือ W A S D · F ปักธง · R กลับไปที่ธง · อ่านจาก e.code ใช้ได้แม้แป้นเป็นภาษาไทย
  // สเปซบาร์พักเกมหรือเล่นต่อ · เดิมเป็น Backspace (พี่กันสั่ง "กด p หรือ backspace") 22 ต.ค. 2569 พี่กันบอกว่าหมายถึงสเปซบาร์มาตลอด
  // สั่ง "ปุ่มที่เชื่อมไปแบ็กสเปซ เอาออกให้หมด เพราะหมายถึงสเปซบาร์" · Backspace ไม่ทำอะไรแล้ว
  const keyRef = useRef({ doMove, doFlag, doBack, bump, setHold });
  useEffect(() => { keyRef.current = { doMove, doFlag, doBack, bump, setHold }; }, [doMove, doFlag, doBack, bump, setHold]);
  // จอคอม ก่อนกดเริ่มเกม กดลูกศรแล้วเริ่มเกมพร้อมเดินเลย แบบแตะปุ่มลูกศรบนมือถือ (padMove) · Enter เริ่มเกม
  const armRef = useRef(start);
  useEffect(() => { armRef.current = start; });
  useEffect(() => {
    const KEYS: Record<string, Dir> = { ArrowUp: "u", ArrowDown: "d", ArrowLeft: "l", ArrowRight: "r", KeyW: "u", KeyS: "d", KeyA: "l", KeyD: "r" };
    const FALLBACK: Record<string, string> = { w: "u", s: "d", a: "l", d: "r", W: "u", S: "d", A: "l", D: "r", "ไ": "u", "ห": "d", "ฟ": "l", "ก": "r", f: "F", F: "F", "ด": "F", r: "R", R: "R", "พ": "R" };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      // ป๊อปยืนยันเปิดอยู่ (เช่นถามก่อนออกจากหน้าเล่นเกม) ปุ่มลูกศรไม่เดินตัวละครข้างหลังป๊อป
      if (document.querySelector(".cdback")) return;
      const t = e.target as HTMLElement | null, tag = t?.tagName, typ = (t as HTMLInputElement | null)?.type;
      if (tag === "TEXTAREA" || (tag === "INPUT" && typ !== "checkbox" && !(typ === "range" && !e.key.startsWith("Arrow")))) return;
      // Enter หรือ Space เริ่มเกม (Space พี่กันสั่ง 22 ต.ค. 2569 "ในเดส ตอนกดเริ่มเกม สามารถกดสเปชบาร์เริ่มได้นะ") · เฉพาะตอนไม่ได้โฟกัสช่องอื่นอยู่ (ปุ่มเริ่มเกมที่โฟกัสอยู่กดได้เองอยู่แล้ว)
      if ((e.key === "Enter" || e.code === "Space" || e.key === " ") && locked() && document.activeElement === document.body) { e.preventDefault(); armRef.current(); return; }
      // สเปซบาร์ระหว่างเล่น พักเกม กดอีกครั้งเล่นต่อ (พี่กันสั่ง 22 ต.ค. 2569 "เรากดสเปซบาร์หยุดเกมไม่ได้" แล้ว "เราหมายถึงปุ่มนี้นะ")
      // กันปุ่มที่โฟกัสอยู่โดนกดซ้ำด้วยสเปซ (preventDefault) · ช่องเลือกในแผงตั้งค่าไม่โดน
      if ((e.code === "Space" || e.key === " ") && !locked() && tag !== "SELECT" && tag !== "INPUT") {
        const g = G.current;
        if (g && (g.status === "play" || (g.status === "ready" && armedRef.current))) { e.preventDefault(); if (!e.repeat) keyRef.current.setHold(!heldRef.current); return; }
      }
      const k = e.code === "KeyF" ? "F" : e.code === "KeyR" ? "R" : KEYS[e.code] || KEYS[e.key] || FALLBACK[e.key];
      if (!k) return;
      e.preventDefault();
      const h = keyRef.current;
      if (locked() && k !== "F" && k !== "R") armRef.current();
      if (k === "F") { if (!e.repeat) h.doFlag(); return; }
      if (k === "R") { if (!e.repeat) h.doBack(); return; }
      if (!h.doMove(k as Dir) && !e.repeat) h.bump();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [locked]);

  // ลากนิ้วบนกระดาน · อ้อมได้ไม่เกิน 2 ก้าว ไกลกว่านั้นเดินตรงเข้าหานิ้ว
  const follow = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = G.current, cv = board.current?.el();
    if (!g || !cv || locked()) return;
    const t = cellAt(cv, g.n, e.clientX, e.clientY);
    if (t < 0 || t === g.pos) return;
    const dirTo = (a: number, b: number): Dir => (b - a === 1 ? "r" : b - a === -1 ? "l" : b - a === g.n ? "d" : "u");
    const prev = new Map<number, number>([[g.pos, -1]]);
    let layer = [g.pos], sp: number[] | null = null;
    for (let d = 0; d < 2 && layer.length && !sp; d++) {
      const next: number[] = [];
      for (const c of layer) for (const q of openNb(c, g.n, g.R, g.B)) if (!prev.has(q)) {
        prev.set(q, c);
        if (q === t) { const p: number[] = []; let x = q; while (x !== g.pos) { p.unshift(x); x = prev.get(x) as number; } sp = p; break; }
        next.push(q);
      }
      layer = next;
    }
    if (sp) { for (const c of sp) if (!doMove(dirTo(g.pos, c))) break; return; }
    for (let k = 0; k < g.n * 2 && g.pos !== t; k++) {
      const px = g.pos % g.n, py = (g.pos / g.n) | 0, dx = (t % g.n) - px, dy = ((t / g.n) | 0) - py;
      const h: Dir = dx > 0 ? "r" : "l", v: Dir = dy > 0 ? "d" : "u";
      const order = Math.abs(dx) >= Math.abs(dy) ? [dx && h, dy && v] : [dy && v, dx && h];
      let moved = false;
      for (const d of order) if (d && canMove(g, g.pos, d) && doMove(d)) { moved = true; break; }
      if (!moved) break;
    }
  };

  // มือถือ เล่นอยู่แล้วแตะของในแผ่นตั้งค่าด่าน (ต้องเลื่อนผ่านไปอ่านวิธีเล่นท้ายแผ่น) ถามก่อน เกมเดิมจะหายไม่บันทึก · แตะระดับเดิมไม่สร้างด่านใหม่
  // (รายงานมือถือข้อ 2 · จอคอมเหมือนเดิม)
  const guardNew = (kind: "new" | "giveup", go: () => void) => { if (onMobile() && G.current?.status === "play") setAskNew({ kind, go }); else go(); };
  const changePrefs = (p: PlayPrefs) => guardNew("new", () => { setPrefs(p); newLevel(p); });
  const setLevel = (lv: Level) => { if (onMobile() && lv === prefs.level) return; changePrefs({ ...prefs, level: lv, minLen: LV_MINL[lv] }); };

  const toPrint = () => {
    const g = G.current;
    if (!g) return;
    try {
      sessionStorage.setItem("maze-print", JSON.stringify({ n: g.n, ex: g.maze.ex, walls: packWalls(g.maze), level: g.settings.level, algo: g.settings.algo, minLen: g.settings.minLen, loops: g.settings.loops }));
    } catch { /* เก็บไม่ได้ หน้าใบงานจะบอกเอง */ }
    router.push("/print");
  };

  const bestT = snap.bestT, bestS = snap.bestS;
  const over = snap.status === "won";
  const lockedNow = !armed && snap.status === "ready";
  const awayNow = away && !held && snap.status === "play";
  /* คำอธิบายปุ่มครบทุกปุ่ม (พี่กันสั่ง 21 ต.ค. 2569 "เขียนคำอธิบายปุ่มให้ครบ") · จอคอมอยู่ใต้ปุ่มเดิน มือถืออยู่ในแผ่นตั้งค่าด่าน */
  const helpList = (
    <>
      {/* เริ่มเกม 4 ทาง (พี่กันสั่ง 22 ต.ค. 2569 "ไปเขียนในรายละเอียดวิธีเล่นด้วยนะ") */}
      <dt>เริ่มเกม<kbd className="kc" aria-hidden="true">Space</kbd></dt>
      <dd><Phr>{"กดปุ่มเริ่มเกม หรือกด Space หรือ Enter หรือกดลูกศร ลูกศรจะเริ่มแล้วเดินก้าวแรกให้เลย"}</Phr></dd>
      <dt>เดิน</dt>
      <dd><Phr>{"ปุ่มลูกศรบนจอ ปุ่มลูกศรบนคีย์บอร์ด หรือ W A S D กดค้างไว้เพื่อเดินต่อเนื่อง หรือลากนิ้วบนเขาวงกต"}</Phr></dd>
      <dt>เดินย้อน</dt>
      <dd><Phr>{"เดินย้อนทางเดิม เส้นจะหดตามเอง"}</Phr></dd>
      <dt>ปักธง<kbd className="kc" aria-hidden="true">F</kbd></dt>
      <dd><Phr>{"ปักธงไว้ที่ช่องที่ยืนอยู่ กดอีกครั้งเอาธงออก"}</Phr></dd>
      <dt><span className="lfull">กลับไปที่ธง</span><span className="lshort" hidden>กลับธง</span><kbd className="kc" aria-hidden="true">R</kbd></dt>
      <dd><Phr>{"วาร์ปกลับไปที่ธงทันที ไม่นับก้าว"}</Phr></dd>
      <dt><span className="lfull">พักเกม</span><span className="lshort" hidden>พัก</span><kbd className="kc" aria-hidden="true">Space</kbd></dt>
      <dd><Phr>{"หยุดเวลาและซ่อนเขาวงกตไว้ กดอีกครั้งเพื่อเล่นต่อ พักได้ตั้งแต่กดเริ่มเกม"}</Phr></dd>
    </>
  );

  /* โครงหน้า (จัดใหม่ 21 ต.ค. 2569 พี่กันสั่ง "หน้าเล่นเกมในโหมดเดสก์ท็อป จัดให้มันเต็มจอ ... ออกแบบต่างจากมือถือได้เลย")
     จอคอม สามคอลัมน์ ซ้ายสถานะการเล่นกับปุ่มเดิน · กลางกระดานพอดีจอ · ขวาตั้งค่าด่านเลื่อนในตัวเอง
     ลำดับในโค้ด hud กระดาน ปุ่ม ตั้งค่า = ลำดับบนจอแคบ (globals.css หัวข้อหน้าเล่นเกม) */
  /* คลาส ended = เกมนี้จบแล้ว (ชนะหรือยอมแพ้) · มือถือซ่อนแถบรอส่งระหว่างที่เกมยังไม่จบ (app/mobile.css) จอคอมไม่มีกฎของคลาสนี้ */
  return (
    <div className={`view playpage wide${lockedNow ? " locked" : ""}${over || snap.status === "gaveup" ? " ended" : ""}${awayNow ? " away" : ""}`} data-sheet={sheet ?? undefined}>
      <div className="play">
        <div className="pg-hud">
          <div className="hud">
            <div><span className="k">เวลา</span><b>{fmt(time)}</b></div>
            <div><span className="k">ก้าว</span><b>{th(snap.steps)}</b></div>
            <div>
              <span className="k">สถิติดีสุด</span>
              <b>{bestT === null ? "ไม่มี" : fmt(bestT)}</b>
              <span className="best2">{bestS === null ? "คะแนนดีสุด ไม่มี" : `คะแนนดีสุด ${bestS}`}</span>
            </div>
          </div>
          <p className="status"><Phr>{loadErr ? `เปิดด่านจากประวัติไม่สำเร็จ ${loadErr}` : status}</Phr></p>
        </div>
        <section className="pg-board" aria-label="สนามเล่น">
          <div className="stage">
            {game ? (
              <BoardCanvas2D
                ref={board}
                getView={getView}
                tabIndex={0}
                ariaLabel="เขาวงกตสำหรับเล่น ใช้ปุ่มลูกศรเพื่อเดิน"
                scroll={lockedNow || over || snap.status === "gaveup"}
                onPointerDown={(e) => { if (locked()) return; dragging.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ไม่เป็นไร */ } e.currentTarget.focus({ preventScroll: true }); follow(e); }}
                onPointerMove={(e) => { if (dragging.current) follow(e); }}
                onPointerUp={() => { dragging.current = false; }}
              />
            ) : (
              <div className="boardskel" aria-label="กำลังเปิดด่าน" />
            )}
            {/* ปุ่มเริ่มเกม มือถือและจอคอม ทับวงกตที่เบลอ (จอคอมเพิ่ม 22 ต.ค. 2569 พี่กันสั่ง "เพิ่มปุ่มเริ่มที่เดสท็อปด้วย") · สไตล์ใน app/globals.css .startcover */}
            {game && snap.status === "ready" && !armed && (
              <div className="startcover">
                <button type="button" className="btn primary" onClick={start}><Icon name="play" size={18} />เริ่มเกม</button>
              </div>
            )}
            {/* แผ่นหยุดเวลา มือถือเท่านั้น · hidden ไว้ จอคอมไม่เห็น app/mobile.css เปิดให้เห็น · ทับวงกตที่เบลอไว้ แบบปุ่มเริ่มเกม */}
            {awayNow && (
              <div className="awaycover" hidden>
                <button type="button" className="btn primary" onClick={resumeAway}><Icon name="play" size={18} />เล่นต่อ</button>
                <span>หยุดเวลาไว้ระหว่างที่ไม่ได้ดูหน้านี้</span>
              </div>
            )}
            {held && (
              <div className="pausecover" role="dialog" aria-label="พักเกม">
                <b>พักเกมไว้</b>
                <span>เวลาไม่เดินระหว่างนี้ ซ่อนเขาวงกตไว้ระหว่างพัก</span>
                <button type="button" className="btn primary" onClick={() => setHold(false)} autoFocus><Icon name="play" size={16} />เล่นต่อ</button>
              </div>
            )}
          </div>
        </section>
        <div className="pg-ctrl">
          {over && win && game && (
            <div id="wincard-anchor">
              <ResultCard
                G={game}
                r={win.r}
                title="ออกจากเขาวงกตได้แล้ว"
                celebrate
                pills={[...(win.recTime ? ["เวลาดีสุดใหม่"] : []), ...(win.recScore ? ["คะแนนดีสุดใหม่"] : [])]}
                badge={(save.kind === "saving" || (save.kind === "ok" && savedPill)) && (
                  // ป้ายลอยมุมขวาของหัวการ์ด ไม่ดันอะไร (app/globals.css .wsave)
                  <span className={`wsave ${save.kind === "saving" ? "wait" : "done"}`} role="status" title={save.kind === "saving" ? "กำลังบันทึกเกมเข้าระบบ" : "บันทึกเกมเข้าระบบแล้ว"}>
                    <span className={save.kind === "saving" ? "wspin" : "wtick"} aria-hidden="true" />
                    <span className="wsavet">{save.kind === "saving" ? "กำลังบันทึก" : "เข้าระบบแล้ว"}</span>
                  </span>
                )}
              >
                <SaveLine save={save} />
                <div className="row">
                  <button type="button" className="btn primary" onClick={() => newLevel(prefs)}><Icon name="restart" size={16} />เล่นด่านใหม่</button>
                  <button type="button" className="btn solbtn" aria-pressed={solOn} onClick={toggleSol}><Icon name="eye" size={16} />{solOn ? "ซ่อนเฉลย" : "ดูเฉลยเทียบ"}</button>
                </div>
                {/* คำอธิบายเฉลย มือถือเท่านั้น ท้ายการ์ดใต้ปุ่มที่กด ไม่แทรกบรรทัดเหนือวงกตแล้วดันการ์ดลง (พี่กันสั่ง 22 ต.ค. 2569 "ห้ามมีอักษรอะไร ขึ้นที่หน้าเล่นเกม ที่มันทำให้เว็บเลื่อนจากเดิม")
                    hidden ไว้ จอคอมเห็นในบรรทัดสถานะเหมือนเดิม */}
                {solOn && <p className="wsolnote" hidden><Phr>{SOL_MSG}</Phr></p>}
              </ResultCard>
            </div>
          )}
          {!over && (
            <>
              <DPad onMove={padMove} onBump={bump} />
              <div className="flagrow">
                {/* ปักธงแล้ว วงคลื่นแผ่ออกจากปุ่มหนึ่งครั้ง แล้วปุ่มเป็นสีเหลืองค้างไว้ตลอดที่ยังมีธง (พี่กันสั่ง 22 ต.ค. 2569 "ถ้าปักธงแล้ว ปุ่มนี้ควรจะมี animation วอ้ง ๆ แล้วมันจะเปลี่ยนเป็นสีเหลือง") */}
                <button type="button" className={`btn fbtn flagbtn${game && game.flag >= 0 ? " flagged" : ""}`} onClick={doFlag} aria-keyshortcuts="F" disabled={lockedNow}><span className="flagico" aria-hidden="true" />ปักธง<kbd className="kc" aria-hidden="true">F</kbd>{flagPulse > 0 && <span key={flagPulse} className="fring" aria-hidden="true" />}</button>
                {/* ก่อนกดเริ่มเกม ปุ่มปักธงกับกลับไปที่ธงกดไม่ได้ แบบเดียวกับปุ่มพัก (พี่กันสั่ง 22 ต.ค. 2569 "ยังไม่เริ่มเกม ปุ่มปักธง และกดกลับธง ควรกดไม่ได้") */}
                <button type="button" className="btn fbtn" onClick={doBack} aria-keyshortcuts="R" disabled={lockedNow}><Icon name="undo" size={16} /><span className="lfull">กลับไปที่ธง</span><span className="lshort" hidden>กลับธง</span><kbd className="kc" aria-hidden="true">R</kbd></button>
                {/* พักได้ตั้งแต่กดเริ่มเกม (ก่อนก้าวแรกก็พักได้ ม่านพักปิดวงกต) · ปุ่มลัดสเปซบาร์ (เดิม Backspace พี่กันสั่งเอาออก 22 ต.ค. 2569) */}
                <button type="button" className="btn fbtn" aria-pressed={held} aria-keyshortcuts="Space" onClick={() => setHold(!held)} disabled={!held && snap.status !== "play" && !(snap.status === "ready" && armed)}>
                  <Icon name={held ? "play" : "pause"} size={16} />{held ? "เล่นต่อ" : <><span className="lfull">พักเกม</span><span className="lshort" hidden>พัก</span></>}<kbd className="kc" aria-hidden="true">Space</kbd>
                </button>
                {/* ปุ่มตั้งค่า มือถือเท่านั้น อยู่แถวเดียวกับปุ่มธง กดแล้วแผ่นตั้งค่าด่านเด้งขึ้นจากขอบล่าง ข้างในมีวิธีเล่นด้วย
                    (พี่กันสั่ง 21 ต.ค. 2569 "ปุ่มตั้งค่าวิธีเล่น เอาเข้าไปในแท็บ ตั้งค่าด่าน เลย และเอาปุ่มนี้ อยู่แถวเดียวกันกับปุ่มธง") · hidden ไว้ จอคอมไม่เห็น */}
                <button type="button" className="btn fbtn msetbtn" hidden onClick={() => { if (snap.status === "play" && !held) setHold(true); setSheet("set"); }} aria-haspopup="dialog"><Icon name="sliders" size={16} />ตั้งค่า</button>
              </div>
              {/* คำอธิบายปุ่มครบทุกปุ่มของฝั่งนี้ ชื่อปุ่มกับแป้นลัดอยู่คอลัมน์ซ้าย (พี่กันสั่ง 21 ต.ค. 2569 "เขียนคำอธิบายปุ่มให้ครบ" เดิมบอกแค่การเดิน) */}
              {/* วิธีเล่นเป็นปุ่ม กดแล้วขึ้นหน้าต่างเด้ง (พี่กันสั่ง 22 ต.ค. 2569 "ไปย่อให้มันเป็นเปิดปิดได้" แล้วเปลี่ยนเป็น "ไม่เอาแบบนี้ เปลี่ยน เป็นกดแล้วเป็น popup แสดง")
                  ปุ่มลูกศรไม่หดอีก · กำลังเล่นอยู่ เปิดแล้วพักเวลาให้ · ปิดด้วยปุ่มกากบาท แตะพื้นหลัง หรือ Esc · มือถือซ่อน (วิธีเล่นอยู่ในแผ่นตั้งค่าด่าน) */}
              {/* ที่ว่างข้างปุ่ม บอกวิธีเดินสั้น ๆ บรรทัดเดียว ปุ่มชื่อวิธีเล่นทั้งหมด (พี่กันสั่ง 22 ต.ค. 2569 "ที่มันเหลือ บอกวิธีเล่นคร่าวๆในบรรทัดเดียว บอกวิธีเคลื่อนไหว" · "เปลี่ยนเป็นวิธีเล่นทั้งหมด") */}
              <div className="helprow">
                <button type="button" className="helpbtn" aria-haspopup="dialog" onClick={() => { if (snap.status === "play" && !held) setHold(true); setHelpPop(true); }}><Icon name="list" size={14} />วิธีเล่นทั้งหมด</button>
                <span className="helphint">เดินด้วยปุ่มลูกศร หรือ W A S D หรือลากบนวงกต</span>
              </div>
              {/* ยอมแพ้แล้ว คำอธิบายเฉลยขึ้นแทนที่ปุ่มลูกศร (ใช้เดินไม่ได้แล้ว) มือถือเท่านั้น · ไม่แทรกบรรทัดเหนือวงกตแล้วดันจอลง
                  (พี่กันสั่ง 22 ต.ค. 2569 "ห้ามมีอักษรอะไร ขึ้นที่หน้าเล่นเกม ที่มันทำให้เว็บเลื่อนจากเดิม") · hidden ไว้ จอคอมเห็นในบรรทัดสถานะเหมือนเดิม */}
              {snap.status === "gaveup" && status && <p className="solnote" hidden><Phr>{status}</Phr></p>}
            </>
          )}
        </div>

        <section className="panel pg-set" aria-label="ตั้งค่าเกม">
          <div className="msheet-top" hidden><b>ตั้งค่าด่าน</b><button type="button" className="iconbtn" aria-label="ปิดแผ่นนี้" onClick={() => setSheet(null)}><Icon name="x" size={16} /></button></div>
          <h3 className="psech">ตั้งค่าด่าน</h3>
          {/* สถิติดีสุดย้ายมาไว้ในแผ่นนี้บนมือถือ (หน้าเล่นเกมมีแค่เวลากับก้าว พี่กันสั่ง "มีแค่ปุ่ม วงกต ก้าว เวลา จบ") */}
          <p className="mbest" hidden><span>สถิติดีสุด</span> <b>{bestT === null ? "ไม่มี" : fmt(bestT)}</b> <span>{bestS === null ? "คะแนนดีสุด ไม่มี" : `คะแนนดีสุด ${bestS}`}</span></p>
          <div>
            <div className="lbl ptitle">ระดับ <b>{LEVELS[prefs.level]} × {LEVELS[prefs.level]} ช่อง</b></div>
            <div className="seg seg4" role="group" aria-label="ระดับ">
              {LEVEL_IDS.map((lv) => (
                <button key={lv} type="button" aria-pressed={prefs.level === lv} onClick={() => setLevel(lv)}><Icon name={("lv" + (LEVEL_IDS.indexOf(lv) + 1)) as IconName} size={16} />{LEVEL_NAME[lv]}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="lbl ptitle" htmlFor="galgo">วิธีสร้าง</label>
            <select id="galgo" value={prefs.algo} onChange={(e) => changePrefs({ ...prefs, algo: e.target.value as AlgoId })}>
              {Object.entries(GROUPS).map(([g, label]) => (
                <optgroup key={g} label={label}>
                  {ALGOS.filter((a) => a.g === g).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="foot" style={{ marginTop: 6 }}><Phr>{GNOTE[prefs.algo]}</Phr></p>
          </div>
          <MinLenSlider key={`ml${sliderKey}`} prefs={prefs} onCommit={(v) => changePrefs({ ...prefs, minLen: v })} />
          <LoopsSlider key={`lp${sliderKey}`} prefs={prefs} onCommit={(v) => changePrefs({ ...prefs, loops: v })} />
          {/* ปุ่มใหญ่กดสลับเปิดปิด แทนช่องติ๊ก (พี่กันสั่ง 21 ต.ค. 2569 "ขอเป็นปุ่มใหญ่ ไม่ใช่ติ๊ก") · บรรทัดล่างบอกสถานะตอนนี้ */}
          <div className="togrow">
            <button type="button" className="btn tog" aria-pressed={prefs.fog} onClick={() => changePrefs({ ...prefs, fog: !prefs.fog })}>
              <Icon name="torch" size={18} />
              <span className="tgt"><b>โหมดไฟฉาย</b><small>{prefs.fog ? "เปิด มองเห็นแค่รอบตัว" : "ปิด มองเห็นทั้งกระดาน"}</small></span>
            </button>
            <button type="button" className="btn tog" aria-pressed={sound} onClick={() => { const on = !sound; setSoundState(on); setSound(on); setSoundEnabled(on); if (on) SFX.on(); }}>
              <Icon name={sound ? "sound" : "mute"} size={18} />
              <span className="tgt"><b>เสียงตอนเดิน</b><small>{sound ? "เปิดเสียง" : "ปิดเสียง"}</small></span>
            </button>
          </div>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => { setSheet(null); guardNew("new", () => newLevel(prefs)); }}><Icon name="restart" size={16} />ด่านใหม่</button>
            {/* ปุ่มนี้คือยอมแพ้ เกมจบแล้ว (ชนะหรือยอมแพ้ไปแล้ว) กดไม่ได้ บอกเหตุผลไว้ที่ตัวปุ่ม
                (พี่กันสั่ง 22 ต.ค. 2569 "ถ้าเราเล่นจบแล้ว ปุ่มนั้นมันควรทำให้กดไม่ได้สิ" เดิมชนะแล้วกดได้แต่ไม่เกิดอะไรเลย) */}
            <button type="button" className="btn giveup" onClick={() => { setSheet(null); guardNew("giveup", doGiveUp); }} disabled={over || snap.status === "gaveup"}
              title={over ? "เกมจบแล้ว ดูเฉลยได้ที่ปุ่มดูเฉลยเทียบในการ์ดผล" : snap.status === "gaveup" ? "ยอมแพ้แล้ว เฉลยแสดงอยู่บนกระดาน" : "ยอมแพ้แล้วดูเฉลย รอบนี้ไม่นับสถิติ"}><Icon name="giveup" size={16} />ดูเฉลย</button>
            {/* มือถือซ่อนปุ่มนี้ (พี่กันสั่ง 21 ต.ค. 2569 "ปุ่มพิมพ์ใบงาน เอาออก") */}
            <button type="button" className="btn printbtn" onClick={toPrint} title="พิมพ์ใบงานด่านนี้ (A4)"><Icon name="print" size={16} />พิมพ์ใบงาน</button>
          </div>
          {/* โน้ตยาวย่อเป็นหัวข้อกดเปิด ไว้ท้ายแผงนี้ซึ่งเลื่อนในตัวเองได้ (พี่กันสั่ง "ไปย่อ แล้วหาที่โน้ตที่อื่น")
              เคยไว้ใต้ปุ่มลูกศร กดเปิดแล้วดันปุ่มลูกศรหลุดจอ พี่กันทัก "ก็บอกว่าห้ามทับปุ่มกด" ข้อความครบเหมือนเดิม */}
          {/* วิธีเล่นบนมือถือ อยู่ในแผ่นนี้ ข้อความแบบมือถือ สั้น ไม่มีเรื่องคีย์บอร์ด (hidden ไว้ จอคอมเห็นแบบเต็มใต้ปุ่มเดินตามเดิม) */}
          <div className="mhelp" hidden>
            <div className="lbl ptitle">วิธีเล่น</div>
            <dl className="keyhelp">
              <dt>เริ่มเกม</dt><dd><Phr>{"แตะปุ่มเริ่มเกม หรือแตะปุ่มลูกศร ลูกศรจะเริ่มแล้วเดินก้าวแรกให้เลย"}</Phr></dd>
              <dt>เดิน</dt><dd><Phr>{"กดปุ่มลูกศร หรือลากนิ้วบนวงกต กดค้างเพื่อเดินต่อ"}</Phr></dd>
              <dt>เดินย้อน</dt><dd><Phr>{"เดินกลับทางเดิม เส้นจะหดตาม"}</Phr></dd>
              <dt>ปักธง</dt><dd><Phr>{"ปักที่ช่องที่ยืนอยู่ กดอีกครั้งเอาธงออก"}</Phr></dd>
              <dt>กลับธง</dt><dd><Phr>{"วาร์ปกลับไปที่ธง ไม่นับก้าว"}</Phr></dd>
              <dt>พัก</dt><dd><Phr>{"หยุดเวลาและซ่อนวงกต"}</Phr></dd>
            </dl>
          </div>
          <details className="about">
            <summary>วิธีสร้างด่านและวิธีนับคะแนน</summary>
            <ul className="aboutlist">
              <li><Phr>{"ทุกด่านสร้างด้วยวิธีที่เลือก แล้วนำทางตันสั้นไปต่อเป็นทางหลอกยาว"}</Phr></li>
              <li><Phr>{"สุ่มสร้าง 15 รอบ แล้วเลือกด่านที่มีทางหลอกยาวบนเส้นทางเฉลยมากที่สุด"}</Phr></li>
              <li><Phr>{"ทางออกอยู่ที่จุดไกลที่สุดบนขอบล่าง"}</Phr></li>
              {/* วิธีนับคะแนนชุดใหม่ (พี่กันเคาะ 22 ต.ค. 2569 · lib/game/state.ts result) เดิมเขียนว่าโหมดทางวนเทียบกับทางสั้นสุด */}
              <li><Phr>{"คะแนนคิดจากเส้นทางที่เลือกเดินไปถึงทางออก หารด้วยก้าวที่เดินจริง"}</Phr></li>
              <li><Phr>{"หักเฉพาะก้าวที่ต้องเดินย้อนหรือวนกลับที่เดิม เลือกเส้นที่อ้อมกว่าทางสั้นสุดได้ไม่หักคะแนน"}</Phr></li>
              <li><Phr>{"ปักธงไว้ก่อนเข้าทางที่ไม่แน่ใจ กลับไปที่ธงแล้วขากลับไม่นับก้าว"}</Phr></li>
              <li><Phr>{"สถิติดีสุดแยกตามระดับ วิธีสร้าง ความยาวทางหลอก ทางวน และโหมดไฟฉาย เก็บไว้ในเครื่องนี้เท่านั้น"}</Phr></li>
              <li><Phr>{"เกมที่เล่นจบบันทึกเข้าระบบ เปิดดูย้อนได้ในแท็บประวัติ"}</Phr></li>
            </ul>
          </details>
        </section>
      </div>
      {sheet && <div className="msheet-back" onClick={() => setSheet(null)} aria-hidden="true" />}
      {helpPop && createPortal(
        <div className="cdback" onClick={() => setHelpPop(false)}>
          <div className="cdbox helppop" role="dialog" aria-modal="true" aria-label="วิธีเล่น" onClick={(e) => e.stopPropagation()}>
            <div className="hptop"><h3>วิธีเล่น</h3><button type="button" className="iconbtn" aria-label="ปิดแผ่นนี้" onClick={() => setHelpPop(false)} autoFocus><Icon name="x" size={16} /></button></div>
            <dl className="keyhelp">{helpList}</dl>
          </div>
        </div>,
        document.body,
      )}
      {askNew && (
        <ConfirmDialog
          title={askNew.kind === "giveup" ? "กำลังเล่นเกมอยู่ ต้องการยอมแพ้แล้วดูเฉลยหรือไม่" : "กำลังเล่นเกมอยู่ ต้องการเริ่มด่านใหม่หรือไม่"}
          lines={[askNew.kind === "giveup" ? "เกมนี้จะจบและไม่บันทึก" : "เกมที่เล่นอยู่จะหายและไม่บันทึก"]}
          confirmLabel={askNew.kind === "giveup" ? "ยอมแพ้" : "เริ่มด่านใหม่"}
          cancelLabel="เล่นต่อ"
          onConfirm={() => { const go = askNew.go; setAskNew(null); go(); }}
          onCancel={() => { setAskNew(null); setSliderKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}

function snapOf(g: Game | null, p: PlayPrefs) {
  const s = g ? g.settings : settingsOf(p);
  return { status: g ? g.status : "ready", steps: g ? g.steps : 0, bestT: getBestTime(s), bestS: getBestScore(s) };
}

function SaveLine({ save }: { save: SaveState }) {
  if (save.kind === "none") return null;
  if (save.kind === "saving") return <div className="savestate wait" role="status">กำลังบันทึกเกมเข้าระบบ</div>;
  if (save.kind === "ok")
    return (
      <div className="savestate ok" role="status">
        <span>บันทึกเกมเข้าระบบแล้ว</span>
        <Link className="backlink" href={`/history/${save.id}`} style={{ marginLeft: "auto" }}>ดูย้อนในประวัติ</Link>
      </div>
    );
  if (save.kind === "queued")
    return (
      <div className="savestate queued" role="status">
        <div><div>ยังไม่เข้าระบบ บันทึกเกมนี้ไว้ในเครื่องแล้ว</div><div>{save.reason}</div><div>ระบบจะส่งให้เองเมื่อเชื่อมต่อได้</div></div>
      </div>
    );
  return (
    <div className="savestate bad" role="alert">
      <div><div>บันทึกไม่สำเร็จ ข้อมูลยังไม่เข้าระบบ</div><div>{save.reason}</div></div>
    </div>
  );
}

/** แถบทางหลอกขั้นต่ำ · ลากแล้วเปลี่ยนเลขทันที ปล่อยมือแล้วค่อยสร้างด่านใหม่ (เหมือนไฟล์เดิม) */
function MinLenSlider({ prefs, onCommit }: { prefs: PlayPrefs; onCommit: (v: number) => void }) {
  const [v, setV] = useState(prefs.minLen);
  const [src, setSrc] = useState(prefs.minLen);
  if (src !== prefs.minLen) { setSrc(prefs.minLen); setV(prefs.minLen); }
  return (
    <div>
      <label className="lbl ptitle" htmlFor="gMinL">ทางหลอกต้องยาวอย่างน้อย <b>{v} ช่อง</b></label>
      <CommitRange id="gMinL" min={3} max={LV_MAXL[prefs.level]} step={1} value={v} onInput={setV} onCommit={(nv) => { if (nv !== prefs.minLen) onCommit(nv); }} />
      {/* ตัดบรรทัดตามประโยค วงเล็บระดับไม่ถูกหั่นกลาง (พี่กันสั่ง 21 ต.ค. 2569 "ไปปรับบรรทัดดี ๆ")
          · วงเล็บย่อจาก ง่ายสุด 6 กลางสุด 9 ... ให้บรรทัดสองพอดี เหลือสองบรรทัด (พี่กันสั่ง 22 ต.ค. 2569 "ส่วนอื่นๆก็บีบบรรทัดได้") */}
      <p className="foot" style={{ marginTop: 4 }}><Phr>{"ทางตันที่สั้นกว่านี้จะถูกเก็บกวาดไปต่อเป็นทางหลอกยาว"}</Phr><br /><Phr>{"ค่าเริ่มและค่าสูงสุดขยายตามระดับ"}</Phr> <span className="ph">(ง่าย 6 กลาง 9 ยาก 14 โหด 20)</span></p>
    </div>
  );
}

function LoopsSlider({ prefs, onCommit }: { prefs: PlayPrefs; onCommit: (v: number) => void }) {
  const [v, setV] = useState(prefs.loops);
  const [src, setSrc] = useState(prefs.loops);
  if (src !== prefs.loops) { setSrc(prefs.loops); setV(prefs.loops); }
  return (
    <div>
      <label className="lbl ptitle" htmlFor="loops">ทางวน (หลายเส้นทางไปเส้นชัย) <b>{LOOPS[v].name}</b></label>
      <CommitRange id="loops" min={0} max={4} step={1} value={v} onInput={setV} onCommit={(nv) => { if (nv !== prefs.loops) onCommit(nv); }} />
      {/* ป้ายปลายแถบเป็นชื่อระดับต่ำสุดกับสูงสุด เดิมเขียน ทางถูกทางเดียว ซ้ำกับคำอธิบายบรรทัดล่าง พี่กันทัก "เขียนอะไรมา" */}
      <div className="lbl" style={{ marginTop: 2 }}><span>{LOOPS[0].name}</span><span>{LOOPS[LOOPS.length - 1].name}</span></div>
      <p className="foot" style={{ marginTop: 6 }}><Phr>{LOOPS[v].note}</Phr></p>
    </div>
  );
}
