// พิสูจน์: ชนะตอนเน็ตต่ออยู่แต่ไม่ไปไหน เกมยังไม่ถูกเก็บลงเครื่องนานราว 61.5 วินาที (ปิดหน้าช่วงนี้ = หาย)
const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
(globalThis as any).window = globalThis;
(globalThis as any).CustomEvent = class { type: string; constructor(t: string) { this.type = t; } };
(globalThis as any).dispatchEvent = () => true;
// เร่งนาฬิกา 1000 เท่า เพื่อวัดช่วงรอโดยไม่ต้องรอจริง (บันทึกเวลาที่ขอรอไว้ทุกครั้ง)
let virtual = 0; const realST = setTimeout;
(globalThis as any).setTimeout = (fn: any, ms: number) => { const v = ms; return realST(() => { virtual += v; fn(); }, Math.max(0, ms / 1000)); };
// fetch ที่ค้าง ไม่ตอบจนกว่าจะโดนตัด
(globalThis as any).fetch = (_u: string, o: any) => new Promise((_r, rej) => o.signal.addEventListener("abort", () => { const e = new Error("aborted"); e.name = "AbortError"; rej(e); }));
const G = await import("file:///C:/Users/PKH/maze-lab/lib/games.ts");
const rec: any = { saveKey: "33333333-3333-4333-8333-333333333333", playedAt: new Date().toISOString(), appVersion: "1.0.0", level: "easy", algo: "wilson", minLen: 4, loops: 0, fog: false, size: 10, exitX: 5, walls: "x", moves: "D0", timeMs: 1, replayOf: null, label: "ทดสอบ" };
const p = G.uploadGame(rec);
await new Promise((r) => realST(r, 5));
console.log("หลังกดชนะไม่นาน เกมอยู่ในคิวในเครื่องกี่เกม:", G.pendingSnapshot().length);
const res = await p;
console.log("ส่งไม่สำเร็จแล้วเข้าคิว:", JSON.stringify(res), "· ช่วงที่เกมไม่อยู่ในเครื่องเลย ≈", (virtual / 1000).toFixed(1), "วินาที · คิวตอนนี้", G.pendingSnapshot().length);
