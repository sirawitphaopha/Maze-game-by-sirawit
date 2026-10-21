// ตรวจโทเค็นสี: ใช้แต่ไม่ประกาศ · ประกาศในธีมสว่างแต่ไม่มีในธีมมืด
import fs from "fs"; import path from "path";
const ROOT = "C:/Users/PKH/maze-lab";
const css = fs.readFileSync(ROOT + "/app/globals.css", "utf8");
const mob = fs.readFileSync(ROOT + "/app/mobile.css", "utf8");
// แยกบล็อก
const lightBlock = css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)"));
const darkMedia = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf(':root[data-theme="dark"]'));
const darkAttrStart = css.indexOf(':root[data-theme="dark"]');
const darkAttr = css.slice(darkAttrStart, css.indexOf("}", darkAttrStart));
const decl = (s) => new Set([...s.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const L = decl(lightBlock), DM = decl(darkMedia), DA = decl(darkAttr);
const allDecl = decl(css + mob);
// การใช้
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) { if (!/node_modules|\.next|out|docs/.test(f)) walk(p); } else if (/\.(tsx?|css|mjs)$/.test(f)) files.push(p); } };
walk(ROOT + "/app"); walk(ROOT + "/components"); walk(ROOT + "/lib");
const used = new Map();
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  for (const m of t.matchAll(/var\((--[\w-]+)/g)) { if (!used.has(m[1])) used.set(m[1], new Set()); used.get(m[1]).add(path.basename(f)); }
  for (const m of t.matchAll(/tok\("(--[\w-]+)"\)/g)) { if (!used.has(m[1])) used.set(m[1], new Set()); used.get(m[1]).add(path.basename(f) + "(canvas)"); }
}
// ตัวแปรที่ JS ตั้งเอง หรือ next/font
const jsSet = new Set(["--bar-h", "--font-sarabun-src", "--font-mono-src", "--w"]);
console.log("== ใช้แต่ไม่ได้ประกาศที่ไหนเลย ==");
for (const [k, fs_] of used) if (!allDecl.has(k) && !jsSet.has(k)) console.log(k, [...fs_].join(","));
console.log("== ประกาศในธีมสว่าง แต่ไม่มีในธีมมืดแบบตามเครื่อง หรือแบบปุ่ม ==");
for (const k of L) if (!DM.has(k) || !DA.has(k)) console.log(k, "darkMedia:", DM.has(k), "darkAttr:", DA.has(k), "ใช้ที่:", used.has(k) ? [...used.get(k)].join(",") : "(ไม่ได้ใช้)");
console.log("== มีในมืดแบบหนึ่งแต่ไม่มีอีกแบบ ==");
for (const k of DM) if (!DA.has(k)) console.log("เฉพาะ media:", k);
for (const k of DA) if (!DM.has(k)) console.log("เฉพาะ data-theme:", k);
console.log("== ประกาศนอก :root (ตัวแปรเฉพาะที่) ==");
for (const k of allDecl) if (!L.has(k) && !DM.has(k) && !DA.has(k)) console.log(k);
