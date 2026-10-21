// พิสูจน์: คิวรอส่งทิ้งเกมถาวรเมื่อเซิร์ฟเวอร์ตอบ 500 (ฐานสะดุดชั่วคราว) 502/504 หรือตอบ 200 เป็นหน้าเว็บ (หน้าล็อกอินของ Wi-Fi)
// จำลอง localStorage window fetch เอง ไม่ยิงเซิร์ฟเวอร์จริง
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};
(globalThis as any).window = globalThis;
(globalThis as any).CustomEvent = class { type: string; constructor(t: string) { this.type = t; } };
(globalThis as any).dispatchEvent = () => true;

const G = await import("file:///C:/Users/PKH/maze-lab/lib/games.ts");

type Resp = { status: number; body: string; ctype: string };
let next: Resp = { status: 200, body: "{}", ctype: "application/json" };
(globalThis as any).fetch = async () => new Response(next.body, { status: next.status, headers: { "content-type": next.ctype } });

const rec = (k: string) => ({
  saveKey: k, playedAt: new Date().toISOString(), appVersion: "1.0.0", level: "easy", algo: "wilson",
  minLen: 4, loops: 0, fog: false, size: 10, exitX: 5, walls: "x", moves: "D0", timeMs: 1000, replayOf: null, label: "เกม " + k,
});

async function scenario(name: string, first: Resp, second: Resp) {
  store.clear();
  // ① ชนะตอนเน็ตหลุด → เข้าคิว
  (globalThis as any).fetch = async () => { throw new TypeError("Failed to fetch"); };
  const up = await G.uploadGame(rec("11111111-1111-4111-8111-111111111111") as any);
  const inQ1 = G.pendingSnapshot().length;
  // ② แถบรอส่งลองส่ง เซิร์ฟเวอร์ตอบแบบ first
  next = first;
  (globalThis as any).fetch = async () => new Response(next.body, { status: next.status, headers: { "content-type": next.ctype } });
  const f = await G.flushPending();
  const inQ2 = G.pendingSnapshot().length;
  // ③ ชนะเกมใหม่ตอนเซิร์ฟเวอร์ตอบแบบ second
  next = second;
  const up2 = await G.uploadGame(rec("22222222-2222-4222-8222-222222222222") as any);
  const inQ3 = G.pendingSnapshot().length;
  console.log(`[${name}] ตอนเน็ตหลุด queued=${(up as any).queued} คิว=${inQ1} → ลองส่งแล้ว sent=${f.sent} failed=${f.failed} rejected=${f.rejected.length} คิวเหลือ=${inQ2} | เกมใหม่ queued=${(up2 as any).queued} reason="${(up2 as any).reason}" คิว=${inQ3}`);
}

await scenario("500 ฐานสะดุด", { status: 500, body: JSON.stringify({ error: "ฐานข้อมูลไม่ตอบกลับ ลองใหม่ภายหลัง" }), ctype: "application/json" }, { status: 500, body: JSON.stringify({ error: "ฐานข้อมูลไม่รับข้อมูล ลองใหม่ภายหลัง" }), ctype: "application/json" });
await scenario("502 ด่านหน้า Cloudflare", { status: 502, body: "<html>Bad gateway</html>", ctype: "text/html" }, { status: 504, body: "<html>Gateway timeout</html>", ctype: "text/html" });
await scenario("200 หน้าล็อกอิน Wi-Fi", { status: 200, body: "<html>Please sign in to Wi-Fi</html>", ctype: "text/html" }, { status: 200, body: "<html>Please sign in</html>", ctype: "text/html" });
await scenario("503 ประตูยังไม่ตั้งรหัส", { status: 503, body: "ระบบยังไม่ได้ตั้งรหัสผ่าน", ctype: "text/plain" }, { status: 503, body: JSON.stringify({ error: "ระบบยังไม่ได้ตั้งรหัสผ่าน ผู้ดูแลต้องตั้งค่าก่อนใช้งาน" }), ctype: "application/json" });
