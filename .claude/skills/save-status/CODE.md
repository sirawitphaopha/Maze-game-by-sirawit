# โค้ดจริงของระบบบอกสถานะการส่ง — ยกไปวางในเว็บใหม่ได้เลย

> เปิดไฟล์นี้ตอน **ลงมือเขียนจริง** · กฎและเหตุผลอยู่ใน `SKILL.md` อ่านตัวนั้นก่อน
>
> โค้ดทั้งหมดในไฟล์นี้ **คัดจากเว็บที่ใช้งานจริงอยู่ตอนนี้** ไม่ใช่โค้ดตัวอย่างที่แต่งขึ้น
> ที่มาระบุไว้ท้ายทุกก้อน

---

## แผนที่ — เว็บใหม่หนึ่งตัวต้องมี 6 ไฟล์นี้

| ไฟล์ | ทำอะไร | ก้อนที่ |
|---|---|---|
| `lib/net.ts` | ยิงคำขอ · ตัดเมื่อค้าง · ลองซ้ำเฉพาะตอนไม่รู้ผล | ① |
| `components/ui/SaveBanner.tsx` | แถบบอกผลหลังกด | ② |
| `lib/saveQueue.ts` | คิวรอส่งในเครื่อง | ③ |
| `components/shell/PendingBar.tsx` | แถบรายการรอส่ง เห็นทุกหน้า | ④ |
| หน้าที่มีปุ่มบันทึก | ปุ่ม 4 สถานะ + เรียกทั้งสามตัวข้างบน | ⑤ |
| `scripts/test-save-roundtrip.mts` | ส่งจริงแล้วอ่านกลับมาเทียบทีละช่อง | ⑥ |

---

## ① `lib/net.ts` — ยิงคำขอ + ลองซ้ำที่ปลอดภัย

```ts
export type Fail = "timeout" | "offline" | "nodb" | "server";

export type Ask<T> =
  | { ok: true; data: T }
  | { ok: false; why: Fail; status?: number; error?: string };

/** รอนานสุดกี่มิลลิวินาทีก่อนตัด — เผื่อเน็ตโรงพยาบาลช้าแต่ยังไม่ถึงกับหลุด */
const WAIT_MS = 15000;

export const FAIL_TEXT: Record<Fail, string> = {
  timeout: "เซิร์ฟเวอร์ไม่ตอบกลับภายในเวลาที่รอ — เน็ตอาจช้าหรือเซิร์ฟเวอร์กำลังแน่น",
  offline: "ติดต่อเซิร์ฟเวอร์ไม่ได้เลย — ตรวจว่าเครื่องนี้ยังต่อเน็ตอยู่หรือไม่",
  nodb: "ยังไม่ได้ตั้งค่าเชื่อมฐานข้อมูลในเครื่องนี้",
  server: "เซิร์ฟเวอร์รับคำขอแล้วแต่ตอบกลับมาว่าทำไม่สำเร็จ",
};

export async function askServer<T>(
  path: string,
  body?: unknown,
  opts: {
    waitMs?: number;
    method?: "POST" | "PATCH";
    /**
     * ลองซ้ำกี่รอบเมื่อเน็ตสะดุด — ไม่ใส่ = ไม่ลองซ้ำ
     * 🔴 เปิดได้เฉพาะเส้นทางที่ **ส่งซ้ำแล้วผลเท่าเดิม**
     *    เส้นทางที่สร้างแถวใหม่ทุกครั้งห้ามเปิด
     */
    retry?: number;
  } = {}
): Promise<Ask<T>> {
  const rounds = Math.max(1, opts.retry ?? 1);
  let last: Ask<T> = { ok: false, why: "offline" };

  for (let i = 0; i < rounds; i++) {
    last = await askOnce<T>(path, body, opts);
    /* สำเร็จ หรือ เซิร์ฟเวอร์ตอบแล้วว่าไม่ผ่าน = จบ ไม่ต้องลองซ้ำ */
    if (last.ok || (last.why !== "timeout" && last.why !== "offline")) return last;
    /* ถอยห่างก่อนลองใหม่ 0.5 วิ แล้ว 1 วิ — ให้เน็ตที่สะดุดมีเวลาตั้งตัว */
    if (i < rounds - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return last;
}

async function askOnce<T>(
  path: string,
  body?: unknown,
  opts: { waitMs?: number; method?: "POST" | "PATCH" } = {}
): Promise<Ask<T>> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), opts.waitMs ?? WAIT_MS);

  try {
    const r = await fetch(path, {
      method: body === undefined ? "GET" : opts.method ?? "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: stop.signal,
    });

    if (!r.ok) {
      let error: string | undefined;
      try {
        const j = (await r.json()) as { error?: unknown };
        if (typeof j?.error === "string" && j.error.trim()) error = j.error;
      } catch {
        /* 🚨 เซิร์ฟเวอร์ล่มแล้ว Cloudflare ตอบเป็นหน้า HTML ไม่ใช่ JSON
              ห้ามปล่อยให้ตรงนี้ throw ไม่งั้นได้ข้อความผิดเรื่อง (ยกจากเว็บ HCV) */
      }
      return { ok: false, why: r.status === 503 ? "nodb" : "server", status: r.status, error };
    }

    /* อ่านคำตอบไม่ออก = เซิร์ฟเวอร์ตอบผิดรูป ไม่ใช่เน็ตหลุด อย่าโยนไปรวมกัน */
    try {
      return { ok: true, data: (await r.json()) as T };
    } catch {
      return { ok: false, why: "server", status: r.status };
    }
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, why: aborted ? "timeout" : "offline" };
  } finally {
    clearTimeout(timer);
  }
}
```

🔴 **สี่เหตุผลต้องแยกกัน** `timeout` `offline` = ยังไม่รู้ผล ลองซ้ำได้ ·
`server` `nodb` = รู้ผลแล้วว่าไม่ผ่าน ห้ามลองซ้ำ ห้ามเข้าคิว

> ที่มา — `warfarin-dash/lib/net.ts` · ต้นแบบมาจาก `_hcvnz/lib/net.ts` และ `ME-DRP-fresh/lib/net.ts`

---

## ② `components/ui/SaveBanner.tsx` — แถบบอกผล

```tsx
"use client";

import { useEffect } from "react";

export type SaveBannerState =
  | { kind: "idle" }
  /** สำเร็จ — บรรทัดเดียวจบ ห้ามไล่รายละเอียดต่อท้าย */
  | { kind: "ok"; title: string }
  /** ล้มเหลว — ค้างไว้จนกว่าจะกดปิด */
  | { kind: "error"; title: string; detail?: string };

export function SaveBanner({
  state, onClose, inline,
}: {
  state: SaveBannerState;
  onClose: () => void;
  /** โหมดวางอยู่กับที่ — ใช้ในห้องเลือกทรงเท่านั้น (ไม่ลอย ไม่หายเอง) */
  inline?: boolean;
}) {
  const ok = state.kind === "ok";

  /* 🚨 สำเร็จหายเอง 6 วินาที · ผิดพลาด **ห้ามตั้งตัวจับเวลา** */
  useEffect(() => {
    if (!ok || inline) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [ok, state, onClose, inline]);

  if (state.kind === "idle") return null;

  const tone = ok
    ? { bg: "#0f6d5f", fg: "#fff", sub: "rgba(255,255,255,.82)" }
    : { bg: "#a62a2a", fg: "#fff", sub: "rgba(255,255,255,.86)" };

  const place: React.CSSProperties = inline
    ? { maxWidth: 560 }
    : {
        position: "fixed", zIndex: 95,
        insetInlineStart: "50%", transform: "translateX(-50%)",
        bottom: 22, maxWidth: "min(560px, calc(100vw - 32px))",
      };

  return (
    <div role="status" aria-live="polite" style={{
      ...place, background: tone.bg, color: tone.fg,
      borderRadius: 14, padding: "12px 16px",
      boxShadow: "0 14px 34px rgba(24,16,14,.28)",
      display: "flex", alignItems: "flex-start", gap: 11,
    }}>
      <span style={{ flex: "none", marginTop: 1 }}>{ok ? "✓" : "⚠"}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>{state.title}</div>

        {/* 🔴 รายละเอียดแยกเป็นบรรทัดจริงทีละท่อน — ภาษาไทยไม่มีช่องว่างคั่นคำ
            ปล่อยให้เบราว์เซอร์ตัดเอง = คำขาดกลางคำ ("รอส่ง" ขาดเป็น "รอ" กับ "ส่ง") */}
        {state.kind === "error" && state.detail && (
          <div style={{ fontSize: 12, color: tone.sub, marginTop: 3, lineHeight: 1.7 }}>
            {state.detail.split(" · ").map((line) => <div key={line}>{line}</div>)}
          </div>
        )}
      </div>

      {/* ปิดเองได้ทุกกรณี · กรณีผิดพลาดนี่คือทางเดียวที่แถบจะหายไป */}
      <button type="button" onClick={onClose} aria-label="ปิดข้อความ" style={{
        flex: "none", border: "none", background: "none", cursor: "pointer",
        color: tone.fg, opacity: 0.85, padding: 2, lineHeight: 0, marginTop: 1,
      }}>✕</button>
    </div>
  );
}
```

> ที่มา — `warfarin-dash/components/ui/SaveBanner.tsx` · กติกาหายเอง/ไม่หายเอง ยกจากเว็บมูลค่ายาคืน

---

## ③ `lib/saveQueue.ts` — คิวรอส่งในเครื่อง

```ts
import { askServer } from "./net";

const KEY = "<ชื่อเว็บ>_pending_v1";
/** เกินเท่านี้ถือว่าเก่าเกินจะส่ง — ทิ้งออกจากเครื่อง */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingItem = {
  /** รหัสของใบนี้ — คนเดิมวันเดิมได้รหัสเดิม จึงทับกันเองได้ */
  id: string;
  path: string;
  body: unknown;
  at: number;
  /** ข้อความสั้น ๆ ให้คนอ่านรู้ว่าใบนี้คือเคสของใคร วันไหน */
  label: string;
  tries: number;
};

function read(): PendingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as PendingItem[];
    if (!Array.isArray(list)) return [];
    const fresh = list.filter((x) => x && typeof x.at === "number" && Date.now() - x.at < MAX_AGE_MS);
    if (fresh.length !== list.length) write(fresh);
    return fresh;
  } catch {
    /* อ่านไม่ได้ (โหมดส่วนตัว · พื้นที่เต็ม · ของเสีย) = ถือว่าไม่มีคิว
       ห้ามโยนข้อผิดพลาดออกไป ไม่งั้นหน้าเว็บพังเพราะเรื่องที่ไม่ควรพัง */
    return [];
  }
}

function write(list: PendingItem[]): void {
  if (typeof window === "undefined") return;
  try {
    if (list.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("wf-pending-changed"));
  } catch { /* เขียนไม่ได้ = คิวใช้ไม่ได้ในเครื่องนี้ ซึ่งแย่แต่ไม่ควรทำให้หน้าเว็บล้ม */ }
}

/* ── ที่อ่านแบบที่หน้าจอติดตามได้ (useSyncExternalStore) ──────────
   🔴 ต้องคืน **ก้อนเดิม** ถ้าข้อมูลไม่เปลี่ยน ไม่งั้น React วาดใหม่ไม่รู้จบ */
let snapRaw: string | null = null;
let snapList: PendingItem[] = [];
const EMPTY: PendingItem[] = [];

export function pendingSnapshot(): PendingItem[] {
  if (typeof window === "undefined") return snapList;
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { raw = null; }
  if (raw !== snapRaw) { snapRaw = raw; snapList = read(); }
  return snapList;
}
export function pendingServerSnapshot(): PendingItem[] { return EMPTY; }

export function subscribePending(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("wf-pending-changed", cb);
  window.addEventListener("storage", cb);   // เปิดหลายแท็บ ให้ทุกแท็บเห็นตรงกัน
  return () => {
    window.removeEventListener("wf-pending-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * เอาเคสเข้าคิว — เรียกเมื่อส่งไม่สำเร็จเพราะเน็ต **เท่านั้น**
 * 🔴 ห้ามเรียกเมื่อเซิร์ฟเวอร์ตอบมาแล้วว่าไม่ผ่าน เพราะส่งอีกกี่รอบก็ได้คำตอบเดิม
 */
export function queueSave(item: { id: string; path: string; body: unknown; label: string }): void {
  const list = read().filter((x) => x.id !== item.id);   // คนเดิมวันเดิม = ทับใบเดิม
  list.push({ ...item, at: Date.now(), tries: 0 });
  write(list);
}

export function dropPending(id: string): void {
  write(read().filter((x) => x.id !== id));
}

export async function flushPending(): Promise<{ sent: number; failed: number; dropped: number }> {
  let sent = 0, failed = 0, dropped = 0;
  for (const item of read()) {
    const res = await askServer<unknown>(item.path, item.body);
    if (res.ok) { dropPending(item.id); sent++; continue; }
    if (res.why === "timeout" || res.why === "offline") {
      const list = read().map((x) => (x.id === item.id ? { ...x, tries: x.tries + 1 } : x));
      write(list);
      failed++;
    } else {
      /* เซิร์ฟเวอร์ปฏิเสธ = ค้างไว้ก็ส่งไม่ขึ้นอยู่ดี เอาออกจากคิว */
      dropPending(item.id);
      dropped++;
    }
  }
  return { sent, failed, dropped };
}

/** รหัสประจำใบ — คนเดิมวันเดิมต้องได้รหัสเดิมเสมอ จะได้ทับกันเองไม่ใช่กองซ้อน */
export function pendingId(path: string, hn: string, clinicDate: string): string {
  return `${path}|${hn}|${clinicDate}`;
}
```

### 🔴 ห้าข้อที่ต้องถือให้ครบเพราะยอมเก็บข้อมูลผู้ป่วยจริงลงเครื่อง

1. ส่งสำเร็จ = ลบออกจากเครื่องทันที
2. เกิน 7 วันยังส่งไม่ขึ้น = ทิ้ง
3. โหมดเคสตัวอย่างไม่เข้าคิวเลย
4. คนเดิมวันเดิมที่ค้างอยู่ = ทับใบเดิม ไม่ใช่เพิ่มใบใหม่
5. หน้าจอต้องบอกตลอดว่ามีของค้างกี่เคส **ห้ามค้างเงียบ ๆ**

> ที่มา — `warfarin-dash/lib/saveQueue.ts` · แนวคิวยกจาก `ME-DRP-fresh/components/hooks/useRecords.ts` (`PENDING_KEY`)

---

## ④ `components/shell/PendingBar.tsx` — แถบรายการรอส่ง

```tsx
"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { flushPending, pendingSnapshot, pendingServerSnapshot, subscribePending } from "@/lib/saveQueue";

export default function PendingBar() {
  /* อ่านคิวด้วยตัวอ่านของ React เอง — คิวเปลี่ยนจากที่ไหนก็ตาม แถบนี้รู้เองทันที */
  const items = useSyncExternalStore(subscribePending, pendingSnapshot, pendingServerSnapshot);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const send = useCallback(async () => {
    if (busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await flushPending();
      if (r.sent > 0) setMsg(`ส่งเข้าระบบแล้ว ${r.sent} เคส`);
      if (r.dropped > 0) setMsg(`${r.dropped} เคสส่งไม่สำเร็จ เนื่องจากข้อมูลไม่ผ่านการตรวจสอบ ต้องกรอกใหม่`);
    } finally { setBusy(false); }
  }, [busy]);

  useEffect(() => {
    const onOnline = () => { void send(); };
    const onVisible = () => { if (document.visibilityState === "visible") void send(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    /* เปิดเว็บมาแล้วมีของค้าง ลองส่งให้เลย
       🔑 รอให้วาดจอรอบแรกจบก่อน ไม่งั้นกลายเป็นตั้งค่าระหว่างวาด */
    const first = setTimeout(() => { void send(); }, 0);
    return () => {
      clearTimeout(first);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0 && !msg) return null;
  const done = items.length === 0;

  return (
    <div role="status" aria-live="polite" style={{
      display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap",
      padding: "9px 18px",
      background: done ? "#eaf5f0" : "#fdf1e3",
      borderBottom: `1px solid ${done ? "#bfdccd" : "#f0d6ae"}`,
      color: done ? "#1d5c43" : "#8a5a12",
    }}>
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>
        {done ? msg : `รอส่ง ${items.length} เคส — ยังไม่เข้าระบบ`}
      </span>

      {!done && (
        <>
          <span style={{ fontSize: 12 }}>{items.map((x) => x.label).join(" · ")}</span>
          <span style={{ fontSize: 11.5 }}>
            บันทึกไว้ในเครื่องนี้แล้ว ปิดหน้าต่างได้ · ระบบจะส่งให้อัตโนมัติเมื่อเชื่อมต่อได้
          </span>
          <button type="button" onClick={() => void send()} disabled={busy}
                  style={{ marginInlineStart: "auto" }}>
            {busy ? "กำลังส่ง" : "ส่งทันที"}
          </button>
        </>
      )}
    </div>
  );
}
```

🔑 วางไว้ใน `AppShell` ใต้แถบเมนูบน — **ต้องเห็นทุกหน้า** ไม่ใช่เฉพาะหน้าที่กรอก

> ที่มา — `warfarin-dash/components/shell/PendingBar.tsx` · จังหวะส่งซ้ำตอนกลับมาที่หน้าต่าง ยกจาก `ME-DRP-fresh/components/hooks/useRealtime.ts`

---

## ⑤ ในหน้าที่มีปุ่มบันทึก — ต่อสามตัวเข้าด้วยกัน

```tsx
const [banner, setBanner] = useState<SaveBannerState>({ kind: "idle" });
const [saving, setSaving] = useState(false);

const save = useCallback(async () => {
  if (saving) return;
  setSaving(true);
  try {
    /* 🔴 ประกอบก้อนข้อมูลเป็นตัวแปรเดียว แล้วใช้ซ้ำตอนเข้าคิว
          ถ้าประกอบสองที่ จะมีวันหนึ่งที่สองที่นั้นไม่ตรงกัน แล้วของที่ค้างจะขาดช่อง */
    const payload = { /* ...ทุกช่องที่กรอก... */ };

    const res = await askServer<{ created: boolean; patientName: string }>(
      "/api/visit", payload, { retry: 3 }
    );

    if (!res.ok) {
      if (res.why === "timeout" || res.why === "offline") {
        /* ยังไม่รู้ว่าถึงเซิร์ฟเวอร์ไหม → เก็บเข้าคิวในเครื่อง */
        queueSave({
          id: pendingId("/api/visit", hn, clinicDate),
          path: "/api/visit",
          body: payload,
          label: `${pxName} · ${labelThaiDate(clinicDate)}`,
        });
        setBanner({
          kind: "error",
          title: "เชื่อมต่อระบบไม่สำเร็จ — บันทึกเคสนี้ไว้ในเครื่องแล้ว",
          detail: "ข้อมูลยังไม่เข้าระบบ · ปิดหน้าต่างได้ ระบบจะส่งให้อัตโนมัติเมื่อเชื่อมต่อได้ · ดูแถบรายการรอส่งด้านบน",
        });
      } else {
        /* เซิร์ฟเวอร์ตอบแล้วว่าไม่ผ่าน → ห้ามเข้าคิว บอกเหตุผลที่แก้ได้ */
        setBanner({
          kind: "error",
          title: "บันทึกไม่สำเร็จ — ข้อมูลยังไม่เข้าระบบ",
          detail: res.error ?? FAIL_TEXT[res.why],
        });
      }
      return;
    }

    /* 🔴 เขียนฐานแล้ว = ตัวเลขทุกหน้าเปลี่ยน ต้องล้างของที่จำไว้ทั้งแท็บ */
    forgetAll();
    setBanner({
      kind: "ok",
      title: `${res.data.created ? "บันทึกเคสใหม่แล้ว" : "ทับเคสเดิมของวันนี้แล้ว"} · ${res.data.patientName}`,
    });
  } finally {
    setSaving(false);
  }
}, [/* 🔴🔴 ต้องใส่ "ทุกช่องที่กรอก" ให้ครบ — ขาดตัวเดียว = ช่องนั้นไม่เคยถูกส่ง */]);
```

```tsx
{/* ปุ่ม 4 สถานะ */}
<button className="btn" onClick={save} disabled={saving || demoLocked || !ครบ}>
  {saving ? "กำลังบันทึก…" : "บันทึกเคสลงฐาน"}
</button>
{demoLocked && <span className="hint">{DEMO_WHY}</span>}
{!ครบ && <span className="hint">ยังไม่ได้เลือกวันที่มา — ต้องเลือกก่อนถึงจะบันทึกได้</span>}

{/* ปุ่มยกเลิกข้าง ๆ ต้องล็อกด้วย ไม่งั้นกดยกเลิกแล้วคำขอยังวิ่งอยู่ */}
<button className="btn btn-ghost" onClick={reset} disabled={saving}>ล้างฟอร์ม</button>

<SaveBanner state={banner} onClose={() => setBanner({ kind: "idle" })} />
```

### 🔴🔴 ตัวตรวจที่ต้องเปิดคู่กันเสมอ

```js
// eslint.config.mjs
{ rules: { "react-hooks/exhaustive-deps": "error" } }
```

**บั๊กที่กฎข้อนี้จับได้** — เว็บ warfarin กดบันทึกแล้วขึ้นว่าสำเร็จทุกครั้ง
แต่ผลแลป บันทึกแพทย์ วันนัด และการเปลี่ยนยา ไม่เคยถูกส่งไปฐานเลย
เพราะรายการเฝ้าดูของ `save` ขาดไป 6 ตัว ฟังก์ชันจึงส่งของชุดเก่าทุกครั้ง

---

## ⑥ `scripts/test-save-roundtrip.mts` — ส่งจริงแล้วอ่านกลับ

```
โครงของสคริปต์ (รันด้วย node ตรง ๆ ยิงผ่าน API ตัวจริง)

1. ลงทะเบียนคนทดสอบ HN ขึ้นต้น 999
2. ประกอบข้อมูลที่กรอก "ครบทุกช่อง" — รวมช่องที่เพิ่งเพิ่มใหม่ด้วย
3. POST ไปเส้นทางบันทึกจริง
4. อ่านกลับจากฐานโดยตรง (service role) แล้วเทียบ **ทีละช่อง**
     - ช่องข้อความเทียบกับ .trim() เพราะฝั่งเซิร์ฟเวอร์ตัดช่องว่างให้
     - ช่องตัวเลขเทียบเป็นตัวเลข ไม่ใช่ข้อความ
     - ตารางลูก (ผลแลป · รายการที่สั่ง · การเปลี่ยนยา) นับจำนวนแถวและเทียบค่า
5. POST ซ้ำด้วยของชุดเดิม แล้วอ่านกลับอีกรอบ — ผลต้องเท่าเดิมเป๊ะ
     (ไม่เพิ่มแถวซ้ำ · ไม่มีแถวไหนหาย · ตารางลูกไม่ซ้อน)
6. ลบคนทดสอบทิ้ง
7. พิมพ์สรุปว่าผ่านกี่ข้อ ไม่ผ่านข้อไหน — ไม่ผ่านแม้ข้อเดียวให้จบด้วยรหัสไม่สำเร็จ
```

🔴 **เทียบทีละช่อง ไม่ใช่เช็คว่าตอบ 200** — บั๊กที่เจอจริงคือตอบ 200 แต่ของไม่ครบ
🔴 **ต้องมีข้อ 5 เสมอ** เพราะเว็บที่ลองส่งซ้ำได้ ต้องพิสูจน์ว่าส่งซ้ำแล้วไม่พัง
🔑 เว็บ HCV มี 3 ตัว — ตัวแปลงข้อมูลก่อนส่ง · ยิงบันทึกจริง · กดส่งซ้ำ

### 🚨 สคริปต์นี้แทนการกดปุ่มจริงไม่ได้

มันยิงผ่าน API ตรง ๆ **ข้ามหน้าจอไปทั้งหมด** บั๊กที่อยู่ในหน้าจอจึงลอดได้หมด
(บั๊กของ warfarin อยู่ในหน้าจอล้วน ๆ สคริปต์ระดับ API ผ่านทุกตัว)

---

# ป๊อปแต่ละแบบของเว็บพี่น้อง — เลือกใช้ให้ตรงกับงาน

## แบบ ก · ป๊อปกลางจอ + แถบมุมขวา (เว็บ HCV)

```tsx
/** แถบแจ้งเตือนมุมขวาบน หายเองใน 3 วินาที */
const toast = useCallback((text: string, type: 'success' | 'error' = 'success') => setMsg({ text, type }), []);
/** ป๊อปอัปกลางจอ ยืนยันว่าบันทึกแล้ว หายเองใน 1.1 วินาที */
const savedPopup = useCallback((text = 'บันทึกข้อมูลแล้ว') => setSaved(text), []);

{saved !== null && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20">
    <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
      <span className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </span>
      <p className="font-semibold text-slate-800">{saved}</p>
    </div>
  </div>
)}
```

| | |
|---|---|
| ✅ เหมาะกับ | งานที่กดทีละเคส แล้วอยากได้ความมั่นใจชัด ๆ ว่าบันทึกแล้ว |
| ❌ ไม่เหมาะกับ | เว็บที่กรอกติดกัน 20-29 เคส — ฉากทึบกลางจอบังของที่กำลังกรอก |
| 🔑 จุดเด่น | หายเองเร็วมาก (1.1 วิ) จึงไม่ต้องกดปิด |

> `_hcvnz/components/Toast.tsx`

## แบบ ข · ข้อความเด้งมีตัวเลขประกอบ + สั่นเครื่อง (เว็บมูลค่ายาคืน)

```js
app.toast = (text, value, ok) => {
  if (app._toastTimer) clearTimeout(app._toastTimer);
  const good = ok !== false;
  app.setState({ toast: { text: text, value: value, ok: good } });
  if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
  /* 🔴 สำเร็จหายเอง 4 วิ · ผิดพลาดไม่ตั้งเวลา ต้องกดปิดเอง */
  if (good) app._toastTimer = setTimeout(() => app.setState({ toast: null }), 4000);
};

/* 🚨 ปิดได้ด้วยการคลิกเท่านั้น ห้ามผูกกับคีย์บอร์ด
      ผู้ใช้กด Enter รัว ๆ ตอนกรอกยา ข้อความจะถูกปิดทิ้งก่อนอ่านทัน */
app.closeToast = () => app.setState({ toast: null });
```

| | |
|---|---|
| ✅ เหมาะกับ | งานที่ผลลัพธ์มี **ตัวเลขที่ต้องยืนยันด้วยตา** เช่น จำนวนเงิน จำนวนชิ้น |
| ✅ สั่นเครื่อง | ใช้เฉพาะเว็บที่ใช้บนมือถือ · ต้องห่อ try/catch เพราะเครื่องที่ไม่มีจะโยนข้อผิดพลาด |
| 🔑 กฎที่ยกมาใช้ทุกเว็บแล้ว | **สำเร็จหายเอง · ผิดพลาดไม่หายเอง** |

> `Returned-Drug-Value/components/handlers/ui.js`

## แบบ ค · ลองซ้ำ 3 รอบในการกดครั้งเดียว (เว็บ ME-DRP)

```ts
export async function pushIncident(rec, opts = {}): Promise<boolean> {
  const attempts = opts.attempts ?? 3;
  const timeoutMs = opts.timeoutMs ?? 9000;
  for (let a = 0; a < attempts; a++) {
    try {
      await ส่งหลังบ้าน("/api/incidents", "POST", rec, timeoutMs);
      return true;   // สำเร็จ หรือรหัสซ้ำ (หลังบ้านตอบสำเร็จทั้งคู่)
    } catch (e) {
      logWarn("pushIncident (ลองรอบที่ " + (a + 1) + " ไม่สำเร็จ)", e);
    }
    if (a < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (a + 1)));
  }
  return false;   // ครบทุกรอบแล้วยังไม่ขึ้นระบบ → ตกไปเข้าคิวส่งทีหลัง
}
```

🔴 **สามอย่างที่ห้ามทำหายเวลาแก้โค้ด** (คอมเมนต์ในไฟล์จริงเขียนกำกับไว้)

1. ลองซ้ำ 3 รอบในการกดครั้งเดียว — **Safari มีอาการคำขอแรกสะดุดที่ฝั่งเบราว์เซอร์**
   บันทึกฝั่งเซิร์ฟเวอร์เห็นแต่ POST 201 ไม่มีข้อผิดพลาด กดครั้งเดียวไม่ไป กดซ้ำแล้วไป
2. ตัวจับเวลาตัดคำขอค้าง 9 วินาทีต่อรอบ — เน็ตโรงพยาบาลมีอาการ "ต่ออยู่แต่ไม่ไปไหน"
3. **รหัสซ้ำ = สำเร็จ** — ส่งรอบสองเจอแถวเดิมอยู่แล้วคือเรื่องปกติ หลังบ้านตอบ `duplicate: true`

> `ME-DRP-fresh/lib/data.ts`

## แบบ ง · กล่องกลางจอที่ต้องกดตกลง (เว็บ TB)

3 สี — สำเร็จ · ผิดพลาด · แจ้งให้ทราบ · **ต้องกด "ตกลง" ทุกครั้ง**

| | |
|---|---|
| ✅ เหมาะกับ | เรื่องที่ **ห้ามพลาดสายตา** เช่น ลบถาวร · เปลี่ยนสิทธิ์ · ผลที่กู้คืนไม่ได้ |
| ❌ ไม่เหมาะกับ | การบันทึกปกติ — เพิ่มงานอีกหนึ่งคลิกต่อเคส |

## แบบ จ · ข้อความเด้งสำเร็จรูป sonner (เว็บ DM Remission)

```tsx
toast.success("บันทึกข้อมูลแล้ว");
```

| | |
|---|---|
| ✅ ข้อดี | เขียนบรรทัดเดียว มีไอคอน 5 แบบ (สำเร็จ · แจ้ง · เตือน · ผิดพลาด · กำลังโหลด) |
| ❌ ข้อเสีย | **ไม่มีสถานะกำลังบันทึกให้เอง** ต้องเขียนเพิ่มอยู่ดี · ต้องลงไลบรารีเพิ่ม |
| 🔑 | ถ้าเว็บใหม่ใช้ shadcn อยู่แล้วก็ใช้ได้ แต่กติกาหายเอง/ไม่หายเองต้องตั้งเอง |

---

# ตารางสรุป — เว็บใหม่ควรหยิบแบบไหน

| เว็บแบบไหน | ใช้ชุดนี้ |
|---|---|
| **กรอกติดกันหลายสิบเคสต่อรอบ** (warfarin · ME-DRP · ยาคืน) | แถบลอยกลางล่าง (②) + คิวรอส่ง (③④) · **ห้ามใช้กล่องที่ต้องกดปิด** |
| กดทีละเคส ไม่รีบ | ป๊อปกลางจอแบบ ก ได้ ถ้าหายเองเร็ว |
| ผลลัพธ์มีตัวเลขต้องยืนยัน | แบบ ข (ข้อความเด้งมีตัวเลขประกอบ) |
| การกระทำที่กู้คืนไม่ได้ | แบบ ง (ต้องกดตกลง) เฉพาะการกระทำนั้น ไม่ใช่ทุกการบันทึก |
| เว็บอ่านอย่างเดียว ไม่มีปุ่มส่ง | ไม่ต้องมีระบบนี้ |

🔴 **ทุกแบบต้องมีเหมือนกันหมด 3 อย่าง** — ปุ่มล็อกตอนกำลังส่ง · บอกว่าเข้าระบบหรือไม่เข้าระบบ · ชุดทดสอบส่งจริงอ่านกลับ
