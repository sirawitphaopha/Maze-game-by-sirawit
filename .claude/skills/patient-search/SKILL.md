---
name: patient-search
description: ใช้ทุกครั้งที่ทำหรือแก้การค้นหาผู้ป่วยด้วยชื่อหรือ HN ทั้งช่องค้นบนแถบบนที่รายชื่อกางลงมา และช่องค้นในตารางผู้ป่วย ครอบคลุมเส้นทางค้นฝั่งเซิร์ฟเวอร์ กติกาตัวเลขล้วนคือ HN การลืมสลับแป้นพิมพ์สองทาง ป้ายค้นว่า ไฮไลต์ ชื่อเว้นวรรคคำนำหน้า ลูกศรเลือกกับ Enter การส่งคำค้นต่อไปหน้าทะเบียน และกฎความลับของ HN พร้อมโค้ดจริงที่ยกไปใช้ได้เลย วิธีทดสอบ และช่องโหว่ที่ยังเปิดอยู่ เป็นสกิลแยกจาก search-system ซึ่งเป็นสกิลค้นหายา
---

# ค้นหาผู้ป่วยด้วยชื่อหรือ HN — แยกจากสกิลค้นหายา

> 🗺️ เปิดคู่กับ — **`search-system`** เพราะใช้ของกลางร่วมกัน
> (ช่องค้นหาตัวกลาง ข้อ 7–12 · กรอบผลค้นกางตามที่ว่าง ข้อ 14.5 · ลูกศรวนรอบ ข้อ 16 · กันหน้าเพจไหลตาม ข้อ 17)
> และ **`db-safety`** เรื่อง HN ห้ามอยู่ในที่อยู่เว็บ · ตารางเต็มว่างานไหนต้องเปิดสกิลไหน อยู่ที่ `working-with-gun` ข้อ 0.0

> ตั้งขึ้น **1 ตุลาคม 2569** ตามที่เจ้าของงานสั่ง
> *"ลืมบอก ระบบค้าหาชิ้แ HN ที่เราปรับกันตอนนี้ สร้างเเป็นสกิลการค้นหาเเยกจากสกิลค้นหายา"*
> แล้วสั่งต่อทันที *"เอาไปให้ครบนะ วิธีต่างๆให้ครบ"*

ทุกค่าในสกิลนี้ยกจากโค้ดจริงของเว็บ warfarin (`C:\Users\PKH\warfarin-dash`) รุ่น 0.6.9.0
ซึ่งเจ้าของงานเกลาเองทีละจุดตลอดวันที่ 1 ต.ค. 2569 · กติกาค้นกับไฮไลต์แก้ตามข้อ 33 เมื่อ 20 ต.ค. 2569 · 🚨 ก่อนยกไปใช้ เปิดไฟล์จริงเทียบอีกรอบเสมอ โค้ดอาจเปลี่ยนหลังวันที่เขียน

## ที่มา

เดิมช่องค้นบนแถบบนพิมพ์แล้วไม่มีอะไรขึ้นเลย ต้องกด Enter แล้วกระโดดไปหน้าทะเบียน
เจ้าของงานพิมพ์ 999 แล้วนึกว่าค้นไม่เจอ

> *"ทำไมเราค้น 999 เเล้วมันไม่มีอะไรขึ้นมาเลย"*
> *"กาค้นหาที่ถูกต้อในสกิลเราคือมันต้อขึ้นยังไ"*
> *"เอาสกิลนี้ ไปปรับใช้กับการค้นหาชื่อหนือ hn ผู้ป่วย"*

## ทำไมแยกจากสกิลค้นหายา

| เรื่อง | ค้นยา `search-system` | ค้นผู้ป่วย สกิลนี้ |
|---|---|---|
| ค้นที่ไหน | ในเบราว์เซอร์ คลังยาโหลดมาทั้งก้อน | **ที่ฐานข้อมูล** ฐานส่งให้ครั้งละ 1,000 แถวแล้วหยุดเงียบ กรองในเบราว์เซอร์จะขาดคนโดยไม่มีใครรู้ |
| สิ่งที่ค้น | ชื่อยาภาษาอังกฤษ | **ชื่อไทย** กับ **HN ตัวเลข** |
| ลืมสลับแป้น | ไทยเป็นอังกฤษ ทางเดียว | **สองทาง มีเงื่อนไข** (ข้อ 6–8) |
| จัดอันดับ | 7 ชั้น | ไม่มี เรียงตาม HN หรือตามชื่อ |
| ผลบนจอ | `DrugName` สีความแรง | ชื่อเว้นวรรคคำนำหน้า ข้อบ่งใช้ใต้ชื่อ HN ชิดขวา |
| ความลับ | ไม่มี | **HN เป็นข้อมูลผู้ป่วย** ห้ามอยู่ในที่อยู่เว็บ ห้ามอยู่ในบันทึกของเซิร์ฟเวอร์ |

---

# 🛑 ด่านตรวจ 12 ข้อ — ทำช่องค้นผู้ป่วยใหม่ ต้องครบก่อนบอกว่าเสร็จ

| ✓ | ต้องมี | โค้ดที่ต้องเห็นในไฟล์ |
|---|---|---|
| 1 | ช่องค้นตัวกลาง ห้ามวาด `<input>` เอง | `<SearchBox` |
| 2 | คำค้นส่งทางตัวข้อความ ไม่ใช่ที่อยู่เว็บ | `askServer` |
| 3 | ลืมสลับแป้นสองทาง ผ่านตัวตัดสินกลางตัวเดียว | `คำแทนลืมสลับแป้น(` |
| 4 | ป้าย `ค้นว่า ...` ตอนระบบแปลงแป้นให้ | `swapLabel` |
| 5 | ไฮไลต์ด้วยคำที่ใช้ค้นจริง ทั้งชื่อและ HN | `<ไฮไลต์` |
| 6 | ชื่อเว้นวรรคคำนำหน้า | `ชื่อเว้นวรรค(` |
| 7 | ลูกศรขึ้นลงวนรอบ และ Enter เลือกได้ | `ArrowDown` + `moveHi(` |
| 8 | ชี้แล้วแถวเปลี่ยนสี และสีหายเมื่อเมาส์ออก | `onMouseEnter` + `onMouseLeave` |
| 9 | เลื่อนในรายการจนสุดแล้วหน้าเพจไม่ไหลตาม | `overscrollBehavior` |
| 10 | กันคำตอบเก่ามาทับคำตอบใหม่ | `seq.current` |
| 11 | เปิดแฟ้มด้วยรหัสภายใน ไม่ใช่ HN | `patient_id` |
| 12 | ฝั่งเซิร์ฟเวอร์กรองเคสตัวอย่างกับแถวที่ลบ | `demoOf(` + `deleted_at` |

**ตรวจตัวเองด้วยคำสั่งเดียว** — ไม่ขึ้นอะไรเลย = ครบ · ขึ้นคำว่าขาด = ไล่ข้อนั้นในตารางข้างบน

```bash
f=components/shell/PatientSearch.tsx      # ไฟล์หน้าจอของช่องค้นที่เพิ่งทำ
for k in "<SearchBox" "askServer" "คำแทนลืมสลับแป้น(" "swapLabel" "<ไฮไลต์" "ชื่อเว้นวรรค(" \
         "ArrowDown" "moveHi(" "onMouseEnter" "onMouseLeave" "overscrollBehavior" "seq.current" "patient_id"; do
  grep -qF "$k" "$f" || echo "ขาด $k"
done
r=app/api/patients/search/route.ts        # ไฟล์เส้นทางค้นฝั่งเซิร์ฟเวอร์
for k in "demoOf(" "deleted_at"; do grep -qF "$k" "$r" || echo "ขาด $k"; done
```

ช่องค้นในตาราง (ข้อ 24–26) ไม่มีรายการกางลงมา ข้อ 7 8 9 11 จึงไม่เกี่ยว ตรวจแค่ข้อ 1–6 กับ 10

---

# 🌳 มีอะไรบ้าง

```
ค้นหาผู้ป่วย
│
├─ 🧠 ส่วนที่ 1 ฝั่งเซิร์ฟเวอร์
│  ├─ 1. กติกา ตัวเลขล้วน = HN ขึ้นต้นตรงกัน ตัดศูนย์นำหน้า · มีตัวอักษร = แยกคำ ทุกคำอยู่ในชื่อ
│  ├─ 2. ทางค้นแบบเร็วของช่องบนแถบบน แยกจากทางของตาราง
│  ├─ 3. 🔴 คำค้นส่งทางตัวข้อความ ห้ามเขียนลงบันทึก
│  ├─ 4. 🔴 กรองเคสตัวอย่างกับแถวที่ลบทุกเส้นทาง
│  └─ 5. ตาราง ค้น กรอง เรียง แบ่งหน้า ที่ฐาน
│
├─ ⌨️ ส่วนที่ 2 ลืมสลับแป้นพิมพ์ สองทาง
│  ├─ 6. ทำไมต้องสองทาง
│  ├─ 7. ตัวตัดสินกลาง คำแทนลืมสลับแป้น
│  ├─ 8. ตารางแป้น แถวเลขบน กับตัวแปลงอังกฤษเป็นไทย
│  ├─ 9. ลองคำที่พิมพ์ก่อนเสมอ
│  ├─ 10. ป้าย ค้นว่า กับไฮไลต์ด้วยคำแทน
│  └─ 11. ทุกช่องค้นผู้ป่วยต้องแปลงเหมือนกัน
│
├─ 🔍 ส่วนที่ 3 ช่องค้นบนแถบบน รายชื่อกางลงมา
│  ├─ 12. หน้าตาช่อง
│  ├─ 13. ค้นเมื่อหยุดพิมพ์ กันคำตอบเก่าแซง
│  ├─ 14. ข้อความในกรอบ กำลังค้น ค้นไม่สำเร็จ ไม่เจอ
│  ├─ 15. กรอบรายการติดกับช่องค้นหา
│  ├─ 16. แถวผู้ป่วย
│  ├─ 17. ลูกศรชี้แถวที่เลือก ชื่อไม่ขยับ
│  ├─ 18. แป้นพิมพ์ ลูกศร Enter Esc
│  ├─ 19. คลิกกลับเข้าช่อง รายการกลับมา
│  ├─ 20. วิธีใช้ท้ายรายการ 2 บรรทัด
│  └─ 21. เปิดแฟ้มด้วยรหัสภายใน
│
├─ ➡️ ส่วนที่ 4 ส่งคำค้นต่อไปหน้าทะเบียน
│  ├─ 22. อยู่หน้าอื่น ฝากในที่เก็บของแท็บ
│  └─ 23. อยู่หน้าทะเบียนอยู่แล้ว ส่งเป็นข่าว
│
├─ 📋 ส่วนที่ 5 ช่องค้นในตารางผู้ป่วย (ทะเบียน หน้ารวม)
│  ├─ 24. ตัวคุมตาราง usePatientPage
│  ├─ 25. ความกว้างช่องให้ขอบขวาตรงชิป
│  └─ 26. ไฮไลต์ในตาราง
│
├─ 🪪 ส่วนที่ 6 ชื่อผู้ป่วยบนจอ
│  ├─ 27. เว้นวรรคคำนำหน้า
│  ├─ 28. เติมชื่อแยกช่องฝั่งเซิร์ฟเวอร์
│  ├─ 29. ใช้เฉพาะจุดที่เจ้าของงานชี้
│  └─ 30. ข้อบ่งใช้ใต้ชื่อ
│
├─ 🖍 ส่วนที่ 7  31. ไฮไลต์ตัวกลาง
├─ 🔒 ส่วนที่ 8  32. ความลับของ HN รวมทุกข้อ
├─ 🕳 ส่วนที่ 9  33. ช่องโหว่ที่ยังเปิดอยู่
└─ ✅ วิธีทดสอบ
```

## 📦 ไฟล์ที่ต้องยกไปพร้อมกัน — ห้ามหยิบตัวเดียว

| ไฟล์ | ทำอะไร |
|---|---|
| `components/shell/PatientSearch.tsx` | ช่องค้นบนแถบบน รายชื่อกางลงมา |
| `app/api/patients/search/route.ts` | ทางค้นแบบเร็ว |
| `lib/keySwap.ts` | ตัวตัดสินกลางว่าจะลองคำแทนไหม |
| `lib/drugSearch.js` | ตารางแป้น `thaiToEnglish` `englishToThai` และ `moveHi` (ไฟล์เดียวกับสมองค้นยา) |
| `components/ui/Highlight.tsx` | ไฮไลต์ตัวกลาง |
| `lib/patientName.ts` | ชื่อเว้นวรรคคำนำหน้า |
| `lib/patientNameServer.ts` | เติมคำนำหน้า ชื่อ นามสกุล ให้แถวที่ฐานส่งมา (ฝั่งเซิร์ฟเวอร์เท่านั้น) |
| `components/ui/SearchBox.tsx` | ช่องค้นตัวกลาง มี `swapLabel` กับ `join` |
| `lib/usePatientPage.ts` | ตัวคุมตาราง ค้น กรอง เรียง แบ่งหน้า พร้อมลองคำแทน |
| `lib/popup.ts` · `lib/lockScroll.ts` · `lib/dropPlacement.ts` · `lib/z.ts` | ปิดเมื่อคลิกข้างนอกหรือ Esc · ล็อกหน้าเพจ · กางตามที่ว่าง · ชั้นลอย |
| `lib/net.ts` | `askServer` ส่งคำขอพร้อมตัวจับเวลา บอกเหตุที่ล้ม 4 แบบ ต่อ `?demo=1` ให้เองในโหมดเคสตัวอย่าง |

---

# 🧠 ส่วนที่ 1 · ฝั่งเซิร์ฟเวอร์

## 1. กติกาค้น — ตัวเลขล้วน = HN ที่ขึ้นต้นตรงกัน · มีตัวอักษร = แยกคำ ทุกคำอยู่ในชื่อ ลำดับไหนก็ได้

กติกาเดียวกันทั้งทางค้นแบบเร็ว (ข้อ 2) กับฟังก์ชันของตาราง (ข้อ 5)
แก้ 20 ต.ค. 2569 ปิดช่องโหว่ข้อ 33 · เดิมตัวเลขไม่ตัดศูนย์นำหน้า และชื่อค้นทั้งก้อนตามลำดับ

```ts
// app/api/patients/search/route.ts
import { normalizeHn } from "@/lib/hn";

const digits = /^[0-9]+$/.test(q);
const hn = digits ? normalizeHn(q) : "";
if (digits && !hn) return NextResponse.json({ rows: [], total: 0 });   // พิมพ์ 0 ล้วน = ไม่ค้น
const คำ = digits ? [] : q.split(/\s+/).filter(Boolean);

let base = supabaseAdmin().from("wf_patient")
  .select("id, hn, full_name, prefix, first_name, last_name, indication", { count: "exact" })
  .eq("is_demo", demoOf(req, body))
  .is("deleted_at", null);
if (digits) base = base.like("hn", `${hn}%`);
for (const w of คำ) base = base.ilike("full_name", `%${w}%`);   // ต่อทีละคำ = ทุกคำต้องอยู่ในชื่อ
const { data, error, count } = await base.order(digits ? "hn" : "full_name").limit(LIMIT);
```

```sql
-- scripts/030_patient_search_words.sql ในฟังก์ชัน wf_patient_page (เดิม 007)
where btrim(coalesce(p_q, '')) = ''
   -- คีย์เป็นตัวเลขล้วน = ค้น HN แบบขึ้นต้นตรงกัน ตัดศูนย์นำหน้าก่อน · ตัดแล้วว่าง (0 ล้วน) ไม่เจอใคร
   or (btrim(p_q) ~ '^[0-9]+$' and ltrim(btrim(p_q), '0') <> '' and pn.hn like ltrim(btrim(p_q), '0') || '%')
   -- พิมพ์ตัวอักษร = แยกคำตามช่องว่าง ทุกคำต้องอยู่ในชื่อ ลำดับไหนก็ได้
   or (btrim(p_q) !~ '^[0-9]+$' and not exists (
         select 1 from regexp_split_to_table(btrim(p_q), '\s+') as t(w)
         where pn.full_name not ilike '%' || t.w || '%'))
```

🔑 คีย์ HN ทีละตัว รายชื่อแคบลงทุกครั้งที่คีย์เพิ่ม · ทะเบียนเก็บ HN แบบตัดศูนย์นำหน้า (`lib/hn.ts`) คำค้นจึงต้องตัดแบบเดียวกัน
🔑 ชื่อค้นจาก `full_name` ช่องเดียว ซึ่งในฐานเขียนคำนำหน้าติดชื่อ (`นายทดสอบ ชุดตรวจ`)
   แยกคำแล้ว `นาย ทดสอบ` ก็เจอ เพราะ `นาย` กับ `ทดสอบ` อยู่ในชื่อทั้งคู่ · `ชุดตรวจ ทดสอบ` สลับลำดับก็เจอ
🔴 สองทางนี้ต้องใช้กติกาเดียวกันเสมอ แก้ทางหนึ่งต้องแก้อีกทางด้วย ไม่งั้นช่องบนแถบบนเจอ แต่กด Enter ไปหน้าทะเบียนแล้วไม่เจอ

## 2. ทางค้นแบบเร็ว แยกจากทางของตาราง

> *"มันค้นเกือบ 1 วิเลยนะ หลังจากพิม 999 เสร็จ มันเร็วกว่านั้นได้ไหม"* (เจ้าของงาน 1 ต.ค. 2569)

เดิมช่องบนแถบบนยิงทาง `/api/patients` ของตาราง ซึ่งคิดของหนักทั้งหน้า (ค่า INR ล่าสุด กลุ่มความเร่งด่วน นับทุกกลุ่ม)
แยกเป็น `POST /api/patients/search` อ่านแค่ที่รายชื่อต้องใช้ วัดได้ราว 0.3 วินาที

| ค่า | เท่าไหร่ | ทำไม |
|---|---|---|
| `LIMIT` | **8 คน** | ช่องบนแถบบนโชว์แค่นี้ ที่เหลือกด Enter ไปดูในหน้าทะเบียน |
| ช่องที่อ่าน | `id, hn, full_name, prefix, first_name, last_name, indication` | สามช่องของชื่อไว้เว้นวรรค · ข้อบ่งใช้ไว้ขึ้นใต้ชื่อ |
| นับ | `{ count: "exact" }` | ได้จำนวนคนทั้งหมดกลับมาด้วย |
| คำค้น | `trim()` แล้วตัดที่ 100 ตัวอักษร · ว่างตอบ `{ rows: [], total: 0 }` ทันที | ไม่ถามฐานด้วยคำว่าง |
| ส่งกลับ | `{ rows: [{ patient_id, hn, full_name, prefix, first_name, last_name, indication }], total }` | ใช้ชื่อช่อง `patient_id` เหมือนแถวของตาราง หน้าจอใช้ของชุดเดียวกันได้ |

```ts
const LIMIT = 8;

export async function POST(req: NextRequest) {
  if (!dbConfigured()) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่าเชื่อมฐานข้อมูลในเครื่องนี้", notConfigured: true }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ใช่ JSON" }, { status: 400 }); }

  const q = typeof body.q === "string" ? body.q.trim().slice(0, 100) : "";
  if (!q) return NextResponse.json({ rows: [], total: 0 });

  /* กติกาเดียวกับฟังก์ชันของตาราง (ข้อ 1) */
  const digits = /^[0-9]+$/.test(q);
  const hn = digits ? normalizeHn(q) : "";
  if (digits && !hn) return NextResponse.json({ rows: [], total: 0 });
  const คำ = digits ? [] : q.split(/\s+/).filter(Boolean);

  let base = supabaseAdmin()
    .from("wf_patient")
    .select("id, hn, full_name, prefix, first_name, last_name, indication", { count: "exact" })
    .eq("is_demo", demoOf(req, body))
    .is("deleted_at", null);
  if (digits) base = base.like("hn", `${hn}%`);
  for (const w of คำ) base = base.ilike("full_name", `%${w}%`);
  const { data, error, count } = await base
    .order(digits ? "hn" : "full_name")
    .limit(LIMIT);

  if (error) {
    // เขียนเฉพาะข้อความผิดพลาด ไม่เขียนคำค้นลงบันทึก เพราะอาจเป็น HN
    console.error("[wf] ค้นผู้ป่วยแบบเร็วไม่สำเร็จ:", error.message);
    return NextResponse.json({ error: "อ่านข้อมูลจากฐานไม่สำเร็จ" }, { status: 500 });
  }
  type Found = {
    id: string; hn: string; full_name: string; indication: string | null;
    prefix: string | null; first_name: string | null; last_name: string | null;
  };
  /* สามช่องของชื่อส่งไปด้วย หน้าจอจะได้เว้นวรรคระหว่างคำนำหน้ากับชื่อ (full_name ในฐานเขียนติดกัน) */
  const rows = ((data ?? []) as Found[]).map((p) => ({
    patient_id: p.id, hn: p.hn, full_name: p.full_name, indication: p.indication,
    prefix: p.prefix, first_name: p.first_name, last_name: p.last_name,
  }));
  return NextResponse.json({ rows, total: count ?? rows.length });
}
```

## 3. 🔴 คำค้นส่งทางตัวข้อความ ห้ามเขียนลงบันทึก

- **ใช้ POST ทั้งที่เป็นการอ่าน** คำค้นอาจเป็น HN ของผู้ป่วยจริง ถ้าต่อท้ายที่อยู่เว็บ (`?q=`) จะค้างในแถบที่อยู่ ประวัติเบราว์เซอร์ และบันทึกของเซิร์ฟเวอร์
- **ล้มแล้วเขียนแค่ข้อความผิดพลาด** ห้ามเขียนคำค้นหรือตัวคำขอทั้งก้อนลงบันทึก
- **หน้าจอเรียกผ่าน `askServer` ตัวเดียว** ห้าม `fetch` เอง เพราะตัวนี้ต่อ `?demo=1` ให้เองตอนเปิดโหมดเคสตัวอย่าง และมีตัวจับเวลาตัด

## 4. 🔴 กรองเคสตัวอย่างกับแถวที่ลบ ทุกเส้นทาง

```ts
.eq("is_demo", demoOf(req, body))
.is("deleted_at", null)
```

ลืมเมื่อไหร่ เคสตัวอย่าง 90 คน (HN 999001–999090) โผล่ในรายชื่อของจริงเงียบ ๆ
ตัวเติมชื่อแยกช่อง (ข้อ 28) ก็กรองสองอย่างนี้ด้วย ทุกเส้นทางที่อ่าน `wf_patient` ต้องมีครบสองบรรทัด

🔑 เคสทดสอบ HN 999998 · 999999 อยู่ในข้อมูลจริง ไม่ได้ติดธงเคสตัวอย่าง ค้น `999` ในโหมดปกติจึงเจอสองคนนี้

## 5. ตาราง ค้น กรอง เรียง แบ่งหน้า ที่ฐานทั้งหมด

ทาง `POST /api/patients` ส่ง `{ q, band, sort, dir, limit, offset }` ให้ฟังก์ชัน `wf_patient_page` ฐานคืน `{ rows, total, counts }`

🔴 **ห้ามดึงผู้ป่วยทั้งหมดมากรองในเบราว์เซอร์** ฐานส่งให้แค่ 1,000 แถวแล้วหยุดเงียบ ๆ ไม่มีคำเตือน
   วันที่ผู้ป่วยเกินพัน ตารางจะขาดคนไปโดยไม่มีใครรู้
🔴 แก้ `wf_patient_page` ต้องสำรองฐานก่อน และยิงทุกกลุ่มกรองที่มี ไม่ใช่เฉพาะกลุ่มที่แก้ (`db-safety` · `testing-proof`)
🔑 `counts.all` = จำนวนคนที่ตรงกับคำค้นทุกกลุ่มรวมกัน ใช้ตัดสินว่าคำค้นนี้ไม่เจอใครเลยจริงไหม (ข้อ 9)

---

# ⌨️ ส่วนที่ 2 · ลืมสลับแป้นพิมพ์ สองทาง

## 6. ทำไมต้องสองทาง

ค้นยาแปลงทางเดียว เพราะชื่อยาเป็นอังกฤษ พลาดได้แบบเดียวคือแป้นค้างไทย
ค้นผู้ป่วยพิมพ์ได้สองอย่าง จึงพลาดได้สองแบบ

| ตั้งใจพิมพ์ | แป้นค้างที่ | ได้ออกมา | ระบบแปลงเป็น |
|---|---|---|---|
| ชื่อไทย `ทดสอบ` | อังกฤษ | `mflv[` | `ทดสอบ` |
| HN `999` ด้วยแถวเลขบน | ไทย | `ตตต` | `999` |

🔑 ชื่อผู้ป่วยเป็นภาษาไทย **ทางหลักคือแปลงอังกฤษเป็นไทย** เจ้าของงานเคาะ 1 ต.ค. 2569
🔑 แป้นตัวเลขด้านขวา (numpad) ให้ตัวเลขเหมือนกันทุกภาษา แถวเลขบนเท่านั้นที่เพี้ยนตอนแป้นค้างไทย

## 7. ตัวตัดสินกลาง `คำแทนลืมสลับแป้น` (`lib/keySwap.ts`)

```ts
import { englishToThai, thaiToEnglish } from "@/lib/drugSearch";

export function คำแทนลืมสลับแป้น(raw: string): string {
  const q = raw.trim();
  let alt = "";
  if (/[a-z]/i.test(q)) alt = englishToThai(q).trim();
  else if (/[฀-๿]/.test(q)) {
    const เลข = thaiToEnglish(q).trim();
    if (/^\d+$/.test(เลข)) alt = เลข;
  }
  return alt && alt !== q ? alt : "";
}
```

| พิมพ์มา | มีอะไร | ทำอะไร | คืนค่า |
|---|---|---|---|
| `mflv[` | ตัวอังกฤษ | แปลงอังกฤษเป็นไทยทั้งคำ | `ทดสอบ` |
| `ตตต` | ตัวไทย | แปลงไทยเป็นอังกฤษ ได้เลขล้วน | `999` |
| `ฟฟฟฟฟ` | ตัวไทย | แปลงได้ `aaaaa` ไม่ใช่เลขล้วน | ว่าง ไม่ลองคำแทน |
| `999` | เลขล้วน | ไม่มีอะไรต้องแปลง | ว่าง |

🔴 **ไทยเป็นอังกฤษใช้ได้เฉพาะเมื่อได้ตัวเลขล้วน** ชื่อไทยที่ค้นไม่เจอ ห้ามแปลงเป็นอย่างอื่นแล้วไปเจอคนอื่นแทน
🔴 คืนค่าว่าง = ไม่มีคำแทนที่ควรลอง · คำแทนที่ออกมาเหมือนคำเดิมก็คืนค่าว่าง

## 8. ตารางแป้น — `lib/drugSearch.js` ไฟล์เดียวกับสมองค้นยา

**แถวเลขบน** เพิ่ม 1 ต.ค. 2569 เดิมแปลงกลับเป็นเลขไม่ได้เลย คีย์ HN ตอนแป้นค้างไทยจึงค้นไม่เจอ

```js
// ต่อท้าย TH_TO_EN — แถวตัวเลขด้านบน (ไม่กด Shift)
'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5', 'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0', 'ข': '-', 'ช': '=', 'ฃ': '\\'
```

ผลพลอยได้ ช่องค้นยาแปลงความแรงที่คีย์ตอนแป้นค้างไทยได้ด้วย เช่น `ถจจ` เป็น `500`

**ตัวแปลงกลับทาง อังกฤษเป็นไทย** สร้างจากตารางเดิม ไม่ได้เขียนตารางใหม่ สองตารางจึงไม่มีทางขัดกัน

```js
// ตารางกลับทาง สร้างจาก TH_TO_EN ตัวที่ซ้ำเอาตัวแรก ('M' เป็น ์)
const EN_TO_TH = {};
for (const [th, en] of Object.entries(TH_TO_EN)) {
  if (EN_TO_TH[en] == null) EN_TO_TH[en] = th;
}

// "l;ylfu" → "สวัสดี" · ตัวที่แปลงไม่ได้คงไว้ตามเดิม (ช่องว่าง)
export function englishToThai(text) {
  let out = '';
  for (const ch of String(text || '')) {
    out += EN_TO_TH[ch] != null ? EN_TO_TH[ch] : ch;
  }
  return out;
}
```

⚠️ แปลงอังกฤษเป็นไทยทั้งคำ รวมตัวเลขที่ปนมาด้วย (`8` เป็น `ค`) ถูกต้องสำหรับชื่อ เพราะตัวไทยบางตัวอยู่บนแถวเลขบน
   แต่เลขล้วนไม่ถูกแปลงเลย เพราะตัวตัดสินแปลงอังกฤษเป็นไทยเฉพาะเมื่อมีตัวอักษรอังกฤษ (ข้อ 7)

## 9. ลองคำที่พิมพ์ก่อนเสมอ คำแทนลองเมื่อไม่เจอใครเลย

**ช่องบนแถบบน** — รอบแรกได้ 0 คน ค่อยลองคำแทน

```ts
async function ค้นผู้ป่วย(raw: string) {
  const ask = (q: string) => askServer<{ rows?: Row[]; total?: number }>("/api/patients/search", { q });

  const first = await ask(raw);
  if (!first.ok) return { ok: false, why: first.why };
  const rows = first.data.rows ?? [];
  if (rows.length) return { ok: true, found: { rows, total: Number(first.data.total) || rows.length, used: raw, swapped: false } };

  const alt = คำแทนลืมสลับแป้น(raw);
  if (alt) {
    const second = await ask(alt);
    const rows2 = second.ok ? second.data.rows ?? [] : [];
    if (second.ok && rows2.length) {
      return { ok: true, found: { rows: rows2, total: Number(second.data.total) || rows2.length, used: alt, swapped: true } };
    }
  }
  return { ok: true, found: { rows: [], total: 0, used: raw, swapped: false } };
}
```

**ช่องในตาราง** — ดูยอดรวมทุกกลุ่ม ไม่ใช่แค่กลุ่มที่กรองอยู่

```ts
/** คำค้นนี้ไม่เจอใครเลยไหม — ดูยอดรวมทุกกลุ่ม ไม่ใช่แค่กลุ่มที่กรองอยู่ */
const ไม่เจอใคร = (d: PanelPage) => (d.counts ? Number(d.counts.all) : Number(d.total)) === 0;

const raw = q.trim();
const res = await remember(key, async () => {
  const first = await askServer<PanelPage>("/api/patients", body);
  if (!first.ok || !raw || !ไม่เจอใคร(first.data)) return first;
  const alt = คำแทนลืมสลับแป้น(raw);
  if (!alt) return first;
  const second = await askServer<PanelPage>("/api/patients", { ...body, q: alt });
  return second.ok && !ไม่เจอใคร(second.data) ? { ok: true as const, data: { ...second.data, swapped: alt } } : first;
}, { force });
```

🔴 **กรองกลุ่มที่ไม่มีคนนี้ ไม่ได้แปลว่าพิมพ์ผิดแป้น** ห้ามไปลองคำแทน ไม่งั้นได้ผลของคำอื่นมาโดยคนพิมพ์ไม่รู้ตัว
🔑 จำผลไว้ใต้คำที่พิมพ์ พร้อมคำแทนที่ติดไว้ในผล (`swapped`) กลับมาหน้านี้จึงไม่ต้องยิงสองรอบ
   ตอนหยิบของที่จำไว้ขึ้นจอ ต้องตั้งป้ายด้วย `setSwapped(seen.swapped ?? "")` ทุกที่ที่หยิบ ไม่งั้นป้ายหายตอนกลับเข้าหน้า

## 10. ป้าย ค้นว่า กับไฮไลต์ด้วยคำแทน

| ช่อง | ป้าย | ไฮไลต์ |
|---|---|---|
| แถบบน | `swapLabel={raw && found?.swapped ? found.used : undefined}` | `<ไฮไลต์ ข้อความ={...} คำ={used} กติกาผู้ป่วย />` |
| ตาราง | `swapLabel={keyed && swapped ? swapped : undefined}` | `hl={keyed ? swapped \|\| keyed : ""}` |

ป้ายอยู่ในช่องค้นหาเอง ชิดขวา ตัวเขียน `ค้นว่า <คำแทน>` พื้น `var(--ok-bg)` ตัว `var(--ok)` 11px หนา 600 ไม่รับเมาส์ (ตัวกลาง `SearchBox`)
ที่เว้นขวาของตัวหนังสือขยายตามป้าย ไม่งั้นตัวหนังสือลอดไปใต้ป้าย

```ts
const ป้ายกว้าง = swapLabel ? Math.max(58, swapLabel.length * 8 + 26) : 0;
const padRight = (hasText ? h - 8 : 13) + ป้ายกว้าง;
```

🔴 **ไฮไลต์ด้วยคำแทน ไม่ใช่คำที่พิมพ์** พิมพ์ `mflv[` แล้วไฮไลต์ด้วย `mflv[` จะไม่มีอะไรสว่างเลย
🔴 **Enter ไปหน้าทะเบียนต้องส่งคำแทน** `const key = (found?.swapped ? found.used : raw).trim();`

## 11. ทุกช่องค้นผู้ป่วยต้องแปลงเหมือนกัน

> *"การค้นหาชื่อตรงนี้ยังไม่ตามแถบค้นหา"* (หน้าทะเบียนพิมพ์ `mflv[` แล้วไม่เจอ ทั้งที่ช่องบนแถบบนเจอ)
> *"เเละระบบค้นหาตรงนั้นด้วย แก้ให้เหมือนกัน"* (หน้ารวม) — เจ้าของงาน 1 ต.ค. 2569

ตัวตัดสินอยู่ที่ `lib/keySwap.ts` ที่เดียว ช่องบนแถบบนกับตัวคุมตารางเรียกตัวเดียวกัน
🔴 ห้ามเขียนตัวแปลงแยกในหน้าไหน ช่องค้นผู้ป่วยช่องใหม่ต้องเรียกตัวนี้ ไม่งั้นสองช่องค้นได้ผลไม่เท่ากัน

---

# 🔍 ส่วนที่ 3 · ช่องค้นบนแถบบน รายชื่อกางลงมา

## 12. หน้าตาช่อง

```tsx
<div ref={wrapRef} onKeyDown={onKeyDown} onFocus={reopen} onClick={reopen} style={{ width: 320, position: "relative" }}>
  <SearchBox
    value={q}
    onChange={change}
    placeholder="คีย์ HN หรือพิมพ์ชื่อผู้ป่วย"
    ariaLabel="ค้นหาผู้ป่วยจากทุกหน้า"
    h={40}
    swapLabel={raw && found?.swapped ? found.used : undefined}
    join={showing ? (place.up ? "top" : "bottom") : undefined}
  />
  {showing && /* กรอบรายการ ข้อ 15 */}
</div>
```

| ค่า | เท่าไหร่ |
|---|---|
| กว้าง | 320 |
| สูง | 40 (ช่องในหน้าทะเบียนกับหน้ารวมสูง 42) |
| ข้อความใบ้ | `คีย์ HN หรือพิมพ์ชื่อผู้ป่วย` ใช้คำเดียวกันทุกช่องค้นผู้ป่วย |

## 13. ค้นเมื่อหยุดพิมพ์ กันคำตอบเก่าแซง

```ts
/** รอให้หยุดพิมพ์ก่อนค่อยถาม ไม่ยิงทุกตัวอักษร · เดิม 220 ลดลงตอนเจ้าของงานทักเรื่องช้า */
const WAIT_MS = 120;

useEffect(() => {
  if (!raw) return;
  const mine = ++seq.current;
  const t = setTimeout(() => {
    void ค้นผู้ป่วย(raw).then((r) => {
      if (mine !== seq.current) return;   // มีคำค้นใหม่กว่าแล้ว ทิ้งคำตอบนี้
      if (!r.ok) { setWhy(r.why); setState("fail"); return; }
      setFound(r.found);
      setState("ok");
    });
  }, WAIT_MS);
  return () => clearTimeout(t);
}, [raw]);

const change = (v: string) => {
  setQ(v); setHi(-1); setOpen(true);
  if (v.trim()) setState("loading");
  else { setState("idle"); setFound(null); seq.current++; }   // ลบหมด = ทิ้งคำตอบที่ยังวิ่งอยู่ด้วย
};
```

🔴 ไม่มีตัวนับ `seq` พิมพ์ `99` แล้ว `999` ต่อทันที ถ้าคำตอบของ `99` มาทีหลัง รายชื่อจะเป็นของ `99` ทั้งที่ช่องเขียน `999`

## 14. ข้อความในกรอบ

| สถานะ | ขึ้นว่า |
|---|---|
| กำลังค้น และยังไม่มีรายชื่อชุดเดิม | `กำลังค้น` |
| ค้นไม่สำเร็จ | `ค้นไม่สำเร็จ` ตามด้วยเหตุผล สีแดง `var(--hi)` |
| เจอ 0 คน | `ไม่เจอผู้ป่วยที่ตรงกับ <คำที่พิมพ์>` |

```ts
const ค้นไม่ได้เพราะ: Record<Fail, string> = {
  timeout: "เซิร์ฟเวอร์ตอบช้าเกินเวลาที่รอ ลองพิมพ์ใหม่อีกครั้ง",
  offline: "ติดต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่าเครื่องยังต่อเน็ตอยู่",
  nodb: "ยังไม่ได้ตั้งค่าเชื่อมฐานข้อมูลในเครื่องนี้",
  server: "เซิร์ฟเวอร์ตอบกลับว่าค้นไม่สำเร็จ",
};
```

🔑 ระหว่างค้นคำใหม่ รายชื่อชุดเดิมยังอยู่ ไม่กระพริบเป็นว่าง (`กำลังค้น` ขึ้นเฉพาะตอนยังไม่มีรายชื่อเลย)

## 15. กรอบรายการติดกับช่องค้นหา

> *"ให้สองกรอบ มันติดกันได้ไหม จะเว้นไว้ทำไม"* (เจ้าของงาน 1 ต.ค. 2569)

ชิดขอบช่องค้นหาพอดี ไม่เว้นระยะ ใช้เส้นขอบของช่องค้นหาเป็นเส้นคั่นเส้นเดียว ฝั่งที่ต่อกันเป็นมุมเหลี่ยม กว้างเท่าช่องพอดี
ที่ว่างข้างล่างไม่พอ กางขึ้นข้างบน แล้วต่อกันแบบเดียวกันกลับด้าน (`search-system` ข้อ 14.5)

```tsx
// ช่องค้นหา — components/ui/SearchBox.tsx รับ join
borderRadius: join === "bottom" ? "12px 12px 0 0" : join === "top" ? "0 0 12px 12px" : 12,

// กรอบรายการ
<div ref={panelRef} role="listbox" aria-label="ผู้ป่วยที่ค้นเจอ"
  style={{
    position: "absolute", left: 0, width: "100%",
    zIndex: Z.menu, background: "#fff", border: "1px solid var(--line)",
    boxShadow: "0 8px 30px rgba(122,45,80,.14)", overflow: "hidden",
    ...(place.up
      ? { bottom: "100%", borderBottom: "none", borderRadius: "12px 12px 0 0" }
      : { top: "100%", borderTop: "none", borderRadius: "0 0 12px 12px" }),
    maxHeight: place.max,
  }}>
  <div ref={listRef} onMouseLeave={() => setHi(-1)}
    style={{ maxHeight: Math.max(120, place.max - 8), overflowY: "auto", overscrollBehavior: "contain" }}>
    {/* แถวผู้ป่วย · ข้อความสถานะ · วิธีใช้ท้ายรายการ */}
  </div>
</div>
```

```ts
const place = useDropPlacement(showing, wrapRef, panelRef);   // วัดที่ว่างจริงทุกครั้งที่กาง → place.up · place.max
useClickOutside(showing, wrapRef, close);                       // คลิกข้างนอกปิด
useEscClose(showing, close);                                    // Esc ปิด
useLockPageScroll(showing, listRef);                            // หน้าเพจห้ามเลื่อนตอนกาง แต่ในรายการเลื่อนได้
```

## 16. แถวผู้ป่วย

```tsx
<button key={p.patient_id} ref={(el) => { itemRefs.current[i] = el; }}
  type="button" role="option" aria-selected={hi === i}
  onMouseEnter={() => setHi(i)} onClick={() => openFile(p)}
  style={{
    position: "relative",
    display: "flex", alignItems: "baseline", gap: 14, width: "100%", textAlign: "start",
    border: "none", borderTop: i > 0 ? "1px solid var(--line)" : "none",
    cursor: "pointer", padding: "8px 12px 8px 28px",
    background: hi === i ? "var(--rose50)" : "transparent",
  }}>
  {/* ลูกศร ข้อ 17 */}
  <span className="th" style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
    <ไฮไลต์ ข้อความ={ชื่อเว้นวรรค(p)} คำ={used} กติกาผู้ป่วย />
    {p.indication && (
      <span style={{ display: "block", fontSize: 12, fontWeight: 400, color: "var(--soft)" }}>{p.indication}</span>
    )}
  </span>
  <span className="num" style={{ fontSize: 12.5, color: "var(--soft)", whiteSpace: "nowrap" }}>
    HN <ไฮไลต์ ข้อความ={p.hn} คำ={used} กติกาผู้ป่วย />
  </span>
</button>
```

| ส่วน | ค่า |
|---|---|
| ชื่อ | 13.5px หนา 600 เว้นวรรคคำนำหน้า (ข้อ 27) ไฮไลต์ |
| ข้อบ่งใช้ | บรรทัดใต้ชื่อ 12px สีจาง (ข้อ 30) |
| HN | ชิดขวา 12.5px สีจาง ไม่ตัดบรรทัด มีคำว่า `HN` นำหน้า ไฮไลต์ด้วย |
| แถวที่ชี้ | พื้น `var(--rose50)` |
| เส้นแบ่งแถว | จาง `1px solid var(--line)` คนแรกไม่มีเส้นข้างบน · *"ใส่เส้นเเบ่เเถวจางๆหน่อย"* |
| ที่เว้นซ้าย | 28 จองไว้ให้ลูกศรทุกแถว |

🔴 **สั่ง `border: "none"` ก่อน แล้วค่อยวาดเส้นแบ่งแถว** กลับลำดับแล้วเส้นหายทั้งรายการ (`search-system` กับดักที่ ②)
🔴 **สีแถวที่ชี้ต้องหายเมื่อเมาส์ออกนอกกรอบ** `onMouseLeave={() => setHi(-1)}` อยู่ที่กล่องรายการ ไม่ใช่ที่แถว

## 17. ลูกศรชี้แถวที่เลือก ชื่อไม่ขยับ

> *"อยากได้แบบ ลูกศรชี้เเบบนี้ด้วย --> เเต่ตัวชื่อต้องไม่ขยับ"* แล้วเลือกจากภาพ 8 แบบ *"เอาอันนี้นะ"* (ทรงบั้งคู่ · 1 ต.ค. 2569)

```tsx
<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--rose600)"
  strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
  style={{ position: "absolute", insetInlineStart: 9, top: 13, visibility: hi === i ? "visible" : "hidden" }}>
  <path d="M5 5l7 7-7 7M12 5l7 7-7 7" />
</svg>
```

🔑 วางลอยในที่เว้นซ้าย 28 ที่จองไว้ทุกแถว และซ่อนด้วย `visibility` ไม่ใช่ถอดออก ลูกศรโผล่หรือหาย ชื่อจึงอยู่ที่เดิมเสมอ
แบบที่เคยวาดให้เลือก ลูกศรเส้น · บั้ง · **บั้งคู่ (เลือก)** · สามเหลี่ยมทึบ · หัวลูกศรทึบ · ลูกศรทึบ · ลูกศรในวงกลม · ลูกศรหักมุม

## 18. แป้นพิมพ์ ลูกศร Enter Esc

```ts
const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    setOpen(true);
    setHi((h) => moveHi(h, e.key === "ArrowDown" ? 1 : -1, rows.length));
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    if (hi >= 0 && rows[hi]) openFile(rows[hi]);   // ชี้ใครอยู่ = เปิดแฟ้มคนนั้น
    else goRegistry();                            // ยังไม่ชี้ใคร = ไปหน้าทะเบียนแล้วกรองด้วยคำนี้ (ข้อ 22)
  }
};

/* ลูกศรเลื่อนเกินขอบกรอบ กรอบต้องเลื่อนตาม (search-system ข้อ 15) */
useEffect(() => {
  if (hi >= 0) itemRefs.current[hi]?.scrollIntoView({ block: "nearest" });
}, [hi]);
```

```js
// lib/drugSearch.js — ลูกศรวนรอบ ยังไม่ชี้ใคร กดขึ้น = ไปตัวสุดท้าย
export function moveHi(current, delta, total) {
  if (!total || total < 1) return -1;
  if (current < 0) return delta > 0 ? 0 : total - 1;
  let next = current + delta;
  if (next < 0) next = total - 1;
  if (next >= total) next = 0;
  return next;
}
```

| ปุ่ม | ทำอะไร |
|---|---|
| ลูกศรลง ขึ้น | เลื่อนแถวที่ชี้ วนรอบ กรอบเลื่อนตาม |
| Enter ตอนชี้ใครอยู่ | เปิดแฟ้มคนนั้น |
| Enter ตอนยังไม่ชี้ใคร | ไปหน้าทะเบียนแล้วกรองด้วยคำนี้ |
| Esc · คลิกข้างนอก | ปิดรายการ คำค้นยังอยู่ในช่อง |

## 19. คลิกกลับเข้าช่อง รายการกลับมา

> *"คือตอนที่เราค้ยหา 999 เเล้วเราไปกดที่อื่นของเว็บ ตัวดรอปดาวมันจะหายเนอะ เเต่ถ้าเราเอาเมาส์มากดที่ช่องค้นหา ตัวดริปดาวมันนควรกลับมานะ"*

```ts
const close = () => { setOpen(false); setHi(-1); };
const reopen = () => { if (q.trim()) setOpen(true); };   // ผูกกับ onFocus และ onClick ของกล่องนอก
const reset = () => { close(); setQ(""); setFound(null); setState("idle"); seq.current++; };
```

🔑 กลับมาด้วยผลค้นเดิม ไม่ค้นใหม่ · กด Tab กลับเข้าช่องก็กลับมาเหมือนคลิก
🔑 ปิดแค่ซ่อนรายการ คำค้นยังค้างในช่อง · ล้างทั้งหมด (`reset`) เฉพาะตอนเปิดแฟ้มหรือไปหน้าทะเบียนแล้ว

## 20. วิธีใช้ท้ายรายการ 2 บรรทัด

> *"เขียนเข้าใจไหม เเล้วไม่สอนเรื่องลูกศรด้วย"* → *"ยาว ย่อเหลือไม่เกิน 2 บรรืทัดล"*
> บรรทัดที่สองใช้คำของเจ้าของงานเอง *"สามารถกด enter เพื่อดูรายชื่อทั้งหมดในหน้าทะเบียน"*
> บรรทัดแรก *"เอาใหม่ เเล้วกด enter เพื่อเปิดแฟ้ม"* (รอบก่อน "เพื่อเปิดแฟ้มผู้ป่วย" ยาวเกินบรรทัด 4 จุด)

```tsx
{state === "ok" && rows.length > 0 && (
  <div className="hint" style={{ padding: "7px 12px", borderTop: "1px solid var(--line)", lineHeight: 1.7, fontSize: 12 }}>
    <div><ปุ่มแป้น>↑</ปุ่มแป้น> <ปุ่มแป้น>↓</ปุ่มแป้น> เลือกผู้ป่วย แล้วกด <ปุ่มแป้น>Enter</ปุ่มแป้น> เพื่อเปิดแฟ้ม</div>
    <div>สามารถกด <ปุ่มแป้น>Enter</ปุ่มแป้น> เพื่อดูรายชื่อทั้งหมดในหน้าทะเบียน</div>
  </div>
)}

/** ปุ่มบนแป้นพิมพ์ในคำอธิบาย วาดเป็นกรอบเล็กให้ตาแยกออกจากตัวหนังสือ */
function ปุ่มแป้น({ children }: { children: string }) {
  return (
    <kbd style={{ fontFamily: "inherit", fontSize: 11.5, lineHeight: 1.4, color: "var(--ink)",
      border: "1px solid var(--line)", borderRadius: 5, padding: "0 5px", background: "var(--paper)" }}>
      {children}
    </kbd>
  );
}
```

🔴 ไม่เกิน 2 บรรทัด และแต่ละบรรทัดต้องไม่ตกบรรทัดในกรอบกว้าง 320 · แก้คำเมื่อไหร่ต้องเปิดดูด้วยตาว่ายังอยู่บรรทัดเดียว

## 21. เปิดแฟ้มด้วยรหัสภายใน

```ts
const openFile = (p: Row) => {
  reset();
  router.push(`/patients/${encodeURIComponent(p.patient_id)}`);
};
```

🔴 **ห้ามใช้ HN ในที่อยู่เว็บ** ใช้ `patient_id` ซึ่งเป็นรหัสภายในของแถว (เจ้าของงานสั่ง 16 ก.ย. 2569)

---

# ➡️ ส่วนที่ 4 · ส่งคำค้นต่อไปหน้าทะเบียน

```ts
const goRegistry = () => {
  const key = (found?.swapped ? found.used : raw).trim();
  if (!key) return;
  reset();
  if (pathname === "/patients") {                                   // ข้อ 23
    window.dispatchEvent(new CustomEvent(PATIENT_SEARCH_EVENT, { detail: key }));
    return;
  }
  try {
    sessionStorage.setItem("wf_search", key);                       // ข้อ 22
  } catch {
    // ที่เก็บของแท็บใช้ไม่ได้ (โหมดส่วนตัวบางตัว) ยังพาไปหน้าทะเบียนได้ แค่ไม่ได้เติมคำค้นให้
  }
  router.push("/patients");
};
```

## 22. อยู่หน้าอื่น — ฝากในที่เก็บของแท็บ หยิบแล้วล้างทันที

หน้าทะเบียนหยิบของฝากในตัวจับที่ทำงานก่อนจอวาด แล้วล้างทิ้งทันที กลับเข้าหน้านี้รอบหน้าจะได้ไม่เจอคำค้นเก่าค้าง

```ts
// app/patients/page.tsx
} = usePatientPage(PER_PAGE, { handoff: true });

useLayoutEffect(() => {
  let next: { q: string; band: CountKey } | undefined;
  try {
    const fromChart = sessionStorage.getItem("wf_band");
    const fromTop = sessionStorage.getItem("wf_search");
    sessionStorage.removeItem("wf_band");
    sessionStorage.removeItem("wf_search");
    /* ...กลุ่มจากกราฟมาก่อน ตรวจชื่อกลุ่มแล้ว... */
    else if (fromTop) next = { q: fromTop, band: "all" };
  } catch {
    // ที่เก็บของแท็บใช้ไม่ได้ ก็แค่ไม่มีคำค้นตั้งต้น
  }
  startWith(next);   // 🔴 ต้องเรียกทุกทาง แม้ไม่มีของฝาก ตารางรอสัญญาณนี้ก่อนยิงรอบแรก
}, [startWith]);
```

🔴 **หน้าที่รับของฝากห้ามยิงรอบแรกจนกว่าจะหยิบของฝากเสร็จ** (`handoff: true` ใน `usePatientPage`)
   เคยยิงไปก่อน ตารางขึ้นผู้ป่วยทั้งหมดแวบหนึ่งก่อนเหลือคนที่ค้น
🔑 ใช้ที่เก็บของแท็บ (sessionStorage) ไม่ใช่ที่อยู่เว็บ เพราะคำค้นอาจเป็น HN และหยิบแล้วล้างทันที
🔑 คำค้นจากแถบบนตั้งกลุ่มเป็น `ทั้งหมด` เสมอ

## 23. อยู่หน้าทะเบียนอยู่แล้ว — ส่งเป็นข่าว

**บั๊กเดิม** เปิดหน้าทะเบียนอยู่แล้วพิมพ์ค้นบนแถบบน ไม่เกิดอะไร (เจอ 17 ก.ย. 2569 แก้ 1 ต.ค. 2569)
เพราะหน้าไม่ได้เปิดใหม่ ของฝากในที่เก็บของแท็บจึงไม่ถูกหยิบ

```ts
// components/shell/PatientSearch.tsx
export const PATIENT_SEARCH_EVENT = "wf-patient-search";

// app/patients/page.tsx — ตัวตั้งคำค้นเก็บในตัวอ้างอิง ได้ตัวล่าสุดเสมอโดยไม่ต้องผูกตัวฟังใหม่
const ตั้งคำค้น = useRef<(term: string) => void>(() => {});
useEffect(() => {
  ตั้งคำค้น.current = (term) => { changeBand("all"); changeQ(term); };
});
useEffect(() => {
  const ฟัง = (e: Event) => {
    const term = (e as CustomEvent<unknown>).detail;
    if (typeof term === "string" && term.trim()) ตั้งคำค้น.current(term.trim());
  };
  window.addEventListener(PATIENT_SEARCH_EVENT, ฟัง);
  return () => window.removeEventListener(PATIENT_SEARCH_EVENT, ฟัง);
}, []);
```

🔴 ตรวจชนิดของข่าวก่อนใช้ (`typeof term === "string"`) ของที่ไม่ใช่ข้อความทิ้งไป

---

# 📋 ส่วนที่ 5 · ช่องค้นในตารางผู้ป่วย (ทะเบียน หน้ารวม)

## 24. ตัวคุมตาราง `usePatientPage` — ตัวเดียวใช้ทุกหน้า

| เรื่อง | ทำยังไง |
|---|---|
| รอหยุดพิมพ์ | 260 มิลลิวินาที รอบแรก 0 · โครงจางขึ้นทันทีที่กด ไม่งั้นนึกว่าปุ่มเสีย |
| กันคำตอบเก่าแซง | ตัวนับ `seq` แบบเดียวกับข้อ 13 |
| เปลี่ยนคำค้น | กลับหน้าแรกเสมอ `changeQ = (v) => { setQ(v); setPage(0); }` |
| ดึงไม่สำเร็จ | 🔴 **เก็บแถวเดิมไว้ ห้ามล้างเป็นว่าง** ตารางว่างแปลว่าไม่มีผู้ป่วย ซึ่งคนละเรื่องกับดึงไม่ได้ |
| ดึงไม่สำเร็จ แต่ชิปที่กดไม่ตรงกับแถวที่เห็น | ขึ้นคำเตือน (`staleView`) |
| จำผลไว้ | `remember` / `peek` ของ `lib/dataCache.ts` วางแถวเดิมลงจอก่อนเฟรมแรก พร้อมป้าย `swapped` |
| ลืมสลับแป้น | ข้อ 9 |

```tsx
<SearchBox value={q} onChange={changeQ} placeholder="คีย์ HN หรือพิมพ์ชื่อผู้ป่วย"
  ariaLabel="ค้นหาผู้ป่วยในทะเบียน" h={42}
  swapLabel={keyed && swapped ? swapped : undefined} />
```

## 25. ความกว้างช่องให้ขอบขวาตรงชิป — ไม้บรรทัดล่องหน

> *"เเถบค้น ยาวถึกรอบ ต่ำกว่าเป้าหมาย"* (หน้าทะเบียน)
> *"เราพูดผิด เอาถึว INR สูกว่าเป้า"* (หน้ารวม) — เจ้าของงาน 1 ต.ค. 2569

| หน้า | ขอบขวาของช่องตรงกับ | ชิปที่วัด |
|---|---|---|
| ทะเบียน | ขอบขวาชิป INR ต่ำกว่าเป้าหมาย | `["all", "hi", "lo"]` |
| หน้ารวม | ขอบขวาชิป INR สูงกว่าเป้าหมาย | `["all", "today", "hi"]` |

วางชิปชุดเดียวกันแบบล่องหนไว้ในช่องตารางเดียวกับช่องค้นหา ช่องจึงกว้างเท่าชิปจริงเสมอ

```tsx
// components/PatientTable.tsx
export function ChipWidth({ keys, band, counts, children }: {
  keys: CountKey[]; band: CountKey; counts: Counts | null; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "inline-grid", flex: "none", minWidth: 0 }}>
      <div aria-hidden="true" style={{ gridArea: "1 / 1", visibility: "hidden", height: 0, overflow: "hidden" }}>
        <BandChips keys={keys} band={band} counts={counts} onPick={() => {}} style={{ flexWrap: "nowrap" }} />
      </div>
      <div style={{ gridArea: "1 / 1", minWidth: 0 }}>{children}</div>
    </div>
  );
}

<ChipWidth keys={["all", "hi", "lo"]} band={band} counts={counts}>
  <SearchBox ... />
</ChipWidth>
```

🔴 **ห้ามฝังความกว้างเป็นตัวเลข** เคยใส่ 509 กับ 648 จากการวัดตอนฟอนต์ไทยยังโหลดไม่เสร็จในแท็บที่ไม่ได้เปิดดู ขอบเลยไม่ตรงบนจอจริง
   ชิปมีตัวเลขจำนวนคน ความกว้างเปลี่ยนตามข้อมูล ไม้บรรทัดล่องหนตามให้เอง
🔴 วัดเทียบขอบต้องรอฟอนต์ก่อนเสมอ `await document.fonts.ready` แล้วค่อยอ่านตำแหน่ง

## 26. ไฮไลต์ในตาราง

```tsx
<PatientTable ... spacedName hl={keyed ? swapped || keyed : ""} />

// components/PatientTable.tsx
const ชื่อ = spacedName ? ชื่อเว้นวรรค(r) : r.full_name;
return hl ? <ไฮไลต์ ข้อความ={ชื่อ} คำ={hl} กติกาผู้ป่วย /> : ชื่อ;
...
<td className="num">{hl ? <ไฮไลต์ ข้อความ={r.hn} คำ={hl} กติกาผู้ป่วย /> : r.hn}</td>
```

ไฮไลต์ทั้งชื่อและ HN แบบเดียวกับรายการบนแถบบน · เปิด `กติกาผู้ป่วย` ทุกจุด (ข้อ 31)

---

# 🪪 ส่วนที่ 6 · ชื่อผู้ป่วยบนจอ

## 27. เว้นวรรคคำนำหน้า

> *"วรรค คำนำหน้า กับชื่อด้วย"* (รายการบนแถบบน) → *"วรรคคำนำหน้ากับชื่อบนหัวแฟ้มด้วย"* → *"วรรคคำนำหน้ากับชื่อในตารางทะเบียนด้วย"*

```ts
// lib/patientName.ts
export function ชื่อเว้นวรรค(p: {
  full_name: string; prefix?: string | null; first_name?: string | null; last_name?: string | null;
}): string {
  return p.prefix && p.first_name ? `${p.prefix} ${p.first_name} ${p.last_name ?? ""}`.trim() : p.full_name;
}
```

🔴 **ห้ามตัดคำนำหน้าออกจาก `full_name` ด้วยการเดา** ในฐานเขียนติดกัน `นาง` + `สาวิตรี` = `นางสาวิตรี`
   ตัดแบบเดาจะได้ `นางสาว` กับ `ิตรี` · ต้องประกอบจากสามช่องที่ทะเบียนเก็บแยกไว้
🔑 ทะเบียนเก่าที่ไม่มีสามช่อง ใช้ `full_name` เดิม

## 28. เติมชื่อแยกช่องฝั่งเซิร์ฟเวอร์

ฟังก์ชันของตารางในฐานส่ง `full_name` มาก้อนเดียว เส้นทางจึงอ่านสามช่องเพิ่มเฉพาะคนในชุดนั้น (ไม่เกินหนึ่งหน้า)

```ts
// lib/patientNameServer.ts
export async function เติมชื่อแยกช่อง<T extends { patient_id: string }>(db: SupabaseClient, rows: T[], demo: boolean): Promise<T[]> {
  const ids = rows.map((r) => r.patient_id).filter(Boolean);
  if (!ids.length) return rows;
  const { data, error } = await db.from("wf_patient").select("id, prefix, first_name, last_name")
    .in("id", ids).eq("is_demo", demo).is("deleted_at", null);
  if (error) {
    console.error("[wf] อ่านคำนำหน้าของผู้ป่วยในชุดนี้ไม่สำเร็จ:", error.message);
    return rows;   // 🔴 อ่านไม่ได้ ชื่อแค่ไม่เว้นวรรค ห้ามทำให้ทั้งคำขอล้ม
  }
  type Name = { id: string; prefix: string | null; first_name: string | null; last_name: string | null };
  const by = new Map(((data ?? []) as Name[]).map((n) => [n.id, n]));
  return rows.map((r) => {
    const n = by.get(r.patient_id);
    return n ? { ...r, prefix: n.prefix, first_name: n.first_name, last_name: n.last_name } : r;
  });
}

// app/api/patients/route.ts หลังเรียกฟังก์ชันของตาราง
page.rows = await เติมชื่อแยกช่อง(supabaseAdmin(), page.rows ?? [], demoOf(req, body));
```

ใช้ที่ `/api/patients` (ทะเบียน หน้ารวม) กับ `/api/schedule` (ตารางนัด) · ทางค้นแบบเร็วอ่านสามช่องตรงอยู่แล้ว ไม่ต้องเติม

## 29. ใช้เฉพาะจุดที่เจ้าของงานชี้

| จุด | ไฟล์ |
|---|---|
| รายการค้นบนแถบบน | `components/shell/PatientSearch.tsx` |
| หัวแฟ้มผู้ป่วย | `app/patients/[pid]/page.tsx` |
| ตารางทะเบียน หน้ารวม ตารางนัด | `PatientTable` ส่ง `spacedName` |

🔴 จุดอื่นยังแสดง `full_name` เหมือนเดิม จะเพิ่มจุดไหนต้องให้เจ้าของงานชี้ (ขอบเขตเป็นของเจ้าของงาน)

## 30. ข้อบ่งใช้ใต้ชื่อ

รายการบนแถบบนขึ้นข้อบ่งใช้ (`indication`) เป็นบรรทัดเล็กใต้ชื่อ ช่วยแยกคนชื่อซ้ำ ไม่มีค่า = ไม่ขึ้นบรรทัดนี้

> *"ตรงค้าหา มันมีโรคด้วยเหรอ"* · *"เเล้วทำไมอันนี้ไม่มีโรคล่ะ งง"*
> *"สอเคสนี้มันเคสทดสอบ แปลวว่าเธอสร้าเคสรายละเอียดไม่ครบสิงั้น ... สิ่งที่เราจะเทสมันควรมีครบสิ"*

🔴 **ข้อมูลที่ใช้ทดสอบต้องมีครบทุกช่องที่จอแสดง** เคสทดสอบเดิมไม่มีข้อบ่งใช้ บรรทัดนี้จึงไม่เคยถูกทดสอบเลย
   เจ้าของงานเห็นเองจากภาพไอคอนที่ขอให้วาด (บันทึกคำด่า 1 ต.ค. 2569 (7))

---

# 🖍 ส่วนที่ 7 · ไฮไลต์

## 31. ไฮไลต์ตัวกลาง `components/ui/Highlight.tsx`

```tsx
import { isHn, normalizeHn } from "@/lib/hn";

/** สระบนล่างกับวรรณยุกต์ไทยที่เกาะพยัญชนะ ั ิ ี ึ ื ุ ู ฺ ็ ่ ้ ๊ ๋ ์ ํ ๎ */
const ตัวเกาะ = /[ัิ-ฺ็-๎]/;

export function ไฮไลต์({ ข้อความ, คำ, กติกาผู้ป่วย = false }: { ข้อความ: string; คำ: string; กติกาผู้ป่วย?: boolean }) {
  const ล่าง = ข้อความ.toLowerCase();
  let คำค้น = คำ.toLowerCase().split(/\s+/).filter(Boolean);
  /* ข้อความที่ใช้เทียบ กับตำแหน่งจริงของตัวอักษรแต่ละตัว · ไม่เปิดกติกาผู้ป่วย = เทียบกับข้อความตรง ๆ */
  let เทียบ = ล่าง;
  let ตำแหน่งจริง: number[] | null = null;
  if (กติกาผู้ป่วย) {
    คำค้น = คำค้น.map((k) => (isHn(k) ? normalizeHn(k) : k)).filter(Boolean);
    ตำแหน่งจริง = [];
    เทียบ = "";
    for (let j = 0; j < ล่าง.length; j++) {
      if (/\s/.test(ล่าง[j])) continue;
      เทียบ += ล่าง[j];
      ตำแหน่งจริง.push(j);
    }
  }
  const ที่เจอ = คำค้น
    .map((k) => {
      const i = เทียบ.indexOf(k);
      if (i < 0) return null;
      return ตำแหน่งจริง
        ? ([ตำแหน่งจริง[i], ตำแหน่งจริง[i + k.length - 1] + 1] as const)
        : ([i, i + k.length] as const);
    })
    .filter((x): x is readonly [number, number] => x !== null)
    .sort((a, b) => a[0] - b[0]);
  if (!ที่เจอ.length) return <>{ข้อความ}</>;
  const ชิ้น: ReactNode[] = [];
  let ถึง = 0;
  for (const [i, ท้าย] of ที่เจอ) {
    /* ขยายขอบให้ครบพยางค์ ถอยต้นจนเจอตัวที่ไม่ใช่ตัวเกาะ เลื่อนท้ายจนพ้นตัวเกาะ */
    let เริ่ม = i;
    let จบ = ท้าย;
    while (เริ่ม > 0 && ตัวเกาะ.test(ข้อความ[เริ่ม])) เริ่ม--;
    while (จบ < ข้อความ.length && ตัวเกาะ.test(ข้อความ[จบ])) จบ++;
    if (เริ่ม < ถึง) continue; // ทับกับคำก่อนหน้า ข้ามไป
    if (เริ่ม > ถึง) ชิ้น.push(ข้อความ.slice(ถึง, เริ่ม));
    ชิ้น.push(
      <mark key={เริ่ม} style={{ background: "#dcefe4", color: "#2f7d5d", fontWeight: 700, padding: 0 }}>
        {ข้อความ.slice(เริ่ม, จบ)}
      </mark>
    );
    ถึง = จบ;
  }
  ชิ้น.push(ข้อความ.slice(ถึง));
  return <>{ชิ้น}</>;
}
```

| เรื่อง | ค่า |
|---|---|
| สี | ตัว `#2f7d5d` พื้น `#dcefe4` หนา 700 ตามสกิล `search-system` ข้อ 13 |
| พิมพ์หลายคำ | ไฮไลต์ทุกคำ คำละที่แรกที่เจอ ทับกันข้าม |
| ตัวพิมพ์ | ไม่สนตัวใหญ่ตัวเล็ก |
| ขอบไฮไลต์ไทย | ลากสระบนล่างกับวรรณยุกต์ไปพร้อมตัวที่มันเกาะ ไม่ตัดกลางพยางค์ (`search-system` หัวข้อไฮไลต์ข้อความไทย · 2 ต.ค. 2569) |
| `กติกาผู้ป่วย` | **เปิดเฉพาะช่องค้นผู้ป่วย** (แถบบน · ตารางทะเบียน · ตารางหน้ารวม) ทั้งชื่อและ HN · ① เทียบแบบไม่สนช่องว่าง แล้วแปลงตำแหน่งกลับมาที่ข้อความที่เว้นวรรค ② คำที่เป็นเลขล้วนตัดศูนย์นำหน้าก่อน · เพิ่ม 20 ต.ค. 2569 (ข้อ 33) |

🔴 **`กติกาผู้ป่วย` ต้องเป็นตัวเลือกที่เปิดเฉพาะจุด ห้ามตั้งเป็นค่าเริ่มต้น** ตัวไฮไลต์ใช้ร่วมกับหน้าคลังยาและคลังวิธีบริหารยา
   ซึ่งตัวค้นของหน้านั้นไม่ได้ค้นข้ามช่องว่าง เปิดทั้งเว็บแล้วจะสว่างคำที่ไม่ใช่เหตุผลที่แถวนั้นถูกค้นเจอ

> *"กลับไปสีเขียวละกัน"* (เจ้าของงาน 1 ต.ค. 2569 หลังแคลร์ลองเปลี่ยนเป็นโทนโรส)

🔴 **สีไฮไลต์เป็นของกลางทั้งเว็บ** เปลี่ยนที่ตัวกลางเท่ากับเปลี่ยนทุกจุดที่เรียกใช้ ต้องบอกเจ้าของงานก่อนว่าจุดไหนเปลี่ยนตามบ้าง
   เจ้าของงานถาม *"เธอเปลี่ยนทีเดียว มันเปลี่ยนสีไฮไลต์ทั้เว็บเลยใช่ไหม"* ตอนนั้นเว็บมีไฮไลต์อยู่ 3 ชุด
🔴 ห้ามวาดไฮไลต์เองในหน้า เรียกตัวกลางนี้ (ตารางคลังวิธีบริหารยังวาดเองสีเหลือง ค้างในโรดแมปของ warfarin)

---

# 🔒 ส่วนที่ 8 · ความลับของ HN

## 32. รวมทุกข้อไว้ที่เดียว

| ห้าม | ทำแบบนี้แทน |
|---|---|
| HN ในที่อยู่เว็บ (`?q=` · `/patients/<HN>`) | ส่งทางตัวข้อความ POST · เปิดแฟ้มด้วย `patient_id` |
| คำค้นในบันทึกของเซิร์ฟเวอร์ | เขียนเฉพาะข้อความผิดพลาด |
| ส่งคำค้นข้ามหน้าทางที่อยู่เว็บ | ที่เก็บของแท็บ หยิบแล้วล้างทันที · หรือส่งเป็นข่าวในหน้าเดียวกัน |
| เขียนข้อมูลผู้ป่วยลงที่เก็บถาวรของเบราว์เซอร์เพื่อจำผลค้น | จำในหน่วยความจำ (`lib/dataCache.ts`) ปิดแท็บแล้วหาย |
| ใช้ HN จริงตอนทดสอบหรือเขียนในเอกสาร | ใช้เคสทดสอบ HN 999998 · 999999 |
| ลืมกรองเคสตัวอย่าง | `demoOf(req, body)` ทุกเส้นทาง |

---

# 🕳 ส่วนที่ 9 · ช่องโหว่ที่ยังเปิดอยู่

## 33. พิมพ์ในช่องค้นบนแถบบนจริงในโครม 1 ต.ค. 2569 — ปิดแล้ว 4 จาก 5 (20 ต.ค. 2569)

เจ้าของงานสั่ง 20 ต.ค. 2569 *"อันไหนที่ไม่ต้องให้เราเคาะ ทำต่อเลยนะ แล้วเทสด้วย"* แล้วอนุญาตให้แก้ฐาน *"รันเลย"*
แก้ทั้งสองทางค้นพร้อมกัน (ข้อ 1) · ฟังก์ชันของตาราง `scripts/030_patient_search_words.sql` · ไฮไลต์เพิ่ม `กติกาผู้ป่วย` (ข้อ 31)

| พิมพ์ | เดิม 1 ต.ค. | ต้นเหตุเดิม | ตอนนี้ 20 ต.ค. |
|---|---|---|---|
| `นาย ทดสอบ` (เว้นวรรคแบบที่เห็นบนจอ) | ❌ ไม่เจอ | ในฐาน `full_name` เขียนคำนำหน้าติดชื่อ ค้นทั้งก้อนจึงไม่ตรง | ✅ เจอ 2 คน แยกคำแล้วทุกคำต้องอยู่ในชื่อ |
| `นายทดสอบ` (ติดกัน) | ⚠️ เจอ แต่ไม่มีไฮไลต์ | จอแสดงชื่อเว้นวรรค (ข้อ 27) ไฮไลต์หาคำที่ติดกันในชื่อที่เว้นวรรคไม่เจอ | ✅ สว่าง `นาย ทดสอบ` ไฮไลต์เทียบแบบไม่สนช่องว่าง |
| `ชุดตรวจ ทดสอบ` (นามสกุลก่อนชื่อ) | ❌ ไม่เจอ | ค้นทั้งก้อนตามลำดับ ไม่แยกคำแบบสมองค้นยา (`search-system` ข้อ 2) | ✅ เจอ 1 คน สว่างทั้งสองคำ |
| `0999998` (HN มีศูนย์นำหน้า) | ❌ ไม่เจอ | ทะเบียนเก็บ HN แบบตัดศูนย์นำหน้า (`lib/hn.ts` `normalizeHn`) แต่ช่องค้นไม่ได้ตัด | ✅ เจอ HN 999998 สว่างทั้งเลข · พิมพ์ `000` ไม่เจอใคร |
| สระกับวรรณยุกต์เรียงคนละลำดับ | ยังไม่ได้ทำ | ยังไม่มีตัวจัดลำดับเครื่องหมายไทย (`search-system` ข้อ 18) | ⬜ ยังเปิดอยู่ · ทางที่เสนอ ทำกุญแจเทียบตาม `search-system` ข้อ 18 ใช้เทียบอย่างเดียว ห้ามเขียนกลับลงฐาน |

**ตรวจหลังแก้ฐาน 20 ต.ค. 2569** (ข้อ 5) — สำรองฐานก่อนแก้ · ยิงทุกกลุ่มกรอง 31 กลุ่ม ทั้งผู้ป่วยจริงและเคสตัวอย่าง ตัวเลขเท่าก่อนแก้ทุกช่อง
· เทสในโครมครบ 3 ช่อง (แถบบน · ตารางทะเบียน · ตารางหน้ารวม) · `999` `ตตต` `mflv[` `ฟฟฟฟฟ` ได้ผลเท่าเดิม · หน้าคลังยาไฮไลต์เหมือนเดิม

🔴 แก้ฟังก์ชันของตารางในฐาน ต้องสำรองฐานก่อน และยิงทุกกลุ่มกรองหลังแก้ (ข้อ 5)
🔴 สองทางค้นต้องแก้พร้อมกัน (ข้อ 1)
🔑 พิมพ์ตัวเลขเว้นวรรค (`9999 98`) ไม่นับเป็น HN เพราะไม่ใช่เลขล้วน จะไปค้นจากชื่อแทน ได้ 0 คน · ทั้งสองทางค้นทำเหมือนกัน

---

# ✅ วิธีทดสอบ

ใช้เคสทดสอบในข้อมูลจริง ห้ามใช้ HN จริง

| HN | ชื่อบนจอ | ข้อบ่งใช้ |
|---|---|---|
| 999998 | นาย ทดสอบ ชุดตรวจ | AF |
| 999999 | นาย ทดสอบระบบ ลบทิ้งได้ | Mechanical valve |

**ช่องค้นบนแถบบน** — พิมพ์จริงทีละข้อ ดูด้วยตา

| พิมพ์หรือกด | ต้องได้ |
|---|---|
| `999` | 2 คน HN ขึ้นต้น 999 ไฮไลต์ ไม่มีป้าย ค้นว่า |
| `ตตต` | 2 คนเดิม ป้าย `ค้นว่า 999` ในช่อง |
| `mflv[` | 2 คน ป้าย `ค้นว่า ทดสอบ` ไฮไลต์คำว่า ทดสอบ |
| `ฟฟฟฟฟ` | `ไม่เจอผู้ป่วยที่ตรงกับ ฟฟฟฟฟ` ไม่แปลงเป็นอย่างอื่น |
| `นาย ทดสอบ` (เว้นวรรค) | 2 คน สว่าง `นาย` กับ `ทดสอบ` |
| `นายทดสอบ` (ติดกัน) | 2 คน สว่าง `นาย ทดสอบ` ข้ามช่องว่างบนจอ |
| `ชุดตรวจ ทดสอบ` (นามสกุลก่อนชื่อ) | 1 คน HN 999998 สว่างทั้งสองคำ |
| `0999998` (ศูนย์นำหน้า) | 1 คน HN 999998 สว่างทั้งเลข |
| `000` | `ไม่เจอผู้ป่วยที่ตรงกับ 000` |
| ลูกศรลงแล้ว Enter | เปิดแฟ้มคนที่ชี้ ที่อยู่เว็บเป็นรหัสภายใน **ไม่มี HN** |
| พิมพ์แล้ว Enter โดยไม่ชี้ใคร | ไปหน้าทะเบียน ตารางกรองด้วยคำนั้น |
| เปิดหน้าทะเบียนอยู่แล้ว พิมพ์ `999998` แล้ว Enter | ตารางในหน้าเดิมกรองเหลือ 1 แถว |
| คลิกที่อื่นแล้วคลิกกลับเข้าช่อง | รายการกลับมาด้วยผลเดิม |
| Esc | รายการปิด คำค้นยังอยู่ |
| ชี้แถวแล้วเลื่อนเมาส์ออกนอกกรอบ | สีแถวหาย ลูกศรหาย |
| ช่องที่วางไว้ล่างจอ (ตอนยกไปใช้ที่อื่นที่ไม่ใช่แถบบน) | กรอบกางขึ้นข้างบน ยังติดกับช่อง · บนแถบบนแทบไม่มีทางกางขึ้น เพราะข้างบนไม่มีที่ |

**ช่องค้นในตาราง** — หน้าทะเบียนกับหน้ารวมพิมพ์ `mflv[` กับห้าแถวท้ายตารางข้างบน ต้องได้ผลเท่าช่องบนแถบบน พร้อมป้ายและไฮไลต์ในตาราง

**ดูว่าคำค้นไม่หลุดไปที่อยู่เว็บ** — เปิดรายการคำขอในเครื่องมือของเบราว์เซอร์ คำขอ `/api/patients/search` ต้องเป็น POST และคำค้นอยู่ในตัวข้อความ ที่อยู่ไม่มีคำค้น

**ช่องโหว่ข้อ 33** — พิมพ์ทุกแบบในตารางข้อ 33 ทุกครั้งที่แตะเส้นทางค้น ผลต้องตรงกับช่อง ตอนนี้ (แก้ช่องโหว่ที่เหลือแล้วต้องมาแก้ตารางนั้นด้วย)

🔴 ความเร็วต้องดูด้วย พิมพ์ `999` แล้วรายชื่อต้องขึ้นเร็วกว่าเดิมที่เจ้าของงานทักว่าเกือบ 1 วินาที

---

# 📊 เว็บไหนทำแล้ว

> 🚨 ห้ามเชื่อตารางนี้โดยไม่ตรวจโค้ดจริงก่อน

| เว็บ | สถานะ |
|---|---|
| warfarin | ✅ ครบด่านตรวจ 12 ข้อ (1 ต.ค. 2569 รุ่น 0.6.9.0) · ช่องโหว่ข้อ 33 ปิดแล้ว 4 จาก 5 (20 ต.ค. 2569 ในเครื่อง ยังไม่พุช) เหลือลำดับเครื่องหมายไทย |
| เว็บอื่น | ยังไม่ได้ตรวจ ยกไปเมื่อไหร่ใช้รายการไฟล์ข้างบน แล้วเปิดสกิลนี้ไล่ด่านตรวจ |

---

# 🔴 ความผิดที่เคยทำ ห้ามซ้ำ

| เมื่อไหร่ | ทำอะไรผิด |
|---|---|
| ก่อน 1 ต.ค. 2569 | ช่องค้นบนแถบบนพิมพ์แล้วไม่มีอะไรขึ้น ต้องกด Enter แล้วกระโดดไปหน้าทะเบียน เจ้าของงานพิมพ์ 999 แล้วนึกว่าค้นไม่เจอ |
| 17 ก.ย. ถึง 1 ต.ค. 2569 | เปิดหน้าทะเบียนอยู่แล้วพิมพ์ค้นบนแถบบน ตารางไม่กรอง ค้างอยู่สองสัปดาห์ |
| 1 ต.ค. 2569 | ช่องบนแถบบนใช้ทางของตารางที่คิดของหนัก ค้นเกือบ 1 วินาที |
| 1 ต.ค. 2569 | เว้นระยะระหว่างช่องค้นกับกรอบรายการ |
| 1 ต.ค. 2569 | คำอธิบายท้ายรายการไม่สอนเรื่องลูกศร แล้วยาวเกินสองบรรทัด |
| 1 ต.ค. 2569 | ช่องค้นหน้าทะเบียนไม่ได้ใช้ตัวแปลงแป้นตัวเดียวกับแถบบน พิมพ์ `mflv[` แล้วไม่เจอ |
| 1 ต.ค. 2569 | เปลี่ยนสีไฮไลต์ที่ตัวกลาง โดยไม่ได้บอกก่อนว่าเปลี่ยนทั้งเว็บ |
| 1 ต.ค. 2569 | เคสทดสอบข้อมูลไม่ครบ บรรทัดข้อบ่งใช้ใต้ชื่อจึงไม่เคยถูกทดสอบ |
| 1 ต.ค. 2569 | ฝังความกว้างช่องค้นเป็นตัวเลขจากการวัดตอนฟอนต์ยังโหลดไม่เสร็จ ขอบไม่ตรงชิปบนจอจริง |

🔴🔴 **แตะการค้นหาผู้ป่วยเมื่อไหร่ เปิดสกิลนี้อ่านให้จบก่อนเสมอ** แล้วเปิด `search-system` ข้อที่อ้างถึงด้วย
