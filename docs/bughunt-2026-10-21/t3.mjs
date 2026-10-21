const { PDEF } = await import("file:///C:/Users/PKH/maze-lab/lib/maze/generators.ts");
const TH = /[\u0E00-\u0E7F]/;
for (const [id, list] of Object.entries(PDEF)) for (const d of list) {
  if (d.t === "select" || !d.fmt) continue;
  const outs = new Set();
  for (let v = d.min; v <= d.max + 1e-9; v += d.step) outs.add((TH.test(d.fmt(v)) ? "ไทย" : "ไม่ไทย") + ":" + d.fmt(Number(v.toFixed(6))));
  const kinds = new Set([...outs].map((o) => o.split(":")[0]));
  if (kinds.size > 1) console.log(id, d.k, [...outs].slice(0, 8).join(" | "));
}
