"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ALGOS, GROUPS, generate, type AlgoId, type GroupId } from "@/lib/maze/generators";
import { build, openNb } from "@/lib/maze/grid";

/* หัวข้อกลุ่มวิธีสร้างในห้องทดลอง ชี้แล้วขึ้นป๊อปอัปอธิบายความหมาย พร้อมภาพเขาวงกตตัวอย่างของกลุ่มนั้น
   (พี่กันสั่ง 21 ต.ค. 2569 "หัวข้อพวกนี้ ขอเอาเมาส์ไปโดนแล้วมีป๊อปอัปอธิบายความหมาย และมีรูปภาพประกอบด้วย")
   ภาพแต่ละกลุ่มไฮไลต์สิ่งที่เป็นนิสัยของกลุ่มนั้น ไม่ใช่ภาพเปล่าเหมือนกันหมด (พี่กันสั่ง "รูปต้องบ่งบอกและอธิบายความหมายด้วย")
     ขุดทางยาว เส้นทางเฉลยสีชมพูยาวคดเคี้ยว · แตกกิ่งถี่ จุดแดงที่ทางตันจำนวนมาก กับเส้นทางเฉลยสั้น
     สุ่มแบบยุติธรรม จุดแดงที่ทางตันกระจายทั่วกระดาน · สร้างทีละแถว ทางตรงยาวตามขอบสีส้มกับลูกศรทิศที่ทางไหลไป
     สร้างกำแพงแทนการขุด กำแพงชั้นแรกหนาสีฟ้า ชั้นที่สองสีฟ้าบาง
   ภาพสร้างสดด้วยวิธีตัวแทนของกลุ่ม ขนาด 12 × 12 ค่าตั้งต้น · สร้างครั้งแรกที่ชี้แล้วจำไว้ ชี้ซ้ำได้ภาพเดิม */

type Mark = "path" | "deadpath" | "dead" | "edges" | "split";

const INFO: Record<GroupId, { sample: AlgoId; mark: Mark; legend: string; points: string[] }> = {
  long: {
    sample: "dfs", mark: "path",
    legend: "เส้นชมพูคือเส้นทางเฉลย ยาวและคดเคี้ยว",
    points: ["ตัวขุดเดินต่อเนื่องไปเรื่อย ๆ จนชนทางตัน แล้วจึงหาจุดใหม่เพื่อขุดต่อ", "ได้ทางยาวคดเคี้ยว ทางแยกและทางตันมีน้อย", "เส้นทางเฉลยยาว ต้องเดินอ้อมไกลกว่าจะถึงทางออก"],
  },
  bushy: {
    sample: "prim", mark: "deadpath",
    legend: "จุดแดงคือทางตัน มีจำนวนมาก · เส้นชมพูคือเส้นทางเฉลย สั้นและตรง",
    points: ["ขยายออกจากหลายจุดพร้อมกัน คล้ายหมึกซึมบนกระดาษ", "ทางแยกถี่ ทางตันสั้นจำนวนมาก", "เส้นทางเฉลยมักสั้นและตรง"],
  },
  fair: {
    sample: "wilson", mark: "dead",
    legend: "จุดแดงคือทางตัน กระจายสม่ำเสมอทั่วกระดาน ไม่กองอยู่มุมใด",
    points: ["สุ่มให้เขาวงกตทุกแบบที่เป็นไปได้มีโอกาสเกิดเท่ากัน", "ไม่ลำเอียงไปทางใด หน้าตาสม่ำเสมอทั้งกระดาน", "ใช้เวลาสร้างนานกว่ากลุ่มอื่น"],
  },
  row: {
    sample: "binary", mark: "edges",
    legend: "แถบส้มคือทางตรงยาวตามขอบ · ลูกศรคือทิศที่ทางทั้งหมดไหลไป",
    points: ["สร้างทีละแถวจากบนลงล่าง จำเพียงแถวที่กำลังสร้าง", "สร้างได้เร็วและใช้หน่วยความจำน้อย", "Binary Tree กับ Sidewinder มีทางตรงยาวตามขอบ และทางไหลไปทิศเดียว"],
  },
  wall: {
    sample: "division", mark: "split",
    legend: "เส้นฟ้าหนาคือกำแพงแรกที่ผ่าห้องใหญ่ · เส้นฟ้าบางคือกำแพงชั้นถัดไป",
    points: ["เริ่มจากห้องโล่งที่ไม่มีกำแพง แล้วสร้างกำแพงผ่าห้องเป็นสองส่วนพร้อมเจาะประตูไว้", "ผ่าห้องย่อยต่อไปเรื่อย ๆ จนห้องเล็กสุด", "ได้กำแพงตรงยาว หน้าตาคล้ายผังอาคาร"],
  },
};

const N = 12, C = 10, PAD = 8;
const cx = (c: number) => PAD + (c % N) * C + C / 2, cy = (c: number) => PAD + ((c / N) | 0) * C + C / 2;
const seg = (a: number, b: number) => {
  // เส้นกำแพงระหว่างช่อง a กับ b
  const lo = Math.min(a, b), x = PAD + (lo % N) * C, y = PAD + ((lo / N) | 0) * C;
  return Math.abs(b - a) === 1 ? `M${x + C} ${y}V${y + C}` : `M${x} ${y + C}H${x + C}`;
};

/** ภาพตัวอย่างที่สร้างแล้วของแต่ละวิธี · จำไว้ระดับไฟล์ ชี้ซ้ำได้ภาพเดิม
    (เดิมจำด้วย useMemo ในป๊อปที่ถูกถอดทุกครั้งที่เมาส์ออก ชี้ใหม่ได้ภาพใหม่ docs/BUGHUNT-2026-10-21.md ข้อ 26) */
const PICS = new Map<AlgoId, ReturnType<typeof makePic>>();

function makePic(algo: AlgoId) {
    const g = generate(N, algo), w = build(N, g), E = PAD + N * C, mid = N >> 1, s = mid, e = N * (N - 1) + mid;
    let walls = "";
    for (let c = 0; c < N * N; c++) {
      if (w.R[c] && c % N < N - 1) walls += seg(c, c + 1);
      if (w.B[c] && c < N * N - N) walls += seg(c, c + N);
    }
    const g0 = PAD + mid * C;
    walls += `M${PAD} ${PAD}H${g0}M${g0 + C} ${PAD}H${E}M${PAD} ${E}H${g0}M${g0 + C} ${E}H${E}M${PAD} ${PAD}V${E}M${E} ${PAD}V${E}`;
    // เส้นทางเฉลย ค้นทางกว้างจากทางเข้าบนกลางถึงทางออกล่างกลาง
    const prev = new Int32Array(N * N).fill(-2); prev[s] = -1;
    const q = [s];
    for (let i = 0; i < q.length; i++) for (const nb of openNb(q[i], N, w.R, w.B)) if (prev[nb] === -2) { prev[nb] = q[i]; q.push(nb); }
    const path: number[] = [];
    for (let c = e; c >= 0; c = prev[c]) path.unshift(c);
    const pathD = `M${cx(s)} ${PAD - 4}` + path.map((c) => `L${cx(c)} ${cy(c)}`).join("") + `L${cx(e)} ${E + 4}`;
    const dead = [...Array(N * N).keys()].filter((c) => openNb(c, N, w.R, w.B).length === 1 && c !== s && c !== e);
    // ทางตรงยาวตามขอบ แถวบนสุด ล่างสุด คอลัมน์ซ้ายสุด ขวาสุด ที่เปิดโล่งเกือบตลอด
    const edges: string[] = [];
    const runRow = (y: number) => [...Array(N - 1).keys()].filter((x) => !w.R[y * N + x]).length >= N - 2;
    const runCol = (x: number) => [...Array(N - 1).keys()].filter((y) => !w.B[y * N + x]).length >= N - 2;
    const top = runRow(0), bot = runRow(N - 1), left = runCol(0), right = runCol(N - 1);
    if (top) edges.push(`M${cx(0)} ${cy(0)}H${cx(N - 1)}`);
    if (bot) edges.push(`M${cx(N * (N - 1))} ${cy(N * (N - 1))}H${cx(N * N - 1)}`);
    if (left) edges.push(`M${cx(0)} ${cy(0)}V${cy(N * (N - 1))}`);
    if (right) edges.push(`M${cx(N - 1)} ${cy(N - 1)}V${cy(N * N - 1)}`);
    const tx = right ? 1 : left ? -1 : 0, ty = top ? -1 : bot ? 1 : 0;
    // กำแพงชั้นแรกกับชั้นที่สองของวิธีแบ่งห้อง ตามลำดับห้องที่ผ่า
    let split1 = "", split2 = "", room = 0;
    for (const o of g.ops) {
      if (o[0] === "r") { room++; continue; }
      if (o[0] !== "w") continue;
      if (room === 1) split1 += seg(o[1] as number, o[2] as number);
      else if (room <= 3) split2 += seg(o[1] as number, o[2] as number);
    }
    return { walls, pathD, dead, edges, tx, ty, split1, split2 };
}

/** เขาวงกตตัวอย่างแบบเส้น SVG พร้อมไฮไลต์นิสัยของกลุ่ม */
function MiniMaze({ algo, mark }: { algo: AlgoId; mark: Mark }) {
  const pic = useMemo(() => {
    let p = PICS.get(algo);
    if (!p) { p = makePic(algo); PICS.set(algo, p); }
    return p;
  }, [algo]);
  const S = N * C + PAD * 2, mid = PAD + (N * C) / 2;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} aria-hidden="true">
      {mark === "edges" && pic.edges.map((d) => <path key={d} d={d} fill="none" stroke="var(--b2)" strokeWidth={7} strokeLinecap="round" opacity={0.55} />)}
      {(mark === "path" || mark === "deadpath") && <path d={pic.pathD} fill="none" stroke="var(--path)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />}
      <path d={pic.walls} fill="none" stroke="var(--wall)" strokeWidth={1.5} strokeLinecap="square" />
      {mark === "split" && <path d={pic.split2} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeLinecap="square" />}
      {mark === "split" && <path d={pic.split1} fill="none" stroke="var(--accent)" strokeWidth={4} strokeLinecap="square" />}
      {(mark === "dead" || mark === "deadpath") && pic.dead.map((c) => <circle key={c} cx={cx(c)} cy={cy(c)} r={2.3} fill="var(--wrong-dot)" />)}
      {mark === "edges" && (pic.tx || pic.ty) ? (
        <g stroke="var(--b2)" strokeWidth={3} strokeLinecap="round" fill="none">
          <path d={`M${mid - pic.tx * 22} ${mid - pic.ty * 22}L${mid + pic.tx * 22} ${mid + pic.ty * 22}`} />
          <path d={`M${mid + pic.tx * 22} ${mid + pic.ty * 22}l${-pic.tx * 9} ${-pic.ty * 0}M${mid + pic.tx * 22} ${mid + pic.ty * 22}l${-pic.tx * 0} ${-pic.ty * 9}`} />
        </g>
      ) : null}
    </svg>
  );
}

export default function GroupLabel({ g }: { g: GroupId }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const info = INFO[g];
  // ป๊อปยึดตำแหน่งกับจอ เลื่อนแผงแล้วลอยค้างผิดที่ จึงปิดตอนเลื่อน · กด Esc ปิดได้ (WCAG 1.4.13 · docs/BUGHUNT-2026-10-21.md ข้อ 34)
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    // แตะที่อื่นแล้วปิด (มือถือแตะที่ว่างแล้วโฟกัสไม่หลุด ป๊อปค้าง พี่กันทัก 21 ต.ค. 2569)
    const onDown = (e: PointerEvent) => { if (!(e.target instanceof Element) || !e.target.closest(".glabel, .ginfo")) close(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); window.removeEventListener("scroll", close, true); };
  }, [at]);
  // y คือแนวป้ายชื่อกลุ่ม แล้ววัดความสูงจริงของป๊อปก่อนวาดลงจอ ดันขึ้นถ้าล้นขอบล่าง
  // (เดิมเดาสูง 380 แต่ของจริง 400 ถึง 460 ภาษาอังกฤษถึง 560 จอสูง 577 ขอบล่างหลุดจอ เจอตอนตรวจภาษาอังกฤษ 23 ต.ค. 2569)
  const box = useRef<HTMLSpanElement>(null);
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect(), W = 300;
    setAt({ x: Math.min(r.right + 12, innerWidth - W - 8), y: r.top - 10 });
  };
  // วัดซ้ำทุกครั้งที่ป๊อปเปลี่ยนขนาด ภาษาอังกฤษตัวแปลเปลี่ยนข้อความหลังวาดรอบแรก ป๊อปสูงขึ้นทีหลัง
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !at) return;
    const place = () => { el.style.top = `${Math.max(8, Math.min(at.y, innerHeight - el.offsetHeight - 8))}px`; };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [at]);
  return (
    <span className="glabel" tabIndex={0} onMouseEnter={(e) => show(e.currentTarget)} onMouseLeave={() => setAt(null)} onFocus={(e) => show(e.currentTarget)} onBlur={() => setAt(null)} aria-describedby={at ? `ginfo-${g}` : undefined}>
      {GROUPS[g]}
      <span className="ginfoicon" aria-hidden="true">i</span>
      {at && (
        <span ref={box} className="ginfo" id={`ginfo-${g}`} role="tooltip" style={{ left: at.x, top: at.y }}>
          <b className="gtitle">{GROUPS[g]}</b>
          <span className="gmaze"><MiniMaze algo={info.sample} mark={info.mark} /></span>
          <span className="glegend">{info.legend}</span>
          <span className="gcap">ภาพตัวอย่างจาก {ALGOS.find((x) => x.id === info.sample)?.name} ขนาด {N} × {N} ช่อง</span>
          <ul>{info.points.map((p) => <li key={p}>{p}</li>)}</ul>
          <span className="gcap">วิธีในกลุ่มนี้ {ALGOS.filter((x) => x.g === g).map((x) => x.name).join(" · ")}</span>
        </span>
      )}
    </span>
  );
}
