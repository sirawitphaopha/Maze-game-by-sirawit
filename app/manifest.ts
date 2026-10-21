import type { MetadataRoute } from "next";

/* ไฟล์ประกาศตัวตนของแอป เพิ่มลงหน้าจอโฮมแล้วเปิดเต็มจอแบบแอป ไม่มีแถบที่อยู่เว็บ (สกิล mobile-web-app "ทุกเว็บมือถือต้องทำ")
   · ไอคอนเป็น PNG ใน public/ สร้างจาก app/icon.svg (iOS ไม่รับ SVG) · maskable เผื่อขอบให้แอนดรอยด์ตัดเป็นวงกลมได้
   · ประตูรหัสผ่านยกเว้นไอคอนกับไฟล์นี้แล้ว (middleware.ts) เพราะเบราว์เซอร์โหลดเองโดยไม่แนบบัตรผ่าน
   · short_name ไม่เกิน 12 ตัวอักษร ไม่งั้นใต้ไอคอนโดนตัดด้วยจุดไข่ปลา
   · display standalone ไม่มีปุ่มย้อนกลับของเบราว์เซอร์ ทุกหน้ามีทางกลับของตัวเองแล้ว (แท็บบนแถบบน ปุ่มกลับในตัวดูย้อน) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ห้องทดลองเขาวงกต",
    short_name: "เขาวงกต",
    description: "ดู 11 วิธีสร้างเขาวงกต แล้วลองเดินเอง บันทึกเกมที่เล่นจบ เปิดดูย้อนได้",
    start_url: "/",
    display: "standalone",
    background_color: "#ECF4F6",
    theme_color: "#0A7EA4",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
