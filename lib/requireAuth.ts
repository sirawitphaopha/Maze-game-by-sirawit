// ด่านตรวจบัตรผ่านของเส้นทางหลังบ้านแต่ละเส้น ชั้นที่สองต่อจาก middleware (ยกจาก ME-DRP)
// ทำไมต้องมีทั้งที่ middleware กั้นแล้ว — บน Cloudflare มีทางที่คำขอไม่ผ่าน middleware ได้
// และ Next.js เคยมีช่องโหว่ข้าม middleware มาแล้ว (CVE-2025-29927) จึงล็อกทุกห้อง ไม่พึ่งยามคนเดียว
//
// ใส่เป็นบรรทัดแรกของทุก handler ใน app/api/ ยกเว้น /api/auth
//   const กัน = await requireAuth(req); if (กัน) return กัน;

import { NextResponse } from "next/server";
import { AUTH_COOKIE, authConfigured, authCookieValid } from "./auth";

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export async function requireAuth(req: Request): Promise<NextResponse | null> {
  if (!authConfigured()) {
    return NextResponse.json({ error: "ระบบยังไม่ได้ตั้งรหัสผ่าน ผู้ดูแลต้องตั้งค่าก่อนใช้งาน" }, { status: 503 });
  }
  if (await authCookieValid(readCookie(req, AUTH_COOKIE))) return null;
  return NextResponse.json({ error: "กรุณาเข้าสู่ระบบใหม่", needAuth: true }, { status: 401 });
}
