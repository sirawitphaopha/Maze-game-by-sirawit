// กรอกรหัส ตรวจ ออกบัตรผ่าน (ยกจาก ME-DRP app/api/auth/route.ts)
import { NextResponse } from "next/server";
import { AUTH_COOKIE, authConfigured, authCookieOpts, expectedToken, issueAuthCookie, safeEqual, tokenOf } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!authConfigured()) {
    return NextResponse.json({ error: "ระบบยังไม่ได้ตั้งรหัสผ่าน ผู้ดูแลต้องตั้งค่าก่อน" }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const pw = typeof body.password === "string" ? body.password : "";
  // 🚨 ปฏิเสธรหัสว่างที่ตัวรับรหัสด้วย (สกิล db-safety ข้อ ③)
  if (!pw.trim()) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "กรุณากรอกรหัสผ่าน" }, { status: 401 });
  }
  if (!safeEqual(await tokenOf(pw), await expectedToken())) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await issueAuthCookie(), authCookieOpts());
  return res;
}

/** ออกจากระบบ ลบบัตรผ่าน */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", authCookieOpts(0));
  return res;
}
