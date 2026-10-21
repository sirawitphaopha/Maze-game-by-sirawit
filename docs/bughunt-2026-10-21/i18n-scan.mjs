// เทียบข้อความไทยในโค้ดกับพจนานุกรม lib/i18n-en.ts โดยจำลอง toEn ของ lib/lang.ts ตรงตัว
import fs from "fs"; import path from "path"; import { createRequire } from "module";
const ROOT = "C:/Users/PKH/maze-lab";
const require = createRequire(ROOT + "/package.json");
const ts = require("typescript");
const { EN, EN_RX } = await import("file:///" + ROOT + "/lib/i18n-en.ts");
const THAI = /[\u0E00-\u0E7F]/;
function toEn(s) {
  if (!THAI.test(s)) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const lead = m ? m[1] : "", core = (m ? m[2] : s).replace(/\s+/g, " "), tail = m ? m[3] : "";
  const hit = EN[core];
  if (hit !== undefined) return lead + hit + tail;
  for (const [rx, out] of EN_RX) { const r = core.match(rx); if (r) return lead + (typeof out === "function" ? out(r) : core.replace(rx, out)) + tail; }
  return null; // ไม่เจอ
}
globalThis.__toEn = toEn;
const dirs = (process.argv[2] || "components,app").split(",");
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (/\.(tsx|ts)$/.test(f) && !/i18n-en\.ts$/.test(f)) files.push(p); } };
for (const d of dirs) walk(path.join(ROOT, d));
const sample = (expr) => {
  const t = expr.getText();
  if (ts.isConditionalExpression(expr)) {
    const w = expr.whenTrue; if (ts.isStringLiteral(w) || ts.isNoSubstitutionTemplateLiteral(w)) return w.text; if (ts.isTemplateExpression(w)) return tplText(w);
    return "12";
  }
  if (/when\(|whenN\(|played_at/.test(t)) return "21 ต.ค. 2569 19:23";
  if (/dur\(/.test(t)) return "32.4 วินาที";
  if (/fmt\(/.test(t)) return "1:23.4";
  if (/algoName|\.name\b|name\)/.test(t)) return "Wilson";
  if (/LEVEL_NAME/.test(t)) return "กลาง";
  if (/reason|error|why|msg/i.test(t)) return "";
  return "12";
};
const tplText = (node) => { let s = node.head.text; for (const sp of node.templateSpans) s += sample(sp.expression) + sp.literal.text; return s; };
const out = [];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(ROOT, f).split(path.sep).join("/");
  const report = (node, text, kind) => {
    if (!THAI.test(text)) return;
    const r = toEn(text);
    if (r === null) out.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind, text: text.replace(/\s+/g, " ").trim(), parent: ts.SyntaxKind[node.parent.kind] });
    else if (THAI.test(r)) out.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind: kind + "+ยังมีไทยหลังแปล", text: text.replace(/\s+/g, " ").trim() + "  =>  " + r, parent: ts.SyntaxKind[node.parent.kind] });
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      // React ตัดช่องว่างบรรทัดใหม่ของ JSX
      const lines = node.text.split(/\r?\n/).map((l, i, a) => (i === 0 ? l.replace(/\s+$/, "") : i === a.length - 1 ? l.replace(/^\s+/, "") : l.trim())).filter(Boolean);
      const t = lines.join(" ");
      if (t.trim()) report(node, t, "jsx");
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // ข้ามกุญแจวัตถุ import และค่าที่เป็นชื่อคีย์
      if (ts.isImportDeclaration(node.parent) || (ts.isPropertyAssignment(node.parent) && node.parent.name === node)) { }
      else report(node, node.text, "str");
    } else if (ts.isTemplateExpression(node)) {
      report(node, tplText(node), "tpl");
    }
    ts.forEachChild(node, visit);
  };
  // ข้ามคอมเมนต์อัตโนมัติเพราะ ts ไม่นับคอมเมนต์เป็นโหนด
  visit(sf);
}
for (const o of out) console.log(`${o.file}:${o.line} [${o.kind}/${o.parent}] ${o.text}`);
console.log("รวม", out.length);
