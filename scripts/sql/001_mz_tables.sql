-- ============================================================
-- เกมเขาวงกต (repo Maze-game-by-sirawit) · ตารางในฐาน Supabase โปรเจกต์ tb-calculator
-- 🔴 ทุกอย่างในไฟล์นี้ขึ้นต้นด้วย mz_ ไม่แตะตารางหรือฟังก์ชันเดิมของเว็บงานในฐานนี้เด็ดขาด
-- 🔴 เปิด RLS ทุกตาราง ไม่มี policy ใด ๆ และถอนสิทธิ์ anon กับ authenticated (สกิล db-safety ข้อ 36 ตั้งใจ)
--    เบราว์เซอร์อ่านเขียนตรงไม่ได้ ต้องผ่านเส้นทางหลังบ้านของเกมที่ถือกุญแจ service role เท่านั้น
-- ทุกแถวมีเวลาสร้าง เวลาแก้ (ตัวดักฝั่งฐานตั้งให้เอง) ถังขยะ (deleted_at) และร่องรอยการแก้ใน mz_audit_log
-- ไฟล์นี้รันซ้ำได้ (if not exists / or replace / drop trigger if exists)
-- ยกแบบจาก city-lab scripts/sql/001_cb_tables.sql
-- ============================================================

create table if not exists public.mz_games (
  id uuid primary key default gen_random_uuid(),
  -- รหัสก้อนการบันทึก หน้าเว็บสร้างตอนเกมจบ ส่งซ้ำรหัสเดิม = ไม่เพิ่มแถว (กันบันทึกซ้ำตอนเชื่อมต่อสะดุด)
  save_key uuid not null unique,
  -- เวลาที่เล่นจบ จากเบราว์เซอร์ (ไม่ใช่นาฬิกาของฐาน)
  played_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- แถวที่ชุดทดสอบสร้าง ไม่แสดงในประวัติ
  is_test boolean not null default false,
  app_version text not null check (length(app_version) <= 20),
  -- ค่าตั้งของด่าน
  level text not null check (level in ('easy', 'mid', 'hard', 'hell')),
  size smallint not null check (size between 5 and 60),
  algo text not null check (algo in ('dfs', 'hunt', 'growing', 'prim', 'kruskal', 'ab', 'wilson', 'binary', 'sidewinder', 'eller', 'division')),
  min_len smallint not null check (min_len between 3 and 20),
  loops smallint not null check (loops between 0 and 4),
  fog boolean not null,
  -- ผังกำแพงทั้งกระดาน แพ็กเป็นข้อความ (lib/game/encode.ts) · เก็บผังจริงไม่ใช่รหัสสุ่ม เกมเก่าดูย้อนได้ตลอด
  walls text not null check (length(walls) between 1 and 2000),
  exit_x smallint not null check (exit_x >= 0 and exit_x < size),
  -- บันทึกการเดินทุกก้าวพร้อมเวลา แพ็กเป็นข้อความ (lib/game/encode.ts)
  moves text not null check (length(moves) <= 200000),
  -- ผล
  time_ms integer not null check (time_ms >= 0),
  steps integer not null check (steps >= 0),
  shortest integer not null check (shortest >= 0),
  decisions integer not null check (decisions >= 0),
  wrong integer not null check (wrong >= 0),
  lost integer not null check (lost >= 0),
  back integer not null check (back >= 0),
  rewalk integer not null check (rewalk >= 0),
  warps integer not null check (warps >= 0),
  score smallint not null check (score between 0 and 100),
  choices integer not null check (choices >= 0),
  loop_count integer not null check (loop_count >= 0),
  -- เล่นด่านเดิมอีกรอบจากเกมไหน
  replay_of uuid references public.mz_games (id)
);
comment on table public.mz_games is 'เกมเขาวงกต · เกมที่เล่นจบ 1 แถว = 1 เกม · ผังกำแพงกับบันทึกการเดินดูย้อนได้ · ลบ = ประทับ deleted_at';

create table if not exists public.mz_audit_log (
  id bigserial primary key,
  table_name text not null,
  row_id uuid,
  action text not null,
  changed_at timestamptz not null default now(),
  old_row jsonb,
  new_row jsonb
);
comment on table public.mz_audit_log is 'เกมเขาวงกต · ร่องรอยทุกการเพิ่ม แก้ ลบ ในตาราง mz_ (ไม่เก็บผังกำแพงกับบันทึกการเดิน กันตารางโต)';

create index if not exists mz_games_played_idx on public.mz_games (played_at desc) where deleted_at is null and not is_test;
create index if not exists mz_audit_row_idx on public.mz_audit_log (table_name, row_id, changed_at desc);

-- ── ตัวดักฝั่งฐาน ──
create or replace function public.mz_touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.mz_audit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.mz_audit_log (table_name, row_id, action, old_row, new_row)
    values (tg_table_name, old.id, tg_op, to_jsonb(old) - 'moves' - 'walls', null);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.mz_audit_log (table_name, row_id, action, old_row, new_row)
    values (tg_table_name, new.id, tg_op, to_jsonb(old) - 'moves' - 'walls', to_jsonb(new) - 'moves' - 'walls');
    return new;
  else
    insert into public.mz_audit_log (table_name, row_id, action, old_row, new_row)
    values (tg_table_name, new.id, tg_op, null, to_jsonb(new) - 'moves' - 'walls');
    return new;
  end if;
end;
$$;

drop trigger if exists mz_games_touch on public.mz_games;
create trigger mz_games_touch before update on public.mz_games for each row execute function public.mz_touch_updated_at();
drop trigger if exists mz_games_audit on public.mz_games;
create trigger mz_games_audit after insert or update or delete on public.mz_games for each row execute function public.mz_audit();

-- ── กติกาการเข้าถึง ──
alter table public.mz_games enable row level security;
alter table public.mz_audit_log enable row level security;

revoke all on public.mz_games from anon, authenticated;
revoke all on public.mz_audit_log from anon, authenticated;
revoke all on sequence public.mz_audit_log_id_seq from anon, authenticated;
revoke execute on function public.mz_touch_updated_at() from public, anon, authenticated;
revoke execute on function public.mz_audit() from public, anon, authenticated;
