// พิสูจน์พฤติกรรมของ components/ui/Translator.tsx ในโครมแบบไม่มีหน้าต่าง (โปรไฟล์ชั่วคราว ไม่ใช่โครมของผู้ใช้)
// ใช้โค้ดจริงของ Translator.tsx lib/lang.ts lib/i18n-en.ts (แปลง TS เป็น JS ด้วย typescript แล้วตัด import export)
// จำลอง React ด้วยการเปลี่ยน nodeValue ของโหนดเดิม (ตรงกับ setTextContent ของ react-dom)
import fs from "fs";
import { createRequire } from "module";
const ROOT = "C:/Users/PKH/maze-lab";
const require = createRequire(ROOT + "/package.json");
const ts = require("typescript");
const puppeteer = (await import("file:///" + require.resolve("puppeteer-core").split("\\").join("/"))).default;

const tr = (f) => ts.transpileModule(fs.readFileSync(ROOT + "/" + f, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve } }).outputText;
const strip = (js) => js.replace(/^import .*$/gm, "").replace(/^export default /gm, "").replace(/^export /gm, "");
const code = [
  "const useSyncExternalStore = () => 'th'; const useEffect = (fn) => { fn(); };",
  "const I18N = (() => {", strip(tr("lib/i18n-en.ts")), "return { EN, EN_RX }; })();",
  "const LANG = (() => { const { EN, EN_RX } = I18N;", strip(tr("lib/lang.ts")), "return { setLang, getLang, subscribeLang, toEn }; })();",
  "const TR = (() => { const { setLang, getLang, subscribeLang, toEn } = LANG;", strip(tr("components/ui/Translator.tsx")), "return Translator; })();",
  "window.__setLang = LANG.setLang; window.__startTr = () => TR();",
].join("\n");

const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ห้องทดลองเขาวงกต</title></head><body>
<div class="hud"><b id="best">ไม่มี</b></div>
<table><tr><td id="opt">8 ช่อง ทางวนไม่มี ไฟฉาย</td><td id="opt2">8 ช่อง ทางวนไม่มี</td></tr></table>
<select id="sel"><optgroup id="og" label="ขุดทางยาว"><option>DFS</option></optgroup></select>
<div id="skel" aria-label="กำลังเปิดด่าน"></div>
<div id="pend">กลาง Wilson 87 คะแนน 1:23.4</div>
<script>${code}</script></body></html>`;

const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find((p) => fs.existsSync(p));
const tmp = fs.mkdtempSync("C:/Users/PKH/AppData/Local/Temp/claude/C--Users-PKH/22926fa3-2a42-4285-bd0e-908e37bc081a/scratchpad/bughunt/chrome-");
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", userDataDir: tmp, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("หน้าเว็บพัง", e.message));
  await page.setContent(html, { waitUntil: "load" });
  const r = await page.evaluate(async () => {
    const tick = () => new Promise((res) => setTimeout(res, 30));
    const $ = (id) => document.getElementById(id);
    const log = [];
    window.__startTr();
    window.__setLang("en"); await tick();
    log.push(["1 หลังกด EN", $("best").textContent, $("opt").textContent, $("opt2").textContent, "optgroup=" + $("og").getAttribute("label"), "aria=" + $("skel").getAttribute("aria-label"), "pend=" + $("pend").textContent, "title=" + document.title]);
    // React เปลี่ยนค่าในโหนดเดิม (ชนะเกมแรก เวลาดีสุดจาก ไม่มี เป็นตัวเลข)
    $("best").firstChild.nodeValue = "0:45.3"; await tick();
    log.push(["2 React เปลี่ยนเป็นเวลา", $("best").textContent]);
    window.__setLang("th"); await tick();
    log.push(["3 หลังกด TH", $("best").textContent, $("opt").textContent, $("opt2").textContent, "title=" + document.title]);
    // วนไม่จบไหม นับการเปลี่ยนต่อการแก้หนึ่งครั้ง
    window.__setLang("en"); await tick();
    let n = 0; const mo = new MutationObserver((rs) => { n += rs.length; }); mo.observe(document.body, { subtree: true, characterData: true, childList: true, attributes: true });
    for (let i = 0; i < 50; i++) { $("opt2").firstChild.nodeValue = i % 2 ? "8 ช่อง ทางวนไม่มี" : "18 ช่อง ทางวนมาก ไฟฉาย"; await new Promise((res) => setTimeout(res, 0)); }
    await tick(); mo.disconnect();
    log.push(["4 แก้ 50 ครั้ง นับการเปลี่ยนทั้งหมด", n, $("opt2").textContent]);
    return log;
  });
  for (const row of r) console.log(row.map((x) => (typeof x === "string" ? JSON.stringify(x) : x)).join("  "));
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
