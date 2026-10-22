"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CommitRange from "@/components/ui/CommitRange";
import Phr from "@/components/ui/Phr";
import Icon from "@/components/ui/Icon";
import GroupLabel from "./GroupInfo";
import { ALGOS, DEF, GROUPS, NOTES, PDEF, generate, type AlgoId, type GroupId, type Params } from "@/lib/maze/generators";
import { braidOps, build, cleanStubs, countChoices, countLoops, deadEnds, shortStubs, solve, type Op } from "@/lib/maze/grid";
import { solRun, type SolRun } from "@/lib/game/solAnim";
import { drawLab, labFinish, labStep, type LabState } from "@/lib/draw/labDraw";
import { fitCanvas, reducedMotion, solFinished } from "@/lib/draw/paint";
import { th } from "@/lib/local";
import { labMem, type LabPrefs } from "@/lib/session";
import { glideIntoView } from "@/lib/glide";

/* ════════════════════════════════════════════════════════════════════
   แท็บห้องทดลอง 2D เหมือนเดิม (ยกจากไฟล์เดิม ก้อนที่ 1 · เอกสารหัวข้อ 7) พี่กันเคาะ "คงเป็น 2D เหมือนเดิม"
   เปลี่ยนจากของเดิม · บั๊กข้อ 6 ลากแถบขนาดตาราง สร้างรอบเดียวไม่มีแอนิเมชัน ปล่อยมือแล้วค่อยสุ่มหลายรอบตามที่ตั้ง
                      (เดิมสุ่มเต็มจำนวนรอบทุกครั้งที่แถบขยับ ตั้ง 200 รอบแล้วหน้าค้างได้ถึง 1.5 วินาทีต่อครั้ง)
   ════════════════════════════════════════════════════════════════════ */

const SPEED_LABEL = ["", "ช้ามาก", "ช้า", "กลาง", "เร็ว", "เร็วมาก"];
const SPEED_SEC = [0, 14, 8, 4.5, 2.2, 1];

const defaultPrefs = (): LabPrefs => ({
  algo: "dfs",
  n: 25,
  PV: Object.fromEntries(ALGOS.map((a) => [a.id, DEF(a.id)])) as Record<AlgoId, Params>,
  animate: true,
  speed: 3,
  minL: 5,
  clean: false,
  braid: 0,
  tries: 1,
  farExit: false,
});

const LEG: [string, (a: AlgoId) => boolean, React.ReactNode][] = [
  ["visit", (a) => !["division", "kruskal", "eller"].includes(a), <><i className="sw" style={{ background: "var(--visit)" }} />ช่องที่สร้างแล้ว</>],
  ["sets", (a) => a === "kruskal" || a === "eller", <><i className="sw sets" />สีตามกลุ่มที่เชื่อมกันแล้ว</>],
  ["cur", (a) => !["division", "kruskal"].includes(a), <><i className="sw" style={{ background: "var(--cur)" }} />ตัวขุด</>],
  ["front", (a) => a === "prim" || a === "growing", <><i className="sw" style={{ background: "var(--frontier)" }} />ช่องรอขุด</>],
  ["walk", (a) => a === "wilson" || a === "ab", <><i className="sw" style={{ background: "var(--b2)" }} />ทางเดินสุ่มที่ยังไม่ยืนยัน</>],
  ["hunt", (a) => a === "hunt", <><i className="sw" style={{ background: "var(--hunt)" }} />แถวที่กำลังกวาดหา</>],
  ["room", (a) => a === "division", <><i className="sw" style={{ background: "var(--room)" }} />ห้องที่กำลังผ่า</>],
  ["sol", () => true, <><i className="sw" style={{ background: "var(--path)" }} />เส้นทางเฉลย</>],
  ["br", () => true, <><i className="sw" style={{ background: "var(--b1)" }} /><i className="sw" style={{ background: "var(--b2)", marginLeft: -4 }} /><i className="sw" style={{ background: "var(--b3)", marginLeft: -4 }} />ทางแยกที่แตกออกตอนดูเฉลย</>],
];

type Stats = { dead: number; len: number; ch: number; short: number };
type Msg = { pre: string; bold: string; post: string };
type CmpRow = { dead: number; len: number; ch: number; sh: number };

const maxMinL = (n: number) => Math.max(6, Math.round(n / 2));

export default function LabView() {
  const [prefs, setPrefs] = useState<LabPrefs>(() => labMem.prefs ?? defaultPrefs());
  const pref = useRef(prefs);
  useEffect(() => { pref.current = prefs; labMem.prefs = prefs; }, [prefs]);

  const cv = useRef<HTMLCanvasElement | null>(null);
  const st = useRef<LabState | null>(null);
  const anim = useRef(0);
  const sol = useRef<SolRun | null>(null);
  const solRaf = useRef(0);
  const [showSol, setShowSol] = useState(false);
  const [stats, setStats] = useState<Stats>({ dead: 0, len: 0, ch: 0, short: 0 });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [cmp, setCmp] = useState<Record<string, CmpRow> | null>(null);
  const [cmpSub, setCmpSub] = useState("กำลังคำนวณ");
  const [cmpN, setCmpN] = useState(prefs.n);
  const [cmpL, setCmpL] = useState(prefs.minL);
  const cmpToken = useRef(0);
  const cmpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draw = useCallback(() => {
    const c = cv.current, s = st.current;
    if (!c || !s) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawLab(ctx, fitCanvas(c, ctx), s, sol.current, performance.now(), !reducedMotion());
  }, []);

  // ลูกศรทางเข้าออกกะพริบขึ้นลง วาดกระดานซ้ำราว 20 ครั้งต่อวินาที เฉพาะตอนเห็นหน้าอยู่ · เครื่องตั้งลดการเคลื่อนไหวไม่วาดซ้ำ
  useEffect(() => {
    let id = 0, last = 0;
    const tick = (t: number) => {
      id = requestAnimationFrame(tick);
      if (t - last < 50 || document.hidden || reducedMotion()) return;
      last = t;
      draw();
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [draw]);

  const stopSol = useCallback(() => {
    if (solRaf.current) cancelAnimationFrame(solRaf.current);
    solRaf.current = 0;
    sol.current = null;
  }, []);

  const startSol = useCallback(() => {
    stopSol();
    const s = st.current;
    if (!s) return;
    const on = new Uint8Array(s.n * s.n);
    for (const c of s.path) on[c] = 1;
    sol.current = solRun(s.n, s.fin.R, s.fin.B, s.n >> 1, s.n * (s.n - 1) + s.ex, on, performance.now());
    if (reducedMotion()) { sol.current.done = true; draw(); return; }
    const tick = () => {
      const S = sol.current;
      if (!S) return;
      draw();
      if (solFinished(S, performance.now())) { S.done = true; solRaf.current = 0; draw(); }
      else solRaf.current = requestAnimationFrame(tick);
    };
    solRaf.current = requestAnimationFrame(tick);
  }, [draw, stopSol]);

  const finish = useCallback(() => {
    if (st.current) labFinish(st.current);
    draw();
  }, [draw]);

  const run = useCallback(() => {
    const s = st.current;
    if (!s) return;
    const per = Math.max(1, Math.ceil(s.ops.length / (SPEED_SEC[pref.current.speed] * 60)));
    const tick = () => {
      for (let k = 0; k < per && s.i < s.ops.length; k++) labStep(s, s.ops[s.i++]);
      if (s.i >= s.ops.length) { anim.current = 0; finish(); return; }
      draw();
      anim.current = requestAnimationFrame(tick);
    };
    anim.current = requestAnimationFrame(tick);
  }, [draw, finish]);

  /** สร้างเขาวงกตใหม่ด้วยค่าปัจจุบัน · quick = ระหว่างลากแถบขนาด สุ่มรอบเดียว */
  const newMaze = useCallback((animate: boolean, quick = false) => {
    if (anim.current) { cancelAnimationFrame(anim.current); anim.current = 0; }
    stopSol();
    setShowSol(false);
    const p = pref.current, n = p.n, algo = p.algo;
    const tries = quick ? 1 : p.tries, far = p.farExit, bp = p.braid / 100, P = p.PV[algo], t0 = performance.now(), L = p.minL;
    let best: { g: ReturnType<typeof generate>; bo: Op[]; moved: number; fin: { R: Uint8Array; B: Uint8Array }; path: number[]; ex: number } | null = null;
    let sum = 0, done = 0;
    for (let t = 0; t < tries; t++) {
      const g = generate(n, algo, P), f = build(n, g), co = p.clean ? cleanStubs(n, f.R, f.B, L) : [], bo = braidOps(n, f.R, f.B, bp), r = solve(n, f.R, f.B, far);
      sum += r.path.length; done++;
      if (!best || r.path.length > best.path.length) best = { g, bo: co.concat(bo), moved: co.length / 2, fin: f, path: r.path, ex: r.ex };
      if (performance.now() - t0 > 1500) break;
    }
    const b = best as NonNullable<typeof best>, N = n * n, setMode = algo === "kruskal" || algo === "eller";
    let par: Int32Array | null = null, sz: Int32Array | null = null;
    if (setMode) { par = new Int32Array(N); sz = new Int32Array(N).fill(1); for (let i = 0; i < N; i++) par[i] = i; }
    st.current = {
      n, ops: b.bo.length ? b.g.ops.concat(b.bo) : b.g.ops, fin: b.fin, path: b.path, ex: b.ex,
      R: new Uint8Array(N).fill(b.g.open ? 0 : 1), B: new Uint8Array(N).fill(b.g.open ? 0 : 1),
      vis: new Uint8Array(N), front: new Uint8Array(N), cur: -1, wk: [], hunt: -1, room: null, par, sz, i: 0, done: false,
    };
    setStats({ dead: deadEnds(n, b.fin.R, b.fin.B, b.ex), len: b.path.length, ch: countChoices(n, b.fin.R, b.fin.B, b.path, L), short: shortStubs(n, b.fin.R, b.fin.B, L, b.ex) });
    const m: Msg[] = [];
    if (tries > 1) m.push({ pre: `สุ่มแล้ว ${th(done)} รอบ${done < tries ? " (หยุดก่อนเพราะวิธีนี้ใช้เวลานาน)" : ""} เส้นทางเฉลยเฉลี่ย ${th(sum / done)} ช่อง เก็บอันที่ยาวสุดไว้ `, bold: th(b.path.length), post: " ช่อง" });
    if (b.moved) m.push({ pre: "เก็บกวาดทางตันสั้นไป ", bold: th(b.moved), post: " จุด โดยย้ายไปต่อเป็นทางหลอกที่ยาวขึ้น" });
    if (b.g.walk) m.push({ pre: "ตัวเดินสุ่มเดินไปทั้งหมด ", bold: th(b.g.walk), post: ` ก้าว กว่าจะครบ ${th(N)} ช่อง` });
    const loops = countLoops(n, b.fin.R, b.fin.B);
    if (loops > 0) m.push({ pre: "มีทางวน ", bold: th(loops), post: " วง จึงมีทางไปถึงเส้นชัยมากกว่าหนึ่งทาง" });
    setMsgs(m);
    if (animate && !reducedMotion()) run();
    else finish();
  }, [finish, run, stopSol]);

  /** กราฟเทียบทุกวิธี คำนวณทีละวิธีด้วย setTimeout ไม่ให้หน้าค้าง */
  const compare = useCallback(() => {
    const my = ++cmpToken.current, nn = pref.current.n, N = nn * nn, ml = pref.current.minL, res: Record<string, CmpRow> = {};
    setCmpN(nn); setCmpL(ml); setCmpSub("กำลังคำนวณ");
    let i = 0;
    const next = () => {
      if (my !== cmpToken.current) return;
      const a = ALGOS[i].id, heavy = a === "ab" || a === "wilson";
      const T = Math.max(3, Math.round((nn <= 20 ? 40 : nn <= 40 ? 14 : 7) * (heavy ? 0.5 : 1)));
      let d = 0, l = 0, c = 0, sh = 0;
      for (let t = 0; t < T; t++) {
        const f = build(nn, generate(nn, a)), r = solve(nn, f.R, f.B);
        d += deadEnds(nn, f.R, f.B); l += r.path.length; c += countChoices(nn, f.R, f.B, r.path, ml); sh += shortStubs(nn, f.R, f.B, ml);
      }
      res[a] = { dead: (d / T / N) * 100, len: l / T, ch: c / T, sh: sh / T };
      i++;
      if (i < ALGOS.length) { setCmpSub(`กำลังคำนวณ ${i} จาก ${ALGOS.length} วิธี`); cmpTimer.current = setTimeout(next, 0); }
      else { setCmp({ ...res }); setCmpSub("ค่าตั้งต้นของแต่ละวิธี ไม่รวมการปรับหลังสร้าง แถบสีชมพูคือวิธีที่เลือกอยู่"); }
    };
    cmpTimer.current = setTimeout(next, 40);
  }, []);

  /** ออกจากหน้า · หยุดกราฟเทียบที่คำนวณค้างอยู่ */
  const cancelCompare = useCallback(() => {
    if (cmpTimer.current) clearTimeout(cmpTimer.current);
    cmpToken.current++;
  }, []);

  const scheduleCompare = useCallback(() => {
    if (cmpTimer.current) clearTimeout(cmpTimer.current);
    cmpTimer.current = setTimeout(compare, 60);
  }, [compare]);

  // เปิดหน้า · สร้างเขาวงกตแรก แล้วคำนวณกราฟเทียบ
  useEffect(() => {
    newMaze(pref.current.animate);
    scheduleCompare();
    const redraw = () => requestAnimationFrame(draw);
    window.addEventListener("resize", redraw);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", redraw);
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // กระดานย่อขยายตามพื้นที่ (ไม่ใช่แค่ตอนหน้าต่างเปลี่ยนขนาด) เช่นข้อความใต้สถิติโผล่แล้วพื้นที่กระดานเตี้ยลง
    const ro = new ResizeObserver(redraw);
    if (cv.current) ro.observe(cv.current);
    return () => {
      window.removeEventListener("resize", redraw);
      mq.removeEventListener("change", redraw);
      mo.disconnect();
      ro.disconnect();
      if (anim.current) cancelAnimationFrame(anim.current);
      if (solRaf.current) cancelAnimationFrame(solRaf.current);
      cancelCompare();
    };
  }, [newMaze, scheduleCompare, cancelCompare, draw]);

  const update = (patch: Partial<LabPrefs>) => {
    const next = { ...pref.current, ...patch };
    pref.current = next;
    setPrefs(next);
    return next;
  };
  const regen = () => newMaze(pref.current.animate);

  // มือถือ แผงอยู่ใต้กระดาน เลือกวิธีหรือแตะแท่งกราฟแล้วพากลับขึ้นไปดูวงกตก่อตัว (รายงานมือถือข้อ 5)
  const selectAlgo = (a: AlgoId) => { update({ algo: a }); regen(); if (document.documentElement.classList.contains("mz-mobile")) glideIntoView(document.querySelector(".lstage .boardbox")); };
  const setParam = (k: string, v: number | string) => update({ PV: { ...pref.current.PV, [prefs.algo]: { ...pref.current.PV[prefs.algo], [k]: v } } });

  const toggleSol = () => {
    const s = st.current;
    if (s && !s.done) { if (anim.current) { cancelAnimationFrame(anim.current); anim.current = 0; } finish(); }
    if (showSol) { stopSol(); setShowSol(false); draw(); }
    else { setShowSol(true); startSol(); }
  };

  const a = prefs.algo, algo = ALGOS.find((x) => x.id === a), name = algo?.name ?? a, note = NOTES[a];
  // หัวกล่องคำอธิบาย แยกชื่อวิธีออกจากชื่อไทยในวงเล็บ ให้ชื่อวิธีใหญ่สีไล่ระดับ
  const noteSplit = note.h.match(/^(.*?)\s*\(([^)]+)\)\s*$/), noteName = noteSplit?.[1] ?? note.h, noteThai = noteSplit?.[2] ?? "";
  // ชื่อเต็มอยู่ในวงเล็บแถวเดียวกับชื่อบนการ์ดขวา และใต้หัวกล่องคำอธิบาย · ชื่อไทยอยู่หัวกล่องคำอธิบายที่เดียว
  // (พี่กันสั่ง "ใส่วงเล็บชื่อเต็มและแถวเดียวกัน" แล้ว "ชื่อเต็มจุดนี้ก็เอาไว้ด้วย ไม่ได้ให้เอาออก")
  const fullName = algo?.full ?? "";
  const bars = (key: keyof CmpRow, f: (v: number) => string) => {
    if (!cmp) return null;
    const mx = Math.max(...ALGOS.map((x) => cmp[x.id]?.[key] ?? 0)) || 1;
    return ALGOS.map((x) => (
      // กดแถวแล้วเลือกวิธีนั้นเลย (พี่กันสั่ง "อยากให้กดได้ แล้วมันจะไปเลือกวิธีสร้าง")
      <button key={x.id} type="button" className={`bar${x.id === a ? " cur" : ""}`} onClick={() => selectAlgo(x.id)} aria-pressed={x.id === a} title={`เลือกวิธี ${x.name}`}>
        <span className="n">{x.short}</span>
        <span className="t"><span className="f" style={{ width: `${(((cmp[x.id]?.[key] ?? 0) / mx) * 100).toFixed(1)}%` }} /></span>
        <span className="val">{f(cmp[x.id]?.[key] ?? 0)}</span>
      </button>
    ));
  };

  /* โครงหน้า (จัดใหม่ 21 ต.ค. 2569 พี่กันสั่ง "จัดรูปแบบหน้าห้องทดลองให้สวยงาม ใช้ได้จริง ... อย่าลบจุดไหนออก")
     จอคอม แผงตั้งค่าซ้ายเลื่อนในตัวเอง · กระดานกลางพอดีจอเสมอ ไม่ขยับตอนเลื่อนแผง · สถิติขวา · กราฟเทียบอยู่ล่าง
     จอแคบหรือจอเตี้ย กลับไปเรียงต่อกันแบบเดิม (globals.css หัวข้อห้องทดลอง) */
  return (
    <div className="view labpage wide">
      <div className="lab">
        <section className="panel" aria-label="ตัวควบคุม">
          <div className="psec">
            <h3 className="psech"><span className="num">1</span>วิธีสร้าง</h3>
            <div className="algos">
              {Object.keys(GROUPS).map((g) => (
                <div key={g} className="agroup">
                  <GroupLabel g={g as GroupId} />
                  <div className="chips">
                    {ALGOS.filter((x) => x.g === g).map((x) => (
                      <button key={x.id} type="button" className="chip" aria-pressed={x.id === a} onClick={() => selectAlgo(x.id)}>{x.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="note">
              {/* ชื่อวิธีเด่นแบบเดียวกับการ์ดขวา ชื่อไทยในวงเล็บแยกเป็นบรรทัดรองข้างชื่อ (พี่กันสั่ง "ให้ชื่อตรงนี้เด่นด้วย") */}
              <h2><b className="nname">{noteName}</b>{noteThai && <span className="nthai">({noteThai})</span>}</h2>
              {/* ชื่อเต็มอยู่ทั้งการ์ดขวาและกล่องนี้ (พี่กันสั่ง "ชื่อเต็มจุดนี้ก็เอาไว้ด้วย ไม่ได้ให้เอาออก") */}
              {fullName && <div className="nfull">{fullName}</div>}
              <p><Phr>{note.p}</Phr></p>
              <p className="trait"><Phr>{note.t}</Phr></p>
            </div>
          </div>
          <div className="psec">
            <h3 className="psech"><span className="num">2</span>ปรับตามนิสัยของ {name}</h3>
            {PDEF[a].map((d) => {
              const id = `p-${a}-${d.k}`, v = prefs.PV[a][d.k];
              if (d.t === "select")
                return (
                  <div key={id}>
                    <label className="lbl" htmlFor={id}>{d.label}</label>
                    <select id={id} value={String(v)} onChange={(e) => { setParam(d.k, e.target.value); regen(); }}>
                      {d.opts.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
                    </select>
                  </div>
                );
              return (
                <div key={id}>
                  <label className="lbl" htmlFor={id}>{d.label} <b>{d.fmt(Number(v))}</b></label>
                  <CommitRange id={id} min={d.min} max={d.max} step={d.step} value={Number(v)} onInput={(nv) => setParam(d.k, nv)} onCommit={() => regen()} />
                  {d.ends && <div className="ends"><span>{d.ends[0]}</span><span>{d.ends[1]}</span></div>}
                </div>
              );
            })}
            <button type="button" className="btn" style={{ flex: "none" }} onClick={() => { update({ PV: { ...pref.current.PV, [a]: DEF(a) } }); regen(); }}><Icon name="sliders" />คืนค่าตั้งต้น</button>
          </div>
          <div className="psec">
            <h3 className="psech"><span className="num">3</span>ขนาดและการแสดงตอนสร้าง</h3>
            <div>
              <label className="lbl" htmlFor="size">ขนาดตาราง <b>{prefs.n} × {prefs.n}</b></label>
              <CommitRange id="size" min={5} max={60} step={1} value={prefs.n}
                onInput={(n) => { const ml = Math.min(pref.current.minL, maxMinL(n)); update({ n, minL: ml }); newMaze(false, true); }}
                onCommit={() => { if (pref.current.tries > 1) newMaze(false); scheduleCompare(); }}
              />
            </div>
            <label className="chk"><input type="checkbox" checked={prefs.animate} onChange={(e) => update({ animate: e.target.checked })} /> แสดงตอนสร้างทีละขั้น</label>
            <div>
              <label className="lbl" htmlFor="speed">ความเร็ว <b>{SPEED_LABEL[prefs.speed]}</b></label>
              <input type="range" id="speed" min={1} max={5} step={1} value={prefs.speed} onChange={(e) => update({ speed: +e.target.value })} />
            </div>
          </div>
          <div className="psec">
            <h3 className="psech"><span className="num">4</span>ปรับหลังสร้างเสร็จ (ใช้ได้ทุกวิธี)</h3>
            <div>
              <label className="lbl" htmlFor="minL">ทางหลอกต้องยาวอย่างน้อย <b>{prefs.minL} ช่อง</b></label>
              <CommitRange id="minL" min={3} max={maxMinL(prefs.n)} step={1} value={prefs.minL} onInput={(v) => update({ minL: v })} onCommit={() => { regen(); scheduleCompare(); }} />
              <p className="foot" style={{ marginTop: 4 }}><Phr>{"สั้นกว่านี้นับเป็นทางตันสั้นที่มองแวบเดียวก็รู้ ไม่นับเป็นทางหลอก"}</Phr></p>
            </div>
            <label className="chk"><input type="checkbox" checked={prefs.clean} onChange={(e) => { update({ clean: e.target.checked }); regen(); }} /> เก็บกวาดทางตันสั้นไปต่อเป็นทางหลอกยาว</label>
            <div>
              <label className="lbl" htmlFor="braid">ทุบทางตันให้กลายเป็นทางวน <b>{prefs.braid}%</b></label>
              <CommitRange id="braid" min={0} max={100} step={10} value={prefs.braid} onInput={(v) => update({ braid: v })} onCommit={() => regen()} />
              <div className="ends"><span>ทางถูกทางเดียว</span><span>ทางวนเต็มกระดาน</span></div>
            </div>
            <div>
              <label className="lbl" htmlFor="tries">สุ่มหลายรอบแล้วเก็บอันที่ทางยาวสุด <b>{`${prefs.tries} รอบ`}</b></label>
              <CommitRange id="tries" min={1} max={200} step={1} value={prefs.tries} onInput={(v) => update({ tries: v })} onCommit={() => regen()} />
            </div>
            <label className="chk"><input type="checkbox" checked={prefs.farExit} onChange={(e) => { update({ farExit: e.target.checked }); regen(); }} /> ย้ายทางออกไปจุดที่ไกลสุดบนขอบล่าง</label>
          </div>
        </section>

        {/* กล่องกระดานมีแต่กระดาน ไม่มีหัว ไม่มีคำอธิบายสี กระดานจึงสูงเกือบเต็มจอ (พี่กันสั่ง "ควรขยายวงกตสิ") */}
        <section className="lstage" aria-label="เขาวงกต">
          <div className="boardbox">
            <canvas ref={cv} role="img" aria-label="เขาวงกตที่สร้างแบบสุ่ม ทางเข้าด้านบน ทางออกด้านล่าง" />
          </div>
        </section>

        <aside className="side" aria-label="เขาวงกตนี้">
          {/* ปุ่มสร้างใหม่กับดูเฉลยย้ายจากในแผงมาไว้ข้างกระดาน กดได้ตลอดไม่ว่าแผงจะเลื่อนไปถึงไหน */}
          <div className="sidecard">
            <div className="stitle">
              <div className="sname"><b>{name}</b>{fullName && <span className="sfull">({fullName})</span>}</div>
              <span className="ssize">{prefs.n} × {prefs.n} ช่อง</span>
            </div>
            <div className="sbtns">
              <button type="button" className="btn primary" onClick={regen}><Icon name="restart" size={16} />สร้างใหม่</button>
              <button type="button" className="btn solbtn" aria-pressed={showSol} onClick={toggleSol}><Icon name="eye" size={16} />{showSol ? "ซ่อนเฉลย" : "ดูเฉลย"}</button>
            </div>
            <div className="legend">{LEG.filter((l) => l[1](a)).map((l) => <span key={l[0]}>{l[2]}</span>)}</div>
          </div>
          <div className="stats">
            <div className="stat"><div className="k">ทางตัน (dead end)</div><div className="v">{th(stats.dead)}</div></div>
            <div className="stat"><div className="k">เส้นทางเฉลยยาว (ช่อง)</div><div className="v">{th(stats.len)}</div></div>
            <div className="stat"><div className="k">ทางหลอกยาวบนเส้นทางเฉลย</div><div className="v">{th(stats.ch)}</div></div>
            <div className="stat"><div className="k">ทางตันสั้นที่มองแวบเดียวก็รู้</div><div className="v">{th(stats.short)}</div></div>
          </div>
          {msgs.length > 0 && (
            <p className="pick">{msgs.map((m, i) => <span key={i}>{i > 0 && <br />}{m.pre}<b>{m.bold}</b>{m.post}</span>)}</p>
          )}

          {/* กราฟเทียบย้ายจากล่างหน้ามาไว้ใต้สถิติ ใช้ที่ว่างของแผงขวา ทั้งหน้าจบในจอเดียว (พี่กันชี้ที่ว่างใต้สถิติ) */}
          <section className="compare" aria-label="เทียบทุกวิธี">
            <h2>เทียบทั้ง {ALGOS.length} วิธีที่ขนาด {cmpN} × {cmpN}</h2>
            <p className="sub"><Phr>{cmpSub}</Phr></p>
            <div className="cgrid">
              <div className="metric"><h3>ทางตันต่อ 100 ช่อง</h3><div>{bars("dead", (v) => v.toFixed(1))}</div></div>
              <div className="metric"><h3>ความยาวเส้นทางเฉลย (ช่อง)</h3><div>{bars("len", th)}</div></div>
              <div className="metric"><h3>ทางหลอกยาว {cmpL} ช่องขึ้นไปบนเส้นทางเฉลย</h3><div>{bars("ch", th)}</div></div>
              <div className="metric"><h3>ทางตันที่สั้นกว่า {cmpL} ช่อง</h3><div>{bars("sh", th)}</div></div>
            </div>
            <details className="about">
              <summary>วิธีอ่านกราฟนี้</summary>
              <ul className="aboutlist">
                <li><Phr>{"ทุกวิธีใช้ค่าตั้งต้น และได้เขาวงกตสมบูรณ์ (perfect maze) เหมือนกัน คือทุกช่องไปถึงได้ และมีทางถูกเพียงทางเดียว ต่างกันที่นิสัยของทาง"}</Phr></li>
                <li><Phr>{"ทางตันมาก หมายถึงมีกับดักสั้น ๆ ให้เลี้ยวผิดบ่อย"}</Phr></li>
                <li><Phr>{"เส้นทางเฉลยยาว หมายถึงต้องเดินอ้อมไกล"}</Phr></li>
                <li><Phr>{"ทางหลอกยาว คือจุดบนเส้นทางเฉลยที่มีทางผิดลึกพอให้หลงเข้าไปจริง ยิ่งมากยิ่งต้องตัดสินใจ"}</Phr></li>
                <li><Phr>{"ทางตันสั้น คือทางที่มองแวบเดียวก็รู้ว่าตัน ยิ่งมากยิ่งรกตาโดยไม่ช่วยให้สนุก"}</Phr></li>
                <li><Phr>{"ความยาวที่ใช้แบ่งปรับได้ที่หัวข้อ ทางหลอกต้องยาวอย่างน้อย"}</Phr></li>
              </ul>
            </details>
          </section>
        </aside>
      </div>
    </div>
  );
}
