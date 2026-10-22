"use client";

import { Fragment, useEffect, useState } from "react";
import type { Game, Result } from "@/lib/game/state";
import { fmt, scoreTone, th } from "@/lib/local";
import Icon from "@/components/ui/Icon";
import { reducedMotion } from "@/lib/draw/paint";

/* การ์ดผลตอนชนะ (ยกจากไฟล์เดิม · เอกสารหัวข้อ 8 การ์ดตอนชนะ) ใช้ทั้งหน้าเล่นเกมและตัวดูย้อน
   คะแนนตัวใหญ่ แถบวัด คำประเมิน · เวลา ก้าว ทางแยกที่เลือกถูก เลี้ยวผิด · ที่มาของก้าวเกินรวมกันได้ตรงพอดีเสมอ */

// วลีที่ห้ามตัดกลาง (.ph คือ white-space: nowrap ชุดเดียวกับ components/ui/Phr.tsx)
const ph = (t: string) => <span className="ph">{t}</span>;

type Props = {
  G: Game;
  r: Result;
  title: string;
  pills?: string[];
  markersNote?: boolean;
  /** การ์ดตอนชนะในหน้าเล่นเกม ใส่ถ้วยรางวัลกับหัวข้อสีโทนอุ่น */
  celebrate?: boolean;
  /** ป้ายเล็กข้างหัวข้อ (ป้ายบันทึกของหน้าเล่นเกมบนมือถือ) */
  badge?: React.ReactNode;
  children?: React.ReactNode;
};

export default function ResultCard({ G, r, title, pills, markersNote, celebrate, badge, children }: Props) {
  const [meter, setMeter] = useState(0);
  useEffect(() => {
    let a = 0, b = 0;
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setMeter(r.score)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [r.score]);
  // เลขคะแนนนับขึ้นจาก 0 ถึงคะแนนจริงในราว 0.9 วินาที แล้วดุ๊กดิ๊กวนไปเรื่อย ๆ (พี่กันสั่ง 21 ต.ค. 2569 "ขอเลข 84 ให้มันมีความดุ๊กดิ๊กนิด ๆ" แล้ว "ตุ๊กติ๊กตลอดวนไปมา ไม่ใช่ 1 ครั้งจบ")
  // เครื่องตั้งลดการเคลื่อนไหว ขึ้นเลขจริงทันที ไม่นับ ไม่เด้ง
  const [shown, setShown] = useState(0);
  const still = reducedMotion();
  useEffect(() => {
    if (still) return;
    let id = 0;
    const t0 = performance.now(), D = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / D);
      setShown(Math.round(r.score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [r.score, still]);

  // จำนวนครั้งที่ปักธง นับจากบันทึกการเดินของเกมนี้
  const nFlag = G.events.filter((e) => e.k === "F").length;
  const parts: string[] = [];
  if (G.lost) parts.push(`หลงในทางผิด ${th(G.lost)} ก้าว`);
  if (G.back) parts.push(`ถอยหลังบนทางถูก ${th(G.back)} ก้าว`);
  if (G.rewalk) parts.push(`เดินซ้ำช่วงที่เคยผ่านแล้ว ${th(G.rewalk)} ก้าว`);

  return (
    <div className="win">
      <div className="wincard">
        <div className="whead">
          {/* ชนะแล้ว ถ้วยรางวัลสีทองเด้งเข้ามา หัวข้อสีโทนอุ่นไล่เฉด (พี่กันสั่ง 21 ต.ค. 2569 "ใส่ไอคอนที่บ่งบอกของรางวัลและความยินดี และเปลี่ยนสีให้เด่น") */}
          {celebrate ? <h2 className="wtitle"><span className="trophy" aria-hidden="true"><Icon name="trophy" size={22} /></span><span className="wtxt">{title}</span></h2> : <h2>{title}</h2>}
          {pills && pills.length > 0 && <div className="pills">{pills.map((p) => <span key={p} className="pill">{p}</span>)}</div>}
          {badge}
        </div>
        {/* เลขคะแนนกับแถบวัดสีตามระดับเดียวกับแถบคะแนนในหน้าประวัติ (พี่กันสั่ง 21 ต.ค. 2569 "ใส่สีคะแนนตามเส้นด้วย" "สีตามเส้นนี้") */}
        <div className={`score sc-${scoreTone(r.score)}`}>
          {/* data-w = จำนวนหลักของคะแนนจริง มือถือกันที่ไว้เท่าคะแนนจริงตั้งแต่เริ่มนับ (app/mobile.css) เดิมนับจาก 9 เป็น 10 แล้วคำประเมินตกบรรทัด การ์ดยืดลง 66 จุดกลางแอนิเมชัน */}
          <div className="snum"><b className="sbounce" aria-label={`${r.score}`} data-w={String(r.score).length}>{still ? r.score : shown}</b><span>/100</span></div>
          <div className="sgrade"><span className="k">คะแนนความแม่นยำ</span><b>{r.grade}</b></div>
        </div>
        <div className={`meter sc-${scoreTone(r.score)}`} aria-hidden="true"><div className="mfill" style={{ width: `${meter}%` }} /></div>
        <div className="wstats">
          {/* wst-dup = ตัวเลขซ้ำกับแถวเวลา ก้าว ด้านบนของหน้าเล่นเกมจอคอม ซ่อนที่นั่น (app/globals.css) · หน้าดูย้อนกับมือถือยังขึ้น
              (พี่กันสั่ง 22 ต.ค. 2569 "งั้นเอาออก มันซ้ำ แล้วจัดให้มันวันเพจ") */}
          <div className="wst-dup"><span className="k">เวลา</span><b>{fmt(G.el)}</b></div>
          <div className="wst-dup"><span className="k">ก้าวทั้งหมด</span><b>{th(G.steps)}</b></div>
          {/* หน้าเล่นเกม (celebrate) กล่องก้าวเกินแทนบรรทัดก้าวเกินในคำอธิบาย (พี่กันสั่ง 22 ต.ค. 2569 "เราบอกว่าเอาอันนี้ออกไง แล้วไปเพิ่มการ์ดอีกอันเรื่องจำนวนก้าวที่ผิด")
              ตัวดูย้อนยังเป็นบรรทัดเดิมที่แยกที่มาของก้าวเกิน */}
          {celebrate && <div className="tone-wrong wst-waste"><span className="k">ก้าวเกิน</span><b>{`${th(r.waste)} ก้าว`}</b></div>}
          <div><span className="k">ทางแยกที่เลือกถูก</span><b>{`${th(r.D - r.W)} / ${th(r.D)}`}</b></div>
          <div className="tone-wrong"><span className="k">เลี้ยวผิด</span><b>{th(G.wrong)} ครั้ง</b></div>
        </div>
        {/* แต่ละวลีไม่ถูกหั่นกลาง ตัวเลขอยู่กับคำว่าก้าวเสมอ ตัดบรรทัดได้เฉพาะระหว่างวลี (พี่กันสั่ง "ปรับบรรทัดดี ๆ") */}
        <p className="wnote">
          {/* คะแนน = เส้นทางสุดท้ายของผู้เล่น ÷ ก้าวที่เดินจริง (lib/game/state.ts result · พี่กันเคาะ 22 ต.ค. 2569 "เอาตามเรา" ให้นับแค่ก้าว)
              ด่านทางวนเลือกเส้นที่อ้อมกว่าได้ไม่หักคะแนน (พี่กันเคาะ "ยังไงเราต้องได้เต็ม 100") บอกทางสั้นสุดไว้ให้เทียบ */}
          {ph("คะแนน = เส้นทางที่เลือก ÷ ก้าวที่เดินจริง")} {ph(`(${th(r.route)} ÷ ${th(G.steps)} ก้าว)`)}
          {r.route > r.shortest && <><br />{ph(`ทางสั้นสุด ${th(r.shortest)} ก้าว`)} {ph("เส้นที่อ้อมกว่าทางสั้นสุดไม่หักคะแนน")} {ph("หักเฉพาะก้าวที่เดินย้อนหรือวนกลับที่เดิม")}</>}
          {/* บรรทัดก้าวเกินกับคำอธิบายสีขึ้นทุกเกม เกมที่ไม่มีก้าวเกินก็ขึ้น (พี่กันสั่ง 21 ต.ค. 2569 "ให้มันขึ้นตลอดได้ไหม" ไฟล์เดิมขึ้นเฉพาะเกมที่มีก้าวเกินหรือเลี้ยวผิด) */}
          {/* หน้าเล่นเกมไม่มีบรรทัดนี้ ทั้งตอนมีและไม่มีก้าวเกิน (พี่กันสั่ง 22 ต.ค. 2569 "เอาบรรทัดนี้ออก" แล้ว "เราบอกว่าเอาอันนี้ออกไง") ใช้กล่องก้าวเกินข้างบนแทน */}
          {!celebrate && (r.waste > 0 ? <><br />{ph(`ก้าวเกิน ${th(r.waste)} ก้าว มาจาก`)} {parts.map((p, i) => <Fragment key={i}>{ph(p)} </Fragment>)}</> : <><br />{ph("ไม่มีก้าวเกิน")} {ph(r.route === r.shortest ? "เดินตามทางสั้นสุดพอดี" : "ไม่เดินย้อนและไม่วนกลับที่เดิม")}</>)}
          {G.warp > 0 && <><br />{ph(`วาร์ปกลับธง ${th(G.warp)} ครั้ง`)} {ph("ไม่นับก้าว")}</>}
          <br /><i />ช่องสีแดงอ่อนบนกระดานคือทางที่หลงเข้าไป
          {markersNote && <><br /><span className="dot" />จุดแดงคือช่องที่เลี้ยวผิด</>}
          {/* เกมที่ปักธง บอกว่าปักกี่ครั้ง ธงบนกระดานคือจุดที่ปัก (พี่กันสั่ง 21 ต.ค. 2569 "ถ้ามีปักธง ให้ขึ้น") */}
          {nFlag > 0 && <><br /><span className="flagmark" />{ph(`ปักธง ${th(nFlag)} ครั้ง ธงบนกระดานคือจุดที่ปักไว้`)}{markersNote && nFlag > 1 && <> {ph("ธงจางคือจุดที่เคยปักก่อนหน้า")}</>}</>}
        </p>
        {children}
      </div>
    </div>
  );
}
