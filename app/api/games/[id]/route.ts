import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { FULL_COLS, TABLES, bad, dbFail, dbReady, supabaseAdmin } from "@/lib/server/games";

/* เกมเดียว พร้อมผังกำแพงกับบันทึกการเดิน สำหรับตัวดูย้อน · รหัสยึดจากเส้นทางเท่านั้น (สกิล db-safety ทางเข้าฐาน ②)
   DELETE ลบเกม = ประทับเวลา deleted_at ไม่ลบแถว กู้คืนได้ที่ฐาน (สกิล pharmacy-web-logic ข้อ 19 ถังขยะ) · นับแถวที่โดนจริง (สกิล data-integrity) */

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const กัน = await requireAuth(req);
  if (กัน) return กัน;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return bad("รหัสเกมไม่ถูกต้อง");
  const nodb = dbReady();
  if (nodb) return nodb;
  try {
    const q = await supabaseAdmin().from(TABLES.games).select(FULL_COLS).eq("id", id).is("deleted_at", null).maybeSingle();
    if (q.error) return dbFail("get", q.error.message, "อ่านฐานข้อมูลไม่สำเร็จ ลองใหม่ภายหลัง");
    if (!q.data) return bad("ไม่พบเกมนี้", 404);
    return NextResponse.json({ game: q.data });
  } catch (e) {
    return dbFail("get", e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const กัน = await requireAuth(req);
  if (กัน) return กัน;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return bad("รหัสเกมไม่ถูกต้อง");
  const nodb = dbReady();
  if (nodb) return nodb;
  try {
    const db = supabaseAdmin();
    const q = await db.from(TABLES.games).update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null).select("id");
    if (q.error) return dbFail("delete", q.error.message, "ลบไม่สำเร็จ ลองใหม่ภายหลัง");
    if (q.data && q.data.length === 1) return NextResponse.json({ ok: true, id });
    // ไม่โดนสักแถว · ลบไปแล้วก่อนหน้า (เช่น ลองส่งซ้ำตอนเน็ตหลุด) ตอบสำเร็จ · ไม่มีแถวนี้เลย ตอบไม่พบ
    const old = await db.from(TABLES.games).select("id").eq("id", id).maybeSingle();
    if (old.error) return dbFail("delete", old.error.message, "ลบไม่สำเร็จ ลองใหม่ภายหลัง");
    if (old.data) return NextResponse.json({ ok: true, id, already: true });
    return bad("ไม่พบเกมนี้", 404);
  } catch (e) {
    return dbFail("delete", e);
  }
}
