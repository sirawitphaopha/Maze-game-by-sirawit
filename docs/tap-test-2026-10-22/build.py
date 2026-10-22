# ประกอบหน้าทดลองกด: CSS จริงของเว็บ (ตัดฟอนต์ที่โหลดจากเครื่องทดสอบ ใช้ Google Fonts แทน) + หน้าตาหน้าเล่นเกมที่ถอดมา + ตัวเกมจริง + ตัวจด
import base64, re, pathlib

src = pathlib.Path(__file__).parent
here = pathlib.Path("out/tap-test")  # ของที่ snap.mjs กับ esbuild สร้าง (รันจากโฟลเดอร์โปรเจกต์)
css = (here / "app.css").read_text(encoding="utf-8")
# ฟอนต์ของ next/font ชี้ไฟล์ ../media/*.woff2 ในเครื่องทดสอบ หน้า artifact โหลดไม่ได้ · ตัวสำรอง (local Arial) เก็บไว้
css, nfont = re.subn(r"@font-face\s*\{[^}]*url\(\"?\.\./media/[^}]*\}", "", css)
# ฟอนต์ระบบของตัวช่วย dev ของ Next (Geist) ไม่ใช้
css = re.sub(r"/\*# sourceMappingURL=.*?\*/", "", css)

body = (here / "body.html").read_text(encoding="utf-8")
icon = base64.b64encode((here / "icon.svg").read_bytes()).decode()
body = body.replace('src="/icon.svg"', 'src="data:image/svg+xml;base64,' + icon + '"')
body = body.replace('<div hidden=""><!--$--><!--/$--></div>', "")
tapbox = (
    '<div class="tapbox">'
    '<div class="lbl ptitle">ทดลองกด <b id="tapN">0 ครั้ง</b></div>'
    '<p class="foot" id="tapSave">กำลังเชื่อมที่เก็บ</p>'
    '<ul class="tapsum" id="tapSum"></ul>'
    '<button type="button" class="btn primary" id="tapShow">ดูจุดที่กดและพื้นที่กด</button>'
    "</div>"
)
m = re.search(r'(<div class="msheet-top"[^>]*>.*?</div>)', body, re.S)
assert m, "หาหัวแผ่นตั้งค่าไม่เจอ"
body = body[: m.end()] + tapbox + body[m.end():]

extra = """
:root { --font-sarabun-src: "Sarabun", "Sarabun Fallback"; --font-mono-src: "Roboto Mono", "Roboto Mono Fallback"; }
/* หน้าจริงกันขอบบนล่างของเครื่องเอง (แถบบนเว้น env top · ก้อนปุ่มลบ env bottom) เหมือนแอปบนหน้าจอโฮม
   ตัวห่อของ artifact เว้นขอบที่ :root ซ้ำอีกชั้น เปิดเต็มจอในแอป Claude แล้วหน้ายาวเกินจอ 74 จุด แถวปุ่มธงตกจอ (เจอจากผลกดรอบแรก 22 ต.ค. 2569)
   จึงคืนขอบของตัวห่อเป็น 0 ให้หน้าวางตัวแบบเว็บจริง เนื้อหายังพ้นขอบเครื่องเพราะ CSS ของเว็บจริงกันไว้แล้ว */
:root { padding-top: 0; padding-bottom: 0; }
/* ส่วนทดลองกดในแผ่นตั้งค่า */
.tapbox { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--accent-soft); }
.tapbox .foot { margin: 0; }
.tapbox .btn { flex: none; min-height: 46px; }
.tapsum { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: 14px; color: var(--ink); }
.tapsum li { display: flex; justify-content: space-between; gap: 12px; min-width: 0; }
.tapsum b { font-family: var(--f-mono); font-weight: 500; font-variant-numeric: tabular-nums; }
.tapsum .tapmiss span { color: var(--muted); font-size: 12.5px; line-height: 1.6; }
/* แผ่นใสดูจุดที่กด นิ้วทะลุ · ป้ายบอกจำนวนกดแล้วปิด */
.tapov { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 80; pointer-events: none; }
.tapchip { position: fixed; z-index: 81; top: calc(env(safe-area-inset-top, 0px) + 6px); left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; max-width: calc(100vw - 24px); padding: 7px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--ink); font: 500 13px var(--f-body); box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--ink) 45%, transparent); cursor: pointer; white-space: nowrap; }
.tapchip span { display: inline-flex; align-items: center; gap: 5px; }
.tapchip i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.tapchip b { color: var(--accent); }
.tapchip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
"""

page = (
    "<title>ทดลองกดเขาวงกต</title>\n"
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&family=Sarabun:wght@400;500;600;700&display=swap">\n'
    "<style>\n" + css + "\n</style>\n<style>" + extra + "</style>\n"
    + body
    + "\n<script>\n" + (here / "mz.js").read_text(encoding="utf-8") + "\n</script>\n<script>\n" + (src / "app.js").read_text(encoding="utf-8") + "\n</script>\n"
)
out = here / "maze-tap-test.html"
out.write_text(page, encoding="utf-8")
print("ตัดฟอนต์", nfont, "ชุด · ขนาด", len(page.encode()) // 1024, "KB")
