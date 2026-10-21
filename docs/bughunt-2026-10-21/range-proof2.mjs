// ลากแถบเลื่อน (input type=range) ด้วยเมาส์ แล้วปล่อยนอกตัวแถบ · pointerup ไปถึงตัวแถบไหม (CommitRange ยืนยันค่าด้วย onPointerUp)
// และลากด้วยนิ้วแบบเฉียงบนจอที่ตั้ง touch-action: pan-y (แบบ app/mobile.css) ได้ pointerup หรือ pointercancel
import fs from "fs";
import { createRequire } from "module";
const ROOT = "C:/Users/PKH/maze-lab";
const require = createRequire(ROOT + "/package.json");
const puppeteer = (await import("file:///" + require.resolve("puppeteer-core").split("\\").join("/"))).default;
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));
const tmp = fs.mkdtempSync("C:/Users/PKH/AppData/Local/Temp/claude/C--Users-PKH/22926fa3-2a42-4285-bd0e-908e37bc081a/scratchpad/bughunt/chrome-");
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;height:2000px} input{display:block;width:300px;margin:100px 40px} html,body,body *{touch-action:pan-y!important}</style></head><body>
<input id="r" type="range" min="0" max="4" step="1" value="2">
<script>
window.log=[];const r=document.getElementById('r');
for (const t of ['pointerdown','pointerup','pointercancel','change','lostpointercapture']) r.addEventListener(t,e=>log.push(t+':'+r.value));
document.addEventListener('pointerup',e=>log.push('doc-pointerup target='+e.target.tagName));
</script></body></html>`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", userDataDir: tmp, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 700 });
  await page.setContent(html, { waitUntil: "load" });
  const box = await (await page.$("#r")).boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  // เมาส์ กดที่ปุ่มแถบ (กลาง ค่า 2) ลากไปขวาพร้อมลงล่างพ้นตัวแถบ แล้วปล่อยนอกตัวแถบ
  await page.mouse.move(cx, cy); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(cx + i * 12, cy + i * 25);
  await page.mouse.up();
  console.log("เมาส์ ปล่อยนอกแถบ:", JSON.stringify(await page.evaluate(() => { const l = log.slice(); log.length = 0; return l; })));
  // นิ้ว (จำลองจอสัมผัส) ลากเฉียง ขวาน้อย ลงเยอะ
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await page.evaluate(() => { document.getElementById("r").value = 2; });
  const tp = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await tp("touchStart", cx, cy);
  for (let i = 1; i <= 12; i++) { await tp("touchMove", cx + Math.min(i, 6) * 12, cy + Math.max(0, i - 6) * 30); await new Promise((r) => setTimeout(r, 16)); }
  await tp("touchEnd", 0, 0);
  await new Promise((r) => setTimeout(r, 200));
  console.log("นิ้ว ลากเฉียง:", JSON.stringify(await page.evaluate(() => log.slice())));
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
