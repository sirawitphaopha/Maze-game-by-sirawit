// ประตูตรวจรหัสผ่าน กั้นทุกหน้าและทุกเส้นทางหลังบ้าน (ยกจาก ME-DRP)
//
// 🚨 ใช้ชื่อ middleware.ts ตามเว็บอื่นของพี่กัน (Next 16 เรียกว่าเลิกใช้แล้ว แต่ยังทำงาน)
//    ความจำ 19 พ.ค. 2569 เคยเจอ proxy.ts ของ Next 16 สร้างเว็บบน Cloudflare ไม่ผ่าน
//    แตะไฟล์นี้เมื่อไหร่ ต้องรัน npm run cf:build ให้ผ่านก่อนบอกว่าเสร็จ
//
// ด่านที่หนึ่ง · ด่านที่สองคือ lib/requireAuth.ts ที่ทุกเส้นทางหลังบ้านเรียกเอง
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authConfigured, authCookieOpts, authCookieValid, issueAuthCookie, shouldRenew } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  if (!authConfigured()) {
    return new NextResponse("ระบบยังไม่ได้ตั้งรหัสผ่าน (MAZE_PASSWORD กับ MAZE_AUTH_SECRET) ผู้ดูแลต้องตั้งค่าก่อนใช้งาน", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const path = req.nextUrl.pathname;
  if (path === "/login" || path === "/api/auth") return NextResponse.next();

  const got = req.cookies.get(AUTH_COOKIE);
  if (await authCookieValid(got?.value)) {
    const res = NextResponse.next();
    if (shouldRenew(got?.value)) res.cookies.set(AUTH_COOKIE, await issueAuthCookie(), authCookieOpts());
    return res;
  }

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ", needAuth: true }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // ยกเว้นไฟล์นิ่งของ Next เอง ไม่งั้นหน้าเข้าสู่ระบบโหลดสไตล์กับฟอนต์ไม่ได้
  // 🚨 ไม่ยกเว้นเส้นทางที่ลงท้ายด้วยนามสกุลไฟล์ใด ๆ (สกิล db-safety ข้อ ④) /api/x.png ต้องโดนกั้น
  // icon.svg ไอคอนเว็บ (หน้าเข้าสู่ระบบใช้ด้วย) · apple-icon.png ไอคอนหน้าจอโฮม iPhone ระบุชื่อไฟล์ตรง ๆ ทีละไฟล์ · icon-192.png icon-512.png icon-maskable-512.png manifest.webmanifest ไอคอนกับไฟล์ประกาศตัวตนของแอปบนหน้าจอโฮม เบราว์เซอร์โหลดเองโดยไม่แนบบัตรผ่าน (สกิล mobile-web-app) ไม่มีข้อมูลลับ
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icon-192.png|icon-512.png|icon-maskable-512.png|manifest.webmanifest).*)"],
};
