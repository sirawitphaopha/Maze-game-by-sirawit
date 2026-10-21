"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { drawGame, type BoardView } from "@/lib/draw/gameDraw";
import { fitCanvas } from "@/lib/draw/paint";

/* กระดานเกมแบบ 2D · ตัวแม่ถือสถานะเกม (mutable) แล้วสั่ง draw() เมื่อมีอะไรเปลี่ยน
   วาดใหม่เองเมื่อหน้าต่างเปลี่ยนขนาด หรือธีมเปลี่ยน
   🔑 รอบหน้าทำ 3D สร้างตัวแทน BoardCanvas3D ที่รับ props ชุดเดียวกัน */

export type BoardHandle = { draw: () => void; el: () => HTMLCanvasElement | null };

type Props = {
  ref?: Ref<BoardHandle>;
  getView: () => BoardView | null;
  ariaLabel: string;
  tabIndex?: number;
  onPointerDown?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
};

export default function BoardCanvas2D({ ref, getView, ariaLabel, tabIndex, onPointerDown, onPointerMove, onPointerUp }: Props) {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef(getView);
  useEffect(() => { viewRef.current = getView; }, [getView]);

  const draw = useCallback(() => {
    const c = cv.current, v = viewRef.current();
    if (!c || !v) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawGame(ctx, fitCanvas(c, ctx), v);
  }, []);

  useImperativeHandle(ref, () => ({ draw, el: () => cv.current }), [draw]);

  useEffect(() => {
    const redraw = () => requestAnimationFrame(draw);
    window.addEventListener("resize", redraw);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", redraw);
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // กระดานย่อขยายตามพื้นที่ที่ได้ (หน้าเล่นเกมบนจอคอมพอดีความสูงจอ) ไม่ใช่แค่ตอนหน้าต่างเปลี่ยนขนาด
    const ro = new ResizeObserver(redraw);
    if (cv.current) ro.observe(cv.current);
    redraw();
    return () => { window.removeEventListener("resize", redraw); mq.removeEventListener("change", redraw); mo.disconnect(); ro.disconnect(); };
  }, [draw]);

  return (
    <canvas
      ref={cv}
      className="board"
      tabIndex={tabIndex}
      role="img"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
