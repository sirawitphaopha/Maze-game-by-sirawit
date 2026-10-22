// ถอดหน้าเล่นเกมมือถือ (ก่อนกดเริ่ม) จากเซิร์ฟเวอร์ทดสอบ เป็น HTML ล้วน + CSS ทั้งชุด + ไอคอน ลง out/tap-test/
// รันจากโฟลเดอร์โปรเจกต์ ต้องเปิด npm run dev ไว้ · รหัสทดสอบส่งทาง MAZE_TEST_PW (ห้ามเขียนรหัสลงไฟล์)
// ดักทุกคำขอที่ไม่ใช่การอ่าน ไม่มีอะไรถึงฐาน
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(process.cwd() + "/package.json");
const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE || "http://127.0.0.1:3600", OUT = "out/tap-test", PW = process.env.MAZE_TEST_PW || "";
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
await page.setRequestInterception(true);
page.on("request", (r) => { if (r.method() !== "GET" && !r.url().endsWith("/api/auth")) return r.respond({ status: 503, body: "x" }); r.continue(); });
if (PW) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(async (pw) => { await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) }); }, PW);
}
await page.goto(BASE + "/play", { waitUntil: "networkidle0" });
await page.waitForSelector(".startcover .btn");
await page.evaluate(() => document.fonts.ready);
const got = await page.evaluate(async () => {
  const b = document.body.cloneNode(true);
  b.querySelectorAll("script, nextjs-portal, next-route-announcer, template").forEach((e) => e.remove());
  b.querySelectorAll("canvas").forEach((c) => { c.removeAttribute("width"); c.removeAttribute("height"); });
  const css = [];
  for (const l of document.querySelectorAll("link[rel=stylesheet]")) css.push(await (await fetch(l.href)).text());
  const icon = await (await fetch("/icon.svg")).text();
  return { html: b.innerHTML, css: css.join("\n"), icon };
});
fs.writeFileSync(OUT + "/body.html", got.html);
fs.writeFileSync(OUT + "/app.css", got.css);
fs.writeFileSync(OUT + "/icon.svg", got.icon);
console.log("หน้า", got.html.length, "ตัวอักษร · CSS", got.css.length, "ตัวอักษร →", OUT);
await browser.close();
