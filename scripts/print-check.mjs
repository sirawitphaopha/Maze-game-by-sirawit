// ═══════════════════════════════════════════════════════════════════════════
// ตัวตรวจใบงาน สร้างไฟล์ PDF จริงจากเว็บที่รันอยู่ เพื่อดูด้วยตา (ยกจากเว็บยาคืน scripts/print-check.mjs)
// สกิล making-documents กฎข้อที่ 1 · สร้างไฟล์ ต้องเปิดไฟล์จริงดู ห้ามดูแค่หน้าจอ
//
// วิธีใช้
//   1. เปิดเซิร์ฟเวอร์ทดสอบไว้ก่อน (npm run dev)
//   2. node scripts/print-check.mjs            ใบงานของด่านใหม่จากหน้าเล่นเกม
//      node scripts/print-check.mjs <รหัสเกม>  ใบงานของเกมในประวัติ
//   3. node scripts/pdf-look.mjs out/worksheet.pdf แล้วเปิดภาพใน out/look ดู
//
// 🚨 อ่านรหัสผ่านจาก .env.local ให้เอง ห้ามพิมพ์รหัสลงไฟล์นี้
// ═══════════════════════════════════════════════════════════════════════════
import fs from "fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.PRINT_CHECK_URL || "http://127.0.0.1:3600";
const OUT = "out";
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("หา Chrome ในเครื่องไม่เจอ");

const env = fs.readFileSync(".env.local", "utf8").split(/\r?\n/);
const pw = (env.find((l) => l.startsWith("MAZE_PASSWORD=")) || "").slice("MAZE_PASSWORD=".length).trim();
const fromId = process.argv[2] || "";

fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--font-render-hinting=none"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  const ok = await page.evaluate(async (p) => (await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: p }) })).ok, pw);
  if (!ok) throw new Error("เข้าสู่ระบบไม่สำเร็จ ตรวจ MAZE_PASSWORD ใน .env.local");
  if (fromId) {
    await page.goto(`${BASE}/print?from=${fromId}`, { waitUntil: "networkidle0" });
  } else {
    await page.goto(BASE + "/play", { waitUntil: "networkidle0" });
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("พิมพ์ใบงาน")), { timeout: 20000 });
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("พิมพ์ใบงาน"))?.click());
    await page.waitForFunction(() => location.pathname === "/print", { timeout: 20000 });
  }
  await page.waitForSelector(".printdoc .paper", { timeout: 20000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  const papers = await page.$$eval(".printdoc .paper", (els) => els.map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }));
  await page.pdf({ path: `${OUT}/worksheet.pdf`, printBackground: true, preferCSSPageSize: true });
  console.log(`สร้าง ${OUT}/worksheet.pdf แล้ว · กระดาษบนจอ ${papers.length} แผ่น ขนาด ${papers.join(" ")} จุด`);
} finally {
  await browser.close();
}
