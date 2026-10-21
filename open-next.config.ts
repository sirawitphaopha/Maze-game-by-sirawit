// ตัวแปลง Next.js ให้รันบน Cloudflare Workers
// ปล่อยว่างคือใช้ค่ามาตรฐาน เหมือนเว็บ warfarin ME-DRP และยาคืน
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
