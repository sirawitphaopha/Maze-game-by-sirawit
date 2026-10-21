import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { LIST_COLS, TABLES, bad, dbFail, dbReady, gameRow, readBody, supabaseAdmin } from "@/lib/server/games";

/* ============================================================
   เกมที่เล่นจบ
   POST  บันทึกหนึ่งเกม · ส่งซ้ำรหัสก้อนเดิม = ตอบสำเร็จ ไม่เพิ่มแถว (duplicate)
   GET   รายการแบบแบ่งหน้า ?page=1 หน้าละ 50 เกม เรียงจากล่าสุด · ไม่รวมแถวทดสอบกับแถวในถังขยะ
   ============================================================ */

export const dynamic = "force-dynamic";

const PAGE = 50;

export async function POST(req: Request) {
  const กัน = await requireAuth(req);
  if (กัน) return กัน;
  const r = await readBody(req);
  if ("res" in r) return r.res;
  const g = gameRow(r.body);
  if ("error" in g) return bad(g.error);
  const nodb = dbReady();
  if (nodb) return nodb;
  try {
    const db = supabaseAdmin();
    const ins = await db.from(TABLES.games).upsert(g.row, { onConflict: "save_key", ignoreDuplicates: true }).select("id");
    if (ins.error) return dbFail("insert", ins.error.message, "ฐานข้อมูลไม่รับข้อมูล ลองใหม่ภายหลัง");
    if (ins.data && ins.data.length > 0) return NextResponse.json({ ok: true, id: ins.data[0].id, duplicate: false });
    // รหัสก้อนนี้เคยบันทึกแล้ว ตอบรหัสแถวเดิม
    const old = await db.from(TABLES.games).select("id").eq("save_key", g.row.save_key as string).maybeSingle();
    if (old.error || !old.data) return dbFail("insert-dup", old.error?.message ?? "ไม่พบแถวเดิม");
    return NextResponse.json({ ok: true, id: old.data.id, duplicate: true });
  } catch (e) {
    return dbFail("insert", e);
  }
}

export async function GET(req: Request) {
  const กัน = await requireAuth(req);
  if (กัน) return กัน;
  const nodb = dbReady();
  if (nodb) return nodb;
  const page = Math.max(1, Math.min(10000, Number(new URL(req.url).searchParams.get("page")) || 1));
  try {
    const from = (page - 1) * PAGE;
    const q = await supabaseAdmin()
      .from(TABLES.games)
      .select(LIST_COLS, { count: "exact" })
      .is("deleted_at", null)
      .eq("is_test", false)
      .order("played_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (q.error) return dbFail("list", q.error.message, "อ่านฐานข้อมูลไม่สำเร็จ ลองใหม่ภายหลัง");
    return NextResponse.json({ games: q.data ?? [], total: q.count ?? 0, page, pageSize: PAGE });
  } catch (e) {
    return dbFail("list", e);
  }
}
