// ประตูตรวจรหัสผ่าน กั้นทุกหน้าและทุกเส้นทางหลังบ้าน (ยกจาก ME-DRP)
//
// 🚨 ใช้ชื่อ middleware.ts ตามเว็บอื่นของพี่กัน (Next 16 เรียกว่าเลิกใช้แล้ว แต่ยังทำงาน)
//    ความจำ 19 พ.ค. 2569 เคยเจอ proxy.ts ของ Next 16 สร้างเว็บบน Cloudflare ไม่ผ่าน
//    แตะไฟล์นี้เมื่อไหร่ ต้องรัน npm run cf:build ให้ผ่านก่อนบอกว่าเสร็จ
//
// ด่านที่หนึ่ง · ด่านที่สองคือ lib/requireAuth.ts ที่ทุกเส้นทางหลังบ้านเรียกเอง
import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AUTH_COOKIE, authConfigured, authCookieOpts, authCookieValid, issueAuthCookie, shouldRenew } from "@/lib/auth";

/* ภาษาตามประเทศของคนเปิดเว็บ (พี่กันสั่ง 23 ต.ค. 2569 "ให้เว็บตรวจ ip หน่อย ถ้าเป็นคนไทยหน้าเว็บจะไทย แต่นอกนั้นเป็นอังกฤษ")
   Cloudflare บอกประเทศจาก IP มาให้ทุกคำขอ (หัวคำขอ cf-ipcountry หรือ request.cf.country) · จดแค่รหัสประเทศสองตัวลงคุกกี้ maze-geo ไม่เก็บ IP
   สคริปต์หัวเว็บ (app/layout.tsx LANG_BOOT) อ่านคุกกี้นี้ เฉพาะคนที่ยังไม่เคยกดปุ่มเลือกภาษาเอง · ไม่รู้ประเทศ (เครื่องทดสอบ XX) ไม่จด = อังกฤษ (พี่กันสั่ง "เอาอังกฤษเป็นตัวหลัก") */
const GEO_COOKIE = "maze-geo";
function visitorCountry(req: NextRequest): string | null {
  const ok = (c: unknown): c is string => typeof c === "string" && /^[A-Z]{2}$/.test(c) && c !== "XX";
  const h = req.headers.get("cf-ipcountry");
  if (ok(h)) return h;
  try {
    const c = getCloudflareContext().cf?.country;
    if (ok(c)) return c;
  } catch { /* เครื่องทดสอบไม่มีข้อมูลของ Cloudflare */ }
  return null;
}
function withGeo<T extends NextResponse>(req: NextRequest, res: T): T {
  const c = visitorCountry(req);
  if (c) res.cookies.set(GEO_COOKIE, c, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24, secure: req.nextUrl.protocol === "https:" });
  return res;
}

export async function middleware(req: NextRequest) {
  if (!authConfigured()) {
    return new NextResponse("ระบบยังไม่ได้ตั้งรหัสผ่าน (MAZE_PASSWORD กับ MAZE_AUTH_SECRET) ผู้ดูแลต้องตั้งค่าก่อนใช้งาน", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const path = req.nextUrl.pathname;
  if (path === "/login") return withGeo(req, NextResponse.next());
  if (path === "/api/auth") return NextResponse.next();

  const got = req.cookies.get(AUTH_COOKIE);
  if (await authCookieValid(got?.value)) {
    const res = NextResponse.next();
    if (shouldRenew(got?.value)) res.cookies.set(AUTH_COOKIE, await issueAuthCookie(), authCookieOpts());
    return path.startsWith("/api/") ? res : withGeo(req, res);
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
