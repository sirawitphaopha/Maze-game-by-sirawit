import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ============================================================
   ตัวเชื่อมฐานข้อมูล ฝั่งเซิร์ฟเวอร์เท่านั้น (ยกจาก city-lab ที่ยกจาก warfarin)

   🔴 ฐานนี้คือฐานของ tb-calculator ซึ่งมีข้อมูลผู้ป่วยของเว็บงานอยู่ด้วย
      กุญแจ service_role ข้ามกติกาของตารางได้ทั้งหมด ใครถือไปก็อ่านและลบได้ทุกแถว
      ชื่อตัวแปรห้ามขึ้นต้นด้วย NEXT_PUBLIC_ · ไฟล์นี้ห้ามถูก import จากไฟล์ที่มี "use client"
      (บรรทัด import "server-only" ข้างบนทำให้พังตั้งแต่ตอนสร้างเว็บถ้ามีใครเผลอ · สกิล db-safety ข้อ 24)

   🔴 เกมแตะได้เฉพาะตารางที่ขึ้นต้นด้วย mz_ เท่านั้น
      ทุกเส้นทางหลังบ้านเรียกตารางผ่าน TABLES ข้างล่าง ห้ามรับชื่อตารางจากหน้าเว็บ
   ============================================================ */

export const TABLES = {
  /** เกมที่เล่นจบ (scripts/sql/001_mz_tables.sql) */
  games: "mz_games",
} as const;

const PLACEHOLDER = "PASTE_SECRET_HERE";

let cached: SupabaseClient | null = null;

/** ตั้งค่าครบหรือยัง บอกหน้าเว็บได้โดยไม่ต้องส่งค่ากุญแจออกไป */
export function dbConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key && key !== PLACEHOLDER);
}

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  if (!dbConfigured()) throw new Error("ยังไม่ได้ตั้ง SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ในไฟล์ .env.local");
  cached = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
