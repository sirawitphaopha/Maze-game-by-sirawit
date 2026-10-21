const { EN } = await import("file:///C:/Users/PKH/maze-lab/lib/i18n-en.ts");
const { NOTES, PDEF } = await import("file:///C:/Users/PKH/maze-lab/lib/maze/generators.ts");
const { GNOTE, LOOPS } = await import("file:///C:/Users/PKH/maze-lab/lib/game/level.ts");
const k = (s) => s.trim().replace(/\s+/g, " ");
const has = (s) => EN[k(s)] !== undefined;
let miss = 0;
const chk = (tag, s) => { if (/[\u0E00-\u0E7F]/.test(s) && !has(s)) { miss++; console.log("ไม่เจอ", tag, JSON.stringify(s)); } };
for (const [id, n] of Object.entries(NOTES)) { const sp = n.h.match(/^(.*?)\s*\(([^)]+)\)\s*$/); chk("NOTES.h-thai " + id, sp?.[2] ?? ""); chk("NOTES.p " + id, n.p); chk("NOTES.t " + id, n.t); }
for (const [id, list] of Object.entries(PDEF)) for (const d of list) { chk("PDEF.label " + id, d.label); if (d.opts) for (const o of d.opts) chk("PDEF.opt " + id, o[1]); if (d.ends) for (const e of d.ends) chk("PDEF.end " + id, e); if (d.fmt) for (const v of [d.min ?? 0, d.max ?? 1, ((d.min ?? 0) + (d.max ?? 1)) / 2]) { const f = d.fmt(v); if (/[\u0E00-\u0E7F]/.test(f) && !has(f)) { /* อาจเข้า EN_RX */ console.log("fmt", id, d.k, JSON.stringify(f)); } } }
for (const [id, s] of Object.entries(GNOTE)) chk("GNOTE " + id, s);
for (const l of LOOPS) { chk("LOOPS.name", l.name); chk("LOOPS.note", l.note); }
console.log("รวมไม่เจอ", miss);
