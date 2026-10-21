# รูปแบบมือถือ ฝั่งพฤติกรรม (JavaScript/React) + สคริปต์ตรวจ
## สกัดจาก `C:\Users\PKH\Returned-Drug-Value` (เว็บมูลค่ายาคืน ห้องยา รพ.ปรางค์กู่)

> เอกสารนี้เขียนต่อท้ายทีละหัวข้อระหว่างอ่านโค้ด · โค้ดทุกก้อนยกมาตรงตัวจากไฟล์จริง ไม่เรียบเรียงใหม่
> คอมเมนต์ที่มีคำพูดของเจ้าของงาน (พี่กัน) ยกมาคำต่อคำ

---

# ส่วนที่ 1 — `components/MedReturnApp.jsx` (1073 บรรทัด)

---

## ผูกตัวกันลากกันซูมตั้งแต่วินาทีแรก ไม่รอให้หน้าจอวาดเสร็จ

**ที่ไหน** `components/MedReturnApp.jsx:349-355` (เรียกใน constructor) และตัวฟังก์ชัน `:888-903`

**โค้ดจริง**
```jsx
    // ── ผูกตัวกันลาก/กันซูมตั้งแต่วินาทีแรก ────────────────────────────────
    // 🚨 componentDidMount เกิดช้ากว่านี้หลายวินาทีบนมือถือ
    //    ผูกที่นี่จึงกันได้ตั้งแต่ก่อนหน้าจอถูกวาดครั้งแรกด้วยซ้ำ
    //    (ตัวถอดยังอยู่ที่ componentWillUnmount เหมือนเดิม)
    this._bindEarlyGuards();

    installHandlers(this);
```

```jsx
  // ผูกตัวกันลากกับกันซูมทันที ไม่รอให้หน้าจอวาดเสร็จ
  // 🚨 ต้องกันการผูกซ้ำ เพราะ React โหมดเข้มงวดสร้างคอมโพเนนต์สองรอบตอนพัฒนา
  _bindEarlyGuards = () => {
    if (typeof window === 'undefined' || this._earlyBound) return;
    this._earlyBound = true;
    // ฉากหลังห้ามเลื่อนเมื่อมีหน้าต่างซ้อน (ดู _blockBgScroll)
    document.addEventListener('touchmove', this._blockBgScroll, { passive: false });
    document.addEventListener('wheel', this._blockBgScroll, { passive: false });
    document.addEventListener('scroll', this._pinLeft, { passive: true, capture: true });
    window.addEventListener('scroll', this._pinLeft, { passive: true });
    window.addEventListener('touchmove', this._pinLeft, { passive: true });
    window.addEventListener('touchend', this._pinLeft, { passive: true });
    document.addEventListener('gesturestart', this._onGesture, { passive: false });
    document.addEventListener('gesturechange', this._onGesture, { passive: false });
    document.addEventListener('gestureend', this._onGesture, { passive: false });
  };
```

**แก้ปัญหาอะไร** — ถ้าผูกตัวป้องกันใน `componentDidMount` ตามปกติ ช่วงเวลาก่อนหน้านั้น (หลายวินาทีบนมือถือจริง) หน้าเว็บไม่มีการป้องกันอะไรเลย ผู้ใช้ลากนิ้วทีเดียวหน้าก็ไถลค้างไปทั้งรอบ

**เหตุผลจากคอมเมนต์** (คำพูดเจ้าของงานที่ทำให้เกิดโค้ดนี้ อยู่ที่ `_isNarrowNow` บรรทัด 877)
> 🔴 พี่กันเจอเอง 1 ก.ย. 2569: "ตอนรีเฟรชหน้าเเล้วเข้ามา ตอนนี้คือเราขยับซ้ายขวาได้อยู่"
>
>    ต้นเหตุคือทุกอย่างเช็คคลาส .mrv-mobile ก่อนทำงาน แต่คลาสนั้นถูกใส่ใน
>    componentDidMount ซึ่งเกิดหลังหน้าโหลดเสร็จหลายวินาที
>    ช่วงก่อนหน้านั้นจึงไม่มีการป้องกันอะไรเลย — ลากทีเดียวก็ค้างไปทั้งรอบ

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** ท่า "ผูกใน constructor ถอดใน componentWillUnmount + ธง `_earlyBound` กันผูกซ้ำตอน React StrictMode" เป็นของกลาง ไม่พึ่งข้อมูลของเว็บนี้เลย · ถ้าเว็บอื่นเป็น function component ต้องย้ายไป `useEffect` ที่รันครั้งเดียว แต่จะเสียข้อดีเรื่อง "ผูกก่อนวาดจอ" ไป (useEffect ก็รันหลัง paint เหมือน componentDidMount)

---

## ตัวดักท่าซูมด้วยนิ้ว — ตั้ง viewport แล้วยังไม่พอ

**ที่ไหน** `components/MedReturnApp.jsx:802-814` (ตัวดัก) + `:900-902` (การผูก) + `:1041-1043` (การถอด)

**โค้ดจริง**
```jsx
  // ── ห้ามซูมด้วยนิ้ว (พี่กันสั่ง 1 ก.ย. 2569) ───────────────────────────────
  //
  // Safari บน iPhone มีท่าซูมของตัวเองชื่อ gesture ซึ่งไม่ผ่านระบบ touch ปกติ
  // ปิดด้วย CSS อย่างเดียวจึงไม่พอ ต้องดักท่านี้ตรง ๆ ด้วย
  //
  // 🚨 ฝั่งคอมต้องไม่โดน — ตรวจคลาส .mrv-mobile ก่อนเสมอ
  //    (เบราว์เซอร์บนคอมไม่ยิง gesture อยู่แล้ว แต่กันไว้เผื่อจอสัมผัสบนคอม)
  // 🚨 ห้ามดักการแตะสองครั้งด้วยตัวนี้ — ปุ่มทั้งเว็บใช้ touch-action: manipulation
  //    ซึ่งปิดการซูมจากการแตะสองครั้งให้แล้ว
  _onGesture = (e) => {
    if (!this._isNarrowNow()) return;
    if (e.cancelable) e.preventDefault();
  };
```

การผูก (ใน `_bindEarlyGuards`)
```jsx
    document.addEventListener('gesturestart', this._onGesture, { passive: false });
    document.addEventListener('gesturechange', this._onGesture, { passive: false });
    document.addEventListener('gestureend', this._onGesture, { passive: false });
```

การถอด (ใน `componentWillUnmount`)
```jsx
    document.removeEventListener('gesturestart', this._onGesture);
    document.removeEventListener('gesturechange', this._onGesture);
    document.removeEventListener('gestureend', this._onGesture);
```

**สรุปคำตอบตามที่ถาม**
- **ดักเหตุการณ์อะไร** — `gesturestart` · `gesturechange` · `gestureend` (3 ตัว เป็นเหตุการณ์เฉพาะของ Safari/WebKit ไม่ใช่ `touchstart`/`touchmove`)
- **ผูกที่ไหน** — `document` (ไม่ใช่ window)
- **`passive` แบบไหน** — `{ passive: false }` **ทั้งสามตัว** เพราะต้อง `preventDefault()` ได้ ถ้าเป็น passive จะห้ามไม่ได้
- **ทำไมต้องมีทั้งที่ตั้ง viewport แล้ว** — คอมเมนต์บอกตรง ๆ ว่า "Safari บน iPhone มีท่าซูมของตัวเองชื่อ gesture ซึ่งไม่ผ่านระบบ touch ปกติ ปิดด้วย CSS อย่างเดียวจึงไม่พอ" · CLAUDE.md ข้อ 3.67 บอกว่าล็อก **3 ชั้น** — `maximum-scale=1` + `user-scalable=no` (viewport) · `touch-action: pan-y` (CSS) · ดัก `gesturestart` (JS)

**เหตุผลจากคอมเมนต์ / คำพูดเจ้าของงาน** (จาก CLAUDE.md ข้อ 3.67 ซึ่งเป็นเอกสารของโปรเจกต์นี้)
> *"ห้ามซูม เหมือนจุดที่ตรึงไว้ของปุ่มกดส่งยา เพราะแอปทั่วไป มันซูมไม่ได้ นี่นา"*

และเอกสารบันทึกว่าแคลร์ทักท้วงเรื่องคนสายตายาวไปแล้ว พี่กันยืนยัน (เหตุผล: เว็บใช้ในห้องยา ไม่ใช่เว็บสาธารณะ และช่องกรอกทุกช่องถูกบังคับเป็น 16px แล้ว)

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย ถ้าเว็บนั้นตั้งใจให้ทำตัวเหมือนแอป** · แต่เป็นการตัดสินใจเชิงนโยบาย ไม่ใช่เชิงเทคนิค — เว็บสาธารณะที่คนสายตายาวใช้ **ไม่ควรยก** เพราะการปิดซูมเป็นปัญหาการเข้าถึง (accessibility) · โค้ดเองไม่พึ่งอะไรของเว็บนี้เลย นอกจากฟังก์ชัน `_isNarrowNow()`

---

## `_isNarrowNow()` — ตรวจว่าเป็นจอมือถือ โดยไม่พึ่งคลาสที่โค้ดเป็นคนใส่

**ที่ไหน** `components/MedReturnApp.jsx:875-925`

**โค้ดจริง**
```jsx
  // ── ตอนนี้เป็นฝั่งมือถือไหม (ไม่พึ่งคลาสที่โค้ดเป็นคนใส่) ─────────────────
  //
  // 🔴 พี่กันเจอเอง 1 ก.ย. 2569: "ตอนรีเฟรชหน้าเเล้วเข้ามา ตอนนี้คือเราขยับซ้ายขวาได้อยู่"
  //
  //    ต้นเหตุคือทุกอย่างเช็คคลาส .mrv-mobile ก่อนทำงาน แต่คลาสนั้นถูกใส่ใน
  //    componentDidMount ซึ่งเกิดหลังหน้าโหลดเสร็จหลายวินาที
  //    ช่วงก่อนหน้านั้นจึงไม่มีการป้องกันอะไรเลย — ลากทีเดียวก็ค้างไปทั้งรอบ
  //
  // 🚨 ความกว้างจอใช้ได้ตั้งแต่วินาทีแรก ไม่ต้องรออะไรเลย
  //    เอามาเป็นด่านสำรอง คู่กับคลาสที่ยังใช้เป็นตัวหลักเมื่อโหลดเสร็จแล้ว
  // 🚨 1180 = จุดสลับเดียวกับธง wide · เดสก์ท็อปจริงจึงไม่มีทางเข้าเงื่อนไขนี้
  // ⚠️ ถ้ากดปุ่ม "มือถือ" บนคอม (forceNarrow) จอยังกว้างอยู่ ตัวนี้จะตอบว่าไม่ใช่มือถือ
  //    ซึ่งถูกต้อง — กรณีนั้นไม่มีนิ้วมาลากอยู่แล้ว และคลาสก็ทำงานแทนให้
```

```jsx
  _isNarrowNow = () => {
    if (typeof document === 'undefined') return false;
    if (document.body.classList.contains('mrv-mobile')) return true;
    return (window.innerWidth || 0) < 1180;
  };
```

**แก้ปัญหาอะไร** — ตัวป้องกันทุกตัว (กันลาก กันซูม กันฉากหลังเลื่อน ดึงลงโหลดใหม่) ต้องรู้ว่า "ตอนนี้เป็นมือถือไหม" ถ้าถามจาก state หรือคลาสอย่างเดียว จะตอบว่า "ไม่ใช่" ในช่วงวินาทีแรกที่หน้าเว็บยังไม่ hydrate เสร็จ = ผู้ใช้ลากได้ในช่วงนั้น

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย ปรับเลข 1180 ตามเว็บนั้น** · เลข 1180 คือจุดสลับของเว็บนี้ (CLAUDE.md ข้อ 7 บอกว่า "เดิม 960 แต่คอลัมน์ในตารางบีบจนเหลือ 34px เลยขยับขึ้น") · ชื่อคลาส `mrv-mobile` ก็ต้องเปลี่ยนตามคำนำหน้าของเว็บนั้น

---

## `syncMobileClass()` — ใส่/ถอดคลาสที่ `<body>` ตามธง wide (ห้ามใช้ `@media` ตัดสิน)

**ที่ไหน** `components/MedReturnApp.jsx:731-738` (คอมเมนต์) + `:927-932` (ตัวฟังก์ชัน) + `:333-339` (เรียกตอน resize) + `:419-424` (เรียกตอน componentDidUpdate)

**โค้ดจริง — คอมเมนต์**
```jsx
  // ── ธงบอก CSS ว่าตอนนี้เป็นฝั่งมือถือ (พี่กันสั่ง 1 ก.ย. 2569) ─────────────
  //
  // 🚨 ต้องผูกกับธง wide ตัวเดียวกับที่ใช้เลือกว่าจะวาดหน้าจอแบบไหน
  //    ใช้ @media (max-width) ใน CSS แทนไม่ได้ เพราะกดปุ่ม "มือถือ" บนคอมได้
  //    (forceNarrow) ซึ่งตอนนั้นจอยังกว้าง 1366px อยู่ แต่หน้าจอเป็นแบบมือถือแล้ว
  //
  // 🚨 เงื่อนไขต้องตรงกับ vals/derive.js → wide เป๊ะ ๆ ห้ามเขียนคนละแบบ
  //    แก้ที่หนึ่งต้องแก้อีกที่เสมอ ไม่งั้น CSS กับ JSX จะไม่ตรงกันแบบเงียบ ๆ
```

**โค้ดจริง — ตัวฟังก์ชัน**
```jsx
  syncMobileClass = () => {
    if (typeof document === 'undefined') return;
    const st = this.state;
    const wide = (st.vw || 0) >= 1180 && !st.forceNarrow;
    document.body.classList.toggle('mrv-mobile', !wide);
  };
```

**โค้ดจริง — จังหวะที่เรียก**
```jsx
    // วาดใหม่เฉพาะตอนความกว้างเปลี่ยนจริง — ลากขอบหน้าต่างจะยิง event รัวมาก
    // แต่ละครั้งวิ่ง renderVals ใหม่ทั้งก้อน (กรองยา 417 ตัว) เครื่องเก่าจะกระตุก
    this._onResize = () => {
      this.syncMobileClass();
      this.lockWidth();
      if (window.innerWidth !== this.state.vw || window.innerHeight !== this.state.vh) {
        this.setState({ vw: window.innerWidth, vh: window.innerHeight });
      }
    };
```

```jsx
  componentDidUpdate(prevProps, prevState) {
    this._syncModalFlag();
    // สลับปุ่มมุมมองมือถือ/คอม ต้องอัปเดตคลาสที่ body ตามทันที
    if (prevState.vw !== this.state.vw || prevState.forceNarrow !== this.state.forceNarrow) {
      this.syncMobileClass();
    }
```

**แก้ปัญหาอะไร** — ถ้าใช้ `@media (max-width)` ใน CSS ตัดสินว่าเป็นมือถือ แล้วผู้ใช้กดปุ่มสวิตช์ "มือถือ" บนคอม (จอกว้าง 1366px) จะได้ JSX แบบมือถือแต่ CSS แบบเดสก์ท็อป = หน้าจอเพี้ยนโดยไม่มีอะไรเตือน

**กับดักที่ต้องรู้** — เงื่อนไข `wide` เขียนซ้ำ **2 ที่** (`syncMobileClass` กับ `vals/derive.js`) คอมเมนต์เตือนเองว่า "แก้ที่หนึ่งต้องแก้อีกที่เสมอ ไม่งั้น CSS กับ JSX จะไม่ตรงกันแบบเงียบ ๆ" · เป็นจุดอ่อนที่เว็บอื่นควรทำให้ดีกว่า (ดึงมาเป็นฟังก์ชันกลางตัวเดียว)

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** แนวคิด "ธง JS เป็นตัวตัดสิน แล้วเขียนคลาสลง body ให้ CSS เกาะ" ใช้ได้ทุกเว็บ · เลข 1180 กับชื่อคลาสต้องปรับ

---

## ตรวจว่ามีเมาส์จริงไหม — `matchMedia('(pointer: fine)')` + ต้องฟังการเปลี่ยนแปลงด้วย

**ที่ไหน** `components/MedReturnApp.jsx:205-208` (คำอธิบายใน state) + `:481-492` (การวัด) + `:1017-1020` (การถอด)

**โค้ดจริง — คำอธิบายใน state**
```jsx
      // มีเมาส์จริงไหม — วัดตอน componentDidMount ด้วย (pointer: fine)
      // ใช้กันสวิตช์ "คอม/มือถือ" ไม่ให้โผล่บนเครื่องสัมผัสจริง (พี่กันสั่ง — ขึ้นมาแล้วบังจอ)
      // ความกว้างอย่างเดียวไม่พอ แท็บเล็ตแนวนอนกว้าง 1024 จะหลุดขึ้นมา
      hasMouse: true,
```

**โค้ดจริง — การวัด**
```jsx
    // เครื่องสัมผัสล้วน (มือถือ/แท็บเล็ต) → (pointer: fine) เป็นเท็จ = ซ่อนสวิตช์มุมมอง
    // โน้ตบุ๊กจอสัมผัสที่ต่อเมาส์ยังนับเป็น fine เพราะดูตัวชี้หลัก
    //
    // ต้องคอยฟังการเปลี่ยนแปลงด้วย ไม่ใช่วัดครั้งเดียวจบ — เสียบเมาส์เข้าแท็บเล็ต
    // หรือถอดออกจากแท่นวาง ค่านี้เปลี่ยนได้กลางคัน ถ้าไม่ฟังไว้สวิตช์จะค้างผิดสถานะ
    try {
      this._mqMouse = window.matchMedia('(pointer: fine)');
      patch.hasMouse = this._mqMouse.matches;
      this._onMouseKind = (e) => this.setState({ hasMouse: e.matches });
      if (this._mqMouse.addEventListener) this._mqMouse.addEventListener('change', this._onMouseKind);
      else this._mqMouse.addListener(this._onMouseKind);        // Safari รุ่นเก่า
    } catch (e) { patch.hasMouse = true; }
```

**โค้ดจริง — การถอด**
```jsx
    if (this._mqMouse && this._onMouseKind) {
      if (this._mqMouse.removeEventListener) this._mqMouse.removeEventListener('change', this._onMouseKind);
      else this._mqMouse.removeListener(this._onMouseKind);
    }
```

**แก้ปัญหาอะไร** — สวิตช์ "คอม/มือถือ" (ปุ่มบังคับดูหน้าจอมือถือทั้งที่นั่งอยู่หน้าคอม) ต้องไม่โผล่บนเครื่องสัมผัสจริง เพราะบังจอ · แต่ถ้าดูความกว้างอย่างเดียว แท็บเล็ตแนวนอน 1024px จะหลุดขึ้นมา

**กับดัก 3 ข้อที่โค้ดนี้ดักไว้**
1. **ห้ามวัดครั้งเดียวจบ** — เสียบ/ถอดเมาส์ ค่านี้เปลี่ยนกลางคันได้ ต้อง `addEventListener('change')`
2. **Safari รุ่นเก่าไม่มี `addEventListener` บน MediaQueryList** ต้องตกไปใช้ `addListener` (deprecated)
3. **ต้องครอบ try/catch** — `matchMedia` อาจไม่มีในบางสภาพ ตกไปตั้ง `hasMouse = true` (ค่าปลอดภัย = ซ่อนไม่ได้ก็ยอมให้เห็น)

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** · แต่ค่า `hasMouse` ถูกใช้ตัดสินเรื่องเดียวคือ "โผล่สวิตช์มุมมองไหม" (`showLayoutSwitch = st.vw >= 960 && st.hasMouse`) เว็บอื่นที่ไม่มีสวิตช์แบบนี้ก็ยังใช้ประโยชน์ได้ (เช่น ตัดสินว่าจะแสดง hover hint ไหม)

---

## กันฉากหลังเลื่อนตอนเปิดป๊อป — ต้องทำ 2 ชั้น (ห้ามเหตุการณ์ + ตรึงตัว body)

### ชั้นที่ 1 — ห้ามเหตุการณ์ `touchmove` / `wheel`

**ที่ไหน** `components/MedReturnApp.jsx:905-919`

**โค้ดจริง**
```jsx
  // ── ฉากหลังห้ามเลื่อนเมื่อมีหน้าต่างซ้อน (พี่กันสั่ง 1 ก.ย. 2569) ──────────
  //
  // การปิด overflow ที่พื้นที่เลื่อน (ดู shell.jsx) พอสำหรับคอม
  // แต่บนมือถือนิ้วยังลากได้อยู่ เพราะเบราว์เซอร์ส่งการเลื่อนต่อไปให้ตัวที่อยู่ข้างนอก
  //
  // 🚨 ต้องห้ามที่เหตุการณ์ตรง ๆ และต้องเป็น passive:false ถึงจะห้ามได้
  // 🚨 ต้องปล่อยให้เลื่อนได้ถ้านิ้วอยู่ "ในตัวหน้าต่างซ้อนเอง"
  //    ไม่งั้นหน้าต่างที่มีเนื้อหายาว (รายการล็อต · ตั้งค่า) เลื่อนดูข้างในไม่ได้เลย
  //    ตัวชี้วัดคือ element ที่นิ้วแตะอยู่ในกล่องที่มี role="dialog" หรือไม่
  _blockBgScroll = (e) => {
    if (!this.state.anyModalOpen) return;
    const t = e.target;
    if (t && t.closest && t.closest('[role="dialog"], [data-scrollable="1"]')) return;
    if (e.cancelable) e.preventDefault();
  };
```

การผูก (ใน `_bindEarlyGuards`)
```jsx
    document.addEventListener('touchmove', this._blockBgScroll, { passive: false });
    document.addEventListener('wheel', this._blockBgScroll, { passive: false });
```

### ชั้นที่ 2 — ตรึงตัว `<body>` ทั้งใบ พร้อมจำตำแหน่งเลื่อน

**ที่ไหน** `components/MedReturnApp.jsx:382-417`

**โค้ดจริง**
```jsx
  // ── ฉากหลังห้ามเลื่อนเมื่อมีหน้าต่างซ้อน — ฝั่งมือถือต้องตรึงทั้งใบ ────────
  //
  //   พี่กันเจอเอง 1 ก.ย. 2569: "ทำไมเราเปิด popup แล้วเราสามารถเลื่อนเพจลงล่างได้"
  //
  //   การดักเหตุการณ์ touchmove อย่างเดียวไม่พอบนมือถือ — เบราว์เซอร์บนมือถือ
  //   ส่งการเลื่อนต่อไปให้หน้าเว็บทั้งใบได้อยู่ดี ต้องตรึงตัวหน้าเว็บเองด้วย
  //
  // 🚨 ต้องจำตำแหน่งที่เลื่อนค้างไว้ แล้วคืนตอนปิดหน้าต่าง
  //    ไม่งั้นปิดหน้าต่างแล้วเด้งกลับไปบนสุด เสียตำแหน่งที่กำลังดูอยู่
  // 🚨 ทำเฉพาะฝั่งมือถือ ฝั่งคอมปิด overflow ที่พื้นที่เลื่อนก็พอแล้ว
  //    (ตรึงทั้งใบบนคอมจะทำให้แถบเลื่อนหายแล้วหน้ากระตุกตอนเปิดปิด)
  _lockBody = (on) => {
    if (typeof document === 'undefined') return;
    if (!this._isNarrowNow()) {
      // เผื่อกรณีสลับจากมือถือมาคอมทั้งที่หน้าต่างยังเปิดอยู่
      if (document.body.style.position === 'fixed') this._lockBody(false);
      return;
    }
    const b = document.body;
    if (on) {
      if (b.style.position === 'fixed') return;
      const sc = this.scrollRef && this.scrollRef.current;
      this._lockTop = sc ? sc.scrollTop : (window.scrollY || 0);
      b.style.position = 'fixed';
      b.style.width = '100%';
      b.style.overflow = 'hidden';
    } else {
      if (b.style.position !== 'fixed') return;
      b.style.position = '';
      b.style.width = '';
      b.style.overflow = '';
      const sc = this.scrollRef && this.scrollRef.current;
      if (sc && this._lockTop != null) sc.scrollTop = this._lockTop;
      this._lockTop = null;
    }
  };
```

### ตัวทวนธง "มีหน้าต่างซ้อนเปิดอยู่ไหม"

**ที่ไหน** `components/MedReturnApp.jsx:368-380` + `:199-202` (คำอธิบายใน state) + `:419-420` (เรียกทุกครั้งที่วาดจอ)

**โค้ดจริง — คำอธิบายใน state**
```jsx
      // มีหน้าต่างซ้อนเปิดอยู่ไหม — ตัวดักการเลื่อนอ่านค่านี้
      // 🚨 ตัวจริงคำนวณใน vals/shell.js · ตรงนี้เป็นสำเนาที่ componentDidUpdate เขียนให้
      //    เพราะตัวดักเป็นเหตุการณ์นอก React จะเรียก renderVals เองไม่ได้
      anyModalOpen: false,
```

**โค้ดจริง — ตัวทวน**
```jsx
  // ทวนธง "มีหน้าต่างซ้อนเปิดอยู่ไหม" ให้ตรงกับของจริงทุกครั้งที่วาดจอ
  // 🚨 รายชื่อต้องตรงกับ vals/shell.js → anyModalOpen เป๊ะ ๆ แก้ที่หนึ่งต้องแก้อีกที่
  _syncModalFlag = () => {
    const st = this.state;
    const now = !!(
      st.confirm || st.sheet || st.result ||
      st.hisOpen || st.slipLot || st.lotEdit || st.showOtherDrafts ||
      st.deviceAsk || st.reasonAsk || st.catEdit || st.catLog || st.priceFix ||
      st.lotsFilterOpen || st.histFilterOpen
    );
    if (now !== st.anyModalOpen) this.setState({ anyModalOpen: now });
    this._lockBody(now);
  };
```

**แก้ปัญหาอะไร** — เปิดป๊อปบนมือถือแล้วนิ้วลากที่ฉากหลัง หน้าเว็บข้างหลังเลื่อนตาม ผู้ใช้ปิดป๊อปมาแล้วหลงว่าอยู่ตรงไหน

**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ)**
> พี่กันเจอเอง 1 ก.ย. 2569: "ทำไมเราเปิด popup แล้วเราสามารถเลื่อนเพจลงล่างได้"

และจาก CLAUDE.md ข้อ 3.68
> *"เราบอกเเล้วว่าพอมี popup เเล้วฉากหลังห้ามเลื่อน"*

**การคืนค่าตอนปิด** — ทำครบ 3 อย่าง: ล้าง `position` · ล้าง `width` · ล้าง `overflow` แล้ว **คืน `scrollTop` ของ `scrollRef` (พื้นที่เลื่อนหลัก) ไม่ใช่ `window.scrollTo`** เพราะเว็บนี้พื้นที่เลื่อนคือกล่องข้างใน ไม่ใช่ทั้งหน้า

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้ แต่ต้องปรับ 2 จุด**
1. รายชื่อ state ใน `_syncModalFlag` เป็นของเว็บนี้ล้วน (14 ตัว) — เว็บอื่นต้องเขียนรายชื่อของตัวเอง · ดีกว่านั้นคือทำให้ป๊อปลงทะเบียนตัวเองแทนการเขียนรายชื่อตายตัว 2 ที่
2. `this._lockTop = sc ? sc.scrollTop : (window.scrollY || 0)` — ถ้าเว็บอื่นเลื่อนที่ `window` ตรง ๆ ต้องใช้ `window.scrollTo(0, this._lockTop)` ตอนคืนค่า
- ส่วน `closest('[role="dialog"], [data-scrollable="1"]')` **ยกไปใช้ได้เลย** และเป็นหัวใจ — ถ้าไม่มีบรรทัดนี้ ป๊อปที่เนื้อหายาวจะเลื่อนดูข้างในไม่ได้เลย

---

## กันหน้าไถลซ้ายขวาบนมือถือ — เลิกห้าม แล้วดีดตำแหน่งกลับ 0

**ที่ไหน** `components/MedReturnApp.jsx:847-873` + `:896-899` (การผูก) + `:1035-1038` (การถอด)

**โค้ดจริง**
```jsx
  // ── ตรึงตำแหน่งเลื่อนแนวนอนไว้ที่ 0 (พี่กันชี้ทางเอง 1 ก.ย. 2569) ──────────
  //
  // พี่กันถามว่า "ทำไมกรอบแสดงค่ายา และกรอบปุ่มกดส่งยา ทำไมมันไม่เลื่อน
  //              ทำไมเอาระบบนั้นมาไม่ได้"
  //
  // คำตอบคือแถบพวกนั้นอยู่ "นอก" พื้นที่เลื่อน จึงไม่มีอะไรมาลากมันได้เลย
  // และคลิปที่พี่กันถ่ายมาก็ยืนยัน — แถบล่างนิ่งสนิททุกเฟรมขณะที่ส่วนบนไถล
  // แปลว่าไม่ใช่ทั้งหน้าถูกลาก แต่เป็น "พื้นที่เลื่อน" ตัวเดียวที่เลื่อนแนวนอนได้
  //
  // กฎ CSS ทุกข้อที่ลองมา (overflow hidden/clip · touch-action · max-width)
  // ได้ผลบนคอมแต่ไม่ได้ผลบนมือถือของพี่กัน จึงเลิกพึ่ง CSS แล้วดักที่ตัวเหตุการณ์ตรง ๆ
  // มีอะไรมาดันให้เลื่อนก็ดันไป — ดีดกลับเป็น 0 ทันทีทุกครั้ง
  //
  // 🚨 ผูกแบบ passive ได้ เพราะไม่ได้ห้ามเหตุการณ์ แค่ตั้งค่ากลับ
  //    จึงไม่ถ่วงการเลื่อนขึ้นลงเลยแม้แต่นิดเดียว
  // 🚨 ฝั่งคอมต้องไม่โดน — ตรวจคลาส .mrv-mobile ก่อนเสมอ
  //    (หน้าคลังยาฝั่งคอมมีตารางกว้างที่ต้องเลื่อนดูข้าง ๆ ได้จริง)
  // 🚨 ต้องดักที่ window ด้วย เผื่อสิ่งที่เลื่อนคือทั้งหน้าไม่ใช่กล่องข้างใน
  _pinLeft = () => {
    if (!this._isNarrowNow()) return;
    const sc = this.scrollRef && this.scrollRef.current;
    if (sc && sc.scrollLeft !== 0) sc.scrollLeft = 0;
    const de = document.documentElement;
    if (de && de.scrollLeft !== 0) de.scrollLeft = 0;
    if (document.body.scrollLeft !== 0) document.body.scrollLeft = 0;
    if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
  };
```

การผูก — **4 เหตุการณ์ ทุกตัว passive:true**
```jsx
    document.addEventListener('scroll', this._pinLeft, { passive: true, capture: true });
    window.addEventListener('scroll', this._pinLeft, { passive: true });
    window.addEventListener('touchmove', this._pinLeft, { passive: true });
    window.addEventListener('touchend', this._pinLeft, { passive: true });
```

**แก้ปัญหาอะไร** — หน้าเว็บบนมือถือไถลซ้ายขวาได้ ทั้งที่ไม่ควรมีอะไรกว้างเกินจอ · CLAUDE.md ข้อ 3.67 บันทึกว่า **พี่กันบ่นเรื่องเดียวกัน 7 รอบ ส่งคลิปมา 5 คลิป**

**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ)**
> พี่กันถามว่า "ทำไมกรอบแสดงค่ายา และกรอบปุ่มกดส่งยา ทำไมมันไม่เลื่อน
>              ทำไมเอาระบบนั้นมาไม่ได้"

**บทเรียนที่ CLAUDE.md ข้อ 3.67 บันทึกไว้ (สำคัญมากสำหรับเว็บอื่น)**
> 🔑 **วิธีไล่สาเหตุที่ควรทำตั้งแต่รอบแรก:** ดูว่า **อะไรขยับ อะไรไม่ขยับ** ในคลิปเดียวกัน
> ของนอกพื้นที่เลื่อนนิ่ง + ข้างในไถล = พื้นที่เลื่อนเลื่อนข้างได้ (ดีดกลับได้)
> ทุกอย่างขยับพร้อมกัน = กรอบหน้าเว็บถูกลาก · ตัวอักษรขนาดเปลี่ยน = ซูม

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** เกือบทั้งก้อน · จุดเดียวที่ต้องปรับคือ `this.scrollRef.current` ซึ่งเป็น ref ของพื้นที่เลื่อนหลักในเว็บนี้ · เว็บที่เลื่อนทั้งหน้าใช้แค่ 3 บรรทัดล่าง (documentElement · body · window) ก็พอ

---

## ล็อกความกว้างของแอปให้เท่าขอบจอจริง — `lockWidth()`

**ที่ไหน** `components/MedReturnApp.jsx:191-194` (state) + `:816-845` (ตัวฟังก์ชัน) + `:580-587` (การผูก) + `:1029-1032` (การถอด)

**โค้ดจริง — คำอธิบายใน state**
```jsx
      // ── ความกว้างของ "ขอบจอจริง" ที่วัดได้จากเครื่อง (พี่กันสั่ง 1 ก.ย. 2569) ──
      //   "ให้มัน detect ขอบมือถือ แล้ว fix เลย และปรับใช้กับทุกมือถือได้"
      // 0 = ยังไม่ได้วัด (ตอนเซิร์ฟเวอร์วาดจอ) ให้ใช้ 100% ไปก่อน
      lockW: 0,
```

**โค้ดจริง — ตัวฟังก์ชัน**
```jsx
  // ── วัดขอบจอจริงแล้วล็อกความกว้างของแอปเท่านั้นเป๊ะ ๆ ───────────────────
  //
  // พี่กันสั่ง 1 ก.ย. 2569 หลังบ่นเรื่องหน้าไถลซ้ายขวา 7 รอบ
  //   "ให้มัน fix ซ้ายขวาไม่ได้เหรอ และให้มัน detect ขอบมือถือ แล้ว fix เลย
  //    และปรับใช้กับทุกมือถือได้"
  //
  // ทำไมกฎ CSS ทั้งหมดก่อนหน้าไม่พอ:
  //   iPhone มีกรอบหน้าเว็บ 2 ชั้น — กรอบผัง (layout viewport) กับกรอบที่ตาเห็น
  //   (visual viewport) ถ้ามีอะไรกว้างเกินแม้แต่ครั้งเดียว กรอบผังจะกว้างกว่าจอ
  //   แล้ว iOS ยอมให้ลากกรอบที่ตาเห็นไปมาภายในกรอบผังได้เสมอ
  //   position:fixed ก็ยึดกับกรอบผัง ไม่ใช่ขอบจอ จึงถูกลากไปด้วย
  //
  // วิธีนี้จึงไม่พึ่งกรอบผังเลย — ถามเครื่องตรง ๆ ว่าขอบจอจริงกว้างเท่าไหร่
  // แล้วบังคับตัวแอปให้กว้างเท่านั้น ใช้ได้กับมือถือทุกรุ่นโดยไม่ต้องรู้จักรุ่นเลย
  //
  // 🚨 เอาค่าที่น้อยที่สุดในสามตัวเสมอ — visualViewport คือของที่ตาเห็นจริง
  //    ส่วน innerWidth กับ clientWidth จะโตตามกรอบผังเมื่อมีของล้น
  // 🚨 ปัดลงด้วย Math.floor ห้ามปัดขึ้น — เกินไปแม้ครึ่งจุดก็ลากได้แล้ว
  lockWidth = () => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const cands = [
      vv && vv.width ? vv.width : 0,
      window.innerWidth || 0,
      document.documentElement ? document.documentElement.clientWidth : 0
    ].filter((x) => x > 0);
    if (!cands.length) return;
    const w = Math.floor(Math.min.apply(null, cands));
    if (w > 0 && w !== this.state.lockW) this.setState({ lockW: w });
  };
```

**โค้ดจริง — การผูก (สำคัญ: ต้องผูกกับ visualViewport ไม่ใช่แค่ resize)**
```jsx
    // วัดขอบจอจริงทันทีที่เปิดเว็บ แล้ววัดซ้ำทุกครั้งที่กรอบจอขยับ
    // 🚨 ต้องผูกกับ visualViewport ด้วย — แป้นพิมพ์เด้ง หมุนจอ หรือแถบเบราว์เซอร์ยืดหด
    //    ล้วนเปลี่ยนขอบจอโดยไม่ยิง resize ของหน้าต่างเสมอไป
    this.lockWidth();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.lockWidth);
      window.visualViewport.addEventListener('scroll', this.lockWidth);
    }
    window.addEventListener('resize', this._onResize);
```

**ค่านี้ถูกใช้ที่ไหน** — `components/shell.jsx:73` (ดูส่วนที่ 2)

**แก้ปัญหาอะไร** — iPhone มี viewport 2 ชั้น พอมีอะไรกว้างเกินแม้ครั้งเดียว กรอบผังจะกว้างกว่าจอถาวร แล้ว `position:fixed` ก็เกาะกรอบผัง ไม่ใช่ขอบจอ = แถบล่างที่ควรตรึงก็ถูกลากไปด้วย

**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ)**
> "ให้มัน fix ซ้ายขวาไม่ได้เหรอ และให้มัน detect ขอบมือถือ แล้ว fix เลย
>  และปรับใช้กับทุกมือถือได้"

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย ทั้งก้อน** เป็นโค้ดกลางล้วน ไม่พึ่งอะไรของเว็บนี้เลย · สิ่งเดียวที่ต้องทำเพิ่มคือเอา `lockW` ไปใส่ที่กล่องนอกสุดของแอป (ดูส่วน shell.jsx)

---

## แป้นพิมพ์เด้งบนมือถือ — วัดความสูงเองแล้วส่งเป็นตัวแปร `--kb`

**ที่ไหน** `components/MedReturnApp.jsx:643-653` (การวัด) + `:1054-1057` (การถอด) + `components/pages/sheet.jsx:13` (ที่ใช้)

**โค้ดจริง — การวัด**
```jsx
    // ป๊อปอัปหนีแป้นพิมพ์บนมือถือ — บาง iOS ไม่หดพื้นที่ให้แม้ตั้ง interactiveWidget แล้ว
    // เลยวัดความสูงจริงของแป้นพิมพ์เอง แล้วส่งเป็นตัวแปร --kb ให้ CSS ใช้ดันป๊อปอัปขึ้น
    if (window.visualViewport) {
      this._vv = window.visualViewport;
      this._onVV = () => {
        const gap = Math.max(0, window.innerHeight - this._vv.height - this._vv.offsetTop);
        document.documentElement.style.setProperty('--kb', Math.round(gap) + 'px');
      };
      this._vv.addEventListener('resize', this._onVV);
      this._vv.addEventListener('scroll', this._onVV);
    }
```

**โค้ดจริง — การถอด**
```jsx
    if (this._vv && this._onVV) {
      this._vv.removeEventListener('resize', this._onVV);
      this._vv.removeEventListener('scroll', this._onVV);
    }
```

**โค้ดจริง — ที่เอาไปใช้** (`components/pages/sheet.jsx:13` — ป๊อปใส่จำนวนฝั่งมือถือ ที่เลื่อนขึ้นจากขอบล่าง)
```jsx
      <div role="dialog" aria-modal="true" style={s('position:fixed;left:0;right:0;bottom:0;z-index:21;display:flex;justify-content:center;transform:translateY(calc(var(--kb) * -1));transition:transform .12s ease-out')}>
```

**แก้ปัญหาอะไร** — ป๊อปที่ตรึงไว้ที่ขอบล่างจอ พอแป้นพิมพ์เด้งขึ้นมาจะถูกแป้นพิมพ์บังทั้งอัน ผู้ใช้พิมพ์ตัวเลขแล้วไม่เห็นสิ่งที่พิมพ์และไม่เห็นปุ่มยืนยัน

**สูตรที่ใช้** — `gap = max(0, window.innerHeight − visualViewport.height − visualViewport.offsetTop)` แล้วเขียนลง `--kb` ที่ `documentElement` · ฝั่ง CSS ใช้ `transform: translateY(calc(var(--kb) * -1))` ดันป๊อปขึ้นเท่าความสูงแป้นพิมพ์พอดี พร้อม `transition: transform .12s ease-out` ให้ไม่กระตุก

**เหตุผลจากคอมเมนต์** — "บาง iOS ไม่หดพื้นที่ให้แม้ตั้ง `interactiveWidget` แล้ว" (คือแม้ตั้ง `viewport-fit` / `interactive-widget=resizes-content` ก็ยังต้องวัดเอง)

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย ทั้งก้อน** เป็นสูตรกลาง · ข้อควรระวังเวลายก: ต้องมี `--kb` ค่าตั้งต้นเป็น `0px` ใน CSS ไม่งั้น `calc(var(--kb) * -1)` จะพังทั้งบรรทัดตอนยังไม่ได้วัด (ยังไม่แน่ใจว่าเว็บนี้ตั้งค่าตั้งต้นไว้ไหม — ยังไม่ได้เปิด `app/globals.css` / `app/mobile.css` เพราะไม่อยู่ในขอบเขตที่ได้รับมอบหมาย)

---

## ดึงหน้าลงเพื่อโหลดใหม่ (pull-to-refresh) — ทำเองทั้งหมด

**ที่ไหน** `components/MedReturnApp.jsx:195-204` (state) + `:739-800` (ตัวจับนิ้ว + ตัวโหลด) + `:592-596` (การผูก) + `:1044-1047` (การถอด)

**โค้ดจริง — คำอธิบายใน state**
```jsx
      // ── ดึงหน้าลงเพื่อโหลดใหม่ (พี่กันสั่ง 1 ก.ย. 2569) ────────────────────
      // pullY = ระยะที่นิ้วลากลงมาแล้ว (หน่วยพิกเซล · 0 คือยังไม่ได้ลาก)
      // pullBusy = ปล่อยนิ้วแล้วกำลังโหลดอยู่
      // 🚨 ทั้งคู่ต้องเป็น 0/false เสมอบนเดสก์ท็อป — ตัวจับนิ้วไม่ทำงานที่นั่นเลย
```
```jsx
      pullY: 0,
      pullBusy: false,
```

**โค้ดจริง — คอมเมนต์อธิบายเหตุผล**
```jsx
  // ── ดึงหน้าลงเพื่อโหลดใหม่ (พี่กันสั่ง 1 ก.ย. 2569) ─────────────────────────
  //
  // ทำไมต้องมี: เว็บนี้ถามเซิร์ฟเวอร์เองทุก 20 วินาทีอยู่แล้ว (ดูข้อ 3.62)
  // แต่คนใช้มือถือไม่มีทางรู้ว่าของบนจอสดหรือเก่า และไม่มีปุ่มโหลดใหม่ให้กด
  // การดึงลงเป็นท่ามาตรฐานที่ทุกแอปใช้ตรงกัน จึงไม่ต้องสอน
  //
  // 🚨 ทำงานเฉพาะฝั่งมือถือ — ผูกกับคลาส .mrv-mobile ตัวเดียวกับ mobile.css
  //    เดสก์ท็อปไม่มี touch event และถึงมีก็ถูกด่านนี้ตีกลับก่อน
  // 🚨 ต้องอยู่บนสุดของพื้นที่เลื่อนเท่านั้น (scrollTop === 0)
  //    ไม่งั้นเลื่อนดูตารางประวัติกลางหน้าแล้วหน้าถูกดึงลงมั่ว
  // 🚨 ระยะที่นิ้วลากถูกหารครึ่ง — ให้รู้สึกฝืดเหมือนดึงยางยืด
  //    ลากเท่าไหร่ขยับเท่านั้น จะรู้สึกลื่นเกินจนเผลอสั่งโหลดใหม่บ่อย
  PULL_MAX = 92;
  PULL_FIRE = 62;

  _onTouchStart = (e) => {
    if (!this._isNarrowNow()) return;
    if (this.state.pullBusy) return;
    const sc = this.scrollRef.current;
    if (!sc || sc.scrollTop > 0) { this._pullFrom = null; return; }
    this._pullFrom = e.touches && e.touches[0] ? e.touches[0].clientY : null;
  };

  _onTouchMove = (e) => {
    if (this._pullFrom == null) return;
    const sc = this.scrollRef.current;
    // เลื่อนขึ้นไปแล้ว = เลิกนับว่าเป็นการดึง ปล่อยให้เลื่อนตามปกติ
    if (!sc || sc.scrollTop > 0) { this._pullFrom = null; if (this.state.pullY) this.setState({ pullY: 0 }); return; }
    const y = e.touches && e.touches[0] ? e.touches[0].clientY : 0;
    const dy = y - this._pullFrom;
    if (dy <= 0) { if (this.state.pullY) this.setState({ pullY: 0 }); return; }
    // 🚨 ต้องห้ามการเลื่อนของเบราว์เซอร์ ไม่งั้นเด้งของมันเองสู้กับของเรา ภาพกระตุก
    //    ทำได้เพราะตัวจับนี้ผูกแบบ passive:false (ดู componentDidMount)
    if (e.cancelable) e.preventDefault();
    const next = Math.min(this.PULL_MAX, dy * 0.5);
    if (Math.abs(next - this.state.pullY) >= 1) this.setState({ pullY: next });
  };

  _onTouchEnd = () => {
    if (this._pullFrom == null) return;
    this._pullFrom = null;
    const y = this.state.pullY;
    if (y >= this.PULL_FIRE) { this.pullRefresh(); return; }
    if (y) this.setState({ pullY: 0 });
  };

  // 🚨 ต้องคืนหน้าจอให้เร็วแม้เซิร์ฟเวอร์ช้า — ค้างที่ตัวหมุนนาน ๆ คนจะกดซ้ำ
  //    ตั้งเวลาขั้นต่ำ 420 มิลลิวินาที ไม่งั้นเน็ตเร็ว ๆ ตัวหมุนแวบเดียวจนดูเหมือนไม่ได้ทำอะไร
  pullRefresh = async () => {
    if (this.state.pullBusy) return;
    this.setState({ pullBusy: true, pullY: this.PULL_FIRE });
    const t0 = Date.now();
    try {
      // ถามลายเซ็นก่อน (คลังยา · การตั้งค่า · รายการยาคืน) แล้วโหลดเฉพาะหน้าที่เปิดอยู่
      await this.pulse({ quiet: true });
      this.refreshCurrent();
      if (this.loadServerDrafts) this.loadServerDrafts();
    } catch (e) {}
    const left = 420 - (Date.now() - t0);
    const done = () => this.setState({ pullBusy: false, pullY: 0 });
    if (left > 0) setTimeout(done, left); else done();
  };
```

**โค้ดจริง — การผูก (สังเกต passive ที่ต่างกัน)**
```jsx
    // ดึงหน้าลงเพื่อโหลดใหม่ — ผูกที่หน้าต่าง ไม่ใช่ที่พื้นที่เลื่อน
    // 🚨 พื้นที่เลื่อนถูกสร้างหลัง componentDidMount ในบางจังหวะ (ตอนยังโหลดอยู่)
    //    ผูกที่หน้าต่างแล้วเช็ค scrollRef เอาข้างในจึงไม่มีทางพลาด
    // 🚨 passive:false ที่ touchmove เท่านั้น — ตัวอื่นปล่อย passive ไว้ให้เลื่อนลื่น
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this._onTouchEnd, { passive: true });
```

**สรุปกฎที่ยกไปใช้ได้ทันที**
| ค่า/กฎ | รายละเอียด |
|---|---|
| `PULL_FIRE = 62` | ลากถึงเท่านี้แล้วปล่อย = สั่งโหลด |
| `PULL_MAX = 92` | ลากมากกว่านี้ก็ไม่ขยับเพิ่ม |
| `dy * 0.5` | หารระยะนิ้วครึ่งหนึ่ง ให้รู้สึกฝืดเหมือนยางยืด |
| `>= 1` ถึงจะ setState | กันวาดจอรัวทุกพิกเซล |
| `scrollTop === 0` เท่านั้น | ไม่งั้นเลื่อนกลางหน้าแล้วโดนดึงมั่ว |
| ขั้นต่ำ 420ms | เน็ตเร็วแล้วตัวหมุนแวบเดียว ดูเหมือนไม่ได้ทำอะไร |
| `touchcancel` ผูกไปที่ `_onTouchEnd` ด้วย | นิ้วถูกยกโดยระบบ (โทรเข้า) ต้องคืนค่าเหมือนกัน |
| `passive: false` เฉพาะ `touchmove` | ตัวอื่นปล่อย passive ไว้ให้เลื่อนลื่น |

**ผูกกับเว็บนี้แค่ไหน** — **โครงยกไปใช้ได้เลย · ไส้ในต้องปรับ** · `pullRefresh` เรียก `this.pulse()` · `this.refreshCurrent()` · `this.loadServerDrafts()` ซึ่งเป็นของเว็บนี้ล้วน — เว็บอื่นเปลี่ยนเป็นตัวโหลดของตัวเอง แต่ **โครงตั้งเวลาขั้นต่ำ 420ms และ try/catch ครอบต้องคงไว้**

---

## `--bottombar` — ข้อความเด้ง (toast) ไม่ทับแถบล่างของมือถือ

**ที่ไหน** `components/MedReturnApp.jsx:301-329` + ที่ใช้ `components/pages/toast.jsx:18`

**โค้ดจริง**
```jsx
    // ── วัดความสูงของแถบล่างจอในโหมดมือถือ ──────────────────────────────────
    // ข้อความเด้ง (toast) ของมอคอัปตรึงไว้ที่ bottom:96px ตายตัว
    // แต่ในเว็บจริงหน้าบันทึกมีแถบบันทึกซ้อนอยู่เหนือแถบเมนู รวมกันสูงกว่า 200px
    // ข้อความเด้ง "บันทึกสำเร็จ" จึงไปทับตัวเลขมูลค่ารวมพอดี = อ่านไม่ออกทั้งคู่
    //
    // มีสองกล่องแยกกัน (แถบเมนู + แถบบันทึก) และแถบบันทึกโผล่เฉพาะบางหน้า
    // จึงวัดทีละกล่องแล้วบวกกัน เขียนผลรวมลง --bottombar ให้ toast เอาไปใช้
    this._barRO = { nav: null, save: null };
    this._barH = { nav: 0, save: 0 };
    this._writeBottomBar = () => {
      const total = this._barH.nav + this._barH.save;
      document.documentElement.style.setProperty('--bottombar', total + 'px');
    };
    // สร้าง ref ไว้ตายตัวใน constructor — ถ้าสร้างใหม่ทุกครั้งที่วาดจอ
    // React จะถอดแล้วต่อตัววัดใหม่ทุกเฟรม
    const makeBarRef = (name) => (el) => {
      if (this._barRO[name]) { this._barRO[name].disconnect(); this._barRO[name] = null; }
      if (!el || typeof ResizeObserver === 'undefined') {
        this._barH[name] = 0;              // กล่องหายไปจากจอ = ไม่นับความสูงของมัน
        this._writeBottomBar();
        return;
      }
      const write = () => { this._barH[name] = el.offsetHeight; this._writeBottomBar(); };
      write();
      this._barRO[name] = new ResizeObserver(write);
      this._barRO[name].observe(el);
    };
    this.navBarRef = makeBarRef('nav');
    this.saveBarRef = makeBarRef('save');
```

**โค้ดจริง — ที่เอาไปใช้** (`components/pages/toast.jsx:18`)
```jsx
    <div role="status" aria-live="polite" style={s('position:fixed;left:0;right:0;bottom:calc(var(--bottombar, 96px) + 14px);z-index:95;display:flex;justify-content:center;pointer-events:none;padding:0 14px')}>
```

**แก้ปัญหาอะไร** — toast ที่ตรึงไว้ที่ `bottom:96px` ตายตัว ไปทับแถบล่างของมือถือ (แถบเมนู + แถบบันทึก รวมกันเกิน 200px) = อ่านไม่ออกทั้งข้อความเด้งและตัวเลขที่ถูกทับ

**กฎ 3 ข้อที่ยกไปได้เลย**
1. **วัดด้วย `ResizeObserver` อย่าตั้งเลขตายตัว** — แถบล่างสูงไม่เท่ากันแต่ละหน้า
2. **แยกวัดทีละกล่องแล้วบวก** — แถบบันทึกโผล่เฉพาะบางหน้า
3. 🚨 **สร้าง ref ไว้ตายตัวใน constructor** ถ้าสร้าง arrow function ใหม่ทุกครั้งที่วาดจอ React จะถอดแล้วต่อ ResizeObserver ใหม่ทุกเฟรม (คอมเมนต์ในไฟล์นี้เตือนซ้ำอีกที่ในตัว `catMoreRef` ว่าเป็น "บทเรียนเดียวกับ `--bottombar`")
4. **กล่องหายจากจอ = ตั้งความสูงเป็น 0** ไม่ใช่ปล่อยค้างค่าเดิม
5. **ฝั่งที่ใช้ต้องมีค่าสำรอง** — `var(--bottombar, 96px)` เผื่อยังไม่ได้วัด

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** ทั้งแพตเทิร์น · ชื่อกล่อง (`nav`/`save`) ต้องปรับตามแถบล่างของเว็บนั้น

---

## แถบตรึงอื่น ๆ ที่วัดด้วย ResizeObserver (แพตเทิร์นเดียวกัน 3 ตัว)

**ที่ไหน** `components/MedReturnApp.jsx:260-299`

**โค้ดจริง** (ยกมาตัวแรกเป็นตัวอย่าง ทั้ง 3 ตัวโครงเหมือนกันเป๊ะ)
```jsx
    // ── วัดความสูงแถบกรองหน้าประวัติ ─────────────────────────────────────────
    // หัวตารางต้องติดใต้แถบกรองพอดี ห่างเกินไปจะเห็นแถวลอดผ่าน ชิดเกินไปก็ทับกัน
    // ตั้งเลขตายตัวไม่ได้ เพราะแถบกรองขึ้นบรรทัดใหม่เองเมื่อจอแคบ (flex-wrap)
    // ref แบบฟังก์ชันจะถูกเรียกตอนของโผล่/หายจากจอ = ต่อและถอดตัววัดได้ถูกจังหวะ
    this._histHeadRO = null;
    this.histHeadRef = (el) => {
      if (this._histHeadRO) { this._histHeadRO.disconnect(); this._histHeadRO = null; }
      if (!el || typeof ResizeObserver === 'undefined') return;
      const write = () => document.documentElement.style.setProperty('--histhead', el.offsetHeight + 'px');
      write();
      this._histHeadRO = new ResizeObserver(write);
      this._histHeadRO.observe(el);
    };
```

อีกสองตัวคือ `lotsHeadRef` → `--lotshead` (`:274-286`) และ `catHeadRef` → `--cathead` (`:288-299`)

**แก้ปัญหาอะไร** — หัวตารางที่ตรึงต้องติดใต้แถบกรองพอดี ตั้งเลขตายตัวไม่ได้เพราะ **"แถบกรองขึ้นบรรทัดใหม่เองเมื่อจอแคบ (flex-wrap)"** ซึ่งเป็นสิ่งที่เกิดบนมือถือโดยตรง

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** · เป็นแพตเทิร์นทั่วไปสำหรับ "ตรึง 2 ชั้น" · ⚠️ CLAUDE.md ข้อ 3.70 บันทึกว่าถ้ารื้อมาใช้ `<table>` จริง จะใช้ `thead + position:sticky` ได้ตรง ๆ ไม่ต้องวัดด้วย ResizeObserver อีก — แต่ **กรอบที่ครอบตารางห้ามมี `overflow`** ไม่งั้น sticky ตายทันที

---

# ส่วนที่ 2 — `components/shell.jsx` · `vals/derive.js` · `vals/shell.js` · `handlers/ui.js` · `pages/nav.jsx`

---

## กล่องนอกสุดฝั่งมือถือใช้ `position:fixed` + ความกว้างที่วัดได้ (`lockW`)

**ที่ไหน** `components/shell.jsx:60-74`

**โค้ดจริง**
```jsx
  return (
    /* ── ฝั่งมือถือตรึงทั้งแอปติดกับจอ (พี่กันบ่นเรื่องเดิม 6 รอบ) ────────────

       ก่อนหน้านี้กล่องนอกสุดเป็นกล่องธรรมดาที่สูงเท่าจอ ซึ่งยัง "ลอยอยู่ในหน้าเว็บ"
       ถ้ามีอะไรทำให้หน้าเว็บกว้างกว่าจอ ตัวมันก็ถูกลากไปมาตามหน้าได้

       position:fixed + inset:0 ทำให้มันยึดกับกรอบจอโดยตรง ไม่ใช่ยึดกับหน้าเว็บ
       ต่อให้หน้าเว็บกว้างแค่ไหน หรือมีอะไรมาแทรกจากนอกเว็บ ตัวแอปก็ไม่ขยับตาม
       เป็นท่าเดียวกับที่แอปบนมือถือทำกัน

       🚨 ฝั่งคอมห้ามใช้เด็ดขาด — fixed จะถอนกล่องออกจากผังหน้า
          หน้าที่ต้องเลื่อนทั้งหน้าบนคอมจะพังทันที */
    <div style={V.narrow
      ? sx('position:fixed;top:0;left:0;bottom:0;display:flex;flex-direction:column;overflow:hidden;font-family:Sarabun,sans-serif;color:#1e2420', { background: V.shellBg, width: V.lockW ? V.lockW + 'px' : '100%', maxWidth: V.lockW ? V.lockW + 'px' : '100%' })
      : sx('height:100dvh;display:flex;flex-direction:column;overflow:hidden;font-family:Sarabun,sans-serif;color:#1e2420', { background: V.shellBg })}>
```

**แก้ปัญหาอะไร** — กล่องที่ "สูงเท่าจอ" แต่ยังลอยอยู่ในหน้าเว็บ จะถูกลากไปมาตามหน้าได้ถ้ามีอะไรกว้างเกิน · `position:fixed` + `top/left/bottom` + ความกว้างจาก `lockW` ทำให้กล่องยึดกับกรอบจอโดยตรง

**จุดที่ต้องสังเกต** — ไม่ได้ใช้ `inset:0` (ที่จะรวม `right:0`) แต่ใช้ `top:0;left:0;bottom:0` แล้วกำหนด `width` + `maxWidth` จาก `lockW` แทน — ถ้าใช้ `right:0` ความกว้างจะกลับไปอิงกรอบผัง (layout viewport) ซึ่งเป็นสิ่งที่พยายามหนีอยู่

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** ถ้าเว็บนั้นทำตัวเหมือนแอป (ทั้งหน้าไม่เลื่อน มีแถบล่างตรึง) · ⚠️ **ห้ามยกไปใช้กับหน้าที่ต้องเลื่อนทั้งหน้าตามปกติ** คอมเมนต์เตือนเองว่า "fixed จะถอนกล่องออกจากผังหน้า"

---

## พื้นที่เลื่อนหลัก — ปิด overflow เมื่อมีป๊อป · ปิด overflow-anchor · เลื่อนตามนิ้วด้วย transform

**ที่ไหน** `components/shell.jsx:95-119`

**โค้ดจริง**
```jsx
      {/* ── ฉากหลังห้ามเลื่อนเมื่อมีหน้าต่างซ้อนเปิดอยู่ (พี่กันสั่ง 1 ก.ย. 2569) ──
          "เราบอกเเล้วว่าพอมี popup เเล้วฉากหลังห้ามเลื่อน"

          🚨 ต้องปิดที่ overflow ของพื้นที่เลื่อนเอง ไม่ใช่แค่ที่ body
             เว็บนี้ล็อกความสูงเท่าจอ ตัวที่เลื่อนจริงคือ div ตัวนี้ ไม่ใช่ body
          🚨 ตำแหน่งที่เลื่อนค้างไว้ไม่หาย เพราะแค่ปิด overflow ไม่ได้รีเซ็ต scrollTop
             ปิดหน้าต่างแล้วกลับมาที่เดิมพอดี */}
      <div ref={app.scrollRef} role="main" style={sx('flex:1;overflow-anchor:none;min-height:0;position:relative;display:flex;flex-direction:column', Object.assign(
        { overflowY: V.anyModalOpen ? 'hidden' : 'auto' },
        V.pullY ? { transform: 'translateY(' + V.pullY + 'px)', transition: V.pullBusy ? undefined : 'none' } : null))}>
```

**3 เรื่องซ้อนอยู่ในบรรทัดเดียว**

1. **`overflowY: anyModalOpen ? 'hidden' : 'auto'`** — ปิดพื้นที่เลื่อนเมื่อมีป๊อป (เป็นชั้นที่ 3 ของการกันฉากหลังเลื่อน · ชั้นที่ 1 คือ `_blockBgScroll` ชั้นที่ 2 คือ `_lockBody`)

2. **`overflow-anchor:none`** — คอมเมนต์อธิบายที่ `shell.jsx:97-99`
```jsx
      {/* overflow-anchor:none = ปิดระบบ "ยึดตำแหน่งเลื่อน" ของเบราว์เซอร์
          ปกติมันช่วยไม่ให้จอกระตุกตอนเนื้อหาข้างบนโตขึ้น แต่ที่นี่มันกลับดึงตำแหน่งเดิมกลับมา
          หลังสลับแท็บแล้วข้อมูลโหลดเสร็จ ทำให้เปิดหน้าสรุปมาแล้วอยู่กลางหน้า (พี่กันแจ้งบั๊ก) */}
```

3. **`transform: translateY(pullY)` ตอนดึงลง** — คอมเมนต์ที่ `shell.jsx:108-109`
```jsx
      {/* transform ตามนิ้ว — ใช้ translate ไม่ใช่ margin/padding
          เพราะ translate ไม่ทำให้เบราว์เซอร์คำนวณผังหน้าใหม่ทุกเฟรม ภาพจึงลื่น */}
```
   และ `transition: V.pullBusy ? undefined : 'none'` — **ระหว่างลากต้องเขียน `transition:none` ทับ ไม่งั้นภาพตามนิ้วไม่ทัน** (CLAUDE.md ข้อ 3.67 เขียนกฎนี้ไว้ตรง ๆ) · ปล่อยนิ้วแล้ว (`pullBusy`) ถึงปล่อยให้ transition ทำงาน

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลยทั้ง 3 เรื่อง** · `overflow-anchor:none` เป็นของที่หลายเว็บควรมีแต่ไม่มีใครนึกถึง

---

## แถบ "ดึงลงเพื่อโหลดใหม่" — กล่องสูง 0 เสมอ ผังหน้าไม่ขยับ

**ที่ไหน** `components/shell.jsx:35-54` (ตัววาด) · `:103-107` (จุดที่วาง) · `components/vals/shell.js:26-33` (ข้อความ)

**โค้ดจริง — ตัววาด**
```jsx
// ── แถบ "ดึงลงเพื่อโหลดใหม่" ───────────────────────────────────────────────
//
// 🚨 ความสูงของกล่องเป็น 0 เสมอ (position:absolute) ผังหน้าจึงไม่ขยับเลย
//    ใช้ absolute แทนการแทรกกล่องจริง เพราะกล่องจริงจะดันทุกอย่างลงตลอดเวลา
// 🚨 ตัวหมุนหมุนเฉพาะตอนกำลังโหลด ระหว่างลากเป็นวงกลมนิ่งที่ค่อย ๆ เข้มขึ้น
//    ของที่หมุนตลอดเวลาบอกอะไรไม่ได้ว่าตอนนี้ถึงจุดที่ปล่อยได้หรือยัง
function renderPull(V) {
  if (!V.pullY && !V.pullBusy) return null;
  const k = Math.min(1, V.pullY / 62);
  return (
    <div role="status" aria-live="polite" style={s('position:relative;z-index:2;height:0;overflow:visible')}>
      <div style={sx('position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;pointer-events:none', { height: V.pullY + 'px', opacity: Math.max(0.25, k) })}>
        <div style={sx('width:22px;height:22px;border-radius:50%;border:2.2px solid rgba(47,125,93,.22)', V.pullBusy
          ? { borderTopColor: '#2f7d5d', animation: 'mrspin .7s linear infinite' }
          : { borderTopColor: '#2f7d5d', transform: 'rotate(' + Math.round(k * 300) + 'deg)' })}></div>
        <span style={s('font:600 11.5px Sarabun,sans-serif;color:#2f7d5d')}>{V.pullLabel}</span>
      </div>
    </div>
  );
}
```

**โค้ดจริง — จุดที่วาง**
```jsx
      {/* ── ดึงหน้าลงเพื่อโหลดใหม่ (พี่กันสั่ง 1 ก.ย. 2569) ──────────────────────
          🚨 วางไว้นอกพื้นที่เลื่อน แล้วให้พื้นที่เลื่อนขยับทับมันลงมา
             ถ้าวางข้างใน มันจะเลื่อนหนีไปกับเนื้อหาแล้วมองไม่เห็นตอนดึง
          🚨 บนเดสก์ท็อป V.pullY เป็น 0 เสมอ กล่องนี้จึงสูง 0 และไม่มีอะไรขยับ */}
      {renderPull(V)}
```

**โค้ดจริง — ข้อความ 3 สถานะ** (`vals/shell.js`)
```js
    // ── ดึงหน้าลงเพื่อโหลดใหม่ (พี่กันสั่ง 1 ก.ย. 2569) ──────────────────────
    // 🚨 บนเดสก์ท็อป pullY เป็น 0 เสมอ ตัวจับนิ้วตีกลับตั้งแต่ด่านแรก
    //    ของทุกชิ้นจึงอยู่ตำแหน่งเดิมเป๊ะ ไม่มีอะไรถูกเลื่อนแม้แต่พิกเซลเดียว
    pullY: st.pullY || 0,
    pullBusy: !!st.pullBusy,
    pullReady: (st.pullY || 0) >= 62,
    pullLabel: st.pullBusy ? 'กำลังโหลดข้อมูลใหม่' : ((st.pullY || 0) >= 62 ? 'ปล่อยเพื่อโหลดใหม่' : 'ดึงลงเพื่อโหลดใหม่'),
```

**กฎที่ยกไปได้**
- กล่องนอกสูง 0 (`height:0;overflow:visible`) แล้วกล่องในเป็น `absolute` — ผังหน้าไม่ขยับเลย
- **ตัวหมุนหมุนเฉพาะตอนโหลด** ระหว่างลากเป็นวงกลมที่หมุนตามระยะนิ้ว `rotate(k * 300 deg)` — บอกได้ว่าใกล้จุดปล่อยหรือยัง
- ความทึบไล่ตามระยะ `opacity: max(0.25, k)`
- ข้อความ 3 สถานะ: `ดึงลงเพื่อโหลดใหม่` → `ปล่อยเพื่อโหลดใหม่` → `กำลังโหลดข้อมูลใหม่`
- `pointer-events:none` กันไปกินคลิก · `role="status" aria-live="polite"` ให้โปรแกรมอ่านจอรู้

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** ต้องมี keyframes ชื่อ `mrspin` ในเว็บนั้น
⚠️ **จุดอ่อนที่เว็บอื่นควรทำให้ดีกว่า** — เลข 62 (`PULL_FIRE`) ถูกเขียนซ้ำ **3 ที่** คือ `MedReturnApp.PULL_FIRE` · `renderPull` ใน `shell.jsx` · `pullReady`/`pullLabel` ใน `vals/shell.js` — ควรทำเป็นค่าคงที่ตัวเดียวส่งต่อกัน

---

## ธง `wide` / `narrow` — จุดสลับเดียวของทั้งเว็บ ต้องมาจากการวัดจริง

**ที่ไหน** `components/vals/derive.js:44-55` + `components/vals/shell.js:40-41`

**โค้ดจริง**
```js
    // สวิตช์บังคับดูแบบมือถือบนคอม (มอคอัปบรรทัด 1165) — พี่กันขอให้เก็บไว้
    //
    // จุดตัด: มอคอัปใช้ 960 แต่วัดจริงแล้วที่ 960px คอลัมน์ชื่อยาในตารางเหลือ 34px
    // (คอลัมน์อื่นตรึงความกว้างรวม 522px + แถบข้าง 296px กินไปหมด)
    // แค่ "Metformin 500 mg" ก็ตัดเป็น 3 บรรทัดแล้ว ชื่อยาวกว่านั้นตารางพังเลย
    // ขยับเป็น 1180 → โน้ตบุ๊กจอเล็กได้หน้าจอมือถือซึ่งอ่านง่ายกว่ามาก
    wide: st.vw >= 1180 && !st.forceNarrow,
    tight: tight
```
```js
    wide: d.wide,
    narrow: !d.wide,
```

**บทเรียนที่ยกไปได้** — **จุดสลับต้องมาจากการวัดจริง ไม่ใช่ตัวเลขมาตรฐาน** · เว็บนี้ขยับจาก 960 เป็น 1180 เพราะวัดแล้วคอลัมน์ชื่อยาเหลือ 34px ที่ 960px

**ผูกกับเว็บนี้แค่ไหน** — **แนวคิดยกไปได้ · ตัวเลขต้องวัดใหม่ทุกเว็บ**

---

## จอเตี้ยต้องบีบแถว — ธง `tight` วัดความสูงจอ ไม่ใช่แค่ความกว้าง

**ที่ไหน** `components/vals/derive.js:8-10` + `components/MedReturnApp.jsx:186-190`

**โค้ดจริง — ใน derive**
```js
export function derive(app) {
  // จอเตี้ยกว่า 700px = บีบแถวให้เตี้ยลง เห็นยาได้มากขึ้นอีกราว 3 แถว
  const tight = (app.state.vh || 900) < 700;
```

**โค้ดจริง — คำอธิบายใน state**
```jsx
      vw: 430,
      // ความสูงจอ — ใช้ตัดสินว่าจอสูงพอจะล็อกความสูงหน้าบันทึกไหม
      // 🚨 จอเตี้ยแล้วยังล็อกอยู่ = กรอบรายการยาโดนบีบจนเหลือ 2 แถว
      //    พี่กันเจอเองตอนเปิดโครมสูง 577px แล้วทัก "อันนี้บีบมากกก"
      vh: 900,
```

**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ)**
> พี่กันเจอเองตอนเปิดโครมสูง 577px แล้วทัก "อันนี้บีบมากกก"

**บทเรียนเพิ่มจาก CLAUDE.md ข้อ 3.65**
> 🚨 **ต้องวัดความสูงจอด้วย ไม่ใช่แค่ความกว้าง** — `st.vh` ใน MedReturnApp
> ⚠️ **รีดช่องไฟรอบ ๆ ทีละ 5px ไม่ช่วยอะไร** ตัวที่กินที่จริงคือแถวยาที่คูณจำนวนแถว

**ผูกกับเว็บนี้แค่ไหน** — **แนวคิดยกไปได้เลย** (มือถือแนวนอน · โน้ตบุ๊กจอเตี้ย · เบราว์เซอร์ที่เปิด devtools ครึ่งจอ) · เลข 700 กับค่าที่บีบต้องปรับตามเนื้อหาของเว็บนั้น

---

## เปลี่ยนหน้าแบบไล่จาง — เฉพาะมือถือ และมีทางถอย 4 ชั้น

**ที่ไหน** `components/handlers/ui.js` → `app.viewSwap`

**โค้ดจริง**
```js
  // ── เปลี่ยนหน้าแบบไล่จาง เฉพาะฝั่งมือถือ (พี่กันเคาะ 1 ก.ย. 2569 ชุดที่ 4) ──
  //
  // 🚨 เฉพาะมือถือเท่านั้น ห้ามลามไปเดสก์ท็อป (พี่กันสั่ง "ห้ามขยับเดสแม้แต่ 1px")
  //    ตัวตัดสินคือคลาส .mrv-mobile ที่ body ตัวเดียวกับที่ mobile.css ใช้
  //    ไม่ได้เช็คความกว้างจอ เพราะกดปุ่ม "มือถือ" บนคอมได้
  //
  // 🚨 เครื่องที่ไม่รองรับต้องทำงานปกติ ไม่ใช่ค้าง
  //    Safari รองรับตั้งแต่รุ่น 18 · เครื่องเก่ากว่านั้นเปลี่ยนหน้าแบบเดิมเป๊ะ
  //
  // 🚨 ห้ามใช้ตอนเปิดหน้าต่างซ้อน (ป๊อป) — ภาพนิ่งที่เบราว์เซอร์ถ่ายไว้จะกินคลิกไปด้วย
  //    ที่นี่ใช้กับการสลับแท็บอย่างเดียวจึงปลอดภัย
  app.viewSwap = (run) => {
    const canFade = typeof document !== 'undefined' &&
      typeof document.startViewTransition === 'function' &&
      document.body.classList.contains('mrv-mobile') &&
      !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!canFade) { run(); return; }
    try { document.startViewTransition(run); } catch (e) { run(); }
  };
```

**ด่านตรวจ 4 ชั้นก่อนจะไล่จาง**
1. มี `document` (ไม่ใช่ตอนเซิร์ฟเวอร์วาดจอ)
2. เบราว์เซอร์รองรับ `document.startViewTransition`
3. **เป็นมือถือ** (คลาส `.mrv-mobile` — ไม่ใช่ความกว้างจอ)
4. **เครื่องไม่ได้เปิด "ลดการเคลื่อนไหว"** (`prefers-reduced-motion: reduce`)

แล้วยังครอบ `try/catch` อีกชั้น พังก็ `run()` ตรง ๆ

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลยทั้งก้อน** เปลี่ยนแค่ชื่อคลาส · เป็นตัวอย่างที่ดีของ "ของสวยที่ห้ามพังบนเครื่องที่ไม่รองรับ"

---

## เด้งกลับบนสุดทุกครั้งที่สลับแท็บ — ต้องรีเซ็ต 2 จังหวะ

**ที่ไหน** `components/handlers/ui.js` → `app.goScreen` + `app.toTop`

**โค้ดจริง**
```js
    app.viewSwap(() => app.setState(Object.assign({ screen: name }, ปิดตั้งค่า), () => {
      // 🚨 เด้งกลับบนสุดทุกครั้งที่สลับแท็บ (พี่กันแจ้งบั๊ก)
      // พื้นที่เลื่อนเป็นก้อนเดียวใช้ร่วมกันทุกหน้า ไม่ได้ถูกสร้างใหม่ตอนสลับ
      // ตำแหน่งที่เลื่อนค้างจากหน้าเดิมเลยติดมาด้วย เปิดหน้าสรุปมาแล้วอยู่กลางหน้า
      // มองไม่เห็นตัวเลขใหญ่ซึ่งเป็นของสำคัญที่สุดของหน้านั้น
      //
      // ต้องรีเซ็ต 2 จังหวะ ครั้งเดียวไม่พอ — หน้าประวัติกับหน้าสรุปตอนเพิ่งเข้ายังไม่มีข้อมูล
      // เนื้อหาเลยสั้น พอข้อมูลมาถึงแล้วเนื้อหายืดยาวขึ้น เบราว์เซอร์จะดึงตำแหน่งเลื่อนกลับมา
      // (ทำงานคู่กับ overflow-anchor:none ที่พื้นที่เลื่อนใน shell.jsx)
      app.toTop();
```
```js
  // เด้งพื้นที่เลื่อนหลักกลับบนสุด — เรียกซ้ำในเฟรมถัดไปด้วยเผื่อเนื้อหายังวาดไม่เสร็จ
  app.toTop = () => {
    const set = () => { const sc = app.scrollRef && app.scrollRef.current; if (sc) sc.scrollTop = 0; };
    set();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(set);
  };
```

**แก้ปัญหาอะไร** — พื้นที่เลื่อนเป็นก้อนเดียวใช้ร่วมทุกหน้า สลับแท็บแล้วตำแหน่งเลื่อนของหน้าเดิมติดมาด้วย เปิดหน้าสรุปมาแล้วอยู่กลางหน้า มองไม่เห็นตัวเลขใหญ่

**กฎที่ยกไปได้** — **ต้องเรียก 2 จังหวะ** (ทันที + `requestAnimationFrame`) เพราะข้อมูลที่มาถึงทีหลังจะยืดเนื้อหาแล้วเบราว์เซอร์ดึงตำแหน่งเลื่อนกลับ · ทำงานคู่กับ `overflow-anchor:none`

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** · เว็บที่เลื่อนทั้งหน้าเปลี่ยน `sc.scrollTop = 0` เป็น `window.scrollTo(0,0)`

---

## ปุ่มขึ้นบนสุด/ลงล่างสุด — ใส่เฉพาะหน้ารายงาน ไม่ใส่หน้ากรอก

**ที่ไหน** `components/handlers/ui.js` → `app.pageToTop` / `app.pageToBottom`

**โค้ดจริง**
```js
  // ── ปุ่มขึ้นบนสุด/ลงล่างสุด (พี่กันสั่ง 1 ก.ย. 2569) ──────────────────────
  //   "เอาปุ่มขึ้นสุดลงสุดไปใส่หน่อย" · "ใส่เฉพาะหน้ารายงาน เเดช ไม่ใส่หน้ากรอก"
  //
  //   หน้าสรุปบนมือถือยาวมาก (ตัวเลขใหญ่ กราฟ 12 เดือน Top 10 โดนัทแหล่งที่มา
  //   และเหตุผลการทำลาย) เลื่อนกลับขึ้นไปดูยอดรวมทีต้องปัดหลายสิบครั้ง
  //
  // 🚨 ไม่ใส่ในหน้ากรอก (พี่กันสั่งตรง ๆ) — หน้านั้นมีแถบบันทึกตรึงอยู่ล่างจอแล้ว
  //    ปุ่มลอยเพิ่มอีกคู่จะบังรายการยาที่กำลังกรอก
  // 🚨 พื้นที่เลื่อนของเว็บนี้คือ app.scrollRef ไม่ใช่ทั้งหน้า
  //    window.scrollTo จึงใช้ไม่ได้เลย (กฎเดียวกับ catToTop ในหน้าคลังยา)
  app.pageToTop = () => {
    const el = app.scrollRef && app.scrollRef.current;
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
  };

  app.pageToBottom = () => {
    const el = app.scrollRef && app.scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };
```

**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ)**
> "เอาปุ่มขึ้นสุดลงสุดไปใส่หน่อย" · "ใส่เฉพาะหน้ารายงาน เเดช ไม่ใส่หน้ากรอก"

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** พร้อมกฎ "หน้าที่มีแถบตรึงล่างจอแล้ว ห้ามใส่ปุ่มลอยเพิ่ม"

---

## ข้อความเด้ง (toast) — สำเร็จหายเอง 4 วิ · ผิดพลาดค้างจนกดปิด · สั่นเครื่อง

**ที่ไหน** `components/handlers/ui.js` → `app.toast` / `app.closeToast`

**โค้ดจริง**
```js
  app.toast = (text, value, ok) => {
    if (app._toastTimer) clearTimeout(app._toastTimer);
    const good = ok !== false;
    app.setState({ toast: { text: text, value: value, ok: good } });
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    if (good) app._toastTimer = setTimeout(() => app.setState({ toast: null }), 4000);
  };
```
```js
  // 🚨 ปิดได้ด้วยการคลิกเมาส์เท่านั้น — ห้ามผูกกับคีย์บอร์ด (พี่กันสั่งตรง ๆ)
  //    เพราะผู้ใช้กด Enter รัว ๆ ตอนกรอกยา (Enter สองจังหวะคือเส้นทางหลัก)
  //    ถ้า Enter ปิดข้อความได้ ข้อความจะถูกปิดทิ้งโดยไม่ได้ตั้งใจก่อนอ่านทัน
  //    ซึ่งกลับไปเป็นปัญหาเดิมที่เพิ่งแก้ไป
  app.closeToast = () => app.setState({ toast: null });
```

**ส่วนที่แตะมือถือโดยตรง — `navigator.vibrate(12)`**
เป็น 1 ใน 3 จุดในเว็บที่ CLAUDE.md ข้อ 3.73 อนุญาตให้ `catch` เงียบได้
> | `handlers/ui.js` → `navigator.vibrate` | เครื่องไม่มีตัวสั่น |
>
> **เกณฑ์:** ทุกอย่างที่**คุยกับเซิร์ฟเวอร์**ต้องร้อง · ของที่เป็นความสามารถของเครื่องล้วน ๆ เงียบได้

**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ)**
> พี่กันเคาะ 26 ส.ค. 2569: "ไม่หายทั้งจะสำเร็จหรือไม่สำเร็จ ต้องกดยืนยันหรือปิดเอง
>                          และอันนี้กดเอนเทอร์แล้วไม่ไปนะ ต้องเมาส์ชี้เท่านั้น"

> 🚨 แยกกันคนละแบบ — พี่กันเคาะรอบสอง 26 ส.ค. 2569 หลังเห็นของจริง
>    "ข้อความที่สำเร็จ เรานึกว่าตอนกดบันทึกสุดท้าย ไม่ใช่แค่ยิบย่อยแบบนี้
>     งั้นเอาออก แล้วให้กดปิดเฉพาะผิดพลาด"

**กฎที่ยกไปได้**
- **สำเร็จ** → หายเองใน 4 วินาที ไม่มีปุ่มปิด (ของเดิม 2 วินาทีสั้นไป)
- **ผิดพลาด** → ค้างจนกว่าจะกดปิด **ห้ามใส่ตัวจับเวลาเด็ดขาด ไม่ว่ากี่วินาที**
- **สั่นเครื่อง 12ms** ทุกครั้งที่มีข้อความเด้ง (มือถือเท่านั้นที่รู้สึก) ครอบ try/catch เพราะเครื่องที่ไม่มีตัวสั่นจะโยน
- **ห้ามปิดด้วยคีย์บอร์ด** เพราะเส้นทางหลักของหน้าบันทึกคือกด Enter รัว ๆ

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** · ข้อ "ห้ามปิดด้วยคีย์บอร์ด" ผูกกับเว็บที่มีเส้นทาง Enter รัว ๆ — เว็บอื่นควรทบทวนก่อน

---

## แถบเมนูล่างจอฝั่งมือถือ — safe area · ขนาดปุ่ม · ไอคอนที่สื่อความหมาย

**ที่ไหน** `components/pages/nav.jsx:61-86` (ตัวแถบ) · `:4-59` (ไอคอน) · `components/vals/shell.js:5-13,153` (กรองแท็บ)

**โค้ดจริง — ตัวแถบ**
```jsx
export function renderNavNarrow(V) {
  return (
    <div role="navigation" aria-label="เมนูหลัก" ref={V.navBarRef} style={s('flex:none;background:#fff;border-top:1px solid rgba(30,36,32,.08);padding:8px 0 max(14px,env(safe-area-inset-bottom));order:2')}>
      {/* 🚨 ต้องมีสวิตช์มุมมองในแถบล่างด้วย เฉพาะตอนที่จอกว้างจริงแต่ถูกบังคับดูแบบมือถือ
          ไม่งั้นกดสลับเป็น "มือถือ" แล้วสวิตช์หายไปกับแถบบน = ติดอยู่ในโหมดมือถือถาวร */}
```
```jsx
      {/* 🚨 ใช้ V.tabsNarrow ไม่ใช่ V.tabs — ฝั่งมือถือไม่มีแท็บคลังยา (พี่กันสั่ง 1 ก.ย. 2569) */}
      <div style={s('max-width:520px;margin:0 auto;display:flex;justify-content:space-around')}>
        {V.tabsNarrow.map((t) => (
          <div key={t.label} {...kb(t.pick)} className="hv-txt" style={sx('display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:76px;min-height:52px;border-radius:12px;cursor:pointer;font:600 11px/1.75 Sarabun,sans-serif', { color: t.fg })}>
            {navIcon(t.key, t.on)}
            {t.label}
          </div>
        ))}
      </div>
```

**โค้ดจริง — การกรองแท็บที่ไม่เอาลงมือถือ** (`vals/shell.js`)
```js
// ── แท็บที่ไม่เอาลงแถบล่างฝั่งมือถือ (พี่กันสั่ง 1 ก.ย. 2569) ────────────────
//
// "เอาแท็บคลังยาออก ไม่ใส่ ให้ดูในเดสเท่านั้น"
// หน้าคลังยาเป็นตาราง 14 คอลัมน์ที่ต้องเลื่อนซ้ายขวา ใช้บนจอมือถือไม่ไหวจริง ๆ
// และเป็นงานแก้ข้อมูลกลางที่ทำจากเครื่องห้องยา ไม่ใช่งานหน้าเคาน์เตอร์
//
// 🚨 กรองด้วย key ไม่ใช่ตำแหน่งในรายการ — เพิ่มแท็บใหม่แล้วไม่ต้องมาแก้เลขตรงนี้
// ⚠️ หน้าคลังยายังเปิดได้อยู่ทุกทางเหมือนเดิม แค่ไม่มีแท็บให้กดบนมือถือ
const MOBILE_HIDE = ['catalog'];
```
```js
  // แท็บชุดมือถือ — ต้องประกอบหลัง V เสร็จ เพราะกรองจากรายการเดียวกัน
  V.tabsNarrow = V.tabs.filter((t) => MOBILE_HIDE.indexOf(t.key) < 0);
```

**โค้ดจริง — กฎของไอคอน** (`pages/nav.jsx:4-14` และ `:22-26`)
```jsx
// ── ไอคอนแท็บฝั่งมือถือ ────────────────────────────────────────────────────
//
// พี่กันทัก 1 ก.ย. 2569 ว่าควรเกลาจุดนี้ — ของเดิมยกมาจากมอคอัปตรง ๆ
// เป็นกรอบเปล่า 20×20 ที่ต่างกันแค่ความมนของมุม (สี่เหลี่ยมมน · วงกลม · สี่เหลี่ยม)
// ไม่ได้สื่ออะไรเลย ต้องอ่านตัวหนังสือใต้ไอคอนอย่างเดียว = ไอคอนกินที่ฟรี ๆ
//
// 🚨 เส้นวาดล้วน ไม่มีสีทึบ ใช้ currentColor ทั้งหมด สีจึงตามสถานะแท็บเอง
//    ไม่ต้องมีชุดสีแยกให้ลืมอัปเดตวันหลัง
// 🚨 แท็บที่เปิดอยู่เส้นหนาขึ้น (2.3 จาก 1.7) นอกจากสีที่เข้มขึ้น
//    บนจอกลางแดดที่สีจางลงจนแยกยาก ความหนายังบอกได้ว่าอยู่หน้าไหน
// 🚨 ฝั่งคอมเป็นตัวหนังสือล้วน ห้ามเอาชุดนี้ไปใส่ (renderNavWide)
```
```jsx
  // บันทึก — แคปซูลยาวางเอียง มีเส้นแบ่งครึ่งเม็ดตรงกลาง
  //
  // 🚨 ห้ามใช้รูปถุง/ขวดที่มีหูจับด้านบน — หน้าตาเหมือนถังขยะจนแยกไม่ออก
  //    ถังขยะแปลว่า "ลบ" ทั้งเว็บ เอามาเป็นแท็บหลักแล้วอันตราย
  //    (เจอจากการถ่ายภาพดูจริง ไม่ใช่จากการอ่านโค้ด — กฎข้อ 3.65)
```

**สิ่งที่เว็บอื่นยกไปได้ทันที**

| เรื่อง | ค่า/กฎ |
|---|---|
| ระยะขอบล่างแถบ | `padding:8px 0 max(14px,env(safe-area-inset-bottom))` — กันโดนแถบล่างของ iPhone กิน |
| ขนาดปุ่มแท็บ | `min-width:76px;min-height:52px` (เกินเกณฑ์ 44px) |
| ผูก ref วัดความสูง | `ref={V.navBarRef}` → เขียนลง `--bottombar` |
| ไอคอนแท็บที่เปิดอยู่ | เส้นหนาขึ้น 1.7 → 2.3 **นอกจาก**สีเข้มขึ้น (เผื่อจอกลางแดดที่สีจางจนแยกยาก) |
| ไอคอนใช้ `currentColor` | สีตามสถานะแท็บเอง ไม่ต้องมีชุดสีแยก |
| กรองแท็บออกจากมือถือ | กรองด้วย `key` ไม่ใช่ตำแหน่งในรายการ · หน้ายังเปิดได้ทางอื่น แค่ไม่มีแท็บให้กด |
| สวิตช์มุมมองต้องมีในแถบล่างด้วย | ไม่งั้นกดเป็น "มือถือ" แล้วสวิตช์หายไปกับแถบบน = ติดโหมดมือถือถาวร |

**ผูกกับเว็บนี้แค่ไหน** — **กฎยกไปได้เลยทั้งหมด · ตัวรูป SVG เป็นของเว็บนี้**
🚨 กฎที่สำคัญที่สุดและยกไปได้: **ไอคอนแท็บหลักห้ามหน้าตาเหมือนถังขยะ** — เจอจากการถ่ายภาพดู ไม่ใช่จากการอ่านโค้ด

---

## ตรวจแล้ว — เว็บนี้ไม่มีการจัดการปุ่มย้อนกลับของเบราว์เซอร์เลย

**หลักฐาน** — ค้นทั้ง `components/` `app/` `lib/` ด้วย

```
grep -rn "popstate|pushState|replaceState|window.history|hashchange"
```

**ได้ผลลัพธ์ว่างเปล่า**

**แปลว่า** — ป๊อปทุกตัวปิดด้วย 3 ทางเท่านั้น
1. กดปุ่ม ✕
2. กดฉากหลัง (ป๊อปยืนยันลบ · ใบสรุป · หน้าผลบันทึก **กดฉากหลังไม่ปิดโดยตั้งใจ**)
3. กด Esc (`_onKey` ใน `MedReturnApp.jsx:667-691` ปิดทีละชั้นจากบนลงล่าง 12 ชั้น)

**กดปุ่มย้อนกลับของเบราว์เซอร์ตอนเปิดป๊อป = ออกจากเว็บไปเลย ป๊อปไม่ได้ปิดก่อน**

**เว็บอื่นควรรู้** — นี่เป็นช่องว่างที่เว็บนี้ยังไม่ได้ทำ **ไม่ใช่แบบอย่างให้ทำตาม** · เว็บที่ทำตัวเหมือนแอปบนมือถือควรพิจารณา `history.pushState` ตอนเปิดป๊อป แล้วปิดป๊อปเมื่อ `popstate`
⚠️ **ยังไม่แน่ใจ** ว่าเจ้าของงานเคยตัดสินใจเรื่องนี้ไว้หรือไม่ — ไม่พบคอมเมนต์หรือบันทึกใดที่พูดถึงปุ่มย้อนกลับเลยทั้งในโค้ดและใน `CLAUDE.md`

---

# ส่วนที่ 3 — `components/pages/` (เฉพาะส่วนที่แตะมือถือ) + `components/helpers.js`

---

## หัวเว็บมือถือตรึงบนสุดด้วย `position:sticky` (ไม่ต้องรื้อโครง DOM)

**ที่ไหน** `components/pages/record.jsx:117-135`

**โค้ดจริง**
```jsx
      {/* ── หัวเว็บฝั่งมือถือ ตรึงไว้บนสุด (พี่กันสั่ง 1 ก.ย. 2569) ──────────────
          "ทำไมตรงกดส่งยามันตรึงได้ล่ะ อันนี้ยังทำได้เลย"

          แถบบันทึกกับแถบเมนูตรึงได้เพราะมันอยู่ "นอก" พื้นที่เลื่อน (เป็นพี่น้องกัน)
          ส่วนหัวเว็บอยู่ "ใน" พื้นที่เลื่อน จึงไถลไปกับเนื้อหา
          ย้าย DOM ออกไปข้างนอกก็ได้ แต่จะรื้อโครงทั้งหน้า — ใช้ position:sticky แทน
          ซึ่งตรึงกับขอบบนของพื้นที่เลื่อนได้โดยไม่ต้องย้ายอะไรเลย

          🚨 z-index ต้องสูงกว่าเนื้อหาที่เลื่อนผ่านใต้มัน แต่ต่ำกว่าหน้าต่างซ้อนทุกตัว
             (ต่ำสุดคือป๊อปใส่จำนวนที่ 20 — ตรงนี้จึงใช้ 6)
          🚨 พื้นต้องทึบ ไม่งั้นเห็นรายการยาไหลผ่านทะลุหลังชื่อเว็บ
          ⚠️ ฝั่งคอมไม่ได้ตรึงตรงนี้ หน้าบันทึกคอมล็อกความสูงเท่าจออยู่แล้ว (กฎข้อ 3.2) */}
```
```jsx
      <div style={s('position:sticky;top:0;z-index:6;' + HEAD_PAD + ';background:#fff;border-bottom:1px solid rgba(30,36,32,.07)')}>
```

**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ)**
> "ทำไมตรงกดส่งยามันตรึงได้ล่ะ อันนี้ยังทำได้เลย"

**กฎ 3 ข้อที่ยกไปได้**
1. ของที่อยู่ **นอก** พื้นที่เลื่อนตรึงได้ฟรี · ของที่อยู่ **ใน** ต้องใช้ `position:sticky`
2. `z-index` ต้องสูงกว่าเนื้อหา แต่ **ต่ำกว่าหน้าต่างซ้อนที่ต่ำที่สุด** (เว็บนี้: ป๊อป 20 → หัวใช้ 6)
3. **พื้นต้องทึบ** ไม่งั้นเห็นเนื้อหาไหลทะลุ

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** · `HEAD_PAD` เป็นค่ากลางของเว็บนี้ (`padding:11px 20px 11px`) จาก `components/pages/pagehead.jsx`

---

## ชิปแหล่งที่มาฝั่งมือถือ — ห้าม `flex-wrap` และห้ามใส่คลาส `.tap`

**ที่ไหน** `components/pages/record.jsx:200-213`

**โค้ดจริง**
```jsx
        {/* ชิปแหล่งที่มาฝั่งมือถือ — ชื่อสั้นและลงแถวเดียวเสมอ (พี่กันสั่ง 1 ก.ย. 2569)
            🚨 ห้ามใส่ flex-wrap — ตกแถวที่สองเมื่อไหร่คือกินที่ของรายการยาทันที
               ชิปยืดหดตามที่ว่างแทน (flex:1) และห้ามให้ตัวอักษรตัดบรรทัด
            🚨 ฝั่งเดสก์ท็อปห้ามแตะ ยังใช้ชื่อเต็มกับ flex-wrap เหมือนเดิม */}
        <div style={s('display:flex;gap:5px;margin-top:10px')}>
          {/* 🚨 ชิปเตี้ย 30px (พี่กันสั่ง 1 ก.ย. 2569 "บีบตรงนี้โว้ย")
              เดิม min-height 44px ตามเกณฑ์นิ้ว แต่พี่กันเห็นแล้วว่ากินที่มากเกินไป
              ยังกดง่ายอยู่เพราะกว้างเต็มหนึ่งในห้าของจอ (ราว 70px) ซึ่งเกินเกณฑ์ในแนวกว้าง
              และไม่มีปุ่มอื่นวางติดกันในแนวตั้งให้กดพลาด */}
          {V.sources.map((src) => (
            <div key={src.label} {...kb(src.pick)} className={src.on ? 'hv-seg-on' : 'hv-seg-off'} style={sx('flex:1;min-width:0;display:flex;align-items:center;justify-content:center;height:30px;padding:0 4px;border-radius:999px;font:500 11.5px/1.75 Sarabun,sans-serif;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', { background: src.bg, color: src.fg })}>{src.short}</div>
          ))}
        </div>
```

**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ)**
> พี่กันสั่ง 1 ก.ย. 2569 "บีบตรงนี้โว้ย"

**บทเรียนสำคัญเรื่องเกณฑ์ 44px** — ปุ่มนี้ **เตี้ยกว่าเกณฑ์ 44px โดยตั้งใจ** เพราะเจ้าของงานสั่ง และเหตุผลที่ยังใช้ได้คือ **กว้างพอ (~70px) และไม่มีปุ่มอื่นวางติดกันในแนวตั้ง** · CLAUDE.md ข้อ 3.72 บอกว่าหน้าบันทึก "ห้ามแตะเลย" ตอนไล่แก้ปุ่มให้ถึงเกณฑ์ 44px

**ผูกกับเว็บนี้แค่ไหน** — **กฎยกไปได้เลย 2 ข้อ**
- แถวชิปบนมือถือห้าม `flex-wrap` ถ้าอยู่ในพื้นที่หัวที่ตรึง — ตกแถวที่สองคือกินที่เนื้อหาทันที · ใช้ `flex:1` ให้ยืดหดแทน + `text-overflow:ellipsis`
- **เกณฑ์ 44px วัดได้สองแกน** ปุ่มที่เตี้ยแต่กว้างมากและไม่มีเพื่อนติดกันในแนวตั้ง ยังยอมรับได้ (แต่ต้องเป็นการตัดสินใจที่ตั้งใจ ไม่ใช่ลืม)

---

## ช่องกรอกฝั่งมือถือต้องไม่ต่ำกว่า 16px — ไม่งั้น iPhone ซูมเองแล้วไม่ซูมกลับ

**ที่ไหน** `components/pages/record.jsx:214-231` (คอมเมนต์ + ช่องวันที่/HN) และทุกช่องใน `components/pages/sheet.jsx`

**โค้ดจริง — คอมเมนต์**
```jsx
        {/* ── วันที่กับ HN อยู่แถวเดียว ป้ายอยู่ข้างช่อง (พี่กันสั่ง 1 ก.ย. 2569) ──
            "วันที่ HN ย้ายงี้หน่อยเป็นเเถวเดียว"

            เดิมป้ายอยู่บนช่อง กินความสูงช่องละสองบรรทัด รวมสี่บรรทัด
            ย้ายป้ายมาไว้ข้างซ้ายในกรอบเดียวกัน เหลือบรรทัดเดียว

            🚨 กรอบอยู่ที่กล่องนอก ช่องกรอกจึงไม่มีขอบของตัวเอง
               ปล่อยให้มีทั้งคู่จะเห็นเส้นซ้อนสองชั้น
            🚨 ช่องกรอกยังต้องเป็น 16px ไม่งั้น iPhone ซูมเองตอนแตะ
```

**โค้ดจริง — ช่องวันที่ (สังเกต `font:400 16px/1.7`)**
```jsx
              {/* 🚨 ช่องวันที่ห้ามเผื่อที่ว่างทางขวาเหมือนช่องอื่น
                    กรอบกว้างแค่ครึ่งจอ (~195px) หักป้าย 62 แล้วเผื่ออีก 62
                    เหลือที่จริง 71px ซึ่งไม่พอกับ 01/09/2026 (~110px) แล้วปีหายไปทั้งดุ้น
                    ยอมให้กลางของพื้นที่หลังเส้นคั่นแทน — ข้อมูลครบสำคัญกว่าตำแหน่งตรงเป๊ะ */}
              <input type="date" value={V.dateIso} onChange={V.onDate} max={V.dateMax}
                style={s("flex:1;min-width:0;height:100%;border:none;background:transparent;padding:0;text-align:center;font:400 16px/1.7 Sarabun,sans-serif")} />
```

**โค้ดจริง — ช่อง HN**
```jsx
              {/* 🚨 ข้อความไว้กึ่งกลาง (พี่กันสั่ง 1 ก.ย. 2569 "ไม่ก็เอาไว้กึ่งกลาง")
                    ตัว ไ เคยโดนขอบช่องตัดยอด · อยู่กึ่งกลางแล้วมีที่ว่างบนล่างเท่ากัน */}
              <input value={V.hn} onChange={V.onHn} inputMode="numeric" placeholder="ไม่บังคับ"
                style={s("flex:1;min-width:0;height:100%;border:none;background:transparent;padding:0;text-align:center;font:400 16px/1.7 Sarabun,sans-serif")} />
```

**กฎที่ยกไปได้ 3 ข้อ**
1. **ช่องกรอกฝั่งมือถือห้ามต่ำกว่า 16px เด็ดขาด** — iPhone จะซูมเองตอนแตะแล้วไม่ซูมกลับ (CLAUDE.md ข้อ 3.67 · ตรวจด้วย `scripts/ios-zoom-check.mjs`)
2. **`inputMode="numeric"` / `inputMode="decimal"`** ให้แป้นตัวเลขเด้งขึ้นแทนแป้นตัวอักษร (ใช้ที่ HN · ราคา · จำนวนในป๊อป)
3. **ตัวอักษรไทยในช่องกรอกต้องจัดกึ่งกลางแนวตั้ง** ไม่งั้นสระบน (`ไ`) โดนขอบช่องตัดยอด — เป็นเรื่องเดียวกับกฎวรรณยุกต์ไทยที่ตัดในช่องกรอก

**ผูกกับเว็บนี้แค่ไหน** — **ข้อ 1 กับ 2 ยกไปได้เลยทุกเว็บ** · ข้อ 3 ใช้ได้กับทุกเว็บที่มีภาษาไทย

---

## การ์ดรายการยาบนมือถือ — ปุ่มคู่ที่ติดกัน **ห้ามใส่คลาส `.tap`**

**ที่ไหน** `components/pages/record.jsx:319-334` (คอมเมนต์) + `:352-355` (ปุ่มคู่)

**โค้ดจริง — คอมเมนต์**
```jsx
        {/* ── การ์ดรายการยาแบบ ก (พี่กันเลือกจากมอคอัป 1 ก.ย. 2569) ──────────────
            "เอาแบบ ก เเต่ ขอตามรูปนี้" — โครงแบบ ก + ปุ่มคู่แบบเม็ดยาที่พี่กันชี้

            ของเดิมสูง 118px ต่อใบ เพราะปุ่มใช้ต่อ/ทำลายกินทั้งแถวที่สาม
            ทั้งที่ทางขวายังว่าง · แบบใหม่เหลือราว 66px ประหยัดไปเกือบครึ่ง

            🚨 แถบสีซ้าย 4px บอกสถานะตั้งแต่กวาดตา ไม่ต้องอ่านปุ่ม
               เขียว = ใช้ต่อ · แดง = ทำลาย (สีเดียวกับที่ใช้ทั้งเว็บ)
            🚨 ปุ่มคู่ยังต้องกว้างพอไม่ให้กดพลาด — กำหนด min-width 52px ต่อปุ่ม
               และห้ามใส่คลาส .tap เด็ดขาด (กฎข้อ 3.55) มันขยายพื้นที่กดออกด้านละ 11px
               ปุ่มที่ติดกันจะมีพื้นที่กดซ้อนกัน เล็งกด "ใช้ต่อ" แล้วโดน "ทำลาย"
               = ยาดีถูกบันทึกว่าทำลาย ตัวเลข KPI ผิดโดยไม่มีอะไรเตือน
            🚨 ชื่อยาตัดท้ายด้วยจุดไข่ปลาได้ที่นี่ เพราะแตะแล้วเปิดหน้าต่างที่มีชื่อเต็ม
               (ต่างจากผลค้นหาที่ห้ามตัด เพราะเป็นจุดตัดสินใจว่าจะหยิบยาตัวไหน) */}
```

**โค้ดจริง — ปุ่มคู่**
```jsx
                  <div style={s('display:flex;padding:2px;border-radius:999px;flex:none;background:#f0f1ee')}>
                    <div {...kb(row.setReuse)} className={row.reuseOn ? 'hv-seg-on' : 'hv-txt'} style={sx('min-width:50px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:999px;cursor:pointer;font:600 11px/1.75 Sarabun,sans-serif', { background: row.reuseOn ? '#2f7d5d' : 'transparent', color: row.reuseOn ? '#fff' : '#8a938d' })}>ใช้ต่อ</div>
                    <div {...kb(row.setDestroy)} className={row.reuseOn ? 'hv-des-off' : 'hv-des-on'} style={sx('min-width:50px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:999px;cursor:pointer;font:600 11px/1.75 Sarabun,sans-serif', { background: row.reuseOn ? 'transparent' : '#c2543c', color: row.reuseOn ? '#8a938d' : '#fff' })}>ทำลาย</div>
                  </div>
```

**แก้ปัญหาอะไร** — คลาส `.tap` มี `::before` ที่ขยายพื้นที่กดออกด้านละ 11px · ปุ่มที่ห่างกันน้อยกว่า 22px จึงมีพื้นที่กด **ซ้อนกัน** เล็งกดปุ่มหนึ่งแล้วโดนอีกปุ่ม

**กฎกลางที่ CLAUDE.md ข้อ 3.55 เขียนไว้**
> 🚨🔴 **ปุ่มคู่ที่วางติดกันห้ามใช้คลาส `.tap`**
> `.tap::before` ขยายพื้นที่กดออกด้านละ 11px ปุ่มที่ห่างกันน้อยกว่า 22px จึงมีพื้นที่กดทับกัน
> วัดจริงเจอ: ปุ่ม แก้/ลบ ในการ์ดประวัติมือถือ 36×29 ห่างกัน 7px
> **เล็งกด "แก้" แต่โดน "ลบ"** = ข้อมูลหายไปถังขยะโดยไม่ตั้งใจ
> ต้องขยายตัวปุ่มเองให้ถึงเกณฑ์แทน (`min-height:44px`) แล้วถอด `.tap` ออก

⚠️ **หลุดรอดมาแล้ว 2 ครั้ง** ทั้งที่เขียนกฎนี้ไว้เอง — ปุ่มปีงบ 2569/2568 (CLAUDE.md ข้อ 3.72) และปุ่มคู่บนหน้าผลบันทึก (ข้อ 3.61 ข้อ 7)

**ผูกกับเว็บนี้แค่ไหน** — **กฎยกไปได้เลย และควรเป็นกฎกลาง** · เว็บอื่นที่ใช้เทคนิค "ขยายพื้นที่กดด้วย pseudo-element" ต้องมีกฎนี้ · **ตัวตรวจ `scripts/tap-check.mjs` วัดทั้งขนาดปุ่มและพื้นที่กดที่ทับกัน — ยกไปได้เลย**

**ข้อสังเกตอีกข้อที่ยกไปได้** — ชื่อยาในการ์ด **ตัดท้ายด้วย ellipsis ได้** เพราะแตะแล้วเปิดหน้าต่างที่มีชื่อเต็ม ต่างจากผลค้นหาที่ห้ามตัดเพราะเป็นจุดตัดสินใจ — **กฎเดียวกันใช้ไม่ได้ทุกที่ ต้องดูว่าจุดนั้นเป็นจุดตัดสินใจหรือไม่**

---

## แถบบันทึกล่างจอฝั่งมือถือ — ช่องบังคับต้องอยู่ติดปุ่มส่ง

**ที่ไหน** `components/pages/record.jsx:834-884`

**โค้ดจริง — โครงแถบ**
```jsx
export function renderSaveBar(V) {
  return (
    <div ref={V.saveBarRef} style={s('flex:none;background:#fff;border-top:1px solid rgba(30,36,32,.08);box-shadow:0 -6px 20px rgba(30,36,32,.06);order:1;position:relative;z-index:5')}>
      <div style={s('max-width:520px;margin:0 auto')}>
        {/* ── ไม่มีแถวยอดสะสมปีงบแล้ว (พี่กันสั่ง 1 ก.ย. 2569) ────────────────────
            สั่งเป็น 2 จังหวะ — รอบแรกเอาคำว่า "สะสมปีงบ" ออก รอบนี้เอาตัวเลขออกด้วย
            จอมือถือเตี้ย แถบล่างกินที่ไปแล้วเกือบหนึ่งในสี่ของจอ ทุกบรรทัดต้องคุ้มที่จริง ๆ
            และยอดทั้งปีไม่ใช่ของที่ต้องเห็นตอนกำลังนับยาคืนอยู่หน้าเคาน์เตอร์

            ⚠️ ยอดสะสมปีงบยังอยู่ครบที่หน้าสรุปและแผงขวาฝั่งคอม ไม่ได้หายจากระบบ
            🚨 แถบนี้เป็นของมือถือเท่านั้น ห้ามเอาไปแตะ renderRecordWide ของคอม */}
```

**โค้ดจริง — ช่องผู้บันทึกย้ายมาติดปุ่มส่ง**
```jsx
          {/* ── ผู้บันทึกตรึงไว้ติดปุ่มส่ง (พี่กันสั่ง 1 ก.ย. 2569) ──────────────────
              "ผู้บันทึก เอาตรึงไว้ตรงกดส่ง"

              เดิมซ่อนอยู่ในตัวเลือกเพิ่มเติม ต้องกดเปิดแล้วเลื่อนขึ้นไปหา
              ทั้งที่เป็นช่องบังคับที่ต้องเลือกก่อนกดส่งทุกครั้ง (กฎข้อ 3.24)
              ย้ายมาอยู่เหนือปุ่มส่งพอดี เห็นพร้อมกันโดยไม่ต้องเลื่อนหา */}
          {/* 🚨 ต้องมีระยะห่างใต้ช่องผู้บันทึก (พี่กันทัก "กรอบผู้บันทึก ชิดไปปป")
              ตัวช่องไม่มีระยะของตัวเอง พอวางติดกล่องประหยัด/สูญเสียเลยดูอัดกัน
              ครอบด้วยกล่องที่มีระยะ แทนการแก้ที่ตัวช่องเอง เพราะช่องนี้ใช้ 2 ที่
              (แถบบันทึกฝั่งมือถือ กับแผงขวาฝั่งคอม) ซึ่งต้องการระยะไม่เท่ากัน */}
          <div style={s('margin-bottom:9px')}>{renderRecorderField(V, { inline: true })}</div>
```

**โค้ดจริง — ปุ่มบันทึก 48px**
```jsx
          <div {...kb(V.onSave)} className={V.saveOn ? 'hv-teal' : 'hv-wait'} style={sx('height:48px;border-radius:11px;display:flex;align-items:center;justify-content:center;font:600 16px Sarabun,sans-serif;cursor:pointer', { background: V.saveBg, color: V.saveFg, border: V.saveBorder, boxSizing: 'border-box' })}>{V.saveLabel}</div>
```

**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ)**
> "ผู้บันทึก เอาตรึงไว้ตรงกดส่ง"
> พี่กันทัก "กรอบผู้บันทึก ชิดไปปป"

**บทเรียนจาก CLAUDE.md ข้อ 3.66** — แถบบันทึกฝั่งมือถือถูกบีบจาก **205px → 186px (24% ของจอ 780px)** ตามคำสั่ง *"ไปบีบจุดนี้หน่อย เพราะตอนใช้ในมือถือ มันกินเนื้อที่มาก"*
> 🚨 **ไม่ตัดข้อมูลอะไรทิ้ง** ยอดประหยัด สูญเสีย แถบสัดส่วน อยู่ครบ บีบแค่ขนาดกับระยะห่าง

**กฎที่ยกไปได้**
| กฎ | เหตุผล |
|---|---|
| แถบล่างต้องอยู่ **นอก** พื้นที่เลื่อน (เป็นพี่น้องกัน) | ตรึงได้ฟรีโดยไม่ต้องพึ่ง sticky |
| **ช่องบังคับต้องอยู่ติดปุ่มส่ง** | ซ่อนในส่วนที่ต้องกดเปิด = ลืมกรอกทุกครั้ง แล้วเจอตอนกดส่ง |
| ผูก `ref` วัดความสูง | เขียนลง `--bottombar` ให้ toast หลบ |
| บีบพื้นที่บนมือถือ = **บีบขนาดกับระยะ ห้ามตัดข้อมูลทิ้ง** | ข้อมูลที่หายไปคือข้อมูลที่ไม่มีใครเห็นอีกเลย |
| ตัวควบคุมที่ใช้ 2 ฝั่ง (มือถือ/คอม) — ระยะห่างใส่ที่ **กล่องครอบ ไม่ใช่ตัวควบคุม** | สองฝั่งต้องการระยะไม่เท่ากัน |

**ผูกกับเว็บนี้แค่ไหน** — **กฎยกไปได้เลย · ตัวเลขเป็นของเว็บนี้**

---

## ป๊อปเลื่อนขึ้นจากขอบล่าง (bottom sheet) — 3 ตัวในเว็บ ท่าเดียวกันหมด

### ตัวที่ 1 — ป๊อปใส่จำนวน (`components/pages/sheet.jsx`)

**โค้ดจริง — ฉากหลังกดปิดไม่ได้ + หนีแป้นพิมพ์**
```jsx
export function renderSheet(V) {
  if (!V.sheetOpen) return null;
  return (
    <>
      {/* 🚨 กดพื้นหลังต้องไม่ปิด — เดิมกดปิดได้ ซึ่งบนมือถือคือกับดัก
          เพราะแป้นพิมพ์บังปุ่มจนพื้นหลังเป็นที่เดียวที่กดได้
          ผู้ใช้แตะเพื่อปิดแป้นพิมพ์ = ป๊อปอัปปิดทิ้ง จำนวนที่พิมพ์หายหมด
          ใส่ปุ่ม ✕ ให้แทน */}
      <div style={s('position:fixed;inset:0;background:rgba(21,26,23,.42);z-index:20')}></div>
      <div role="dialog" aria-modal="true" style={s('position:fixed;left:0;right:0;bottom:0;z-index:21;display:flex;justify-content:center;transform:translateY(calc(var(--kb) * -1));transition:transform .12s ease-out')}>
        <div className="mrv-pop" style={s('width:100%;max-width:520px;max-height:88dvh;overflow-y:auto;background:#fff;border-radius:22px 22px 0 0;box-shadow:0 -14px 44px rgba(30,36,32,.24);padding:14px 20px max(22px,env(safe-area-inset-bottom))')}>
          <div style={s('width:42px;height:4px;border-radius:99px;background:rgba(30,36,32,.16);margin:0 auto 14px')}></div>
```

**🚨 บทเรียนที่ยกไปได้ทันทีทุกเว็บ**
> กดพื้นหลังต้องไม่ปิด — เดิมกดปิดได้ ซึ่งบนมือถือคือกับดัก
> **เพราะแป้นพิมพ์บังปุ่มจนพื้นหลังเป็นที่เดียวที่กดได้**
> ผู้ใช้แตะเพื่อปิดแป้นพิมพ์ = ป๊อปอัปปิดทิ้ง จำนวนที่พิมพ์หายหมด

นี่คือกฎที่ตรงข้ามกับความเชื่อทั่วไป ("bottom sheet ควรกดพื้นหลังปิดได้") และเป็นของที่เห็นได้เฉพาะบนมือถือจริงเท่านั้น

**ค่าที่ยกไปได้จากป๊อปนี้**
| ค่า | ทำอะไร |
|---|---|
| `max-height:88dvh` | ใช้ `dvh` ไม่ใช่ `vh` — แถบเบราว์เซอร์บนมือถือยืดหดได้ |
| `padding: ... max(22px,env(safe-area-inset-bottom))` | ก้นป๊อปไม่โดนแถบล่าง iPhone กิน |
| `border-radius:22px 22px 0 0` | มุมมนเฉพาะด้านบน |
| แถบขีดเทา `42×4px` `margin:0 auto 14px` | สัญลักษณ์ว่าเป็นแผ่นที่เลื่อนขึ้นมา |
| `transform:translateY(calc(var(--kb) * -1))` | หนีแป้นพิมพ์ (ดูส่วน `--kb`) |
| `transition:transform .12s ease-out` | ไม่กระตุกตอนแป้นพิมพ์เด้ง |
| ปุ่ม ✕ ขนาด 32×32 | ทางปิดทางเดียว เพราะฉากหลังปิดไม่ได้ |
| ปุ่ม +/− ขนาด `52×52` · ช่องจำนวน `font:700 40px` สูง 56 | นิ้วกดง่ายและอ่านได้ระยะไกล |
| ปุ่มยืนยันสูง 54px | |
| ปุ่มใช้ต่อ/ทำลาย `min-height:44px;min-width:70px` | ในป๊อปนี้ปุ่มใหญ่พอ จึงถึงเกณฑ์ได้ |

**⚠️ ไม่มีการจับท่าลาก (swipe to dismiss)** — แถบขีดเทาเป็นแค่รูป ไม่มี touch handler · ตรวจแล้วทั้ง 3 ป๊อปไม่มีตัวจับท่าลากปิดเลย

### ตัวที่ 2 และ 3 — แผ่นตัวกรอง (`pages/history.jsx` · `pages/lots.jsx`)

**โค้ดจริง** (จาก `lots.jsx` · ตัวใน `history.jsx` เหมือนกันทุกค่า)
```jsx
// ── แผ่นตัวกรองฝั่งมือถือ ────────────────────────────────────────────────────
// เลื่อนขึ้นจากขอบล่าง เก็บทุกอย่างที่ถูกย้ายออกจากหัวหน้าไว้ครบ
//
// 🚨 กดพื้นหลังปิดได้ ต่างจากป๊อปยืนยันลบ เพราะไม่ใช่การกระทำที่ย้อนยาก
//    ปิดทิ้งแล้วตัวกรองยังเป็นเหมือนเดิมทุกอย่าง ไม่มีอะไรเสียหาย
// 🚨 ใช้ Z.panel จากตารางชั้นกลาง ห้ามเขียนเลขเอง (กฎข้อ 3.68)
// 🚨 ต้องเติมชื่อใน anyModalOpen และ _syncModalFlag ด้วย ไม่งั้นฉากหลังเลื่อนตามนิ้ว
export function renderLotsFilter(V) {
  if (!V.lotsFilterOpen) return null;
  const ป้าย = 'font:600 11.5px/1.6 Sarabun,sans-serif;color:#414a44;margin:0 0 6px';
  const ช่องวัน = 'height:44px;padding:0 10px;border-radius:9px;background-color:#fff;font:400 12.5px/1.75 Sarabun,sans-serif;flex:1;min-width:0;box-sizing:border-box';
  return (
    <>
      <div {...kb(V.closeLotsFilter)} aria-label="ปิดตัวกรอง"
        style={sx('position:fixed;inset:0;background:rgba(20,26,22,.34)', { zIndex: Z.panel })} />
      <div role="dialog" aria-modal="true" aria-label="ตัวกรองรายการ Lot"
        style={sx('position:fixed;left:0;right:0;bottom:0;background:#fff;border-radius:18px 18px 0 0;box-shadow:0 -5px 22px rgba(0,0,0,.16);padding:10px 16px 20px;max-height:82vh;overflow-y:auto;overscroll-behavior:contain',
          { zIndex: Z.panel + 1 })}>
        <div aria-hidden="true" style={s('width:36px;height:4px;border-radius:99px;background:#d7dbd6;margin:0 auto 12px')} />
```

**การเปิด/ปิด — เรียบง่ายมาก** (`handlers/lots.js:99-100` · `handlers/history.js:186-187`)
```js
  app.openLotsFilter = () => app.setState({ lotsFilterOpen: true });
  app.closeLotsFilter = () => app.setState({ lotsFilterOpen: false });
```
```js
  app.openHistFilter = () => app.setState({ histFilterOpen: true });
  app.closeHistFilter = () => app.setState({ histFilterOpen: false });
```

**เส้นทางปิดมี 3 ทาง** — กดฉากหลัง (`{...kb(V.closeLotsFilter)}` บนฉากหลัง) · กดปุ่มปิดในแผ่น · กด Esc (`MedReturnApp._onKey`)

**🚨 กฎที่ยกไปได้ (สำคัญมาก) — เพิ่มป๊อปใหม่ต้องเติมชื่อ 2 ที่**
> 🚨 ต้องเติมชื่อใน `anyModalOpen` และ `_syncModalFlag` ด้วย ไม่งั้นฉากหลังเลื่อนตามนิ้ว

ทั้งสองที่คือ `components/vals/shell.js` และ `components/MedReturnApp.jsx` — **ลืมที่ใดที่หนึ่ง = ฉากหลังเลื่อนได้ตอนเปิดป๊อปนั้น โดยไม่มีอะไรเตือน**

**ผูกกับเว็บนี้แค่ไหน** — **โครงยกไปใช้ได้เลยทั้งก้อน** · ค่าทั้งหมด (`82vh` · `18px 18px 0 0` · แถบขีด `36×4` · `overscroll-behavior:contain`) เป็นของกลาง
⚠️ **จุดที่เว็บอื่นควรทำให้ดีกว่า** — ตัวนี้ใช้ `max-height:82vh` (ไม่ใช่ `dvh` เหมือนป๊อปใส่จำนวน) จึงอาจสูงเกินจอตอนแถบเบราว์เซอร์กางอยู่ · **ยังไม่แน่ใจ**ว่าตั้งใจหรือเป็นความไม่สม่ำเสมอ — ไม่มีคอมเมนต์อธิบาย

---

## ตารางชั้นหน้าต่างซ้อน (`Z`) — ป๊อปทุกตัวต้องเอาเลขจากที่นี่

**ที่ไหน** `components/helpers.js:659-669`

**โค้ดจริง**
```js
export const Z = {
  bar: 6,        // แถบเมนู · แถบบันทึก · หัวเว็บที่ตรึงไว้
  float: 15,     // ปุ่มลอย เช่น ปุ่มขึ้นบนสุดในหน้าคลังยา
  menu: 29,      // เมนูเล็กที่กางจากช่องในหน้า (ไม่ใช่หน้าต่างซ้อน)
  sheet: 20,     // ป๊อปใส่จำนวนฝั่งมือถือ
  panel: 32,     // หน้าต่างซ้อนทั่วไป — ตั้งค่า · นำเข้าราคา · แก้ล็อต · ป๊อปในหน้าคลังยา
  over: 52,      // หน้าต่างที่เปิดทับหน้าต่างอื่นได้ — ใบสรุป · ล็อตค้าง · ถามชื่อเครื่อง · ผลบันทึก
  pick: 70,      // ตัวเลือกที่เปิดจากในหน้าต่างซ้อน เช่น เลือกเหตุผลทำลาย
  confirm: 85,   // 🚨 ป๊อปยืนยัน — บนสุดของหน้าต่างทั้งหมดเสมอ
  toast: 95      // ข้อความเด้ง — เหนือทุกอย่าง
};
```

**แก้ปัญหาอะไร** (จาก CLAUDE.md ข้อ 3.68 · **เจ้าของงานเจอเองบนมือถือ**)
> **พี่กันเจอเอง 1 ก.ย. 2569:** กดดูรายการล็อต แล้วกดลบ
> > *"เจ้า popup ลบมันดันอยู่ด้านหลัง popup ก่อนหน้า มันควรอยุ่บนสุดสิ"*

ต้นเหตุคือแต่ละหน้าต่างตั้งเลขชั้นเองตามใจ (20 · 25 · 35 · 40 · 45 · 50 · 60 · 80 · 82)

**กฎ 3 ข้อจาก CLAUDE.md ข้อ 3.68**
> 🚨 **ทุกหน้าต่างต้องใช้เลขจากตารางนี้ ห้ามเขียนเลขเองอีก**
> 🚨 **ฉากหลังใช้เลขตรง ๆ · ตัวกล่องใช้ +1 · ของที่ซ้อนในกล่องใช้ +2**
> 🚨 **ยืนยันต้องสูงกว่าหน้าต่างทุกตัว** มันคือด่านสุดท้ายก่อนของหาย

และกฎเพิ่มจากข้อ 3.41
> 🚨 **`z-index` ของปุ่มลอยต้องต่ำกว่าหน้าต่างซ้อนที่ต่ำที่สุดเสมอ**
> ตอนนี้ต่ำสุดคือป๊อปใส่จำนวนที่ 20 · ปุ่มลอยจึงต้องไม่เกิน 19 (ตั้งไว้ 15)

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** ชื่อชั้นเป็นของกลางเกือบทั้งหมด · **ตัวเลขปรับได้แต่ลำดับห้ามสลับ**

---

## เลื่อนไปหาช่องที่กรอกไม่ครบ — เว็บนี้ทำคนละแบบกับ ME-DRP

**ที่ไหน** `components/handlers/record.js:588-602` (`askSave`)

**โค้ดจริง**
```js
  // 🚨 ตรวจช่องบังคับ "ก่อน" เปิดป๊อป — ไม่งั้นผู้ใช้กดยืนยันแล้วเพิ่งมาบอกว่ากรอกไม่ครบ
  //    เสียจังหวะและดูเหมือนปุ่มเสีย
  app.askSave = () => {
    const st = app.state;
    if (!st.rows.length || st.saving || app._saving) return;
    if (st.demo) { app.toast('อยู่ในโหมดดูตัวอย่าง บันทึกไม่ได้', 'ปิดโหมดก่อน', false); return; }
    if (!ISO.test(st.date || '')) { app.toast('เลือกวันที่ก่อนบันทึก', '', false); return; }
    if (!(st.recorder || '').trim()) {
      app.toast('เลือกชื่อผู้บันทึกก่อน', '', false);
      app.setState({ recorderMenuOpen: true, showMore: true });
      return;
    }
    if (app.pcuSiteMissing()) {
      app.toast('เลือก รพ.สต. ต้นทางก่อนบันทึก', '', false);
      return;
    }
```

**สิ่งที่เว็บนี้ทำ — ไม่มีการ `scrollIntoView` ไปหาช่อง แต่ทำ 3 อย่างแทน**
1. **ตรวจก่อนเปิดป๊อปยืนยัน** ไม่ใช่หลัง — "ไม่งั้นผู้ใช้กดยืนยันแล้วเพิ่งมาบอกว่ากรอกไม่ครบ เสียจังหวะและดูเหมือนปุ่มเสีย"
2. **ขึ้นข้อความเด้งที่ค้างจนกดปิด** (`ok = false` → ไม่มีตัวจับเวลา)
3. **เปิดตัวควบคุมที่ขาดให้เลย** — `app.setState({ recorderMenuOpen: true, showMore: true })` เปิดเมนูเลือกผู้บันทึก **และ** กางส่วน "ตัวเลือกเพิ่มเติม" ที่ซ่อนอยู่

**ทำไมไม่ต้องเลื่อนไปหาช่อง** — บนมือถือ ช่องบังคับทั้งหมดถูกย้ายมาไว้ในที่ที่มองเห็นเสมอแล้ว
- **ผู้บันทึก** → อยู่ในแถบบันทึกล่างจอ (ตรึงอยู่แล้ว) ตามคำสั่ง *"ผู้บันทึก เอาตรึงไว้ตรงกดส่ง"*
- **รพ.สต.** → `renderPcuField(V, { required: true, inline: true })` วางนอกส่วนที่ซ่อน
  ```jsx
        {/* รพ.สต. ต้นทาง — วางนอกส่วน "ตัวเลือกเพิ่มเติม" ให้เห็นทันทีที่เลือก รพ.สต.
            ไม่ใช่ซ่อนไว้จนต้องกดเปิดหา ซึ่งจะทำให้ลืมกรอกได้ง่ายมาก */}
        {renderPcuField(V, { required: true, inline: true })}
  ```
- **วันที่** → อยู่ในหัวเว็บที่ตรึง

**บทเรียนที่ยกไปได้ (ต่างจากท่า `focusError` ของ ME-DRP)**
> **วิธีที่ดีกว่าการเลื่อนไปหาช่องที่ลืมกรอก คือย้ายช่องบังคับไปไว้ในที่ที่ไม่มีวันเลื่อนหาย**
> ถ้าย้ายไม่ได้ อย่างน้อยต้อง **เปิดตัวควบคุมที่ขาดให้เลย** ไม่ใช่แค่บอกว่ากรอกไม่ครบ

⚠️ **จุดที่เว็บนี้ยังไม่ครบ** — เส้นทาง `pcuSiteMissing` **ขึ้นข้อความอย่างเดียว ไม่ได้เปิด/เลื่อนไปหาช่อง** ต่างจากเส้นทางผู้บันทึกที่เปิดเมนูให้ · **ยังไม่แน่ใจ**ว่าตั้งใจหรือตกหล่น — ไม่มีคอมเมนต์อธิบาย

**ผูกกับเว็บนี้แค่ไหน** — **แนวคิดยกไปได้เลย** · ตัว `app.setState({ recorderMenuOpen: true, showMore: true })` ต้องเขียนใหม่ตามตัวควบคุมของเว็บนั้น

---

## สิ่งที่ทำเฉพาะบนมือถือ — รวมเงื่อนไขแตกสาขาตามจอทั้งหมด

| ที่ไหน | เงื่อนไข | ทำอะไรเมื่อเป็นมือถือ |
|---|---|---|
| `shell.jsx:72-74` | `V.narrow` | กล่องนอกสุดเป็น `position:fixed` + `lockW` (คอมเป็น `height:100dvh`) |
| `shell.jsx:141-143` | `V.narrow` | เรียก `renderRecordNarrow` / `renderHistoryNarrow` / `renderSummaryNarrow` (คนละไฟล์ฟังก์ชันกับฝั่งคอม) |
| `shell.jsx:156` | `V.wide` | **ท้ายเว็บโผล่เฉพาะฝั่งคอม** — "บนมือถือมันกินที่ไปสามบรรทัดโดยที่ไม่มีใครอ่าน" |
| `shell.jsx:159-160` | `V.narrow` / `V.wide` | แถบเมนูล่างจอ (มือถือ) vs แถบบนจอ (คอม) |
| `shell.jsx:162` | `V.recordNarrow` | แถบบันทึกล่างจอ — **มือถือเท่านั้น** |
| `vals/shell.js:153` | `MOBILE_HIDE` | ตัดแท็บ "คลังยา" ออกจากแถบล่างมือถือ |
| `vals/shell.js:53` | `fitScreen` | ล็อกความสูงเท่าจอ — **หน้าบันทึกฝั่งคอมเท่านั้น** |
| `vals/shell.js:88` | `showLayoutSwitch` | สวิตช์มุมมองโผล่เมื่อ **จอกว้าง ≥960 และมีเมาส์จริง** |
| `handlers/ui.js` | `.mrv-mobile` | ไล่จางตอนสลับหน้า (`viewSwap`) — มือถือเท่านั้น |
| `MedReturnApp.jsx` | `_isNarrowNow()` | ดึงลงโหลดใหม่ · กันลากซ้ายขวา · กันซูม · ตรึง body — มือถือเท่านั้น |
| `pages/record.jsx:129` | ในฟังก์ชัน Narrow | หัวเว็บ `position:sticky` — มือถือเท่านั้น |
| `pages/record.jsx:204` | ในฟังก์ชัน Narrow | ชิปแหล่งที่มาใช้ **ชื่อสั้น** (`src.short`) ไม่ใช่ชื่อเต็ม |
| `pages/record.jsx` การ์ดยา | ในฟังก์ชัน Narrow | รายการยาเป็นการ์ด ไม่ใช่ตาราง |
| CLAUDE.md ข้อ 3.68 | — | ปุ่มตั้งราคายา · ปุ่มส่งออก CSV บางจุด โผล่เฉพาะฝั่งคอม |
| `handlers/record.js` (ข้อ 3.27) | — | **เครื่องคิดเลขในช่องจำนวนเป็นของคอมเท่านั้น** — "แป้นตัวเลขมือถือไม่มีเครื่องหมาย + − × ÷ ให้กดอยู่แล้ว" |
| CLAUDE.md ข้อ 3.72 | `.mrv-hit` / `.mrv-hit-input` | คลาสขยายพื้นที่กดเป็น 44px อยู่ใน `app/mobile.css` (เดสก์ท็อปไม่โดน) |

**🚨 กฎแม่ของทั้งหมดนี้ (CLAUDE.md ข้อ 3.67)**
> **① ทุกกฎใน `mobile.css` ต้องขึ้นต้นด้วย `.mrv-mobile`** ลืมเมื่อไหร่รั่วไปโดนเดสก์ท็อปทันที
>
> **② ห้ามใช้ `@media (max-width)` ตัดสินว่าเป็นมือถือ** — พี่กันกดปุ่ม "มือถือ" บนคอมได้
> ซึ่งตอนนั้นจอยังกว้าง 1366px อยู่ · ตัวตัดสินจริงคือธง `wide` ใน `vals/derive.js`
> ⚠️ ข้อยกเว้นเดียว: กฎที่ไม่กระทบหน้าตาเลย (overflow) ใช้ `max-width: 1179px` เป็นตาข่ายได้
>
> **③ แตะไฟล์มือถือเมื่อไหร่ ต้องรัน `scripts/desktop-untouched-check.mjs`**
> วัด 96 ชิ้นสองทิศ — ถอดคลาสแล้วต้องเหมือนเดิม **และ** ใส่คลาสแล้วต้องเปลี่ยนจริง

**คำสั่งเจ้าของงานที่เป็นที่มาของกฎทั้งหมด (ยกคำต่อคำ จาก CLAUDE.md ข้อ 3.67)**
> **พี่กันสั่ง 1 ก.ย. 2569:** *"เรามาออกแบบหน้าจอมือถือกันใหม่ ให้มันเหมือนใช้ในแอปได้"*
> แล้วสั่งย้ำ *"ห้ามเปลี่ยนเดสสักนิดเดียว เเม้เเต่ขยับ 1 px ก็ห้าม สร้างไฟล์เเยกได้ไหม"*

---

## `overscroll-behavior:contain` — กรอบที่เลื่อนได้ทุกกรอบต้องมี

**ที่ไหน** ใช้ 9 จุด ที่พบ

| ไฟล์:บรรทัด | กรอบไหน |
|---|---|
| `components/pages/record.jsx:188` | ผลค้นยาฝั่งมือถือ |
| `components/pages/record.jsx:416` | ผลค้นยาฝั่งคอม |
| `components/pages/record.jsx:618` | กรอบรายการฝั่งคอม |
| `components/pages/history.jsx:235` | แผ่นตัวกรองมือถือ |
| `components/pages/history.jsx:338` | แถวชิปที่เลื่อนแนวนอน (`overscroll-behavior-x`) |
| `components/pages/lots.jsx:112` | แถวชิปช่วงเวลาที่เลื่อนแนวนอน (`overscroll-behavior-x`) |
| `components/pages/lots.jsx:139` | แผ่นตัวกรองมือถือ |
| `components/pages/parkedsheet.jsx:99` | รายการล็อตค้างในหน้าต่างซ้อน |

**โค้ดจริง — คอมเมนต์ที่ `record.jsx:185-188`**
```jsx
        {/* 🚨 overscroll-behavior:contain — เลื่อนดูยาจนสุดกรอบแล้วหน้าเว็บข้างหลังต้องไม่ไหลตาม
            (กฎกลาง pharmacy-web-logic ข้อ 28) ไม่เปลี่ยนหน้าตาสักพิกเซล เปลี่ยนแค่พฤติกรรมการเลื่อน */}
        {V.hasResults && (
          <div style={s('margin-top:8px;border:1px solid rgba(30,36,32,.10);border-radius:12px;background:#fff;box-shadow:0 10px 26px rgba(30,36,32,.12);overflow:hidden;max-height:264px;overflow-y:auto;overscroll-behavior:contain')}>
```

**สังเกต** — แถวที่เลื่อน**แนวนอน**ใช้ `overscroll-behavior-x:contain` (ไม่ใช่ทั้งสองแกน) เพราะยังต้องปล่อยให้เลื่อนแนวตั้งผ่านไปหาหน้าได้

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลยทุกเว็บ** · เป็นบรรทัดเดียวที่ไม่เปลี่ยนหน้าตาสักพิกเซล

---

## `data-scrollable="1"` — ทางออกฉุกเฉินให้กรอบที่ไม่ได้เป็น dialog

**ที่ไหน** `components/MedReturnApp.jsx:917` (ตัวเช็ค) + `components/pages/parkedsheet.jsx:99` (ที่ใช้)

**โค้ดจริง — ตัวเช็ค**
```jsx
    if (t && t.closest && t.closest('[role="dialog"], [data-scrollable="1"]')) return;
```

**โค้ดจริง — ที่ใช้**
```jsx
        <div data-scrollable="1" style={s('flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:10px 14px')}>
```

**แก้ปัญหาอะไร** — ตัวกันฉากหลังเลื่อนดูจาก `role="dialog"` เป็นหลัก แต่กรอบที่เลื่อนได้บางกรอบไม่ได้อยู่ใต้ `role="dialog"` (หรืออยู่แต่โครงซ้อนกันจนหาไม่เจอ) จึงมีธง `data-scrollable="1"` ให้ติดเองได้

**ผูกกับเว็บนี้แค่ไหน** — **ยกไปใช้ได้เลย** · เป็นทางออกที่ควรมีติดตัวทุกเว็บที่กันฉากหลังเลื่อน

---

# ส่วนที่ 4 — สคริปต์ตรวจหน้าจอมือถือ 5 ตัว

> ทั้ง 5 ตัวรันด้วย `node scripts/<ชื่อ>.mjs` · ใช้ **puppeteer-core** ยิง Chrome จริงในเครื่อง
> **ห้ามรันในงานนี้** (เปิดเบราว์เซอร์จริง + แตะเซิร์ฟเวอร์) — เอกสารนี้มาจากการอ่านโค้ดอย่างเดียว

---

## โครงร่วมของทั้ง 5 ตัว (ยกไปใช้กับเว็บอื่นได้ทั้งก้อน)

โค้ด 6 ก้อนนี้เหมือนกันเป๊ะทุกไฟล์ ยกจาก `mobile-shot.mjs` มา

### ① พอร์ตอ่านจากตัวแปรแวดล้อม ห้ามฝัง 3000 ตายตัว
```js
// พอร์ตอ่านจากตัวแปรแวดล้อม PORT ถ้าไม่ตั้งใช้ 3000
// (พี่กันตั้งกฎ 5 ก.ย. 2569 ว่าพอร์ตอาจไม่ว่าง ต้องเปิดพอร์ตอื่นได้)
// ใช้: PORT=3002 node scripts/xxx.mjs
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '3000');
```
**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน (ยกคำต่อคำ จาก CLAUDE.md ข้อ 0 กฎ 15)**
> *"จะรันโลคอลมา ต้องดูด้วยว่าพอร์ตนั้นมีใครใช้รึยัง ถ้ามีก็เปิดพอร์ตอื่น"*
> *"จะปิด drp เราทำไม เราแก้โปรเจกต์นั้นอยู่ ก็รันโลคอลใหม่สิ"*

CLAUDE.md ข้อ 3.76 บันทึกว่าไล่แก้ `scripts/*.mjs` **30 ไฟล์** ให้รับ `process.env.PORT`

### ② หา Chrome ในเครื่อง (ไม่ลง Chromium ของ puppeteer)
```js
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
```
(`tap-check.mjs` มีรายการยาวกว่า รวม macOS กับ Linux ด้วย)

### ③ อ่านรหัสผ่านจาก `.env.local` เพื่อผ่านประตูล็อกอิน
```js
const pw = (() => {
  const env = fs.readFileSync('.env.local', 'utf8');
  const hit = env.split(/\r?\n/).find((l) => l.startsWith('MRV_PASSWORD='));
  return hit ? hit.slice('MRV_PASSWORD='.length).trim() : '';
})();
```

### ④🚨 ดักทุกคำขอที่ไม่ใช่ GET — สคริปต์เทสห้ามแตะฐานจริง
```js
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      const u = r.url(), m = r.method();
      // 🚨 สคริปต์เทสห้ามแตะฐานจริง — ดักทุกคำขอที่ไม่ใช่การอ่าน
      if (u.indexOf('/api/') >= 0 && u.indexOf('/api/auth') < 0 && m !== 'GET') {
        r.respond({ status: 503, contentType: 'application/json', body: '{}' }); return;
      }
      r.continue();
    });
```
🚨 **ยกเว้น `/api/auth`** ไม่งั้นล็อกอินไม่ผ่าน (POST) · CLAUDE.md ข้อ 3.72 เตือนเพิ่มว่า **ต้องเปิดตัวดักคำขอ "หลัง" เข้าสู่ระบบเท่านั้น** ในบางสคริปต์ เพราะเปิดตั้งแต่แรกแล้วคุกกี้ไม่ติด
🚨 CLAUDE.md ข้อ 3.63 บันทึกความผิดพลาดจริงว่า **เคยมีล็อตขยะเข้าฐานจริง 4 ล็อต** เพราะระบบส่งซ้ำอัตโนมัติทำงานเกินคาด

### ⑤ ตั้งจอเป็นมือถือจริง ไม่ใช่แค่ย่อหน้าต่าง
```js
    await page.setViewport({ width: 390, height: 780, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
```
🚨 **`isMobile: true` + `hasTouch: true` เป็นหัวใจ** — ถ้าไม่ตั้ง เบราว์เซอร์จะไม่ยิง touch event และคลาส/ตรรกะฝั่งมือถือจะไม่ทำงานเลย = ตัวตรวจที่วัดคนละสภาพกับที่ผู้ใช้เจอ

### ⑥ ตั้งชื่อเครื่องก่อนเสมอ ไม่งั้นหน้าต่างถามชื่อเครื่องบังทุกภาพ
```js
    await page.evaluate(() => {
      try { localStorage.setItem('mrv.device', JSON.stringify('เครื่องทดสอบอัตโนมัติ')); } catch (e) {}
    });
```
🚨 **ห้ามใช้ชื่อ 8 เครื่องจริง** (CLAUDE.md ข้อ 3.64) — ร่างขยะจากการเทสจะไปโผล่ในเครื่องที่ห้องยาใช้จริง
🚨 CLAUDE.md ข้อ 3.74 บันทึกว่า `tap-check.mjs` **เคยฟ้องผิด 3 คู่** เพราะไม่ได้ตั้งชื่อเครื่องก่อนวัด แล้วไปวัดปุ่มในหน้าต่างถามชื่อเครื่องแทน

### ⑦ ตัวหยิบ instance ของ React (`grab`) — เข้าถึง state/method ของแอปจริงได้
```js
const grab = (page, src) => page.evaluate((x) => {
  const el = document.querySelector('[role="button"]');
  const key = el && Object.keys(el).find((k) => k.indexOf('__reactFiber') === 0);
  let f = key ? el[key] : null, app = null;
  while (f) {
    if (f.stateNode && typeof f.stateNode.persist === 'function') { app = f.stateNode; break; }
    f = f.return;
  }
  if (!app) return 'ไม่เจอตัวแอป';
  return new Function('app', x)(app);
}, src);
```
เดินขึ้น fiber tree จาก element แรกที่มี `role="button"` จนเจอ stateNode ที่มีเมธอด `persist` (= instance ของ `MedReturnApp`)
⚠️ **ผูกกับเว็บนี้แน่น** — ต้องเป็น class component และต้องมีเมธอดชื่อ `persist` เป็นตัวชี้

### ⑧ `SHOW=1` เปิดหน้าต่างเบราว์เซอร์ให้เห็น
```js
    headless: process.env.SHOW === String.fromCharCode(49) ? false : 'new',
```
(`String.fromCharCode(49)` คือ `'1'` — เขียนแบบนี้น่าจะเพื่อเลี่ยงปัญหาตัวอักษรตอนแก้ไฟล์)
**เหตุผลจากคอมเมนต์ — คำพูดเจ้าของงาน** (CLAUDE.md ข้อ 3.54)
> พี่กันขอ 26 ส.ค. 2569 *"นี่เธอเทสในเว็บโครมปะ เราไม่เห็นเธอเปิดดูเลย"*

---

## ตัวที่ 1 — `scripts/mobile-bar-check.mjs` (109 บรรทัด)

**หัวไฟล์**
```js
// วัดแถบบันทึกฝั่งมือถือว่ากินที่เท่าไหร่ + ถ่ายภาพให้ดูจริง
// พี่กันสั่ง 1 ก.ย. 2569 "ไปบีบจุดนี้หน่อย เพราะตอนใช้ในมือถือ มันกินเนื้อที่มาก"
```

**ตรวจอะไร** — แถบบันทึกล่างจอฝั่งมือถือกินพื้นที่จอเท่าไหร่ และปุ่มบันทึกยังกดได้จริงไหม

**เตรียมสภาพก่อนวัด** — ยัดยา 2 แถวเข้ารายการ (1 ใช้ต่อ · 1 ทำลาย) แล้วเลือกผู้บันทึกให้ เพื่อให้แถบบันทึกมีของครบตามสภาพใช้งานจริง
```js
    await grab(page, `
      const d = app.state.drugs[0], e = app.state.drugs[3];
      if (!d) return 'ไม่มียา';
      app.persist({ rows: [
        { rid: 'b1', drugId: d.id, name: d.name, unit: d.unit, price: d.price || 1, qty: 30, disposition: 'reuse', source: 'opd' },
        { rid: 'b2', drugId: e.id, name: e.name, unit: e.unit, price: e.price || 1, qty: 10, disposition: 'destroy', source: 'opd' }
      ] });
      app.setState({ recorder: (app.state.staff || [])[0] || '' });
      return 'ok';`);
```

**วัดค่าอะไร**
```js
    const m = await page.evaluate(() => {
      const R = (e) => e ? Math.round(e.getBoundingClientRect().height) : 0;
      const bar = [...document.querySelectorAll('div')]
        .find((e) => (e.innerText || '').indexOf('สะสมปีงบ') === 0 && R(e) > 80 && R(e) < 400);
      const btn = [...document.querySelectorAll('[role="button"]')]
        .find((e) => (e.innerText || '').indexOf('รายการ') > 0 || (e.innerText || '').indexOf('ลองส่งใหม่') >= 0);
      const b = btn ? btn.getBoundingClientRect() : null;
      return {
        จอสูง: window.innerHeight,
        แถบบันทึกสูง: R(bar),
        ปุ่มสูง: b ? Math.round(b.height) : 0,
        ปุ่มอยู่ในจอไหม: b ? (b.top >= 0 && b.bottom <= window.innerHeight) : false,
        ข้อความปุ่ม: btn ? btn.innerText.replace(/\s+/g, ' ').trim() : '(ไม่เจอ)'
      };
    });
```

**เกณฑ์ผ่าน**
```js
    log((m.ปุ่มสูง >= 44 ? '  ผ่าน  ' : '  ตก    ') + 'ปุ่มถึงเกณฑ์นิ้ว 44px');
```
- **ปุ่มบันทึกสูง ≥ 44px** = ผ่าน (เกณฑ์เดียวที่ตัดสินอัตโนมัติ)
- อีก 2 ค่ารายงานให้อ่านเอง — **% ของจอที่แถบกิน** และ **ปุ่มอยู่ในจอไหม** (`top >= 0 && bottom <= innerHeight`)
- ถ่ายภาพลง `out/มือถือ-แถบบันทึก.png`

### 🔴 ตรวจแล้ว — ตัวนี้ **หาแถบบันทึกไม่เจอแล้ว** (ยืนยันจากโค้ดจริง)

ตัวหาแถบใช้ข้อความไทย `'สะสมปีงบ'` เป็นตัวชี้
```js
      const bar = [...document.querySelectorAll('div')]
        .find((e) => (e.innerText || '').indexOf('สะสมปีงบ') === 0 && R(e) > 80 && R(e) < 400);
```
แต่ค้นทั้ง `components/` แล้ว คำว่า `สะสมปีงบ` **เหลืออยู่ที่เดียวคือ `components/pages/record.jsx:800`**
ซึ่งอยู่ใน `renderRecordWide` (แผงขวาฝั่งคอม · ฟังก์ชันเริ่มบรรทัด 373) — **ไม่ใช่แถบบันทึกฝั่งมือถือ**

`renderSaveBar` (บรรทัด 834) เขียนคอมเมนต์บอกเองว่าเอาออกไปแล้ว
```jsx
        {/* ── ไม่มีแถวยอดสะสมปีงบแล้ว (พี่กันสั่ง 1 ก.ย. 2569) ────────────────────
            สั่งเป็น 2 จังหวะ — รอบแรกเอาคำว่า "สะสมปีงบ" ออก รอบนี้เอาตัวเลขออกด้วย
```

สคริปต์รันที่จอ 390px = ฝั่งมือถือ → `renderRecordWide` ไม่ถูกวาดเลย
→ **`bar` เป็น `undefined` เสมอ → รายงาน `แถบบันทึกกินที่ 0px (0% ของจอ)` ทุกครั้ง โดยไม่มีอะไรบอกว่าหาไม่เจอ**

⚠️ บรรทัดปุ่มบันทึกยังทำงานได้ (หาด้วย `indexOf('รายการ') > 0`) เกณฑ์ 44px จึงยังเชื่อได้ · แต่ค่าหลักที่สคริปต์นี้ตั้งใจวัดตายไปแล้ว

**ผูกกับเว็บนี้แค่ไหน** — **ต้องปรับก่อนใช้** · แนวคิดยกไปได้ แต่ต้องเลิกหาชิ้นด้วยข้อความ ใช้ `ref`/`data-*`/`aria-label` แทน
🔑 **แนวคิดที่ยกไปได้ทันที: วัดว่าแถบล่างกินกี่ % ของจอ แล้วรายงานเป็นเปอร์เซ็นต์** — ตัวเลขพิกเซลเปล่า ๆ ไม่บอกว่ามากไปหรือยัง
🔑 **แนวคิดที่ยกไปได้ทันที: วัดว่าแถบล่างกินกี่ % ของจอ แล้วรายงานเป็นเปอร์เซ็นต์** — ตัวเลขพิกเซลเปล่า ๆ ไม่บอกว่ามากไปหรือยัง

---

## ตัวที่ 2 — `scripts/mobile-flow-check.mjs` (167 บรรทัด) 🏆 **ตัวที่มีค่าที่สุดในชุด**

**หัวไฟล์**
```js
// เดินตามอาการที่พี่กันเจอเป๊ะ ๆ (1 ก.ย. 2569)
//   "เรากดส่งแล้วมันเด้งให้เลือกคนส่ง จากนั้นเรากดบันทึก มันไม่ไปเลย"
//
// 🚨 กดผ่านหน้าจอจริงทุกขั้น ไม่ใช่ setState เอาเอง
//    เพราะบั๊กแบบนี้เกิดจากลำดับการกดกับตำแหน่งของเมนู ซึ่ง setState ข้ามไปหมด
```

**ตรวจอะไร** — เส้นทางกดบันทึกบนมือถือ **4 ขั้น กดจริงทุกขั้นเหมือนนิ้วคน**

| ขั้น | ทำอะไร | วัดอะไร |
|---|---|---|
| ① | กดปุ่มบันทึกทั้งที่ยังไม่เลือกผู้บันทึก | มีข้อความ "เลือกชื่อผู้บันทึก" ไหม · เมนูเปิดไหม · `recorderBox` (ตำแหน่งเมนูที่วัดไว้) มีไหม |
| ② | กดเลือกชื่อจากเมนูที่เด้งขึ้นมา (กดจริง) | เลือกได้ชื่อไหน · **แถวที่กดอยู่ในจอไหม** · เมนูปิดแล้วไหม |
| ③ | กดปุ่มบันทึกอีกครั้ง | ป๊อปยืนยันขึ้นไหม (อ่านจาก `app.state.confirm.title`) · ยังมีข้อความเตือนค้างไหม |
| ④ | กดปุ่ม "ยืนยันบันทึก" | **มีคำขอยิงออกไปจริงไหม** |

**หัวใจของตัวนี้ — `tapSave()` กดที่พิกัดกลางปุ่มด้วยเมาส์จริง**
```js
// กดปุ่มบันทึกจริงด้วยการแตะที่พิกัดกลางปุ่ม (เหมือนนิ้วคน)
const tapSave = async (page) => {
  const box = await page.evaluate(() => {
    const b = [...document.querySelectorAll('[role="button"]')]
      .find((e) => (e.innerText || '').indexOf('รายการ') > 0 && (e.innerText || '').indexOf('บันทึก') === 0);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
      inView: r.top >= 0 && r.bottom <= window.innerHeight, label: b.innerText.replace(/\s+/g, ' ').trim() };
  });
  if (!box) return { ok: false, why: 'ไม่เจอปุ่มบันทึก' };
  if (!box.inView) return { ok: false, why: 'ปุ่มอยู่นอกจอ กดไม่ถึง' };
  await page.mouse.click(box.x, box.y);
  return { ok: true, label: box.label, at: box.x + ',' + box.y };
};
```

🚨 **ต่างจาก `el.click()` ตรงนี้เอง** — `page.mouse.click(x, y)` กดที่ **พิกัดบนจอ** ถ้ามีอะไรลอยทับปุ่มอยู่ จะโดนของที่ทับแทน = จับบั๊ก "ปุ่มถูกบัง" ได้ ซึ่ง `el.click()` จับไม่ได้เลย
🚨 และเช็ค `inView` ก่อนกด — **ปุ่มที่อยู่นอกจอถือว่าตกทันที** ไม่ใช่กดไปเงียบ ๆ

**เกณฑ์ผ่าน** — ไม่มีตัวนับ pass/fail · รายงานเป็นเรื่องเล่าทีละขั้นให้อ่านเอง โดยติดธง 🔴 ที่บรรทัดที่มีปัญหา · บรรทัดตัดสินคือ
```js
      log('   คำขอที่ยิงออกไป: ' + (sent.length ? sent.join(' · ') : '🔴 ไม่ยิงอะไรเลย'));
```
พร้อมถ่ายภาพ 3 จุด — `out/มือถือ-หลังกดครั้งแรก.png` · `หลังเลือกชื่อ.png` · `หลังกดครั้งสอง.png`

**บั๊กที่ตัวนี้จับได้จริง** (CLAUDE.md ข้อ 3.66) — ปุ่ม "ยืนยันบันทึก" ไม่มีฟังก์ชันผูก ทำให้ **บันทึกไม่ได้ทั้งเว็บ ทั้งคอมและมือถือ**

| วิธีเทส | จับบั๊กนี้ได้ไหม |
|---|---|
| `setState` แล้วอ่าน state | ❌ ผ่านหมด |
| เรียก `app.save()` ตรง ๆ | ❌ ผ่าน (ข้ามป๊อป) |
| **กดปุ่มจริงทีละขั้นเหมือนคนใช้** | ✅ **เจอ** |

🚨 **กับดักของตัวตรวจเองที่บันทึกไว้** (CLAUDE.md ข้อ 3.66)
> **ชื่อปุ่มในป๊อปคือ "ยืนยันบันทึก" ไม่ใช่ "บันทึก"** — ตัวตรวจที่หาผิดชื่อจะรายงานว่า
> "ไม่ยิงอะไรเลย" ทั้งที่โค้ดถูกแล้ว (เสียเวลาไล่ผิดทางไปหนึ่งรอบ)

**ผูกกับเว็บนี้แค่ไหน** — **แนวคิดยกไปได้เลย 100% · โค้ดต้องเขียนใหม่ตามเส้นทางของเว็บนั้น**
🔑 นี่คือตัวที่ควรทำเป็น **แม่แบบสกิลกลาง**: "เดินตามอาการที่เจ้าของงานเล่าเป๊ะ ๆ ทีละขั้น กดจริงด้วยพิกัด ถ่ายภาพทุกขั้น แล้วรายงานเป็นเรื่องเล่า"

---

## ตัวที่ 3 — `scripts/mobile-overlap-check.mjs` (111 บรรทัด)

**หัวไฟล์**
```js
// วัดว่าอะไรทับกันบ้างบนหน้าบันทึกฝั่งมือถือ (พี่กันแจ้ง 1 ก.ย. 2569 "มันทับกัน HN วันที่")
// 🚨 วัดพิกัดจริงในเบราว์เซอร์ ไม่ใช่อ่านจากโค้ด
```

**รันยังไง** — `node scripts/mobile-overlap-check.mjs [กว้าง] [สูง]` ค่าตั้งต้น **440×956** (จอ iPhone ของเจ้าของงาน)
```js
const W = Number(process.argv[2] || 440);
const H = Number(process.argv[3] || 956);
```

**เก็บพิกัดของอะไรบ้าง**
```js
      push('ป้ายวันที่', grab(/^วันที่$/)[0]);
      push('ป้าย HN', grab(/^HN/)[0]);
      push('ช่องวันที่', document.querySelector('input[type="date"]'));
      push('ช่อง HN', [...document.querySelectorAll('input')].find((i) => i.placeholder === 'ปล่อยว่างได้'));
      push('ป้ายผู้บันทึก', grab(/^ผู้บันทึก$/)[0]);
      push('ป้ายต้องเลือก', grab(/ต้องเลือกก่อนบันทึก/)[0]);

      // แถบเมนูล่าง
      const nav = document.querySelector('[role="navigation"]');
      if (nav) {
        res.items.push(Object.assign({ name: 'แถบเมนูล่าง', text: '' }, box(nav)));
        [...nav.querySelectorAll('[role="button"]')].forEach((b, i) => {
          res.items.push(Object.assign({ name: 'แท็บ' + (i + 1), text: (b.innerText || '').replace(/\s+/g, '') }, box(b)));
        });
      }
```
🚨 กรองเฉพาะ element ที่ **ไม่มีลูก** (`e.children.length === 0`) เพื่อไม่ให้จับกล่องครอบมาแทนตัวข้อความ
```js
      const grab = (re, tag) => [...document.querySelectorAll(tag || '*')]
        .filter((e) => re.test((e.innerText || e.placeholder || '').trim()) && e.children.length === 0);
```

**วัดการทับกันยังไง — เทียบสี่เหลี่ยมทุกคู่**
```js
    for (let i = 0; i < out.items.length; i++) {
      for (let j = i + 1; j < out.items.length; j++) {
        const a = out.items[i], b = out.items[j];
        if (a.name.indexOf('แถบเมนู') === 0 || b.name.indexOf('แถบเมนู') === 0) continue;
        const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
        const oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (ox > 1 && oy > 1) hit.push('  🔴 ' + a.name + ' ทับ ' + b.name + ' — กว้าง ' + ox + 'px สูง ' + oy + 'px');
      }
    }
```

**เกณฑ์ผ่าน** — **ทับกันเกิน 1px ทั้งสองแกน = ตก** (เผื่อ 1px ให้เส้นขอบที่ชนกันพอดี)
- ข้าม "แถบเมนูล่าง" เพราะเป็นกล่องครอบที่ทับลูกของตัวเองอยู่แล้วโดยธรรมชาติ
- พิมพ์ตารางพิกัด `x ซ้าย→ขวา` · `y บน→ล่าง` ของทุกชิ้นให้อ่านเอง
- ถ่ายภาพลง `out/mobile-overlap.png`

**ผูกกับเว็บนี้แค่ไหน** — **โครง (`ox > 1 && oy > 1`) ยกไปได้เลย · รายการชิ้นที่วัดต้องเขียนใหม่**
### 🔴 ตรวจแล้ว — ตัวนี้ **หาช่อง HN ไม่เจอแล้ว** (ยืนยันจากโค้ดจริง)

```js
      push('ช่อง HN', [...document.querySelectorAll('input')].find((i) => i.placeholder === 'ปล่อยว่างได้'));
```
ค้นทั้ง `components/` แล้ว **คำว่า `ปล่อยว่างได้` ไม่มีอยู่ที่ไหนเลยแม้แต่จุดเดียว**
ของจริงตอนนี้คือ `placeholder="ไม่บังคับ"` (`components/pages/record.jsx:252` ฝั่งมือถือ · `:733` ฝั่งคอม)

`push()` เขียนไว้ว่า `if (el)` เท่านั้น
```js
      const push = (name, el) => { if (el) res.items.push(...) };
```
→ **ช่อง HN ถูกข้ามเงียบ ๆ ไม่เข้าไปในรายการที่เอามาเทียบการทับ และไม่มีบรรทัดไหนบอกว่าหาไม่เจอ**
= **ตัวตรวจที่ตั้งใจตรวจ "HN ทับวันที่" กลับไม่ได้ตรวจ HN เลย** ทั้งที่นั่นคืออาการที่เจ้าของงานแจ้งมาตั้งแต่แรก (`"มันทับกัน HN วันที่"`)
🚨 นี่คือ **"ตัวตรวจที่โกหก"** ตามที่สกิล `testing-proof` เตือน — ผ่านเพราะไม่ได้ตรวจ ไม่ใช่เพราะไม่มีปัญหา
🔑 **บทเรียนสำหรับสกิลกลาง: ตัวตรวจที่หาชิ้นไม่เจอ ต้องรายงานว่า "หาไม่เจอ" ไม่ใช่ข้ามเงียบ ๆ** (โค้ดตอนนี้ `push()` เช็ค `if (el)` แล้วข้ามไปเฉย ๆ)

---

## ตัวที่ 4 — `scripts/mobile-save-check.mjs` (191 บรรทัด)

**หัวไฟล์**
```js
// หาสาเหตุ "กดส่งในมือถือไม่ได้" (พี่กันเจอ 31 ส.ค. 2569)
//
// 🚨 ดักทุกคำขอที่ไม่ใช่ GET ไม่ให้แตะข้อมูลจริง
//    แต่ยังอ่านผลได้ว่าถ้าปล่อยจริงมันจะยิงไหม
```

**ตรวจอะไร** — เดิน 3 ขั้น เน้นที่ **ด่านก่อนกดส่ง** (ต่างจาก flow-check ที่เน้นลำดับการกด)

| ขั้น | ทำอะไร | วัดอะไร |
|---|---|---|
| ① | เปิดเว็บครั้งแรกทั้งที่ยังไม่เคยตั้งชื่อเครื่อง | หน้าต่างถามชื่อเครื่องเด้งไหม · กดเลือก "มือถือ หรือแท็บเล็ต" แล้ว **มีชื่อให้เลือกกี่ตัว** · **มีปุ่มข้ามไหม** |
| ② | ยัดชื่อเครื่องลง localStorage แล้วรีโหลด ใส่ยา 1 แถว กดบันทึก | เจอปุ่มบันทึกกี่ปุ่ม (พร้อมพิกัด top/bottom/h) · กดแล้วติดด่านไหน |
| ③ | เลือกผู้บันทึกแล้วกดใหม่ + กดยืนยัน | ป๊อปยืนยันขึ้นไหม · **มีคำขอยิงออกไปจริงไหม** |

**จุดเด่นของตัวนี้ — ตรวจว่า "ติดค้างใช้เว็บไม่ได้เลย"**
```js
      if (opts.filter((o) => o.indexOf('มือถือของ') === 0).length === 0) {
        log('');
        log('   🔴🔴 เจอต้นเหตุแล้ว — ไม่มีชื่อให้เลือก และไม่มีปุ่มข้าม');
        log('        = ติดค้างหน้านี้ ใช้เว็บบนมือถือไม่ได้เลย');
      }
```
🔑 นี่คือการตรวจ **"ทางตัน"** (dead end) — สภาพที่ผู้ใช้เปิดเว็บบนมือถือแล้วไปต่อไม่ได้เลย ซึ่งเป็นบั๊กร้ายแรงที่สุดของเว็บมือถือ

**การอ่านผล — แยกด่านที่ติดออกจากกันชัดเจน**
```js
    log('   กดแล้วเกิดอะไร: ' + (t.indexOf('ยืนยันการบันทึก') >= 0 ? 'ป๊อปยืนยันขึ้น'
      : t.indexOf('เลือกชื่อผู้บันทึก') >= 0 ? '🔴 ติดที่ยังไม่เลือกผู้บันทึก'
      : t.indexOf('เลือก รพ.สต.') >= 0 ? '🔴 ติดที่ยังไม่เลือก รพ.สต.'
      : t.indexOf('โหมดดูตัวอย่าง') >= 0 ? '🔴 ติดที่โหมดดูตัวอย่าง'
      : '🔴 ไม่มีอะไรเกิดขึ้นเลย'));
```
🔑 **"ไม่มีอะไรเกิดขึ้นเลย" เป็นผลลัพธ์แยกต่างหาก** — ต่างจาก "ติดด่าน" ซึ่งเป็นพฤติกรรมที่ถูกต้อง

**เกณฑ์ผ่าน** — ไม่มีตัวนับ · อ่านจากธง 🔴 และบรรทัด `คำขอที่ยิงออกไป` · ถ่ายภาพ 3 จุด (`out/มือถือ-ถามชื่อเครื่อง.png` · `มือถือ-กดบันทึก.png` · `มือถือ-หลังยืนยัน.png`)

**ผูกกับเว็บนี้แค่ไหน** — **ต้องปรับก่อนใช้ (ผูกกับด่านของเว็บนี้แน่นมาก)** — ชื่อเครื่อง · ผู้บันทึก · รพ.สต. · โหมดดูตัวอย่าง เป็นด่านเฉพาะของเว็บนี้
🔑 **แนวคิด 2 ข้อที่ยกไปได้ทุกเว็บ**
1. **ตรวจว่าเปิดเว็บบนมือถือครั้งแรกแล้วไปต่อได้ไหม** (ไม่มีทางตัน)
2. **แยก "ติดด่าน (ถูกต้อง)" ออกจาก "ไม่มีอะไรเกิดขึ้นเลย (บั๊ก)"** ให้ชัด

### 🔴🔴 ตรวจแล้วพบว่า `mobile-save-check.mjs` **รายงานผิดแน่นอน** (ยืนยันจากโค้ดจริง)

สคริปต์ตรวจว่าป๊อปยืนยันขึ้นหรือยัง ด้วยการหาข้อความ **`'ยืนยันการบันทึก'`** (2 จุด บรรทัด 145 และ 172)
```js
    log('   กดแล้วเกิดอะไร: ' + (t.indexOf('ยืนยันการบันทึก') >= 0 ? 'ป๊อปยืนยันขึ้น'
```
```js
    log('   กดแล้วเกิดอะไร: ' + (t.indexOf('ยืนยันการบันทึก') >= 0 ? '✅ ป๊อปยืนยันขึ้นแล้ว'
      : t.indexOf('เลือก รพ.สต.') >= 0 ? '🔴 ติดที่ รพ.สต.'
      : '🔴 ยังไม่มีอะไรเกิดขึ้น'));
```

แต่ข้อความจริงที่ป๊อปแสดง อยู่ที่ `components/handlers/record.js:647` และ `:653`
```js
        title: 'ยืนยันบันทึกรายการยาคืน',
```
```js
        okLabel: 'ยืนยันบันทึก',
```

**`'ยืนยันบันทึกรายการยาคืน'` ไม่มีคำว่า "การ" อยู่เลย** → `indexOf('ยืนยันการบันทึก')` คืน `-1` เสมอ
→ **สคริปต์จะตกไปสาขาสุดท้ายแล้วรายงาน `🔴 ยังไม่มีอะไรเกิดขึ้น` ทุกครั้ง ทั้งที่ป๊อปขึ้นถูกต้องแล้ว**

⚠️ ขั้นถัดไปที่กดปุ่มยืนยันยังทำงานได้ (หาด้วย `indexOf('ยืนยัน') === 0` ซึ่งตรงกับ `okLabel`) บรรทัด `คำขอที่ยิงออกไป` จึงยังเชื่อได้ · แต่บรรทัดกลางโกหก

**ตรงข้ามกับ `mobile-flow-check.mjs` ที่ทำถูก** — ตัวนั้นอ่านจาก state ตรง ๆ (`app.state.confirm.title`) ไม่ใช่ค้นข้อความในหน้า
```js
    const st3 = await grab(page, `return { confirm: app.state.confirm ? app.state.confirm.title : '(ไม่มี)' };`);
```

🔑 **บทเรียนที่ยกเป็นกฎกลางได้ทันที: ตัวตรวจต้องอ่านจาก state ไม่ใช่ค้นข้อความบนหน้าจอ**
ข้อความบนจอถูกแก้ถ้อยคำได้ตลอด ตัวตรวจที่ผูกกับถ้อยคำจะกลายเป็นตัวตรวจที่โกหกทันทีที่มีคนแก้ข้อความ — และไม่มีอะไรเตือน

---

## ตัวที่ 5 — `scripts/mobile-shot.mjs` (102 บรรทัด)

**หัวไฟล์**
```js
// ถ่ายภาพหน้าจอฝั่งมือถือเป็นชิ้น ๆ เพื่อเปิดดูด้วยตา
// 🚨 กฎข้อ 3.65 — แตะหน้าจอเมื่อไหร่ ต้องเปิดภาพดูก่อนรายงานเสมอ
//    การวัดตัวเลขจากโค้ดผ่านหมดได้ทั้งที่ตาอ่านไม่ออก
//
//   node scripts/mobile-shot.mjs            จอ 440×956 (iPhone ของพี่กัน)
//   node scripts/mobile-shot.mjs 390 844    จอเล็กกว่า
```

**ตรวจอะไร** — ไม่ได้ตัดสินผ่าน/ตก · **ถ่ายภาพให้คนเปิดดูด้วยตา** 4 ภาพ + วัดพิกัดแถวหัวเว็บ

| ภาพ | เก็บอะไร |
|---|---|
| `out/m-full.png` | ทั้งจอ |
| `out/m-nav.png` | เฉพาะ `[role="navigation"]` (แถบเมนูล่าง) |
| `out/m-savebar.png` | แถบบันทึก — หาโดยไต่ขึ้นจากปุ่มบันทึก 4 ชั้น |

**วิธีหาแถบบันทึก (ไม่มี selector จึงไต่ DOM ขึ้นไป)**
```js
    const barBox = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[role="button"]')]
        .find((e) => /^(บันทึก \d|เลือกยาก่อน|ลองส่งใหม่|กำลังบันทึก)/.test((e.innerText || '').trim()));
      if (!btn) return null;
      let el = btn;
      for (let i = 0; i < 4 && el.parentElement; i++) el = el.parentElement;
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
    });
```
🔑 **regex ครอบทั้ง 4 สถานะของปุ่ม** (`บันทึก N` · `เลือกยาก่อน` · `ลองส่งใหม่` · `กำลังบันทึก`) — ตัวตรวจที่หาแค่สถานะเดียวจะพลาดตอนอยู่สถานะอื่น

**วัดพิกัดแถวหัวเว็บ**
```js
    // วัดแถวหัวเว็บ — ชื่อเว็บตกบรรทัดเมื่อที่ว่างไม่พอ
```
เก็บกล่องของ **ชื่อเว็บ · ชื่อหน่วยงาน · ทั้งแถว · ปุ่มทุกปุ่มในแถว** แล้วพิมพ์เป็น JSON ให้เทียบเอง

**🚨 บทเรียนที่บันทึกไว้ในไฟล์นี้เอง — ห้ามรอเป็นเวลาตายตัว**
```js
    if (page.url().indexOf('/login') >= 0) {
      // 🚨 ต้องรอช่องรหัสโผล่จริง ห้ามรอเป็นเวลาตายตัว
      //    หน้าเข้าสู่ระบบโหลดฉากหลัง three.js (~600 KB) ก่อน ช้ากว่า 900 มิลลิวินาทีบ่อย
      //    รอไม่ทันแล้วสคริปต์พังทั้งตัวว่า No element found ทั้งที่เว็บปกติดี
      await page.waitForSelector('#mrv-pw', { timeout: 20000 });
```
⚠️ **มีแค่ตัวนี้ตัวเดียวที่แก้แล้ว** — อีก 4 ตัวยังใช้ `await wait(900)` ตายตัว = **มีโอกาสพังเป็นครั้งคราวโดยไม่ใช่ความผิดของเว็บ**

**ผูกกับเว็บนี้แค่ไหน** — **โครงยกไปได้เลย · ตัวหาชิ้นต้องเขียนใหม่**
🔑 กฎที่ยกไปได้ทั้ง 3 ข้อ
1. **แตะหน้าจอเมื่อไหร่ ต้องเปิดภาพดูก่อนรายงานเสมอ** — การวัดตัวเลขผ่านหมดได้ทั้งที่ตาอ่านไม่ออก
2. **รอด้วย `waitForSelector` ไม่ใช่ `setTimeout`**
3. **ถ่ายเป็นชิ้น ๆ (`element.screenshot()`) ไม่ใช่แค่ทั้งจอ** — ภาพครอปเฉพาะจุดดูออกง่ายกว่ามาก

---

## เครื่องมือมือถืออีก 6 ตัวที่เจอเพิ่ม (นอกเหนือจาก 5 ตัวที่สั่งให้อ่าน)

CLAUDE.md ข้อ 3.67 เรียกรวมว่า "เครื่องมือตรวจ 6 ตัว" ของงานมือถือ

| สคริปต์ | ตรวจอะไร · เกณฑ์ผ่าน | ยกไปใช้ได้เลยไหม |
|---|---|---|
| `scripts/desktop-untouched-check.mjs` | **พิสูจน์ว่าเดสก์ท็อปไม่ขยับแม้แต่ 1px** — วัดพิกัดกับขนาดของทุกปุ่มในหน้าบันทึกฝั่งคอม **2 รอบ** รอบแรกตามปกติ รอบสองถอดคลาส `.mrv-mobile` ทิ้ง · **เลขทุกตัวเท่ากันเป๊ะ = ผ่าน** (วัด 96 ชิ้นสองทิศ — ถอดคลาสแล้วต้องเหมือนเดิม **และ** ใส่คลาสแล้วต้องเปลี่ยนจริง) | 🏆 **ยกไปได้เลย** ทุกเว็บที่แยกไฟล์มือถือ · เปลี่ยนแค่ชื่อคลาส |
| `scripts/ios-zoom-check.mjs` | **ไม่มีช่องกรอกไหนบนมือถือที่ทำให้ iPhone ซูมเข้าเอง** — วัดขนาดตัวอักษรของทุกช่องตรง ๆ · **ต่ำกว่า 16px = ตก** · คอมเมนต์บอกว่า "Chrome บนคอมไม่ทำแบบนี้ เครื่องมือตรวจทั่วไปจึงจับไม่ได้เลย" | 🏆 **ยกไปได้เลย** ทุกเว็บ |
| `scripts/drag-proof.mjs` | **ลากนิ้วจริงแล้ววัดว่าของบนจอขยับไหม** — "การวัดความกว้างอย่างเดียวไม่พอ ต้องลากนิ้วจริง เพราะสิ่งที่พี่กันเห็นคือ ลากแล้วมันไถล ไม่ใช่ตัวเลขความกว้าง" · มีตัวนับ pass/fail | 🏆 **ยกไปได้เลย** |
| `scripts/overflow-check.mjs` | **หาว่าอะไรล้นออกนอกจอ** จนหน้าเลื่อนซ้ายขวาได้ · "หน้าเว็บที่เลื่อนแนวนอนได้บนมือถือคือบั๊กเสมอ" · รับ `[กว้าง] [สูง]` | 🏆 **ยกไปได้เลย** |
| `scripts/parked-width-check.mjs` | **แถบล็อตค้าง ทุกสถานะ ไม่ล้นนอกจอ** · 🔑 บทเรียนในหัวไฟล์: *"บั๊กรอบนี้เกิดเฉพาะตอนมีล็อตเดียว ซึ่งเป็นคนละเส้นทางกับหลายล็อต สคริปต์เดิมเทสแค่ตอน 2 ล็อต จึงผ่านหมดทั้งที่ของจริงพัง · **ทุกสถานะที่วาดต่างกัน ต้องเทสแยกกันเสมอ**"* | ต้องปรับ (ผูกกับแถบล็อตค้าง) แต่ **กฎ "ทุกสถานะต้องเทสแยก" ยกไปได้** |
| `scripts/tap-check.mjs` | **วัดขนาดปุ่มจริงในโหมดมือถือ** ที่จอ 390px (รับความกว้างเองได้) · เกณฑ์ `MIN = 44` · รายงาน **2 อย่าง** — ปุ่มที่เล็กกว่าเกณฑ์ **และ พื้นที่กดที่ทับกัน** (อันตรายกว่า) | 🏆 **ยกไปได้เลย** |

**คอมเมนต์ในหัว `tap-check.mjs` (ยกมาเต็ม — เป็นกฎกลางที่ยกไปได้ทั้งก้อน)**
```js
// 🚨 พี่กันสั่ง 26 ส.ค. 2569: "ต12 ต้องทำ แล้วค่อย ๆ แก้ไป
//    และอย่าไปหลงแก้ในเดสก์ท็อป ต้องเช็คเสมอ"
//
// เกณฑ์ 44×44 พิกเซลเป็นเรื่องของ "นิ้วบนจอสัมผัส" ไม่ใช่เมาส์บนคอม
// ปุ่มเล็กบนเดสก์ท็อปไม่ใช่ปัญหา เพราะเมาส์ชี้ได้แม่นกว่านิ้วมาก
//
// 🚨 สิ่งที่อันตรายกว่าปุ่มเล็ก คือ "พื้นที่กดทับกัน"
//    คลาส .tap ขยายพื้นที่กดออกด้านละ 11px ด้วย ::before
//    ปุ่มที่วางติดกัน (✓ กับ ✕ · ใช้ต่อ/ทำลาย) จะมีพื้นที่กดซ้อนกัน
//    กลายเป็นกดพลาดสลับกัน ซึ่งแย่กว่าปุ่มเล็กที่กดยากแต่ไม่กดผิด
//    สคริปต์นี้จึงรายงานทั้งสองอย่าง
```

⚠️ **`tap-check.mjs` เป็นตัวเดียวในกลุ่มนี้ที่ยังไม่รับ `process.env.PORT`** — ใช้ `process.env.PRINT_CHECK_URL || 'http://127.0.0.1:3000'` แทน (ตกหล่นจากการไล่แก้ 30 ไฟล์ในข้อ 3.76)

---

## บทเรียนเรื่อง "ตัวตรวจที่โกหก" ที่เจอในโค้ดชุดนี้ (สำคัญสำหรับสกิลกลาง)

| อาการ | หลักฐานในโปรเจกต์นี้ |
|---|---|
| **ตัวตรวจหาชิ้นไม่เจอแล้วข้ามเงียบ ๆ** | `mobile-overlap-check.mjs` หาช่อง HN ด้วย `placeholder === 'ปล่อยว่างได้'` แต่โค้ดจริงใช้ `'ไม่บังคับ'` แล้ว · `mobile-bar-check.mjs` หาแถบด้วยข้อความ `'สะสมปีงบ'` ที่ถูกเอาออกไปแล้ว |
| **ตัวตรวจวัดคนละสภาพกับที่เจ้าของงานดู** | CLAUDE.md ข้อ 3.74 — *"ตัวตรวจที่วัดคนละสภาพ = ตัวตรวจที่โกหก"* (แคลร์เดินจากหน้าบันทึก · พี่กันรีเฟรชสด) |
| **ตัวตรวจไม่ตั้งสภาพก่อนวัด** | `tap-check.mjs` ไม่ตั้งชื่อเครื่อง → หน้าต่างถามชื่อเครื่องบังจอ → ฟ้องว่าพื้นที่กดทับกัน 3 คู่ทั้งที่โค้ดถูก (ข้อ 3.74) |
| **ตัวตรวจหาปุ่มด้วยข้อความ พอเปลี่ยนชื่อก็กดไม่ติดแล้วถ่ายหน้าผิดมาให้เงียบ ๆ** | `ui-check.mjs` — แก้แล้วโดยหาด้วย `aria-label` แทน (ข้อ 3.74) |
| **ตัวตรวจฟ้องตัวช่วยกลางเอง** | `api-log-check` ฟ้อง `clientLog.js` — *"ตัวตรวจที่ฟ้องผิดแย่กว่าไม่มีตัวตรวจ เพราะคนแก้จะไปปิดเสียงตัวช่วยกลางทิ้ง"* (ข้อ 3.73) |
| **ตัวตรวจเทสแค่สถานะเดียว** | `parked-width-check.mjs` — เทสแค่ตอน 2 ล็อต ผ่านหมดทั้งที่ตอนล็อตเดียวพัง |
| **ตัวตรวจเทียบภาพแทนการอ่านค่า** | `hover-check.mjs` เดิมถ่ายภาพเทียบไบต์ต่อไบต์ตอนสียังไหลไม่ถึงที่ → รายงานไม่ตรงกันทุกรอบ (ข้อ 3.56) |

---

# สรุปท้ายไฟล์

---

## ตาราง ก — ยกไปใช้กับเว็บอื่นได้เลย

| เรื่อง | โค้ดย่อ | ทำไมต้องมี |
|---|---|---|
| **ผูกตัวป้องกันตั้งแต่ constructor** | `this._bindEarlyGuards()` ใน constructor · ธง `this._earlyBound` กันผูกซ้ำตอน StrictMode | `componentDidMount` เกิดช้ากว่าหลายวินาทีบนมือถือ ช่วงนั้นไม่มีการป้องกันเลย ลากทีเดียวค้างทั้งรอบ |
| **ดักท่าซูมของ Safari** | `document.addEventListener('gesturestart'/'gesturechange'/'gestureend', h, {passive:false})` แล้ว `e.preventDefault()` | Safari บน iPhone มีท่าซูมของตัวเองที่ไม่ผ่านระบบ touch ปกติ · viewport + CSS อย่างเดียวไม่พอ |
| **ตรวจมือถือแบบไม่พึ่งคลาสที่โค้ดเป็นคนใส่** | `_isNarrowNow()` = คลาสที่ body **หรือ** `innerWidth < จุดสลับ` | คลาสถูกใส่ตอน mount ซึ่งช้าเกินไป · ความกว้างจอใช้ได้ตั้งแต่วินาทีแรก |
| **ธง JS ตัดสินว่าเป็นมือถือ แล้วเขียนคลาสลง body** | `document.body.classList.toggle('xxx-mobile', !wide)` | `@media (max-width)` ตัดสินผิดเมื่อมีสวิตช์บังคับดูมือถือบนคอม · CSS กับ JSX ต้องเห็นตรงกัน |
| **ตรวจว่ามีเมาส์จริง + ฟังการเปลี่ยนแปลง** | `matchMedia('(pointer: fine)')` + `addEventListener('change')` (มี `addListener` สำรอง) ครอบ try/catch | ความกว้างอย่างเดียวไม่พอ แท็บเล็ตแนวนอน 1024px หลุดขึ้นมา · เสียบ/ถอดเมาส์ค่าเปลี่ยนกลางคัน |
| **กันฉากหลังเลื่อน ชั้นที่ 1** | `document.addEventListener('touchmove'/'wheel', h, {passive:false})` แล้ว `preventDefault()` ถ้าไม่ได้อยู่ใน `closest('[role="dialog"], [data-scrollable="1"]')` | ปิด `overflow` พอสำหรับคอม แต่มือถือส่งการเลื่อนต่อไปให้ตัวข้างนอกเสมอ · ต้องปล่อยให้เลื่อนในป๊อปได้ |
| **กันฉากหลังเลื่อน ชั้นที่ 2 (มือถือเท่านั้น)** | `body.style.position='fixed';width='100%';overflow='hidden'` + จำ `scrollTop` แล้วคืนตอนปิด | ดัก touchmove อย่างเดียวไม่พอบนมือถือ · ไม่จำตำแหน่ง = ปิดป๊อปแล้วเด้งกลับบนสุด |
| **กันฉากหลังเลื่อน ชั้นที่ 3** | `overflowY: anyModalOpen ? 'hidden' : 'auto'` ที่พื้นที่เลื่อน | ปิด overflow ไม่ได้รีเซ็ต scrollTop จึงกลับมาที่เดิมพอดี |
| **ทางออกฉุกเฉินให้กรอบที่ไม่ใช่ dialog** | `data-scrollable="1"` | กรอบที่เลื่อนได้บางกรอบไม่ได้อยู่ใต้ `role="dialog"` |
| **กันหน้าไถลซ้ายขวา — ดีดกลับ 0** | `scrollLeft=0` ทั้ง 4 ที่ (พื้นที่เลื่อน · documentElement · body · window) ผูก `scroll`(capture) · `touchmove` · `touchend` **ทุกตัว passive:true** | กฎ CSS ทุกข้อได้ผลบนคอมแต่ไม่ได้ผลบนมือถือ · ผูก passive ได้เพราะไม่ได้ห้าม แค่ตั้งค่ากลับ จึงไม่ถ่วงการเลื่อนขึ้นลง |
| **ล็อกความกว้างเท่าขอบจอจริง** | `Math.floor(Math.min(visualViewport.width, innerWidth, documentElement.clientWidth))` → ใส่เป็น `width`+`maxWidth` ของกล่องนอกสุด | iPhone มี viewport 2 ชั้น · `position:fixed` เกาะกรอบผัง ไม่ใช่ขอบจอ · **เอาค่าน้อยที่สุดเสมอ ปัดลง ห้ามปัดขึ้น** |
| **ผูก `lockWidth` กับ visualViewport** | `visualViewport.addEventListener('resize'/'scroll', lockWidth)` | แป้นพิมพ์เด้ง หมุนจอ แถบเบราว์เซอร์ยืดหด ล้วนไม่ยิง `resize` ของ window เสมอไป |
| **หนีแป้นพิมพ์ด้วย `--kb`** | `gap = max(0, innerHeight − vv.height − vv.offsetTop)` → `--kb` · ฝั่ง CSS `transform:translateY(calc(var(--kb) * -1));transition:transform .12s ease-out` | บาง iOS ไม่หดพื้นที่ให้แม้ตั้ง `interactiveWidget` แล้ว · ป๊อปที่ตรึงขอบล่างโดนแป้นพิมพ์บังทั้งอัน |
| **ดึงลงโหลดใหม่** | `PULL_FIRE=62` `PULL_MAX=92` · `dy*0.5` · `setState` เมื่อต่างเกิน 1px · เฉพาะ `scrollTop===0` · ขั้นต่ำ 420ms · `passive:false` **เฉพาะ** `touchmove` · `touchcancel` ผูกไปที่ตัวจบด้วย | คนใช้มือถือไม่มีทางรู้ว่าของบนจอสดหรือเก่า และไม่มีปุ่มโหลดใหม่ · หารครึ่งให้รู้สึกฝืด · เน็ตเร็วแล้วตัวหมุนแวบเดียวดูเหมือนไม่ได้ทำอะไร |
| **แถบดึงลงสูง 0 เสมอ** | กล่องนอก `height:0;overflow:visible` · กล่องใน `position:absolute;height:pullY` · `pointer-events:none` | ผังหน้าไม่ขยับเลย · ตัวหมุนหมุนเฉพาะตอนโหลด ระหว่างลากหมุนตามระยะนิ้ว |
| **ระหว่างลากต้องเขียน `transition:none` ทับ** | `transition: pullBusy ? undefined : 'none'` | ไม่งั้นภาพตามนิ้วไม่ทัน |
| **ใช้ `transform` ไม่ใช่ margin/padding ตอนเลื่อนตามนิ้ว** | `transform:translateY(pullY)` | translate ไม่ทำให้เบราว์เซอร์คำนวณผังหน้าใหม่ทุกเฟรม |
| **`overflow-anchor:none` ที่พื้นที่เลื่อน** | — | ระบบยึดตำแหน่งเลื่อนของเบราว์เซอร์ดึงตำแหน่งเดิมกลับหลังข้อมูลโหลดเสร็จ ทำให้เปิดหน้าใหม่มาแล้วอยู่กลางหน้า |
| **เด้งบนสุดตอนสลับหน้า ต้อง 2 จังหวะ** | `set(); requestAnimationFrame(set);` | ข้อมูลที่มาถึงทีหลังยืดเนื้อหา แล้วเบราว์เซอร์ดึงตำแหน่งกลับ |
| **วัดความสูงแถบล่างด้วย ResizeObserver** | สร้าง ref ไว้ **ตายตัวใน constructor** · แยกวัดทีละกล่องแล้วบวก · กล่องหายจากจอ = 0 · ฝั่งใช้ `var(--bottombar, 96px)` | ตั้งเลขตายตัวไม่ได้ · สร้าง ref ใหม่ทุกเฟรม React จะถอดแล้วต่อ observer ใหม่ทุกเฟรม |
| **ไล่จางตอนสลับหน้า มีทางถอย 4 ชั้น** | `startViewTransition` + เช็ครองรับ + เช็คมือถือ + เช็ค `prefers-reduced-motion` + try/catch | ของสวยห้ามพังบนเครื่องที่ไม่รองรับ · เจ้าหน้าที่บางคนเวียนหัวกับภาพเคลื่อนไหว |
| **`overscroll-behavior:contain` ทุกกรอบที่เลื่อนได้** | แนวนอนใช้ `overscroll-behavior-x:contain` | เลื่อนจนสุดกรอบแล้วหน้าข้างหลังต้องไม่ไหลตาม · ไม่เปลี่ยนหน้าตาสักพิกเซล |
| **ตารางชั้นหน้าต่างซ้อนกลาง** | `Z = { bar:6, float:15, sheet:20, menu:29, panel:32, over:52, pick:70, confirm:85, toast:95 }` · ฉากหลังใช้เลขตรง · กล่อง +1 · ของซ้อนในกล่อง +2 | แต่ละป๊อปตั้งเลขเองตามใจ = ป๊อปยืนยันโผล่ใต้ป๊อปที่เปิดก่อน · ปุ่มลอยต้องต่ำกว่าป๊อปที่ต่ำสุด |
| **แถบล่างเว้น safe area** | `padding:8px 0 max(14px, env(safe-area-inset-bottom))` · ป๊อปล่างใช้ `max(22px, env(safe-area-inset-bottom))` | ไม่งั้นโดนแถบล่างของ iPhone กิน |
| **ช่องกรอกฝั่งมือถือห้ามต่ำกว่า 16px** | `font: 400 16px ...` + `inputMode="numeric"/"decimal"` | iPhone ซูมเองตอนแตะแล้วไม่ซูมกลับ · Chrome บนคอมไม่ทำแบบนี้ เครื่องมือทั่วไปจึงจับไม่ได้ |
| **ป๊อปที่ต้องพิมพ์ — ฉากหลังห้ามกดปิด** | ใส่ปุ่ม ✕ แทน | แป้นพิมพ์บังปุ่มจนพื้นหลังเป็นที่เดียวที่กดได้ · แตะเพื่อปิดแป้นพิมพ์ = ป๊อปปิด ของที่พิมพ์หายหมด |
| **ป๊อปที่แค่กรอง — ฉากหลังกดปิดได้** | | ไม่ใช่การกระทำที่ย้อนยาก ปิดแล้วตัวกรองยังเหมือนเดิม |
| **ป๊อปล่างจอใช้ `dvh` ไม่ใช่ `vh`** | `max-height:88dvh` | แถบเบราว์เซอร์บนมือถือยืดหดได้ |
| **ปุ่มคู่ที่วางติดกัน ห้ามขยายพื้นที่กดด้วย pseudo-element** | ถอดคลาสขยายออก แล้วขยายตัวปุ่มเองแทน | ขยายด้านละ 11px ปุ่มที่ห่างกัน < 22px จะมีพื้นที่กดซ้อนกัน = เล็งกดปุ่มหนึ่งแล้วโดนอีกปุ่ม |
| **แถวชิปบนมือถือในพื้นที่หัวที่ตรึง ห้าม `flex-wrap`** | `flex:1;min-width:0;white-space:nowrap;text-overflow:ellipsis` | ตกแถวที่สองคือกินที่ของเนื้อหาทันที |
| **ช่องบังคับต้องอยู่ติดปุ่มส่ง ไม่ซ่อนในส่วนที่ต้องกดเปิด** | | ซ่อนไว้ = ลืมกรอกทุกครั้ง แล้วเจอตอนกดส่ง · ดีกว่าการเลื่อนไปหาช่องทีหลัง |
| **ตรวจช่องบังคับ *ก่อน* เปิดป๊อปยืนยัน + เปิดตัวควบคุมที่ขาดให้เลย** | `app.setState({ recorderMenuOpen: true, showMore: true })` | ไม่งั้นกดยืนยันแล้วเพิ่งมาบอกว่ากรอกไม่ครบ ดูเหมือนปุ่มเสีย |
| **toast: สำเร็จหายเอง 4 วิ · ผิดพลาดค้างจนกดปิด** | `if (good) setTimeout(..., 4000)` — ผิดพลาดไม่มี timer เด็ดขาด | ข้อความผิดพลาดที่หายเองก่อนอ่านทัน ทำให้ดูเหมือนปุ่มเสีย (กัดจริงมาแล้ว 2 ครั้ง) |
| **สั่นเครื่องตอนมีข้อความเด้ง** | `if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }` | มือถือรู้สึกได้ · ครอบ try/catch เพราะเครื่องที่ไม่มีตัวสั่นจะโยน (เป็น catch เงียบที่ถูกต้อง) |
| **ตัดของที่ใช้บนมือถือไม่ไหวออกจากแท็บล่าง โดยกรองด้วย key** | `const MOBILE_HIDE = ['catalog']; tabs.filter(t => MOBILE_HIDE.indexOf(t.key) < 0)` | กรองด้วยตำแหน่งในรายการ = เพิ่มแท็บใหม่แล้วพัง · หน้ายังเปิดได้ทางอื่น แค่ไม่มีแท็บให้กด |
| **ไอคอนแท็บที่เปิดอยู่ต้องหนาขึ้น นอกจากสีเข้มขึ้น** | `strokeWidth: on ? 2.3 : 1.7` · ใช้ `currentColor` | บนจอกลางแดดที่สีจางลงจนแยกยาก ความหนายังบอกได้ว่าอยู่หน้าไหน |
| **ปุ่มลอยขึ้นบนสุด/ลงล่างสุด — ใส่เฉพาะหน้ารายงาน** | `el.scrollTo({top, behavior:'smooth'})` ที่พื้นที่เลื่อนหลัก | หน้าที่มีแถบตรึงล่างจออยู่แล้ว ปุ่มลอยจะบังเนื้อหา |
| **สคริปต์ตรวจ: พอร์ตจากตัวแปรแวดล้อม** | `'http://127.0.0.1:' + (process.env.PORT || '3000')` | พอร์ตอาจถูกโปรเจกต์อื่นยึด ห้ามไปปิดของเขา |
| **สคริปต์ตรวจ: ดักทุกคำขอที่ไม่ใช่ GET** | `setRequestInterception(true)` แล้ว `respond({status:503})` **ยกเว้น `/api/auth`** | สคริปต์เทสห้ามแตะฐานจริง (เคยมีล็อตขยะเข้าฐาน 4 ล็อต) |
| **สคริปต์ตรวจ: จอมือถือจริง** | `setViewport({ ..., isMobile:true, hasTouch:true, deviceScaleFactor:2 })` | ไม่ตั้ง = ไม่ยิง touch event = วัดคนละสภาพกับที่ผู้ใช้เจอ |
| **สคริปต์ตรวจ: รอด้วย `waitForSelector` ห้ามรอเวลาตายตัว** | `await page.waitForSelector('#mrv-pw', { timeout: 20000 })` | หน้าล็อกอินโหลดฉากหลังหนัก ช้ากว่า 900ms บ่อย แล้วสคริปต์พังทั้งตัวทั้งที่เว็บปกติ |
| **สคริปต์ตรวจ: กดด้วยพิกัด ไม่ใช่ `el.click()`** | `page.mouse.click(x, y)` + เช็ค `inView` ก่อนกด | จับบั๊ก "ปุ่มถูกของอื่นทับ" และ "ปุ่มอยู่นอกจอ" ได้ ซึ่ง `el.click()` จับไม่ได้เลย |
| **สคริปต์ตรวจ: อ่านจาก state ไม่ใช่ค้นข้อความบนจอ** | `app.state.confirm.title` | ถ้อยคำบนจอถูกแก้ได้ตลอด ตัวตรวจที่ผูกกับถ้อยคำจะโกหกทันทีโดยไม่มีอะไรเตือน |
| **สคริปต์ตรวจ: ตั้งสภาพให้ครบก่อนวัด** | ยัด `localStorage` ตั้งชื่อเครื่อง · ยัดแถวข้อมูล · เลือกค่าบังคับ | ไม่ตั้ง = หน้าต่างอื่นบังจอ แล้วไปวัดของผิดตัว (เคยฟ้องผิด 3 คู่) |
| **วัดการทับกันโดยเทียบสี่เหลี่ยมทุกคู่** | `ox = min(a.r,b.r) − max(a.l,b.l); oy = min(a.b,b.b) − max(a.t,b.t); if (ox>1 && oy>1) ตก` | เผื่อ 1px ให้เส้นขอบที่ชนกันพอดี |
| **`desktop-untouched-check` — วัด 2 รอบ ถอดคลาสมือถือออก** | เลขทุกตัวเท่ากันเป๊ะ = ผ่าน **และ** ใส่คลาสแล้วต้องเปลี่ยนจริง | พิสูจน์ว่าไฟล์มือถือไม่รั่วไปโดนเดสก์ท็อป — ตัวเดียวในชุดที่พิสูจน์ได้ทั้งสองทิศ |
| **`ios-zoom-check` — วัดขนาดตัวอักษรของทุกช่องกรอก** | ต่ำกว่า 16px = ตก | Chrome บนคอมไม่ซูม เครื่องมือทั่วไปจึงจับไม่ได้ ต้องวัดตัวเลขเอา |
| **`drag-proof` — ลากนิ้วจริงแล้ววัดว่าของขยับไหม** | | วัดความกว้างอย่างเดียวไม่พอ เพราะสิ่งที่ผู้ใช้เห็นคือ "ลากแล้วมันไถล" |
| **`tap-check` — รายงาน 2 อย่าง ไม่ใช่อย่างเดียว** | ปุ่มเล็กกว่า 44px **และ** พื้นที่กดที่ทับกัน | พื้นที่กดทับกันอันตรายกว่าปุ่มเล็ก เพราะกดผิดโดยไม่รู้ตัว |
| **ทุกสถานะที่วาดต่างกัน ต้องเทสแยกกันเสมอ** | `parked-width-check` เทสทั้งตอน 1 ล็อตและหลายล็อต | เทสแค่ 2 ล็อตแล้วผ่านหมด ทั้งที่ตอนล็อตเดียวพัง |
| **แตะหน้าจอเมื่อไหร่ ต้องเปิดภาพดูก่อนรายงาน** | `mobile-shot.mjs` ถ่ายเป็นชิ้น ๆ ด้วย `element.screenshot()` | การวัดตัวเลขผ่านหมดได้ทั้งที่ตาอ่านไม่ออก |

---

## ตาราง ข — ต้องปรับก่อนใช้

| เรื่อง | ต้องปรับอะไร | เพราะอะไร |
|---|---|---|
| **จุดสลับ 1180px** | วัดใหม่ทุกเว็บ | เว็บนี้ขยับจาก 960 → 1180 เพราะวัดแล้วคอลัมน์ชื่อยาเหลือ 34px ที่ 960px · เว็บอื่นเนื้อหาต่างกัน |
| **จุดจอเตี้ย 700px (`tight`)** | วัดใหม่ตามเนื้อหา และเลือกเองว่าจะบีบอะไร | เว็บนี้บีบแถวยาจาก 11px → 6px (สูง 50 → 40) ซึ่งเป็นตัวที่กินที่จริงเพราะคูณจำนวนแถว |
| **ชื่อคลาส `.mrv-mobile`** | เปลี่ยนตามคำนำหน้าของเว็บนั้น | ต้องตรงกับที่ CSS ใช้ · ถูกอ้างถึงใน `_isNarrowNow` · `syncMobileClass` · `viewSwap` · `desktop-untouched-check` |
| **เงื่อนไข `wide` เขียนซ้ำ 2 ที่** | ควรรวมเป็นฟังก์ชันกลางตัวเดียวก่อนยกไป | ตอนนี้อยู่ที่ `syncMobileClass` และ `vals/derive.js` · คอมเมนต์เตือนเองว่า "แก้ที่หนึ่งต้องแก้อีกที่เสมอ ไม่งั้น CSS กับ JSX จะไม่ตรงกันแบบเงียบ ๆ" |
| **เลข `PULL_FIRE = 62` เขียนซ้ำ 3 ที่** | ทำเป็นค่าคงที่ตัวเดียวส่งต่อกัน | ตอนนี้อยู่ที่ `MedReturnApp.PULL_FIRE` · `renderPull` ใน `shell.jsx` · `pullReady`/`pullLabel` ใน `vals/shell.js` |
| **รายชื่อ state ใน `anyModalOpen`** | เขียนรายชื่อของเว็บนั้น — และควรเปลี่ยนเป็นให้ป๊อปลงทะเบียนตัวเองแทน | ตอนนี้ 14 ตัวเขียนตายตัว **2 ที่** (`vals/shell.js` + `MedReturnApp._syncModalFlag`) · ลืมที่ใดที่หนึ่ง = ฉากหลังเลื่อนได้ตอนเปิดป๊อปนั้น โดยไม่มีอะไรเตือน |
| **`_lockBody` คืนค่า scroll** | เว็บที่เลื่อนทั้งหน้าต้องใช้ `window.scrollTo(0, lockTop)` แทน `sc.scrollTop = lockTop` | เว็บนี้พื้นที่เลื่อนคือกล่องข้างใน ไม่ใช่ `body` |
| **`_pinLeft` และ `pageToTop`/`toTop`** | เว็บที่เลื่อนทั้งหน้าตัดบรรทัด `scrollRef` ออก เหลือ documentElement/body/window | ผูกกับ `app.scrollRef` ของเว็บนี้ |
| **กล่องนอกสุด `position:fixed`** | **ห้ามยกไปใช้กับหน้าที่ต้องเลื่อนทั้งหน้าตามปกติ** | `fixed` ถอนกล่องออกจากผังหน้า · ใช้ได้เฉพาะเว็บที่ทำตัวเหมือนแอป (ทั้งหน้าไม่เลื่อน มีแถบล่างตรึง) |
| **ปิดซูมด้วยนิ้ว** | เป็นการตัดสินใจเชิงนโยบาย ไม่ใช่เชิงเทคนิค | เว็บสาธารณะที่คนสายตายาวใช้ **ไม่ควรยก** — เจ้าของงานยืนยันเพราะเว็บนี้ใช้ในห้องยา ไม่ใช่เว็บสาธารณะ และช่องกรอกทุกช่องเป็น 16px แล้ว |
| **`toast` ห้ามปิดด้วยคีย์บอร์ด** | ทบทวนก่อนยก | ผูกกับเว็บที่มีเส้นทางกด Enter รัว ๆ (Enter 2 จังหวะคือเส้นทางหลักของหน้าบันทึก) |
| **ชิปแหล่งที่มาเตี้ย 30px** | ทบทวนก่อนยก | เตี้ยกว่าเกณฑ์ 44px โดยตั้งใจตามคำสั่งเจ้าของงาน · ยังใช้ได้เพราะกว้าง ~70px และไม่มีปุ่มติดกันในแนวตั้ง — ต้องเป็นการตัดสินใจที่ตั้งใจ ไม่ใช่ลืม |
| **ตารางชั้น `Z`** | ตัวเลขปรับได้ · **ลำดับห้ามสลับ** | ยืนยันต้องสูงกว่าหน้าต่างทุกตัวเสมอ · ปุ่มลอยต้องต่ำกว่าป๊อปที่ต่ำที่สุด |
| **`grab()` ในสคริปต์ตรวจ** | เขียนใหม่ตามโครงของเว็บนั้น | เดิน fiber tree หา `stateNode` ที่มีเมธอดชื่อ `persist` — ต้องเป็น class component และต้องมีเมธอดนั้น |
| **`mobile-bar-check.mjs`** | 🔴 **หาแถบด้วยข้อความ `'สะสมปีงบ'` ซึ่งถูกเอาออกไปแล้ว** — ต้องเปลี่ยนไปหาด้วย `ref`/`data-*`/`aria-label` | ตอนนี้รายงาน `แถบบันทึกกินที่ 0px (0%)` ทุกครั้งโดยไม่บอกว่าหาไม่เจอ |
| **`mobile-overlap-check.mjs`** | 🔴 **หาช่อง HN ด้วย `placeholder === 'ปล่อยว่างได้'` ซึ่งไม่มีอยู่แล้ว** (ของจริงคือ `'ไม่บังคับ'`) · และ `push()` ต้องรายงานเมื่อหาไม่เจอ ไม่ใช่ข้ามเงียบ ๆ | ตัวตรวจที่ตั้งใจตรวจ "HN ทับวันที่" กลับไม่ได้ตรวจ HN เลย |
| **`mobile-save-check.mjs`** | 🔴 **หาป๊อปด้วยข้อความ `'ยืนยันการบันทึก'` แต่ของจริงคือ `'ยืนยันบันทึกรายการยาคืน'`** (ไม่มี "การ") — ต้องเปลี่ยนไปอ่าน `app.state.confirm` แบบที่ `mobile-flow-check` ทำ | ตอนนี้รายงาน `🔴 ยังไม่มีอะไรเกิดขึ้น` ทุกครั้ง ทั้งที่ป๊อปขึ้นถูกต้องแล้ว |
| **สคริปต์ตรวจ 4 ใน 5 ตัวยังใช้ `wait(900)` ตายตัวรอหน้าล็อกอิน** | เปลี่ยนเป็น `waitForSelector` ให้ครบ (มีแค่ `mobile-shot.mjs` ที่แก้แล้ว) | หน้าล็อกอินโหลดฉากหลัง three.js ~600 KB ช้ากว่า 900ms บ่อย แล้วสคริปต์พังทั้งตัวทั้งที่เว็บปกติ |
| **`tap-check.mjs` ยังไม่รับ `process.env.PORT`** | เปลี่ยนให้ตรงกับอีก 30 ไฟล์ | ใช้ `PRINT_CHECK_URL || 'http://127.0.0.1:3000'` ตกหล่นจากการไล่แก้พอร์ต |
| **ป๊อปตัวกรองใช้ `82vh` แต่ป๊อปใส่จำนวนใช้ `88dvh`** | เลือกอย่างเดียวให้ทั้งเว็บ (ควรเป็น `dvh`) | **ยังไม่แน่ใจ**ว่าตั้งใจหรือเป็นความไม่สม่ำเสมอ — ไม่มีคอมเมนต์อธิบาย |
| **`--kb` ค่าตั้งต้น** | ตรวจว่ามี `--kb: 0px` ใน CSS ก่อนยก | `calc(var(--kb) * -1)` พังทั้งบรรทัดถ้ายังไม่มีค่า · **ยังไม่แน่ใจ**ว่าเว็บนี้ตั้งไว้ไหม ไม่ได้เปิด `app/globals.css` / `app/mobile.css` (อยู่นอกขอบเขตที่ได้รับมอบหมาย) |

---

## 🔴 ช่องว่างที่เว็บนี้ยังไม่ได้ทำ (อย่ายกไปเป็นแบบอย่าง)

| เรื่อง | สถานะ |
|---|---|
| **ปุ่มย้อนกลับของเบราว์เซอร์** | **ไม่มีการจัดการเลย** — ค้น `popstate` · `pushState` · `replaceState` · `window.history` · `hashchange` ทั้ง `components/` `app/` `lib/` ได้ผลลัพธ์ว่างเปล่า · กดย้อนกลับตอนเปิดป๊อป = ออกจากเว็บไปเลย ป๊อปไม่ได้ปิดก่อน · **ยังไม่แน่ใจ**ว่าเจ้าของงานเคยตัดสินใจเรื่องนี้ไว้หรือไม่ ไม่พบคอมเมนต์หรือบันทึกใดที่พูดถึง |
| **การจับท่าลากปิดป๊อป (swipe to dismiss)** | **ไม่มี** — แถบขีดเทาบนป๊อปทั้ง 3 ตัวเป็นแค่รูป ไม่มี touch handler |
| **เลื่อนไปหาช่องที่กรอกไม่ครบ (`scrollIntoView`)** | ทั้งเว็บมี `scrollIntoView` **จุดเดียว** คือ `MedReturnApp.jsx:426` ซึ่งใช้กับผลค้นหาตอนกดลูกศร (`block:'nearest'`) ไม่ใช่การกรอกฟอร์ม · เส้นทาง `pcuSiteMissing` ขึ้นข้อความอย่างเดียว ไม่ได้เปิดหรือเลื่อนไปหาช่อง — **ยังไม่แน่ใจ**ว่าตั้งใจหรือตกหล่น |
| **สคริปต์ตรวจ 3 ใน 5 ตัวหาชิ้นด้วยข้อความไทยที่ล้าสมัยแล้ว** | ดูตาราง ข — ทั้ง 3 เป็น "ตัวตรวจที่โกหก" ในสภาพปัจจุบัน |

---

## หมายเหตุขอบเขต

- อ่านครบทุกบรรทัดรวมคอมเมนต์: `components/MedReturnApp.jsx` (1073) · `components/shell.jsx` (179) · `components/pages/nav.jsx` (144) · `components/pages/sheet.jsx` (92) · `scripts/mobile-bar-check.mjs` · `mobile-flow-check.mjs` · `mobile-overlap-check.mjs` · `mobile-save-check.mjs` · `mobile-shot.mjs`
- อ่านเฉพาะส่วนที่แตะมือถือ: `components/pages/record.jsx` (ช่วง `renderRecordNarrow` 113-372 และ `renderSaveBar` 834-884) · `components/pages/history.jsx` (แผ่นตัวกรอง 219-270) · `components/pages/lots.jsx` (แผ่นตัวกรอง 100-175) · `components/handlers/ui.js` (ทั้งไฟล์) · `components/handlers/record.js` (ช่วง 250-620) · `components/vals/derive.js` (ทั้งไฟล์) · `components/vals/shell.js` (ทั้งไฟล์) · `components/helpers.js` (ตาราง `Z` และค่าคงที่)
- อ่านหัวไฟล์ (32 บรรทัดแรก): `scripts/desktop-untouched-check.mjs` · `ios-zoom-check.mjs` · `drag-proof.mjs` · `overflow-check.mjs` · `parked-width-check.mjs` · `tap-check.mjs`
- `CLAUDE.md` ของโปรเจกต์ — หัวข้อที่เกี่ยวกับมือถือ (3.55 · 3.61 · 3.63 · 3.64 · 3.65 · 3.66 · 3.67 · 3.68 · 3.69 · 3.72 · 3.73 · 3.74 · 3.76)
- **ไม่ได้อ่าน** `app/mobile.css` และ `app/globals.css` — เป็นฝั่ง CSS ซึ่งอยู่นอกขอบเขตของงานนี้ (ตัวที่ 2 จาก 2 = ฝั่งพฤติกรรม JS)
- **ไม่ได้รันสคริปต์ใดเลย** ตามข้อห้าม · ทุกข้อสรุปมาจากการอ่านโค้ด · จุดที่ยืนยันไม่ได้เขียนกำกับว่า "ยังไม่แน่ใจ" ไว้ทุกจุด
- **ไม่ได้แก้ไฟล์ใดในโปรเจกต์แม้แต่ไฟล์เดียว**
