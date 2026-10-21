import type { Metadata, Viewport } from "next";
import { Roboto_Mono, Sarabun } from "next/font/google";
import "./globals.css";
import "./mobile.css";
import TopBar from "@/components/ui/TopBar";
import PendingBar from "@/components/ui/PendingBar";
import BannerHost from "@/components/ui/BannerHost";
import OverlayScrollbar from "@/components/ui/OverlayScrollbar";
import Translator from "@/components/ui/Translator";

/* ฟอนต์มาตรฐานกลาง Sarabun สำหรับไทย · Roboto Mono สำหรับอังกฤษและตัวเลข (สกิล web-craft ข้อ 6.8 ท่าของ HCV)
   พี่กันสั่ง 21 ต.ค. 2569 "เปลี่ยนฟอนต์ไทยและอังกฤษตามสกิลให้หมด" · เดิมใช้ชุดของไฟล์เดิม Chakra Petch กับ IBM Plex
   ฝังมากับเว็บด้วย next/font ไม่ลิงก์ Google Fonts ตรง ๆ (new-web-checklist ฟอนต์ต้องฝัง) */
const sarabun = Sarabun({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-sarabun-src", display: "swap" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono-src", display: "swap" });

export const metadata: Metadata = {
  title: "ห้องทดลองเขาวงกต",
  description: "ดู 11 วิธีสร้างเขาวงกต แล้วลองเดินเอง บันทึกเกมที่เล่นจบ เปิดดูย้อนได้",
  robots: { index: false, follow: false },
  // เปิดจากไอคอนบนหน้าจอโฮมแบบแอป (ไฟล์ประกาศตัวตน app/manifest.ts) · iPhone ไม่อ่านไฟล์นั้นครบ ต้องบอกซ้ำตรงนี้
  // statusBarStyle ใช้ default แบบปลอดภัย เป็นเรื่องหน้าตาที่ต้องให้พี่กันเลือก (สกิล mobile-web-app) ยังไม่ได้ถาม
  // แถบสถานะของ iPhone โปร่งใส สีแถบบนของเว็บลากขึ้นไปเต็มถึงขอบบน (พี่กันสั่ง 21 ต.ค. 2569 "ส่วนหัวที่มันดำ ๆ ให้มันขยายสีขึ้นไปด้วย")
  // ต้องคู่กับ viewportFit cover (มีแล้ว) และขอบบนของแถบบนกันที่ให้เวลากับแบต (app/mobile.css) · มีผลเฉพาะเปิดจากไอคอนบนหน้าจอโฮม
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "เขาวงกต" },
};

// ห้ามซูมทุกเว็บ ชั้นที่ 1 (สกิล mobile-web-app) · ชั้นอื่นอยู่ใน MOBILE_BOOT กับท้าย app/mobile.css
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

/* ตั้งโหมดมืดหรือสว่างที่เคยเลือกไว้ ก่อนจอวาดเฟรมแรก จอจะได้ไม่กะพริบสว่างแล้วค่อยมืด
   ค่ามาจากปุ่มบนแถบบน (components/ui/ThemeToggle.tsx คีย์ maze-theme) · ไม่เคยเลือก = ตามเครื่อง */
const THEME_BOOT = `try{var t=localStorage.getItem("maze-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

/* ภาษาที่เคยเลือกไว้ ตั้งก่อนจอวาดเฟรมแรกเหมือนโหมดมืด (lib/lang.ts คีย์ maze-lang) · ไม่เคยเลือก = ไทย */
const LANG_BOOT = `try{if(localStorage.getItem("maze-lang")==="en"){document.documentElement.dataset.lang="en";document.documentElement.lang="en"}}catch(e){}`;

/* ธงมือถือ ใส่คลาส mz-mobile ที่ <html> ตั้งแต่ก่อนจอวาดเฟรมแรก และสลับตามขนาดจอ (กฎทั้งหมดอยู่ใน app/mobile.css)
   🔴 ตัวเลข 759px ต้องตรงกับบล็อก @media ท้าย app/mobile.css
   พร้อมตัวป้องกันที่ต้องผูกเร็วที่สุด (สกิล mobile-web-app ข้อ 11 ห้ามผูกใน useEffect)
   · ห้ามซูมชั้นที่ 3 ดักท่าบีบซูมของ Safari
   · หน้าไถลซ้ายขวา ดีดตำแหน่งเลื่อนแนวนอนของทั้งหน้ากลับเป็น 0 ทุกครั้ง เฉพาะตอนเป็นมือถือ (ตารางเลื่อนข้างของตัวเองได้ตามปกติ) */
const MOBILE_Q = "(max-width: 759px)";
/* มือถือ เปิดเว็บครั้งแรกของรอบ (แท็บนี้) ที่หน้าแรก พาไปหน้าเล่นเกมทันทีก่อนจอวาด (พี่กันสั่ง 21 ต.ค. 2569 "หน้าจอหลักคือวงกต และปุ่มเล่นเกมจะแสดงอย่างแรก")
   จำไว้ใน sessionStorage ครั้งต่อไปเลือกห้องทดลองจากเมนูได้ตามปกติ · จอคอมไม่โดน */
const MOBILE_BOOT = `try{var d=document.documentElement,q=matchMedia("${MOBILE_Q}"),s=function(){d.classList.toggle("mz-mobile",q.matches)};s();q.addEventListener("change",s);
try{if(q.matches&&!sessionStorage.getItem("mz-landed")){sessionStorage.setItem("mz-landed","1");if(location.pathname==="/")location.replace("/play")}}catch(e){}
["gesturestart","gesturechange","gestureend"].forEach(function(e){document.addEventListener(e,function(v){v.preventDefault()},{passive:false})});
var p=function(){if(!d.classList.contains("mz-mobile"))return;if(d.scrollLeft)d.scrollLeft=0;if(document.body&&document.body.scrollLeft)document.body.scrollLeft=0;if(window.scrollX)window.scrollTo(0,window.scrollY)};
window.addEventListener("scroll",p,{passive:true});window.addEventListener("touchmove",p,{passive:true});window.addEventListener("touchend",p,{passive:true})}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning เพราะสคริปต์ข้างบนเติม data-theme data-lang lang กับคลาส mz-mobile ที่ <html> ก่อน React มาถึง ค่าจึงต่างจากที่เซิร์ฟเวอร์ส่งโดยตั้งใจ
    <html lang="th" className={`${sarabun.variable} ${robotoMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: MOBILE_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
      </head>
      <body>
        <TopBar />
        <div className="wrap">
          <PendingBar />
          {children}
        </div>
        <BannerHost />
        <OverlayScrollbar />
        <Translator />
      </body>
    </html>
  );
}
