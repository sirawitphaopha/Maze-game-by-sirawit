/* ไอคอนวาดเอง ไม่ใช้ตัวอักษรพิเศษ บางเครื่องวาดเป็นกล่องเปล่าหรืออีโมจิ (สกิลกลางข้อ 2 · new-web-checklist)
   ปุ่มลูกศรเดิมใช้ ◀ ▶ ▲ ▼ ซึ่งไอโฟนบางรุ่นวาด ◀ ▶ เป็นอีโมจิกรอบสีฟ้า (บั๊กข้อ 7) */

export type IconName = "up" | "down" | "left" | "right" | "x" | "check" | "alert" | "cloud" | "cloudoff" | "play" | "pause" | "restart" | "print" | "sun" | "moon" | "eye" | "undo" | "backspace" | "giveup" | "torch" | "sound" | "mute" | "list" | "grid" | "trash" | "lv1" | "lv2" | "lv3" | "lv4" | "trophy" | "sliders" | "tostart" | "menu";

const PATHS: Record<IconName, React.ReactNode> = {
  up: <path d="M12 5 4.5 15.5h15Z" fill="currentColor" stroke="none" />,
  down: <path d="M12 19 4.5 8.5h15Z" fill="currentColor" stroke="none" />,
  left: <path d="M5 12 15.5 4.5v15Z" fill="currentColor" stroke="none" />,
  right: <path d="M19 12 8.5 4.5v15Z" fill="currentColor" stroke="none" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: <><path d="M12 3.5 2.5 20h19Z" /><path d="M12 10v4.5M12 17.2v.3" /></>,
  cloud: <path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.2 4.7 4.7 0 0 0 7 18.5Z" />,
  cloudoff: <><path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.2 4.7 4.7 0 0 0 7 18.5Z" /><path d="M4 4l16 16" /></>,
  play: <path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" stroke="none" />,
  pause: <><path d="M8.5 5.5v13M15.5 5.5v13" /></>,
  restart: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4.5v4h4" /></>,
  print: <><path d="M7 9V3.5h10V9" /><rect x="3.5" y="9" width="17" height="7.5" rx="1.5" /><path d="M7 14h10v6.5H7Z" /></>,
  // ปุ่มสลับโหมดมืด (components/ui/ThemeToggle.tsx)
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  // ดูเฉลย · กลับไปที่ธง · ปุ่ม Backspace บนป้ายปุ่มลัด (พี่กันสั่ง "ใส่ไอคอนให้ครบ")
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  undo: <><path d="M9 14 4.5 9.5 9 5" /><path d="M4.5 9.5H15a5 5 0 0 1 0 10h-3" /></>,
  // ธงขาว ปุ่มยอมแพ้ (พี่กันสั่ง "ยอมแพ้ ดูเฉลย ไปปรับคำ มันไม่อยู่ในกรอบ")
  giveup: <><path d="M5.5 21V3.5" /><path d="M5.5 4.5h12l-2.5 4 2.5 4h-12" /></>,
  // ปุ่มโหมดไฟฉายกับปุ่มเสียงในแผงตั้งค่าด่าน (พี่กันสั่ง "ขอเป็นปุ่มใหญ่ ไม่ใช่ติ๊ก")
  torch: <><path d="M7.5 3.5h9L15 9H9Z" /><path d="M9 9h6v11.5H9Z" /><path d="M12 12.5v3" /></>,
  sound: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></>,
  mute: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></>,
  // ปุ่มเปลี่ยนมุมมองหน้าประวัติ ตาราง กับ ภาพเขาวงกต
  list: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.2" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" /></>,
  // ปุ่มระดับ ง่าย กลาง ยาก โหด หน้าปัดเข็มชี้ จากซ้าย (ง่าย) ไปขวา (โหด) (พี่กันถาม "มีไอคอนอื่นไหม" เดิมเป็นขีดสัญญาณ)
  lv1: <><path d="M4 16.5a8 8 0 0 1 16 0" /><circle cx="12" cy="16.5" r="1.4" fill="currentColor" stroke="none" /><path d="M12 16.5L6.4 14.5" strokeWidth={2.4} /></>,
  lv2: <><path d="M4 16.5a8 8 0 0 1 16 0" /><circle cx="12" cy="16.5" r="1.4" fill="currentColor" stroke="none" /><path d="M12 16.5L9.5 11" strokeWidth={2.4} /></>,
  lv3: <><path d="M4 16.5a8 8 0 0 1 16 0" /><circle cx="12" cy="16.5" r="1.4" fill="currentColor" stroke="none" /><path d="M12 16.5L14.5 11" strokeWidth={2.4} /></>,
  lv4: <><path d="M4 16.5a8 8 0 0 1 16 0" /><circle cx="12" cy="16.5" r="1.4" fill="currentColor" stroke="none" /><path d="M12 16.5L17.6 14.5" strokeWidth={2.4} /></>,
  // ถ้วยรางวัล หัวการ์ดตอนชนะ
  trophy: <><path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0Z" /><path d="M7.5 6H5a2.5 2.5 0 0 0 2.6 4.2M16.5 6H19a2.5 2.5 0 0 1-2.6 4.2" /><path d="M12 13.5v3.5M8.5 20.5h7M9.5 20.5c0-2 1.1-3.5 2.5-3.5s2.5 1.5 2.5 3.5" /></>,
  // ตัวปรับสามแถบ ปุ่มคืนค่าตั้งต้นของตัวปรับในห้องทดลอง (พี่กันสั่ง 21 ต.ค. 2569 "ใส่ไอคอนปุ่มนี้")
  sliders: <><path d="M4 6.5h3.5M11.5 6.5H20M4 12h9.5M17.5 12H20M4 17.5h2.5M10.5 17.5H20" /><circle cx="9.5" cy="6.5" r="2" /><circle cx="15.5" cy="12" r="2" /><circle cx="8.5" cy="17.5" r="2" /></>,
  // กลับไปจุดเริ่ม เส้นตั้งกับสามเหลี่ยมชี้ซ้าย ปุ่มในตัวดูย้อน (แยกให้ต่างจากปุ่มเล่นซ้ำ)
  // ปุ่มเลือกแท็บบนมือถือ (พี่กันสั่ง 21 ต.ค. 2569 "มีปุ่มเปลี่ยนภาษา โหมดมืด ก็เอาอีกปุ่มเอาไว้เลือกแท็บ")
  menu: <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15" />,
  tostart: <><path d="M6.5 5.5v13" /><path d="M18.5 5.5v13L8.5 12Z" fill="currentColor" stroke="none" /></>,
  // ปุ่มลบเกมในหน้าประวัติ
  trash: <><path d="M4.5 7h15" /><path d="M9.5 7V4.5h5V7" /><path d="M6.5 7l1 13h9l1-13" /><path d="M10 11v5.5M14 11v5.5" /></>,
  backspace: <><path d="M21 5.5H8.5L3 12l5.5 6.5H21Z" /><path d="m11.5 9.5 5 5M16.5 9.5l-5 5" /></>,
};

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", display: "block" }}>
      {PATHS[name]}
    </svg>
  );
}
