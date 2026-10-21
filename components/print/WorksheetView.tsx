"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icon";
import { ALGOS } from "@/lib/maze/generators";
import { LEVEL_IDS, LEVEL_NAME, solveTo, type Level, type MazeData } from "@/lib/game/level";
import { unpackWalls } from "@/lib/game/encode";
import { getGame } from "@/lib/games";
import { failText } from "@/lib/net";

/* ════════════════════════════════════════════════════════════════════
   ใบงานเขาวงกต A4 สองหน้า หน้า 1 โจทย์ · หน้า 2 เฉลย (ต้นเรื่องของเกมนี้ เอกสารหัวข้อ 12)
   ทำตามสกิล making-documents
   · กระดาษเป็นกระดาษจริงตั้งแต่บนจอ ขนาด A4 หน่วย mm กับ pt · ในกระดาษไม่มีสไตล์ฝังในแท็ก ใช้คลาสล้วน
   · เอกสารแขวนที่ body โดยตรงด้วย portal ตอนพิมพ์ซ่อนทุกอย่างอื่น
   · สั่งโหลดฟอนต์ให้เสร็จก่อนเปิดหน้าต่างพิมพ์
   เขาวงกตวาดเป็นเส้น SVG คมทุกขนาด · บรรทัด ชื่อ ชั้น เลขที่ ว่างไว้ให้เขียน (แคลร์ตั้ง)
   ════════════════════════════════════════════════════════════════════ */

type Sheet = { maze: MazeData; level: Level; algo: string; minLen: number };
type Load = { kind: "loading" } | { kind: "error"; reason: string } | { kind: "ok"; s: Sheet };

const algoName = (a: string) => ALGOS.find((x) => x.id === a)?.name ?? a;

function fromSession(): Sheet | string {
  try {
    const raw = sessionStorage.getItem("maze-print");
    if (!raw) return "ไม่พบด่านที่จะพิมพ์ กดปุ่มพิมพ์ใบงานจากหน้าเล่นเกมหรือหน้าดูย้อนอีกครั้ง";
    const j = JSON.parse(raw) as { n: number; ex: number; walls: string; level: string; algo: string; minLen: number };
    const maze = unpackWalls(j.n, j.ex, j.walls);
    if (!maze || !LEVEL_IDS.includes(j.level as Level)) return "ข้อมูลด่านที่จะพิมพ์เสีย";
    return { maze, level: j.level as Level, algo: j.algo, minLen: j.minLen };
  } catch {
    return "อ่านด่านที่จะพิมพ์ไม่สำเร็จ";
  }
}

export default function WorksheetView() {
  const [fromId] = useState<string | null>(() => {
    const v = new URLSearchParams(window.location.search).get("from");
    return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
  });
  const [load, setLoad] = useState<Load>(() => {
    if (fromId) return { kind: "loading" };
    const s = fromSession();
    return typeof s === "string" ? { kind: "error", reason: s } : { kind: "ok", s };
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!fromId) return;
    let alive = true;
    void getGame(fromId).then((r) => {
      if (!alive) return;
      if (!r.ok) { setLoad({ kind: "error", reason: r.error || failText(r.why) }); return; }
      const g = r.data.game, maze = unpackWalls(g.size, g.exit_x, g.walls);
      if (!maze || !LEVEL_IDS.includes(g.level as Level)) { setLoad({ kind: "error", reason: "ข้อมูลด่านของเกมนี้เสีย" }); return; }
      setLoad({ kind: "ok", s: { maze, level: g.level as Level, algo: g.algo, minLen: g.min_len } });
    });
    return () => { alive = false; };
  }, [fromId]);

  const doPrint = async () => {
    setBusy(true);
    try {
      // next/font ตั้งชื่อฟอนต์ใหม่เอง (เช่น __Sarabun_xxxx) จึงอ่านชื่อจริงจากตัวแปรใน :root
      // 🚨 ตัวหนาต้องสั่งโหลดแยก (สกิล making-documents) · ตัวเลขกับอังกฤษในกระดาษเป็น Roboto Mono
      const fam = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).split(",")[0].trim();
      const thai = fam("--font-sarabun-src"), en = fam("--font-mono-src");
      await Promise.all([
        document.fonts.load(`600 20pt ${thai}`, "ใบงานเขาวงกต"),
        document.fonts.load(`400 13pt ${thai}`, "ชื่อ ชั้น เลขที่"),
        document.fonts.load(`400 10pt ${en}`, "18 x 18 Wilson 2569"),
      ]).catch(() => undefined);
      await document.fonts.ready;
    } finally {
      setBusy(false);
    }
    window.print();
  };

  return (
    <div className="view">
      <div className="sheetbar">
        <Link className="backlink" href={fromId ? `/history/${fromId}` : "/play"}>{fromId ? "กลับไปหน้าดูย้อน" : "กลับไปหน้าเล่นเกม"}</Link>
        {load.kind === "ok" && (
          <button type="button" className="btn primary" onClick={() => void doPrint()} disabled={busy}>
            <Icon name="print" size={16} />{busy ? "กำลังเตรียมฟอนต์" : "พิมพ์ใบงาน 2 หน้า"}
          </button>
        )}
        {load.kind === "ok" && <span className="foot">หน้า 1 โจทย์ หน้า 2 เฉลย ขนาด A4 แนวตั้ง ตั้งขอบกระดาษในหน้าต่างพิมพ์เป็นไม่มีขอบ (None) จะได้ขนาดเท่าบนจอ</span>}
      </div>
      {load.kind === "loading" && <div className="skelbox" style={{ width: "100%", maxWidth: 794, aspectRatio: "210 / 297", margin: "0 auto" }} aria-label="กำลังเตรียมใบงาน" />}
      {load.kind === "error" && <div className="errbox" role="alert"><span>เตรียมใบงานไม่สำเร็จ {load.reason}</span></div>}
      {load.kind === "ok" && createPortal(<Papers s={load.s} />, document.body)}
    </div>
  );
}

function Papers({ s }: { s: Sheet }) {
  const today = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  const meta = `${LEVEL_NAME[s.level]} ${s.maze.n} × ${s.maze.n} ช่อง  วิธีสร้าง ${algoName(s.algo)}`;
  return (
    <div className="printdoc">
      <div className="paperscroll">
        <div className="paper">
          <div className="phead">
            <h2>ใบงานเขาวงกต</h2>
            <div className="meta">{meta}<br />{today}</div>
          </div>
          {/* เส้นจุดให้เขียนยืดตามความกว้างกระดาษ ไม่นับจำนวนจุดเอง · เดิมพิมพ์จุดเป็นตัวอักษร พอเปลี่ยนฟอนต์จุดกว้างขึ้น ชั้นกับเลขที่ล้นขอบขวา */}
          <div className="fields">
            <span className="fld nm">ชื่อ<i /></span>
            <span className="fld cl">ชั้น<i /></span>
            <span className="fld no">เลขที่<i /></span>
          </div>
          <div className="key">เริ่มจากลูกศรด้านบน หาทางออกไปลูกศรด้านล่าง ลากเส้นห้ามข้ามกำแพง</div>
          <div className="mz"><MazeSvg m={s.maze} solution={false} /></div>
          <div className="pf"><span>ห้องทดลองเขาวงกต</span><span>หน้า 1 จาก 2</span></div>
        </div>
        <div className="paper">
          <div className="phead">
            <h2>เฉลย</h2>
            <div className="meta">{meta}<br />{today}</div>
          </div>
          <div className="key">เส้นสีชมพูคือทางที่สั้นที่สุดจากทางเข้าไปทางออก</div>
          <div className="mz"><MazeSvg m={s.maze} solution /></div>
          <div className="pf"><span>ห้องทดลองเขาวงกต</span><span>หน้า 2 จาก 2</span></div>
        </div>
      </div>
    </div>
  );
}

/** เขาวงกตเป็นเส้น SVG หน่วยละ 10 ต่อช่อง · ขอบกระดานกับลูกศรทางเข้าออก · solution = วาดทางเฉลย */
function MazeSvg({ m, solution }: { m: MazeData; solution: boolean }) {
  const n = m.n, C = 10, pad = 14, size = n * C + pad * 2, N = n * n;
  const x0 = (c: number) => pad + (c % n) * C, y0 = (c: number) => pad + ((c / n) | 0) * C;
  let d = "";
  for (let c = 0; c < N; c++) {
    if (m.R[c] && c % n < n - 1) d += `M${x0(c) + C} ${y0(c)}V${y0(c) + C}`;
    if (m.B[c] && c < N - n) d += `M${x0(c)} ${y0(c) + C}H${x0(c) + C}`;
  }
  const E = pad + n * C, g0 = pad + (n >> 1) * C, b0 = pad + m.ex * C;
  d += `M${pad} ${pad}H${g0}M${g0 + C} ${pad}H${E}M${pad} ${E}H${b0}M${b0 + C} ${E}H${E}M${pad} ${pad}V${E}M${E} ${pad}V${E}`;
  const sw = Math.max(0.9, Math.min(2, 50 / n));
  const tx = g0 + C / 2, bx = b0 + C / 2, ar = 4;
  let sol = "";
  if (solution) {
    const p = solveTo(m).slice().reverse();
    sol = `M${tx} ${pad - 6}` + p.map((c) => `L${x0(c) + C / 2} ${y0(c) + C / 2}`).join("") + `L${bx} ${E + 6}`;
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={solution ? "เขาวงกตพร้อมเส้นเฉลย" : "เขาวงกต"}>
      {solution && <path d={sol} fill="none" stroke="#E0367A" strokeWidth={C * 0.32} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />}
      <path d={d} fill="none" stroke="#000" strokeWidth={sw} strokeLinecap="square" />
      <path d={`M${tx - ar} ${pad - ar * 2.2}H${tx + ar}L${tx} ${pad - ar * 0.5}Z`} fill="#000" />
      <path d={`M${bx - ar} ${E + ar * 0.5}H${bx + ar}L${bx} ${E + ar * 2.2}Z`} fill="#000" />
    </svg>
  );
}
