/**
 * ตัวยิงคำขอกลางของทั้งเว็บ ทุกหน้าที่คุยกับเซิร์ฟเวอร์ต้องผ่านตัวนี้ (ยกจาก city-lab ที่ยกจาก warfarin · ตัดสองภาษาออก)
 *
 * 🔴 มีตัวจับเวลาตัด เน็ตที่ต่ออยู่แต่ไม่ไปไหนทำให้ fetch เปล่า ๆ ค้างเป็นนาที
 * 🔴 ห้ามคืนค่าว่างเมื่อล้มเหลว "ดึงไม่ได้" กับ "ไม่มีข้อมูล" คนละเรื่อง
 * 🔴 ลองซ้ำเฉพาะตอนยังไม่รู้ว่าคำขอถึงเซิร์ฟเวอร์หรือยัง (timeout · offline)
 *    เซิร์ฟเวอร์ตอบแล้วว่าไม่ผ่าน ยิงซ้ำก็ได้คำตอบเดิม
 */

export type Fail = "timeout" | "offline" | "nodb" | "auth" | "server";

export type Ask<T> = { ok: true; data: T } | { ok: false; why: Fail; status?: number; error?: string };

const WAIT_MS = 15000;

/** ข้อความบนจอเป็นภาษาทางการ (สกิล save-status ข้อ 3) */
export function failText(f: Fail): string {
  switch (f) {
    case "timeout": return "เซิร์ฟเวอร์ไม่ตอบกลับภายในเวลาที่รอ อาจเชื่อมต่อช้าหรือเซิร์ฟเวอร์กำลังทำงานหนัก";
    case "offline": return "เชื่อมต่อระบบไม่สำเร็จ ตรวจว่าเครื่องนี้ยังเชื่อมต่ออินเทอร์เน็ตอยู่หรือไม่";
    case "nodb": return "ยังไม่ได้ตั้งค่าเชื่อมฐานข้อมูล";
    case "auth": return "ต้องเข้าสู่ระบบใหม่";
    default: return "เซิร์ฟเวอร์รับคำขอแล้วแต่ตอบกลับว่าทำไม่สำเร็จ";
  }
}

export async function askServer<T>(path: string, body?: unknown, opts: { waitMs?: number; retry?: number; method?: "DELETE" } = {}): Promise<Ask<T>> {
  const rounds = Math.max(1, opts.retry ?? 1);
  let last: Ask<T> = { ok: false, why: "offline" };
  for (let i = 0; i < rounds; i++) {
    last = await askOnce<T>(path, body, opts.waitMs ?? WAIT_MS, opts.method);
    if (last.ok || (last.why !== "timeout" && last.why !== "offline")) return last;
    if (i < rounds - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return last;
}

async function askOnce<T>(path: string, body: unknown, waitMs: number, method?: "DELETE"): Promise<Ask<T>> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), waitMs);
  try {
    const r = await fetch(path, {
      method: method ?? (body === undefined ? "GET" : "POST"),
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
      } catch { /* เซิร์ฟเวอร์ตอบเป็นหน้าเว็บ ไม่ใช่ JSON */ }
      const why: Fail = r.status === 401 ? "auth" : r.status === 503 ? "nodb" : "server";
      return { ok: false, why, status: r.status, error };
    }
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
