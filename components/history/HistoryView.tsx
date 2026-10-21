"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ALGOS } from "@/lib/maze/generators";
import { LEVEL_NAME, LOOPS, type Level } from "@/lib/game/level";
import { cachedList, deleteGame, LIST_FRESH_MS, listGames, type GameSummary } from "@/lib/games";
import { showBanner } from "@/lib/banner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { failText } from "@/lib/net";
import { fmt, th, scoreTone } from "@/lib/local";
import { useStore } from "@/lib/store";
import { skelStore, toggleSkel } from "@/lib/skelDemo";
import Icon from "@/components/ui/Icon";
import MazeThumb from "./MazeThumb";

/* ════════════════════════════════════════════════════════════════════
   แท็บประวัติ เกมที่เล่นจบ เรียงจากล่าสุด หน้าละ 50 เกม · กดแถวเพื่อดูย้อน
   ตารางจริง (สกิล web-craft) · โครงจางใช้ชุดคอลัมน์เดียวกับตารางจริง (สกิล loading-skeleton)
   โหลดไม่สำเร็จหน้าตาต่างจากยังไม่มีเกม และไม่วาดตัวเลขเลย
   ════════════════════════════════════════════════════════════════════ */

const algoName = (a: string) => ALGOS.find((x) => x.id === a)?.name ?? a;
const algoShort = (a: string) => ALGOS.find((x) => x.id === a)?.short ?? a;
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
// การ์ดภาพกับป๊อปอัปเขียนหน่วยครบ เวลาที่เล่นมี น. ระยะเวลาที่ใช้เป็นวินาทีหรือนาทีกับวินาที (พี่กันสั่ง "เวลาใส่หน่วย ระยะเวลาใส่หน่วย")
const whenN = (iso: string) => `${when(iso)} น.`;
// การ์ดภาพแยกวันที่ไว้ซ้าย เวลาไว้ขวาสุด (พี่กันสั่ง "เอาเวลาไปอยู่ขวาสุด")
const dayOf = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const clockOf = (iso: string) => `${new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`;
// ระยะเวลาแบบสั้นพอดีการ์ด ยาวสุดราว 12 ตัวอักษร ทุกกรณี (พี่กันสั่ง "ประเมินทุก scenario ที่เป็นไปได้ จะได้เว้นช่องเอาไว้ มันจะได้ไม่ทับกัน")
// ไม่ถึงนาที 32.4 วินาที · ไม่ถึงชั่วโมง 12:04.5 นาที · ชั่วโมงขึ้นไป 1 ชม. 5 นาที
// ปัดลงเป็นหนึ่งในสิบวินาทีก่อนแยกนาทีกับวินาที แบบเดียวกับ fmt ในแถบบน (เดิมปัดขึ้นหลังเทียบ ได้ 1:010.0 นาที 1:60.0 นาที 60.0 วินาที docs/BUGHUNT-2026-10-21.md ข้อ 17)
const dur = (ms: number) => {
  const t = Math.floor(Math.max(0, ms) / 100), s = t / 10;
  if (t < 600) return `${s.toFixed(1)} วินาที`;
  if (t < 36000) { const m = Math.floor(t / 600), r = (t % 600) / 10; return `${m}:${r < 10 ? "0" : ""}${r.toFixed(1)} นาที`; }
  const h = Math.floor(s / 3600); return `${h} ชม. ${Math.floor((s - h * 3600) / 60)} นาที`;
};

type Col = { k: string; label: string; num?: boolean; skel: number; cell: (g: GameSummary) => React.ReactNode };

/** ชุดคอลัมน์ตัวเดียว ใช้ทั้งตารางจริงและโครงจาง */
/** สีป้ายคะแนน 95 ขึ้นไปเขียว · 80 ขึ้นไปน้ำเงิน · ต่ำกว่านั้นเหลือง */

const COLS: Col[] = [
  { k: "at", label: "วันที่เล่น", skel: 120, cell: (g) => when(g.played_at) },
  { k: "score", label: "คะแนน", skel: 60, cell: (g) => <span className={`scpill ${scoreTone(g.score)}`}><b>{g.score}</b><i style={{ "--w": `${g.score}%` } as React.CSSProperties} /></span> },
  { k: "lv", label: "ระดับ", skel: 70, cell: (g) => <><span className="lvpill">{LEVEL_NAME[g.level as Level] ?? g.level}</span><span className="mut">{g.size} × {g.size}</span></> },
  { k: "algo", label: "วิธีสร้าง", skel: 80, cell: (g) => algoName(g.algo) },
  { k: "opt", label: "ทางหลอก ทางวน", skel: 90, cell: (g) => `${g.min_len} ช่อง ทางวน${LOOPS[g.loops]?.name ?? g.loops}${g.fog ? " ไฟฉาย" : ""}` },
  { k: "time", label: "เวลา", num: true, skel: 48, cell: (g) => fmt(g.time_ms) },
  { k: "steps", label: "ก้าว", num: true, skel: 36, cell: (g) => <>{th(g.steps)}<span className="mut"> / {th(g.shortest)}</span></> },
  { k: "wrong", label: "เลี้ยวผิด", num: true, skel: 28, cell: (g) => th(g.wrong) },
  { k: "rep", label: "ที่มา", skel: 56, cell: (g) => <span className={`srcpill${g.replay_of ? " re" : ""}`}>{g.replay_of ? <><span className="lfull">เล่นด่านเดิมซ้ำ</span><span className="lshort" hidden>เล่นซ้ำ</span></> : "ด่านใหม่"}</span> },
  { k: "go", label: "", skel: 40, cell: () => <span className="go">ดูย้อน<Icon name="right" size={14} /></span> },
];

type Load = { kind: "loading" } | { kind: "error"; reason: string } | { kind: "ok"; games: GameSummary[]; total: number; pageSize: number };

/** มุมมอง ตาราง หรือ ภาพเขาวงกตเรียงกัน · จำไว้ในเครื่องนี้ (ความสะดวกของคนดูคนเดียว อ่านไม่ได้ก็กลับเป็นตาราง) */
type View = "table" | "grid";
const VIEW_KEY = "maze-hist-view";
const readView = (): View => { try { return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "table"; } catch { return "table"; } };

/** หน้าที่เปิดค้างไว้ล่าสุด กลับมาที่แท็บประวัติแล้วอยู่หน้าเดิม */
let lastPage = 1;

const fromCache = (p: number): Load | null => {
  const c = cachedList(p);
  return c ? { kind: "ok", games: c.data.games, total: c.data.total, pageSize: c.data.pageSize } : null;
};

export default function HistoryView() {
  const router = useRouter();
  const skel = useStore(skelStore, (s) => s.on);
  const [page, setPage] = useState(lastPage);
  // 🔴 ของที่จำไว้เป็นค่าเริ่มของ state เลย ไม่ใช่เติมทีหลังใน effect ไม่งั้นโครงจางแวบขึ้นทุกครั้งที่กลับมา (สกิล web-craft โหลดครั้งเดียว)
  const [load, setLoad] = useState<Load>(() => fromCache(lastPage) ?? { kind: "loading" });
  const [ask, setAsk] = useState(0);
  const force = useRef(false);
  const [view, setViewState] = useState<View>(readView);
  // ป๊อปอัปภาพเขาวงกตตอนชี้ที่วันที่ของแถว (มุมมองตาราง) · ตำแหน่งยึดกับจอ ไม่โดนกล่องตารางตัด
  const [peek, setPeek] = useState<{ g: GameSummary; x: number; y: number } | null>(null);
  // ลบวงกต (พี่กันสั่งใช้คำว่าลบวงกต ไม่ใช่ลบเกม และไม่ใช่ลบเขาวงกต) ถามสองชั้นตามสกิล pharmacy-web-logic ข้อ 18 (ลบแล้วไม่มีปุ่มกู้คืนบนเว็บ กู้ได้ที่ฐานเท่านั้น จึงนับเป็นลบจริง)
  // ชั้นแรก [ยกเลิก][ลบวงกตนี้] · ชั้นสอง [ยืนยันลบ][ย้อนกลับ] สลับตำแหน่งโดยตั้งใจ · ระหว่างลบปุ่มบอกว่ากำลังลบ ผลขึ้นแถบบอกผล (สกิล save-status)
  const [del, setDel] = useState<{ g: GameSummary; step: 1 | 2; busy: boolean } | null>(null);
  const askDelete = (g: GameSummary) => { setPeek(null); setDel({ g, step: 1, busy: false }); };
  const doDelete = async () => {
    if (!del) return;
    const g = del.g;
    setDel({ ...del, busy: true });
    const r = await deleteGame(g.id);
    setDel(null);
    if (r.ok) {
      showBanner({ kind: "ok", title: `ลบวงกตที่เล่นวันที่ ${whenN(g.played_at)} แล้ว` });
      // ลบตัวสุดท้ายของหน้า 2 ขึ้นไป ย้ายไปหน้าก่อน (เดิมขึ้นว่ายังไม่มีเกม พร้อมป้ายหน้า 2 จาก 1 docs/BUGHUNT-2026-10-21.md ข้อ 5)
      const left = load.kind === "ok" ? load.games.filter((x) => x.id !== g.id) : [];
      if (load.kind === "ok" && left.length === 0 && page > 1) { force.current = true; go(page - 1); }
      else setLoad((l) => (l.kind === "ok" ? { ...l, games: l.games.filter((x) => x.id !== g.id), total: Math.max(0, l.total - 1) } : l));
    } else {
      showBanner({ kind: "error", title: "ลบไม่สำเร็จ วงกตนี้ยังอยู่ในระบบ", lines: [r.error || failText(r.why)] });
    }
  };
  const delLines = (g: GameSummary) => [`เล่นวันที่ ${whenN(g.played_at)}`, `ระดับ ${LEVEL_NAME[g.level as Level] ?? g.level} ${g.size} × ${g.size} ช่อง วิธี ${algoName(g.algo)}`, `${g.score} คะแนน เวลา ${dur(g.time_ms)} เลี้ยวผิด ${th(g.wrong)} ครั้ง`];
  const setView = (v: View) => { setViewState(v); setPeek(null); try { localStorage.setItem(VIEW_KEY, v); } catch { /* จำไม่ได้ก็ใช้ได้ในรอบนี้ */ } };
  const showPeek = (g: GameSummary, el: HTMLElement) => {
    const r = el.getBoundingClientRect(), W = 236, H = 268;
    const x = Math.min(r.right + 12, innerWidth - W - 8), y = Math.max(8, Math.min(r.top + r.height / 2 - H / 2, innerHeight - H - 8));
    setPeek({ g, x, y });
  };

  const fetchPage = useCallback((p: number) => {
    const c = cachedList(p);
    // จำไว้และยังสด = ไม่ยิงเซิร์ฟเวอร์ · จำไว้แต่เก่า = ดึงใหม่เงียบ ๆ ของเดิมยังอยู่บนจอ
    if (c && !force.current && Date.now() - c.at < LIST_FRESH_MS) return;
    force.current = false;
    let alive = true;
    void listGames(p).then((r) => {
      if (!alive) return;
      // หน้าที่จำไว้ไม่มีเกมแล้ว (ถูกลบจากเครื่องอื่น) แต่ยังมีเกมหน้าก่อน ๆ ไปหน้าสุดท้ายที่มีจริง (ข้อ 5)
      if (r.ok && r.data.games.length === 0 && r.data.total > 0 && p > 1) {
        const last = Math.max(1, Math.ceil(r.data.total / r.data.pageSize));
        lastPage = last; force.current = true; setPage(last);
        return;
      }
      if (r.ok) setLoad({ kind: "ok", games: r.data.games, total: r.data.total, pageSize: r.data.pageSize });
      else if (!c) setLoad({ kind: "error", reason: r.error || failText(r.why) });
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => fetchPage(page), [fetchPage, page, ask]);

  const go = (p: number) => { lastPage = p; setLoad(fromCache(p) ?? { kind: "loading" }); setPage(p); };
  const retry = () => { force.current = true; setLoad({ kind: "loading" }); setAsk((v) => v + 1); };

  const showSkel = skel || load.kind === "loading";
  const pages = load.kind === "ok" ? Math.max(1, Math.ceil(load.total / load.pageSize)) : 1;
  const games = load.kind === "ok" ? load.games : [];
  const avg = games.length ? Math.round(games.reduce((s, g) => s + g.score, 0) / games.length) : 0;
  const perfect = games.filter((g) => g.score === 100).length;
  const avgWrong = games.length ? games.reduce((s, g) => s + g.wrong, 0) / games.length : 0;

  /* จัดใหม่ 21 ต.ค. 2569 (พี่กันสั่ง "หน้าประวัติไปออกแบบ UXUI ใหม่")
     หัวหน้าบอกจำนวนเกม · การ์ดสรุปสี่ใบ · ตารางกว้างเต็มจอ ป้ายคะแนนมีแถบสี ระดับเป็นป้าย ท้ายแถวมีคำว่าดูย้อน
     ตัวเลขสรุปคิดจากเกมในหน้านี้เท่านั้น บอกไว้ใต้การ์ด ไม่แอบอ้างว่าเป็นของทั้งหมด */
  return (
    <div className="view histpage wide">
      <div className="histhead">
        <div>
          <h2>เกมที่เล่นจบ</h2>
          <p className="sub">{!showSkel && load.kind === "ok" ? `ทั้งหมด ${th(load.total)} เกม เรียงจากล่าสุด กด${view === "grid" ? "ภาพ" : "แถว"}เพื่อดูย้อน` : `เรียงจากล่าสุด กด${view === "grid" ? "ภาพ" : "แถว"}เพื่อดูย้อน`}</p>
        </div>
        <div className="histtools">
          <div className="seg viewtog" role="group" aria-label="มุมมอง">
            <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}><Icon name="list" size={16} />ตาราง</button>
            <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}><Icon name="grid" size={16} />ภาพเขาวงกต</button>
          </div>
        <label className="chk skeltoggle"><input type="checkbox" checked={skel} onChange={toggleSkel} /> ดูโครงจางตอนรอข้อมูลค้างไว้ (ไม่จำค่า เปิดหน้าใหม่แล้วกลับเป็นปกติ)</label>
        </div>
      </div>
      {!showSkel && load.kind === "ok" && games.length > 0 && (
        <>
          <div className="histsum">
            <div className="stat"><div className="k">เกมทั้งหมด</div><div className="v">{th(load.total)}</div></div>
            <div className="stat"><div className="k">คะแนนเฉลี่ย</div><div className="v">{th(avg)}</div></div>
            <div className="stat"><div className="k"><span className="lfull">ได้ 100 คะแนน</span><span className="lshort" hidden>100 คะแนน</span></div><div className="v">{th(perfect)}<span className="u"> เกม</span></div></div>
            <div className="stat tone-wrong"><div className="k">เลี้ยวผิดเฉลี่ย</div><div className="v">{avgWrong.toFixed(1)}<span className="u"> ครั้ง</span></div></div>
          </div>
          {pages > 1 && <p className="sumnote">คะแนนเฉลี่ย ได้ 100 คะแนน และเลี้ยวผิดเฉลี่ย คิดจาก {th(games.length)} เกมในหน้านี้</p>}
        </>
      )}
      <section className="hist" aria-label="ประวัติเกม">
        {!showSkel && load.kind === "error" ? (
          <div className="errbox" role="alert">
            <span>โหลดประวัติไม่สำเร็จ {load.reason}</span>
            <button type="button" className="btn" onClick={retry}>ลองโหลดอีกครั้ง</button>
          </div>
        ) : !showSkel && load.kind === "ok" && load.total === 0 ? (
          <div className="emptybox">ยังไม่มีเกมที่บันทึกไว้ เล่นจบหนึ่งเกมแล้วจะขึ้นที่นี่</div>
        ) : view === "grid" ? (
          <div className="mgrid">
            {showSkel
              ? Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="mcard" aria-hidden="true">
                    <span className="skel mthumbskel" />
                    <span className="skel" style={{ width: "60%" }} />
                    <span className="skel" style={{ width: "40%" }} />
                  </div>
                ))
              : load.kind === "ok" &&
                load.games.map((g) => (
                  <div key={g.id} className="mcard" role="group" tabIndex={0} onClick={() => router.push(`/history/${g.id}`)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); router.push(`/history/${g.id}`); } }} aria-label={`ดูย้อนเกมวันที่ ${when(g.played_at)} ${g.score} คะแนน`}>
                    {/* หัวการ์ด ระดับกับขนาดตาราง เหนือภาพ (พี่กันสั่ง "เอา กลาง ไปไว้ที่อื่นหน่อย") */}
                    <span className="mrow"><span className="lvpill">{LEVEL_NAME[g.level as Level] ?? g.level}</span><span className="mhead"><span className="mut">{g.size} × {g.size} ช่อง</span><button type="button" className="iconbtn delbtn" aria-label={`ลบวงกตที่เล่นวันที่ ${when(g.played_at)}`} title="ลบวงกตนี้" onClick={(e) => { e.stopPropagation(); askDelete(g); }} onKeyDown={(e) => e.stopPropagation()}><Icon name="trash" size={15} /></button></span></span>
                    <MazeThumb g={g} label={`เขาวงกตที่เล่นจบ วันที่ ${when(g.played_at)}`} />
                    {/* สามแถว ซ้ายกับขวาชิดขอบ ไม่เหลือที่ว่างฝั่งขวา (พี่กันทัก "ที่ว่างฝั่งขวา") · ชื่อวิธีใช้ชื่อสั้นให้พอดีการ์ด */}
                    {/* แถบคะแนนบรรทัดของตัวเองเต็มความกว้างการ์ด ยาวเท่ากันทุกการ์ดจึงเทียบกันได้ (พี่กันเลือกแบบนี้ 21 ต.ค. 2569 "เอาแบบนี้ก็ได้") */}
                    <span className={`mscore scpill ${scoreTone(g.score)}`}>
                      <span className="mrow"><b>{g.score}</b><span className="mut">{dur(g.time_ms)}</span></span>
                      <i style={{ "--w": `${g.score}%` } as React.CSSProperties} />
                    </span>
                    <span className="mrow">
                      <span>{algoShort(g.algo)}</span>
                      <span className="mut">เลี้ยวผิด {th(g.wrong)}</span>
                    </span>
                    <span className="mrow mdate"><span>{dayOf(g.played_at)}</span><span>{clockOf(g.played_at)}</span></span>
                  </div>
                ))}
          </div>
        ) : (
          <div className="tablewrap">
            <table className="games">
              <thead>
                <tr>{COLS.map((c) => <th key={c.k} className={c.num ? "num" : undefined}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {showSkel
                  ? Array.from({ length: 8 }, (_, i) => (
                      <tr key={i} aria-hidden="true" style={{ cursor: "default" }}>
                        {COLS.map((c, j) => (
                          <td key={c.k} className={c.num ? "num" : undefined}>
                            <span className="skel" style={{ width: Math.round(c.skel * (0.75 + (((i + j) * 37) % 25) / 100)) }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : load.kind === "ok" &&
                    load.games.map((g) => (
                      <tr key={g.id} tabIndex={0} onClick={() => router.push(`/history/${g.id}`)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/history/${g.id}`); } }} aria-label={`ดูย้อนเกมวันที่ ${when(g.played_at)}`}>
                        {COLS.map((c) => c.k === "at"
                          ? <td key={c.k} className="peekcell" onMouseEnter={(e) => showPeek(g, e.currentTarget)} onMouseLeave={() => setPeek(null)}><Icon name="grid" size={13} />{c.cell(g)}</td>
                          : c.k === "go"
                          ? <td key={c.k} className="gocell">{c.cell(g)}<button type="button" className="iconbtn delbtn" aria-label={`ลบวงกตที่เล่นวันที่ ${when(g.played_at)}`} title="ลบวงกตนี้" onClick={(e) => { e.stopPropagation(); askDelete(g); }} onKeyDown={(e) => e.stopPropagation()}><Icon name="trash" size={15} /></button></td>
                          : <td key={c.k} className={c.num ? "num" : undefined} data-label={(c.k === "opt" ? "ทางหลอกขั้นต่ำ" : c.label) || undefined}>{c.cell(g)}</td>)}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
        {!showSkel && load.kind === "ok" && load.total > 0 && (
          <div className="pager">
            <button type="button" className="btn" disabled={page <= 1} onClick={() => go(page - 1)}>หน้าก่อน</button>
            <span>หน้า {th(page)} จาก {th(pages)} รวม {th(load.total)} เกม</span>
            <button type="button" className="btn" disabled={page >= pages} onClick={() => go(page + 1)}>หน้าถัดไป</button>
          </div>
        )}
      </section>
      {del && del.step === 1 && (
        <ConfirmDialog title="ต้องการลบวงกตนี้ออกจากประวัติหรือไม่" lines={[...delLines(del.g), "ลบแล้ววงกตนี้จะหายจากหน้าประวัติ"]} confirmLabel="ลบวงกตนี้" cancelLabel="ยกเลิก" onConfirm={() => setDel({ ...del, step: 2 })} onCancel={() => setDel(null)} />
      )}
      {del && del.step === 2 && (
        <ConfirmDialog title="ยืนยันการลบวงกตนี้อีกครั้ง" lines={[...delLines(del.g), "บนเว็บกู้คืนไม่ได้ กู้ได้ที่ฐานข้อมูลเท่านั้น"]} confirmLabel="ยืนยันลบ" busyLabel="กำลังลบ" cancelLabel="ย้อนกลับ" busy={del.busy} dangerLeft onConfirm={() => void doDelete()} onCancel={() => setDel(null)} />
      )}
      {peek && view === "table" && (
        <div className="mpeek" style={{ left: peek.x, top: peek.y }} aria-hidden="true">
          <MazeThumb g={peek.g} label="" />
          <span className="mrow mdate"><span>{whenN(peek.g.played_at)}</span><span>{peek.g.score} คะแนน</span></span>
        </div>
      )}
    </div>
  );
}
