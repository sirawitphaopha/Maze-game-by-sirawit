// ตัวช่วยให้ Node รันไฟล์ .ts ของโปรเจกต์ตรง ๆ ได้ (ใช้คู่กับ tsext.mjs)
// node --import ./docs/bughunt-2026-10-21/tsext.mjs <สคริปต์>
// · import แบบไม่ใส่นามสกุล "./net" เติม .ts · "next/server" เติม .js
// · "@/lib/..." ชี้ไปโฟลเดอร์โปรเจกต์ · "server-only" แทนด้วยไฟล์ว่าง (รันนอก Next ไม่มีเงื่อนไข react-server)
const ROOT = new URL("../../", import.meta.url);
export async function resolve(spec, ctx, next) {
  if (spec === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  if (spec.startsWith("@/")) spec = new URL(spec.slice(2), ROOT).href;
  try { return await next(spec, ctx); }
  catch (e) {
    if (e.code !== "ERR_MODULE_NOT_FOUND") throw e;
    if ((spec.startsWith(".") || spec.startsWith("file:")) && !spec.endsWith(".ts")) return next(spec + ".ts", ctx);
    if (!spec.endsWith(".js")) return next(spec + ".js", ctx);
    throw e;
  }
}
