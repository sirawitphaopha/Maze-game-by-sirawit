"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { pendingServerSnapshot, pendingSnapshot, subscribePending } from "@/lib/games";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LangToggle from "@/components/ui/LangToggle";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { playMem } from "@/lib/session";
import { APP_VERSION } from "@/lib/version";

/* แถบบนของเว็บ ชื่อ คำโปรย แท็บ และปุ่มออกจากระบบ อยู่แถบเดียวกัน ตรึงไว้บนสุดทุกหน้า
   (พี่กันสั่ง 21 ต.ค. 2569 "ตรึงอันนี้ด้วย" ชี้ที่แท็บ · เดิมหัวเว็บกับแท็บแยกสองชั้น เลื่อนแล้วหายไปทั้งคู่)
   ความสูงของแถบวัดสดเขียนลง --bar-h ให้หน้าห้องทดลองกับหน้าเล่นเกมคิดความสูงพื้นที่ทำงานให้พอดีจอ
   (สกิล web-craft · ระยะที่อิงความสูงของอีกก้อน วัดด้วย ResizeObserver ห้ามตั้งเลขตายตัว)
   แท็บเดิมจำด้วย #lab #play ในที่อยู่เว็บ ตอนนี้เป็นหน้าแยก / · /play · /history
   🔴 ปุ่มออกจากระบบ ยังมีเกมรอส่ง = ห้ามออก เพราะเกมพวกนั้นอยู่ในเครื่องนี้ที่เดียว (สกิล db-safety ข้อ 24) */

const TABS = [
  { href: "/", label: "ห้องทดลอง", match: (p: string) => p === "/" },
  { href: "/play", label: "เล่นเกม", match: (p: string) => p.startsWith("/play") },
  { href: "/history", label: "ประวัติ", match: (p: string) => p.startsWith("/history") },
];

export default function TopBar() {
  const path = usePathname() || "/";
  const router = useRouter();
  // เผลอกดแท็บอื่นระหว่างเล่นเกม ถามก่อนออก (พี่กันสั่ง 21 ต.ค. 2569 "เล่นเกมอยู่ แล้วเผลอกดไปแถบอื่น มันต้องเตือนด้วยนะ")
  // เตือนเฉพาะตอนนาฬิกาเดินแล้วและยังไม่จบ · ยังไม่ก้าวแรกหรือชนะแล้วไปได้เลย
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const items = useSyncExternalStore(subscribePending, pendingSnapshot, pendingServerSnapshot);
  const [busy, setBusy] = useState(false);
  const ro = useRef<ResizeObserver | null>(null);
  // มือถือ แท็บกับปุ่มออกจากระบบอยู่ในรายการที่กางลงจากปุ่มเมนู (พี่กันสั่ง 21 ต.ค. 2569 "ย้ายไปที่อื่น เอาแบบปุ่มกดลงมาเลือก เพราะมันกินที่ มือถือคือเน้นเล่นเกมจริง ๆ")
  const [menu, setMenu] = useState(false);

  // เปลี่ยนหน้าแล้วอยู่บนสุดเสมอ (new-web-checklist · web-craft 6.26)
  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  // รายการเมนูเปิดอยู่ แตะที่อื่นหรือกด Esc แล้วปิด
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => { if (!(e.target instanceof Element) || !e.target.closest(".mmenu, .mmenu-list")) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  // โหลดโค้ดของทุกแท็บรอไว้ตั้งแต่เปิดเว็บ กดเปลี่ยนแท็บแล้วขึ้นทันที ไม่มีจังหวะรอ (พี่กันสั่ง "ห้ามมีการโหลดแบบนี้ตอนเปลี่ยนแท็บ")
  useEffect(() => {
    const t = setTimeout(() => {
      void import("@/components/lab/LabView");
      void import("@/components/game/GameView");
      void import("@/components/history/HistoryView");
      void import("@/components/history/ReplayView");
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // ผูกตัววัดผ่าน ref แบบฟังก์ชัน ต่อและถอดตามจังหวะที่แถบโผล่หรือหาย (หน้าเข้าสู่ระบบไม่มีแถบ)
  const barRef = useCallback((el: HTMLElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    const root = document.documentElement;
    if (!el) { root.style.removeProperty("--bar-h"); return; }
    const put = () => root.style.setProperty("--bar-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    put();
    ro.current = new ResizeObserver(put);
    ro.current.observe(el);
  }, []);

  if (path === "/login") return null;
  const blocked = items.length > 0;
  const onReplay = path.startsWith("/history/");
  // กดแท็บระหว่างเล่นเกม ถามก่อนออก · ใช้ทั้งแท็บบนจอคอมและรายการเมนูบนมือถือ
  const onTab = (e: React.MouseEvent<HTMLAnchorElement>, t: (typeof TABS)[number]) => {
    if (e.detail > 0) e.currentTarget.blur();
    setMenu(false);
    if (path.startsWith("/play") && !t.match(path) && playMem.G?.status === "play") { e.preventDefault(); setLeaveTo(t.href); }
  };

  const logout = async () => {
    if (blocked || busy) return;
    setBusy(true);
    try { await fetch("/api/auth", { method: "DELETE" }); } catch { /* ออกไม่สำเร็จก็ยังพาไปหน้าเข้าสู่ระบบ */ }
    // โหลดหน้าใหม่ทั้งหน้าโดยตั้งใจ ล้างเกมที่จำไว้ในหน่วยความจำของหน้าเว็บทิ้งด้วย (สกิล db-safety ข้อ 24 ออกจากระบบต้องล้างของในเครื่อง)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  };

  return (
    <header className="appbar noprint" ref={barRef}>
      <div className="appbar-in">
        <div className="brand">
          {/* ปุ่มกลับไปหน้าประวัติ ไอคอนอย่างเดียว หน้าชื่อเว็บ เฉพาะหน้าดูย้อน (พี่กันสั่ง 21 ต.ค. 2569
              "เอามาใส่หน้าคำนี้ เป็นปุ่มที่มีแค่ไอคอน พอกดแล้วมีแอนิเมชันปุ่มนั้นเลื่อนหายเอง แล้วชื่อเว็บก็จะเลื่อนไปเต็ม")
              แถบบนอยู่ค้างข้ามหน้า ปุ่มจึงอยู่ในหน้าเว็บตลอด แค่หดกว้างเป็นศูนย์ตอนไม่ใช่หน้าดูย้อน การเปลี่ยนความกว้างคือแอนิเมชัน */}
          <span className={`backslot${onReplay ? " on" : ""}`} aria-hidden={!onReplay}>
            <Link className="iconbtn" href="/history" aria-label="กลับไปหน้าประวัติ" title="กลับไปหน้าประวัติ" tabIndex={onReplay ? 0 : -1}>
              <Icon name="left" size={16} />
            </Link>
          </span>
          {/* ไอคอนเว็บหน้าชื่อ ไฟล์เดียวกับไอคอนแท็บเบราว์เซอร์ app/icon.svg (พี่กันสั่ง "เอา icon มาใส่หน้าชื่อเว็บด้วย") */}
          {/* eslint-disable-next-line @next/next/no-img-element -- ไฟล์ svg เล็ก ไม่ต้องผ่านตัวย่อรูปของ Next */}
          <img className="logo" src="/icon.svg" alt="" width={30} height={30} />
          <h1>ห้องทดลองเขาวงกต</h1>
          {/* เลขรุ่นข้างชื่อ แล้วเส้นกั้นก่อนคำอธิบาย (พี่กันสั่ง 21 ต.ค. 2569 "ใส่เวอร์ชั่น 1.0 แล้วทำเครื่องหมายกั้นกับคำอธิบาย") */}
          <span className="ver">v{APP_VERSION}</span>
          <span className="bsep" aria-hidden="true" />
          {/* คำโปรยชวนเล่น ภาษาสุภาพ ยาวพอดีแถวเดียว (พี่กันสั่ง 21 ต.ค. 2569 "อันนี้จืดไป เขียนให้สนุกและน่าสนใจกว่านี้") */}
          {/* คำว่าเล่นเกมเน้นสีและกดไปแท็บเล่นเกมได้เลย (พี่กันสั่ง 21 ต.ค. 2569 "ใช้คำว่าโหมดเล่นเกม และไฮไลต์คำว่าเล่นเกม พอกดอันนี้แล้วมันจะไปแท็บนั้นเลย") */}
          <p>ชมเขาวงกตก่อตัวทีละช่องด้วย 11 วิธี ปรับนิสัยได้ตามต้องการ แล้วท้าตัวเองหาทางออกในโหมด<Link href="/play" className="plink" aria-current={path === "/play" ? "page" : undefined}>เล่นเกม</Link></p>
        </div>
        <nav className="tabs" aria-label="โหมด">
          {TABS.map((t) => (
            // กดด้วยเมาส์แล้วปล่อยโฟกัสออกจากแท็บ ไม่งั้นกดลูกศรเล่นเกมต่อ เบราว์เซอร์วาดกรอบโฟกัสรอบแท็บ (พี่กันทัก "ปุ่มนี้มาทำใหม่ทำไม มันไม่สวย")
            // กดด้วยคีย์บอร์ด (detail เป็น 0) โฟกัสยังอยู่ กรอบยังขึ้นตามปกติ (สกิล web-craft ปุ่มต้องใช้คีย์บอร์ดได้)
            <Link key={t.href} href={t.href} className="tab" aria-current={t.match(path) ? "page" : undefined} onClick={(e) => onTab(e, t)}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="who">
          <div className="whorow">
            <LangToggle />
            <ThemeToggle />
            {/* ปุ่มเลือกแท็บ มือถือเท่านั้น · hidden ไว้ หน้าคอมไม่เห็นและไม่กินที่ app/mobile.css เปิดให้เห็นบนมือถือ */}
            <button type="button" className="iconbtn mmenu" hidden aria-label="เลือกแท็บ" title="เลือกแท็บ" aria-haspopup="menu" aria-expanded={menu} aria-controls="mmenu-list" onClick={() => setMenu((m) => !m)}>
              <Icon name={menu ? "x" : "menu"} size={18} />
            </button>
            <button type="button" className="out" onClick={logout} disabled={blocked || busy}>
              {busy ? "กำลังออก" : "ออกจากระบบ"}
            </button>
          </div>
          {leaveTo && (
            <ConfirmDialog
              title="กำลังเล่นเกมอยู่ ต้องการไปหน้าอื่นหรือไม่"
              lines={["เวลาจะหยุดไว้ กลับมาที่แท็บเล่นเกมแล้วเล่นต่อได้", "แต่ถ้ารีเฟรชหรือปิดหน้าเว็บ เกมนี้จะหายและไม่บันทึก"]}
              confirmLabel="ไปหน้าอื่น"
              cancelLabel="เล่นต่อ"
              onConfirm={() => { const to = leaveTo; setLeaveTo(null); router.push(to); }}
              onCancel={() => setLeaveTo(null)}
            />
          )}
          {blocked && <div className="outwhy">ยังมีเกมรอส่ง {items.length} เกม ออกจากระบบไม่ได้จนกว่าจะส่งเข้าระบบครบ</div>}
          {/* รายการที่กางลงจากปุ่มเลือกแท็บ (มือถือ) · เล่นเกมอยู่บนสุด (พี่กันสั่ง "ปุ่มเล่นเกมจะแสดงอย่างแรก") */}
          {menu && (
            <div className="mmenu-list" id="mmenu-list" role="menu" aria-label="เลือกแท็บ">
              {[TABS[1], TABS[0], TABS[2]].map((t) => (
                <Link key={t.href} href={t.href} role="menuitem" className="mitem" aria-current={t.match(path) ? "page" : undefined} onClick={(e) => onTab(e, t)}>
                  {t.label}{t.match(path) && <Icon name="check" size={16} />}
                </Link>
              ))}
              <button type="button" role="menuitem" className="mitem mout" onClick={logout} disabled={blocked || busy}>{busy ? "กำลังออก" : "ออกจากระบบ"}</button>
              {blocked && <div className="mwhy">ยังมีเกมรอส่ง {items.length} เกม ออกจากระบบไม่ได้จนกว่าจะส่งเข้าระบบครบ</div>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
