import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { dbConfigured } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** บอกหน้าเว็บว่าตั้งค่าเชื่อมฐานแล้วหรือยัง · ไม่ส่งค่ากุญแจหรือที่อยู่ฐานออกไป (สกิล db-safety ทางเข้าฐาน ③) */
export async function GET(req: Request) {
  const กัน = await requireAuth(req);
  if (กัน) return กัน;
  return NextResponse.json({ configured: dbConfigured() });
}
