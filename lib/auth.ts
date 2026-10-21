// ═══════════════════════════════════════════════════════════════════════════
//  ประตูรหัสผ่านของเกมเขาวงกต (ยกกลไกจาก ME-DRP lib/auth.ts ทั้งชุด)
// ═══════════════════════════════════════════════════════════════════════════
//
// ทำไมเกมต้องมีประตู — หลังบ้านของเกมถือกุญแจฐาน tb-calculator ซึ่งมีข้อมูลผู้ป่วยของเว็บงานอยู่ด้วย
// ประตูกันไม่ให้คนนอกยิงเส้นทางบันทึกเกมเล่น และเป็นกฎของ city-lab "ต้องมีประตูรหัสผ่านก่อนขึ้นเว็บจริง"
//
// 🚨 ล็อกเสมอ ลืมตั้ง MAZE_PASSWORD หรือ MAZE_AUTH_SECRET = ตอบ 503 ทั้งเว็บ ไม่ใช่เปิดโล่งเงียบ ๆ (สกิล db-safety ข้อ ①)
// 🚨 เครื่องทดสอบก็ล็อกแบบเดียวกัน ห้ามทำทางลัดปลดล็อก (สกิล db-safety ข้อ ②)
//    รอบแรกยกมาพร้อมทางลัด "เครื่องทดสอบที่ไม่ได้ตั้งรหัส = เปิดโล่ง" ตรวจทานรอบท้าย 21 ต.ค. 2569 เจอแล้วถอดออก
//
// เปลี่ยนจาก ME-DRP จุดเดียว — ลายเซ็นบัตรผ่านผสมจาก MAZE_AUTH_SECRET กับรหัสผ่านเท่านั้น
// ไม่เอาที่อยู่ฐานข้อมูลมาผสม เพราะแก้ค่านั้นทีเดียวทุกเครื่องหลุดออกจากระบบพร้อมกัน (สกิล db-safety ข้อ ⑤)

export const AUTH_COOKIE = "maze_auth";

/** บัตรผ่านอยู่ได้กี่วัน นับจากครั้งสุดท้ายที่ใช้ (ต่ออายุเองเมื่อใช้เกินหนึ่งในสี่ของอายุ) */
export const AUTH_DAYS = 7;

export function authConfigured(): boolean {
  return !!(process.env.MAZE_PASSWORD || "").trim() && !!(process.env.MAZE_AUTH_SECRET || "").trim();
}

/** ตัวเลือกของคุกกี้อยู่ที่เดียว ใช้ทั้งตอนเข้าสู่ระบบและตอนต่ออายุ (สกิล db-safety ข้อ 24) */
export function authCookieOpts(maxAgeDays = AUTH_DAYS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeDays * 24 * 60 * 60,
  };
}

/** เทียบสองข้อความโดยใช้เวลาเท่ากันเสมอ */
export function safeEqual(a: unknown, b: unknown): boolean {
  const x = String(a ?? ""), y = String(b ?? "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** แปลงรหัสเป็นค่าที่ย้อนกลับไม่ได้ · ผสมความลับของเว็บนี้ */
export async function tokenOf(password: unknown): Promise<string> {
  return sha256Hex(String(password ?? "") + "|maze|" + (process.env.MAZE_AUTH_SECRET || ""));
}

export async function expectedToken(): Promise<string> {
  return tokenOf(process.env.MAZE_PASSWORD || "");
}

/** บัตรผ่าน = <เวลาที่ออก>.<ลายเซ็น> · แก้เวลาเองไม่ได้ ลายเซ็นไม่ตรงทันที */
export async function issueAuthCookie(): Promise<string> {
  const token = await expectedToken();
  const at = Date.now();
  return at + "." + (await sha256Hex(token + "|" + at));
}

/** ใช้มาเกินหนึ่งในสี่ของอายุแล้ว ควรออกบัตรใหม่ (เรียกหลังตรวจบัตรผ่านแล้วเท่านั้น) */
export function shouldRenew(value: unknown): boolean {
  const raw = String(value ?? ""), dot = raw.indexOf(".");
  if (dot <= 0) return false;
  const at = Number(raw.slice(0, dot));
  if (!Number.isFinite(at)) return false;
  return Date.now() - at > (AUTH_DAYS * 24 * 60 * 60 * 1000) / 4;
}

/** ตรวจบัตรผ่าน 3 ด่าน รูปแบบ ลายเซ็น อายุ */
export async function authCookieValid(value: unknown): Promise<boolean> {
  const raw = String(value ?? ""), dot = raw.indexOf(".");
  if (dot <= 0) return false;
  const atText = raw.slice(0, dot), sig = raw.slice(dot + 1);
  if (!/^\d{1,15}$/.test(atText) || !sig) return false;
  const want = await sha256Hex((await expectedToken()) + "|" + atText);
  if (!safeEqual(sig, want)) return false;
  const age = Date.now() - Number(atText);
  if (age < -60 * 1000) return false;
  if (age > AUTH_DAYS * 24 * 60 * 60 * 1000) return false;
  return true;
}
