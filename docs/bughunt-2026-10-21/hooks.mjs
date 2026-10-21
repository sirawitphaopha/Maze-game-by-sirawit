// ตัวช่วย import ไฟล์ของโปรเจกต์ที่ไม่ได้ลงท้าย .ts และใช้ @/ (เฉพาะสคริปต์ตรวจ ไม่แตะโปรเจกต์)
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = "C:/Users/PKH/maze-lab/";
const STUBS = {
  "react": "export const useSyncExternalStore = (s, g) => g(); export const useState = (v) => [v, () => {}]; export default {};",
  "server-only": "export {};",
  "@supabase/supabase-js": "export function createClient() { throw new Error('ห้ามต่อฐานในสคริปต์ตรวจ'); }",
  "next/server": "export class NextResponse { constructor(b, i) { this.body = b; this.status = i?.status ?? 200; } static json(b, i) { const r = new NextResponse(JSON.stringify(b), i); r.json = async () => b; return r; } static next() { return new NextResponse(null, {}); } }",
};

registerHooks({
  resolve(spec, ctx, next) {
    if (STUBS[spec] !== undefined) return { url: "stub:" + spec, shortCircuit: true };
    let s = spec;
    if (s.startsWith("@/")) s = pathToFileURL(ROOT + s.slice(2)).href;
    else if ((s.startsWith("./") || s.startsWith("../")) && ctx.parentURL?.startsWith("file:") && !ctx.parentURL.includes("node_modules")) s = new URL(s, ctx.parentURL).href;
    if (s.startsWith("file:")) {
      const p = fileURLToPath(s);
      if (!existsSync(p) && existsSync(p + ".ts")) return { url: s + ".ts", shortCircuit: true, format: "module-typescript" };
      if (!existsSync(p) && existsSync(p + ".tsx")) return { url: s + ".tsx", shortCircuit: true };
      return next(s, ctx);
    }
    return next(spec, ctx);
  },
  load(url, ctx, next) {
    if (url.startsWith("stub:")) return { format: "module", source: STUBS[url.slice(5)], shortCircuit: true };
    return next(url, ctx);
  },
});
