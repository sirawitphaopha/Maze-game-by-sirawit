"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BoardCanvas2D, { type BoardHandle } from "@/components/board/BoardCanvas2D";
import ResultCard from "@/components/game/ResultCard";
import Icon from "@/components/ui/Icon";
import { ALGOS, isAlgo } from "@/lib/maze/generators";
import { LEVEL_IDS, LEVEL_NAME, LOOPS, type Level, type MazeData, type Settings } from "@/lib/game/level";
import { flagSpots, newGame, replay, replayStep, result, type Game, type GameEvent } from "@/lib/game/state";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { playMem } from "@/lib/session";
import { solRun, type SolRun } from "@/lib/game/solAnim";
import { unpackMoves, unpackWalls } from "@/lib/game/encode";
import { reducedMotion, solFinished } from "@/lib/draw/paint";
import { cachedGame, getGame, type GameFull } from "@/lib/games";
import { failText } from "@/lib/net";
import { fmt, th } from "@/lib/local";
import { useStore } from "@/lib/store";
import { skelStore, toggleSkel } from "@/lib/skelDemo";

/* ════════════════════════════════════════════════════════════════════
   ตัวดูย้อนเกมหนึ่งเกม
   ตัวละครเดินซ้ำบนกระดานตามบันทึกการเดิน (เวลาจริง ไม่รวมช่วงที่หยุดนาฬิกา) · เล่น หยุด เริ่มใหม่ · เร่ง 1× 2× 4× 8× ·
   แถบลากไปช่วงไหนก็ได้ · จุดแดงตรงช่องที่เลี้ยวผิด · จบแล้วขึ้นการ์ดสรุปแบบตอนชนะ
   ทุกตัวเลขคิดจากตรรกะเกมชุดเดียวกับตอนเล่น (lib/game/state.ts replay) จึงเท่ากับตอนเล่นจริงเสมอ
   ════════════════════════════════════════════════════════════════════ */

const SPEEDS = [1, 2, 4, 8];
const algoName = (a: string) => ALGOS.find((x) => x.id === a)?.name ?? a;

type Ready = { row: GameFull; settings: Settings; maze: MazeData; events: GameEvent[] };
type Load = { kind: "loading" } | { kind: "error"; reason: string } | { kind: "ok"; d: Ready };

function decode(row: GameFull): Ready | string {
  const maze = unpackWalls(row.size, row.exit_x, row.walls);
  const events = unpackMoves(row.moves);
  if (!maze || !events) return "ข้อมูลของเกมนี้เสีย เปิดดูย้อนไม่ได้";
  if (!LEVEL_IDS.includes(row.level as Level) || !isAlgo(row.algo)) return "ค่าตั้งของเกมนี้ไม่ถูกต้อง";
  return { row, maze, events, settings: { level: row.level as Level, algo: row.algo, minLen: row.min_len, loops: row.loops, fog: row.fog } };
}

export default function ReplayView({ id }: { id: string }) {
  const skel = useStore(skelStore, (s) => s.on);
  // เคยเปิดเกมนี้แล้ว วาดจากของที่จำไว้ทันที ไม่ขึ้นโครงจาง (สกิล web-craft โหลดครั้งเดียว · lib/games.ts)
  const [load, setLoad] = useState<Load>(() => {
    const g = cachedGame(id);
    if (!g) return { kind: "loading" };
    const d = decode(g);
    return typeof d === "string" ? { kind: "error", reason: d } : { kind: "ok", d };
  });
  const [ask, setAsk] = useState(0);

  useEffect(() => {
    let alive = true;
    void getGame(id).then((r) => {
      if (!alive) return;
      if (!r.ok) { setLoad({ kind: "error", reason: r.error || failText(r.why) }); return; }
      const d = decode(r.data.game);
      setLoad(typeof d === "string" ? { kind: "error", reason: d } : { kind: "ok", d });
    });
    return () => { alive = false; };
  }, [id, ask]);

  if (skel || load.kind === "loading") return <ReplaySkeleton skel={skel} />;
  if (load.kind === "error")
    return (
      <div className="view">
        <Link className="backlink" href="/history">กลับไปหน้าประวัติ</Link>
        <div className="errbox" role="alert">
          <span>เปิดเกมนี้ไม่สำเร็จ {load.reason}</span>
          <button type="button" className="btn" onClick={() => { setLoad({ kind: "loading" }); setAsk((v) => v + 1); }}>ลองโหลดอีกครั้ง</button>
        </div>
      </div>
    );
  return <Player d={load.d} />;
}

function ReplaySkeleton({ skel }: { skel: boolean }) {
  return (
    <div className="view replaypage wide">
      <div className="rplay">
        <div className="rleft">
          <div className="rtop">
            <div className="hud">{[0, 1, 2].map((i) => <div key={i}><span className="skel" style={{ width: 40, height: 10 }} /><br /><span className="skel" style={{ width: 70, height: 18 }} /></div>)}</div>
            <span className="skel" style={{ width: "100%", height: 34 }} />
          </div>
          <div className="skelbox" style={{ height: 320 }} />
        </div>
        <section className="pg-board" aria-label="กำลังโหลดเกม">
          <div className="stage"><div className="boardskel skelbox" /></div>
        </section>
        <section className="panel rinfo">
          {[180, 140, 200, 120].map((w, i) => <span key={i} className="skel" style={{ width: w, height: 14 }} />)}
          <label className="chk skeltoggle"><input type="checkbox" checked={skel} onChange={toggleSkel} /> ดูโครงจางตอนรอข้อมูลค้างไว้</label>
        </section>
      </div>
    </div>
  );
}

/** เกมที่เล่นซ้ำค้างไว้ของแต่ละบันทึก · ก้าวไปข้างหน้าเล่นต่อจากเดิม ย้อนหลังค่อยเริ่มใหม่ (docs/BUGHUNT-2026-10-21.md ข้อ 25) */
const runs = new WeakMap<GameEvent[], { g: Game; k: number }>();

function Player({ d }: { d: Ready }) {
  const router = useRouter();
  const { row, settings, maze, events } = d;
  const total = events.length ? events[events.length - 1].t : 0;
  const [k, setK] = useState(0);
  const [playingNow, setPlaying] = useState(!reducedMotion());
  const [speed, setSpeed] = useState(2);
  const [solOn, setSolOn] = useState(false);
  const board = useRef<BoardHandle>(null);
  const sol = useRef<SolRun | null>(null);
  const solRaf = useRef(0);
  const clockRef = useRef(0);
  const kRef = useRef(0);
  const autoK = useRef(0);
  const [askReplay, setAskReplay] = useState(false);

  // เกม ณ เหตุการณ์ที่ k · เล่นต่อจากก้าวก่อน ไม่เล่นจากต้นทุกก้าว (ตัวเกมตัวเดิมแก้ในที่ วาดใหม่ตาม k)
  const G = useMemo(() => {
    let r = runs.get(events);
    if (!r || r.k > k) { r = { g: newGame(settings, maze), k: 0 }; runs.set(events, r); }
    replayStep(r.g, events, r.k, k);
    r.k = k;
    return r.g;
  }, [settings, maze, events, k]);
  const done = k >= events.length;
  const finalG = useMemo(() => replay(settings, maze, events), [settings, maze, events]);
  const finalR = useMemo(() => result(finalG), [finalG]);
  const tNow = k === 0 ? 0 : events[k - 1].t;

  // ช่องที่ปักธงแต่ละครั้ง แสดงเฉพาะที่ปักไปแล้วถึงเหตุการณ์ที่ดูอยู่
  const spots = useMemo(() => flagSpots(settings, maze, events), [settings, maze, events]);
  const getView = useCallback(() => ({ G, sol: sol.current, fog: false, markers: G.wrongAt, now: performance.now(), pulse: !reducedMotion(), flagSpots: spots.filter((s) => s.i < k).map((s) => s.pos) }), [G, spots, k]);
  useEffect(() => { board.current?.draw(); }, [G, k]);

  // ลูกศรทางเข้าออกกะพริบขึ้นลงเหมือนหน้าเล่นเกมกับห้องทดลอง (พี่กันสั่ง 21 ต.ค. 2569 "ต้องทุกหน้า")
  // วาดซ้ำราว 20 ครั้งต่อวินาทีเฉพาะตอนเห็นหน้า · ดูย้อนจนถึงทางออกแล้วลูกศรนิ่งเหมือนตอนชนะในหน้าเล่นเกม
  useEffect(() => {
    let id = 0, last = 0;
    const tick = (t: number) => {
      id = requestAnimationFrame(tick);
      if (t - last < 50 || document.hidden || reducedMotion()) return;
      last = t;
      board.current?.draw();
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  // ลากแถบหรือกดกลับไปจุดเริ่ม = ตั้งนาฬิกาเล่นให้ตรงก้าวนั้น · ก้าวที่นาฬิกาเดินเองไม่ตั้งซ้ำ
  useEffect(() => {
    kRef.current = k;
    if (k !== autoK.current) { clockRef.current = k === 0 ? 0 : events[k - 1].t; autoK.current = k; }
  }, [k, events]);

  // เดินตามเวลา · เวลาเล่นจริงคูณความเร็ว
  // นาฬิกาเดินต่อเนื่องไม่ผูกกับก้าว (เดิมเริ่มนับใหม่ทุกก้าว เวลาที่เลยไปในเฟรมนั้นหาย เล่นช้ากว่าจริง กด 8× ได้จริงแค่ 3 ถึง 6 เท่า docs/BUGHUNT-2026-10-21.md ข้อ 25)
  useEffect(() => {
    if (!playingNow || done) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      clockRef.current += (now - last) * speed;
      last = now;
      let nk = kRef.current;
      while (nk < events.length && events[nk].t <= clockRef.current) nk++;
      if (nk !== kRef.current) { kRef.current = nk; autoK.current = nk; setK(nk); }
      if (nk < events.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playingNow, done, speed, events]);

  const stopSol = () => { if (solRaf.current) cancelAnimationFrame(solRaf.current); solRaf.current = 0; sol.current = null; };
  useEffect(() => () => { if (solRaf.current) cancelAnimationFrame(solRaf.current); }, []);
  const toggleSol = () => {
    if (solOn) { stopSol(); setSolOn(false); board.current?.draw(); return; }
    setSolOn(true);
    sol.current = solRun(G.n, G.R, G.B, G.s, G.e, G.onPath, performance.now());
    if (reducedMotion()) { sol.current.done = true; board.current?.draw(); return; }
    const tick = () => {
      const S = sol.current;
      if (!S) return;
      board.current?.draw();
      if (solFinished(S, performance.now())) { S.done = true; solRaf.current = 0; board.current?.draw(); }
      else solRaf.current = requestAnimationFrame(tick);
    };
    solRaf.current = requestAnimationFrame(tick);
  };

  // ปุ่มเล่นเล่นหรือหยุด จบแล้วกดเล่นซ้ำจากต้น · ปุ่มกลับไปจุดเริ่มย้อนไปต้นเกมแล้วหยุดรอ ไม่เล่นเอง
  // สองปุ่มจึงทำต่างกันทุกจังหวะ (พี่กันทัก 21 ต.ค. 2569 สองปุ่มตอนจบทำเหมือนกัน แล้วสั่ง "ทำให้ต่างกว่านี้ได้มั้ย" เดิมปุ่มเริ่มใหม่ย้อนแล้วเล่นทันที)
  const toStart = () => { setPlaying(false); setK(0); };
  const playPause = () => { if (done) { setK(0); setPlaying(true); } else setPlaying((p) => !p); };

  return (
    /* จัดใหม่ 21 ต.ค. 2569 สองฝั่ง กระดานซ้ายพอดีจอ · ขวาบนเวลากับปุ่มเล่น · ขวาล่างการ์ดผลคู่กับข้อมูลเกม
       ไม่เหลือที่ว่างในแผง (พี่กันทัก "เว้นที่ว่างข้างล่างไว้ทำไม") · ปุ่มกลับอยู่หน้าชื่อเว็บบนแถบบน (components/ui/TopBar.tsx)
       การ์ดผลแสดงตั้งแต่เปิดหน้า เป็นผลจบของเกมนี้ ไม่ต้องรอดูย้อนจนจบ */
    <div className="view replaypage wide">
      <div className="rplay">
        <div className="rleft">
        <div className="rtop">
          <div className="hud">
            <div><span className="k">เวลา</span><b>{fmt(tNow)}</b></div>
            <div><span className="k">ก้าว</span><b>{th(G.steps)}</b></div>
            <div className="tone-wrong"><span className="k">เลี้ยวผิด</span><b>{th(G.wrong)}</b></div>
          </div>
          {/* ปุ่มแถวหนึ่ง แถบเลื่อนกับเวลาอีกแถวเสมอ ปุ่มเล่นกว้างคงที่ ความสูงจึงเท่ากันทั้งตอนเล่นและตอนจบ
              (พี่กันทัก "ทำไมมันไม่เหมือนกัน" เดิมคำบนปุ่มยาวไม่เท่ากัน แถบเลื่อนตกบรรทัดตอนจบ) */}
          <div className="playbar">
            <div className="pbtns">
              <button type="button" className="btn primary playbtn" onClick={playPause} aria-label={playingNow && !done ? "หยุด" : "เล่น"}>
                <Icon name={playingNow && !done ? "pause" : "play"} size={16} />{playingNow && !done ? "หยุด" : done ? "เล่นอีกครั้ง" : "เล่น"}
              </button>
              <button type="button" className="btn" onClick={toStart} disabled={k === 0}><Icon name="tostart" size={16} />กลับไปจุดเริ่ม</button>
              <div className="speed" role="group" aria-label="ความเร็ว">
                {SPEEDS.map((s) => <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>)}
              </div>
            </div>
            <div className="seek">
              <input type="range" aria-label="เลื่อนไปช่วงไหนก็ได้" min={0} max={events.length} step={1} value={k} onChange={(e) => { setPlaying(false); setK(+e.target.value); }} />
              <span className="tm">{fmt(tNow)} / {fmt(total)}</span>
            </div>
          </div>
          {/* ขึ้นตลอด ยังไม่เลี้ยวผิดก็บอก (พี่กันสั่ง "ให้มันขึ้นตลอดได้ไหม") */}
          <p className="status" style={{ textAlign: "left" }}>{G.wrong > 0 ? `จุดแดงคือช่องที่เลี้ยวออกจากทางถูก ${th(G.wrong)} ครั้งถึงตอนนี้` : "ยังไม่เลี้ยวออกจากทางถูกถึงตอนนี้"}</p>
        </div>
        <section className="panel rinfo" aria-label="ข้อมูลเกม">
          <h3 className="psech">ข้อมูลเกม</h3>
          <div className="lbl"><span>เล่นเมื่อ</span><b>{new Date(row.played_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</b></div>
          <div className="lbl"><span>ระดับ</span><b>{LEVEL_NAME[settings.level]} {row.size} × {row.size}</b></div>
          <div className="lbl"><span>วิธีสร้าง</span><b>{algoName(row.algo)}</b></div>
          <div className="lbl"><span>ทางหลอกขั้นต่ำ</span><b>{row.min_len} ช่อง</b></div>
          <div className="lbl"><span>ทางวน</span><b>{LOOPS[row.loops]?.name ?? row.loops}</b></div>
          <div className="lbl"><span>โหมดไฟฉาย</span><b>{row.fog ? "เปิด" : "ปิด"}</b></div>
          <div className="lbl"><span>ทางหลอกยาวบนเส้นทางเฉลย</span><b>{th(row.choices)} จุด</b></div>
          {row.loop_count > 0 && <div className="lbl"><span>ทางวน</span><b>{th(row.loop_count)} วง</b></div>}
          <div className="lbl"><span>คะแนน</span><b>{row.score} / 100</b></div>
          {row.replay_of && <p className="foot">เกมนี้เล่นด่านเดิมซ้ำจาก <Link className="backlink" href={`/history/${row.replay_of}`}>เกมต้นทาง</Link></p>}
          <p className="foot">ตัวดูย้อนแสดงแบบไม่มีไฟฉายเสมอ จะได้เห็นทางเดินทั้งกระดาน</p>
        </section>
        </div>
        <section className="pg-board" aria-label="ตัวดูย้อน">
          <div className="stage">
            <BoardCanvas2D ref={board} getView={getView} ariaLabel="ตัวดูย้อน ตัวละครเดินซ้ำตามบันทึกการเดิน จุดแดงคือช่องที่เลี้ยวผิด" />
          </div>
        </section>
        {/* ขวา การ์ดผลพร้อมปุ่มทั้งหมดของเกมนี้ (สลับกับข้อมูลเกม ให้สองข้างจบในจอเดียว พี่กันสั่ง "แถบนี้ทำวันเพจได้ บีบเข้าไปได้") */}
        <div className="rright">
          <ResultCard G={finalG} r={finalR} title="ผลของเกมนี้" markersNote>
            <div className="acts">
              <button type="button" className="btn solbtn" aria-pressed={solOn} onClick={toggleSol}><Icon name="eye" size={16} />{solOn ? "ซ่อนเฉลย" : "ดูเฉลยเทียบ"}</button>
              <button type="button" className="btn primary" onClick={() => { if (playMem.G?.status === "play") setAskReplay(true); else router.push(`/play?from=${row.id}`); }}><Icon name="restart" size={16} />เล่นด่านนี้อีกรอบ</button>
              <button type="button" className="btn printbtn" onClick={() => router.push(`/print?from=${row.id}`)}><Icon name="print" size={16} />พิมพ์ใบงานด่านนี้ (A4)</button>
            </div>
          </ResultCard>
        </div>
      </div>
      {/* มีเกมเล่นค้างอยู่ในแท็บเล่นเกม ถามก่อนแทนที่ (เดิมเกมที่ค้างหายเงียบ ทั้งที่ป๊อปตอนออกบอกว่ากลับมาเล่นต่อได้ docs/BUGHUNT-2026-10-21.md ข้อ 29) */}
      {askReplay && (
        <ConfirmDialog
          title="มีเกมที่เล่นค้างอยู่ ต้องการเริ่มด่านนี้แทนหรือไม่"
          lines={["เกมที่เล่นค้างจะหายและไม่บันทึก", "ถ้าต้องการเล่นเกมเดิมต่อ กดยกเลิกแล้วไปที่แท็บเล่นเกม"]}
          confirmLabel="เริ่มด่านนี้"
          cancelLabel="ยกเลิก"
          onConfirm={() => { setAskReplay(false); router.push(`/play?from=${row.id}`); }}
          onCancel={() => setAskReplay(false)}
        />
      )}
    </div>
  );
}
