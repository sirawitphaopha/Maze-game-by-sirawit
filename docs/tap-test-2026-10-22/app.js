/* หน้าทดลองกด · หน้าเล่นเกมมือถือของ Maze Lab (หน้าตากับตัวเกมจริง) + ตัวจดทุกจุดที่นิ้วแตะ
   ตัวเกม (สร้างวงกต เดิน ปักธง วาด) มาจาก lib/ ของเว็บจริงผ่าน window.MZ · ปุ่มลูกศรคิดทิศแบบเดียวกับ components/game/DPad.tsx
   ทุกการแตะจดลงที่เก็บของหน้านี้ (db) ให้แคลร์อ่านทีหลัง · เปิดดูจุดที่กดได้จากปุ่มตั้งค่า */
(function () {
  "use strict";
  var MZ = window.MZ;
  var D = document, root = D.documentElement;
  root.lang = "th";
  var mq = matchMedia("(max-width: 759px)");
  var setMobile = function () { root.classList.toggle("mz-mobile", mq.matches); };
  setMobile();
  mq.addEventListener("change", setMobile);
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };

  // ── ลิงก์ในหน้าไม่พาไปไหน (หน้านี้มีแค่หน้าเล่นเกม)
  D.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a"); if (a) e.preventDefault(); }, true);

  // ── ความสูงแถบบน (แบบ components/ui/TopBar.tsx)
  var bar = $(".appbar");
  var putBar = function () { root.style.setProperty("--bar-h", Math.ceil(bar.getBoundingClientRect().height) + "px"); };
  // วัดรวมขอบใน · แถบบนเว้นขอบบนของเครื่องด้วย padding ซึ่งมาทีหลังได้ (แอป Claude สลับเป็นเต็มจอหลังเปิดหน้า แถบสูง 45 เป็น 119)
  // วัดแค่เนื้อในแล้ว --bar-h ค้าง 45 หน้ายาวเกินจอ 40 จุด (ผลกดรอบสอง) · เว็บจริงแก้แบบเดียวกันใน components/ui/TopBar.tsx
  new ResizeObserver(putBar).observe(bar, { box: "border-box" });
  putBar();

  var fmt = function (ms) { var t = Math.floor(ms / 100), d = t % 10, s = Math.floor(t / 10) % 60, m = Math.floor(t / 600); return m + ":" + String(s).padStart(2, "0") + "." + d; };
  var th = function (v) { return Math.round(v).toLocaleString("th-TH"); };
  var reduced = function () { return matchMedia("(prefers-reduced-motion: reduce)").matches; };

  var LEVELS = { easy: 10, mid: 18, hard: 28, hell: 40 }, LV_IDS = ["easy", "mid", "hard", "hell"];
  var S = { level: "mid", algo: "wilson", minLen: MZ.LV_MINL.mid, loops: 0, fog: false };

  var page = $(".playpage"), stage = $(".stage"), cv = $("canvas.board"), statusEl = $(".status");
  var hudTime = $$(".hud b")[0], hudSteps = $$(".hud b")[1];
  var startcover = $(".startcover"), dpad = $(".dpad"), dbtns = $$(".dbtn", dpad);
  var fbtns = $$(".flagrow .fbtn"), pauseBtn = fbtns[2], pauseHTML = pauseBtn.innerHTML;
  var playSvg = $(".startcover .btn svg").outerHTML;
  var FB_NAMES = ["ปักธง", "กลับธง", "พัก", "ตั้งค่า"];
  var DIR_TH = { u: "ขึ้น", d: "ลง", l: "ซ้าย", r: "ขวา" };

  var G = null, armed = false, held = false, away = false, msgT = 0, lastTap = null;

  var locked = function () { return root.classList.contains("mz-mobile") && !armed && G && G.status === "ready"; };

  function draw() {
    if (!G) return;
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    MZ.drawGame(ctx, MZ.fitCanvas(cv, ctx), { G: G, sol: null, fog: false, now: performance.now(), pulse: !reduced() });
  }
  function setStatus(t) { statusEl.textContent = t; }
  function say(t) {
    setStatus(t);
    clearTimeout(msgT);
    msgT = setTimeout(function () { if (G && G.status === "play") setStatus(""); }, 2600);
  }
  function sync() {
    hudSteps.textContent = th(G ? G.steps : 0);
    page.classList.toggle("locked", !!locked());
    var awayNow = away && !held && G && G.status === "play";
    page.classList.toggle("away", !!awayNow);
    var ac = $(".awaycover", stage);
    if (awayNow && !ac) {
      ac = D.createElement("div");
      ac.className = "awaycover";
      ac.hidden = true;
      ac.innerHTML = '<button type="button" class="btn primary">' + playSvg + "เล่นต่อ</button><span>หยุดเวลาไว้ระหว่างที่ไม่ได้ดูหน้านี้</span>";
      $("button", ac).addEventListener("click", resumeAway);
      stage.appendChild(ac);
    } else if (!awayNow && ac) ac.remove();
    var pc = $(".pausecover", stage);
    if (held && !pc) {
      pc = D.createElement("div");
      pc.className = "pausecover";
      pc.setAttribute("role", "dialog");
      pc.setAttribute("aria-label", "พักเกม");
      pc.innerHTML = '<b>พักเกมไว้</b><span>เวลาไม่เดินระหว่างนี้ ซ่อนเขาวงกตไว้ระหว่างพัก</span><button type="button" class="btn primary">' + playSvg + "เล่นต่อ</button>";
      $("button", pc).addEventListener("click", function () { setHold(false); });
      stage.appendChild(pc);
    } else if (!held && pc) pc.remove();
    pauseBtn.setAttribute("aria-pressed", held ? "true" : "false");
    pauseBtn.disabled = !held && !(G && G.status === "play");
    pauseBtn.innerHTML = held ? playSvg + "เล่นต่อ" : pauseHTML;
    draw();
  }

  function newLevel() {
    G = MZ.newGame(S, MZ.makeLevel(S));
    armed = false; held = false; away = false;
    setStatus("");
    hudTime.textContent = fmt(0);
    if (!startcover.isConnected) stage.insertBefore(startcover, cv.nextSibling);
    sync();
    snapLayout("ด่านใหม่");
  }
  function start() { armed = true; startcover.remove(); note("เริ่มเกม"); sync(); snapLayout("เริ่มเกม"); }
  $(".btn", startcover).addEventListener("click", start);

  function onWin() {
    var g = G;
    newLevel();
    setStatus("ออกจากเขาวงกตได้แล้ว " + th(g.steps) + " ก้าว " + fmt(g.el) + " · ด่านใหม่พร้อมแล้ว");
    note("ชนะ");
  }

  function doMove(d) {
    if (!G || held || locked()) return false;
    var wasReady = G.status === "ready", wasPaused = G.pausedAt !== null;
    var r = MZ.move(G, d, performance.now());
    if (!r.moved) return false;
    if (wasReady || wasPaused) { setStatus(""); away = false; }
    if (r.won) { onWin(); return true; }
    sync();
    return true;
  }
  function doFlag() {
    if (!G || held || locked() || !MZ.setFlag(G, performance.now())) { note("ไม่มีผล"); return; }
    say("ปักธงแล้ว หากพบทางตันให้กดกลับไปที่ธง");
    note("ปักธง");
    sync();
  }
  function doBack() {
    if (!G || held || locked()) { note("ไม่มีผล"); return; }
    var r = MZ.backToFlag(G, performance.now());
    if (r === "noflag") { say("ยังไม่ได้ปักธง ควรปักไว้ที่ทางแยกก่อน"); note("ยังไม่ได้ปักธง"); return; }
    if (r !== "ok") { note(r === "same" ? "อยู่ที่ธงแล้ว" : "ไม่มีผล"); return; }
    say("กลับมาที่ธงแล้ว วาร์ปไม่นับก้าว");
    note("กลับธง");
    sync();
  }
  function setHold(on) {
    if (!G) return;
    var now = performance.now();
    if (on) {
      if (G.status !== "play") return;
      MZ.pause(G, now);
      hudTime.textContent = fmt(MZ.clock(G, now));
      setStatus("พักเกมไว้ เวลาไม่เดิน กดเล่นต่อเมื่อพร้อม");
    } else {
      if (!held) return;
      MZ.resume(G, now);
      setStatus("");
    }
    held = on;
    away = false;
    sync();
  }
  function resumeAway() {
    if (!G) return;
    var now = performance.now();
    MZ.resume(G, now);
    hudTime.textContent = fmt(MZ.clock(G, now));
    setStatus("");
    away = false;
    note("เล่นต่อ");
    sync();
  }
  fbtns[0].addEventListener("click", doFlag);
  fbtns[1].addEventListener("click", doBack);
  pauseBtn.addEventListener("click", function () { setHold(!held); note(held ? "พัก" : "เล่นต่อ"); });

  D.addEventListener("visibilitychange", function () {
    if (D.visibilityState === "hidden") {
      if (G && MZ.pause(G, performance.now())) { setStatus("หยุดเวลาไว้ระหว่างที่ไม่ได้ดูหน้านี้ กดเดินเพื่อเล่นต่อ"); away = true; sync(); }
      flush(true);
    }
  });

  // ── นาฬิกากับตัวผู้เล่นกะพริบ (แบบหน้าเล่นเกมจริง)
  setInterval(function () { if (G && G.status === "play" && G.pausedAt === null) hudTime.textContent = fmt(MZ.clock(G, performance.now())); }, 100);
  (function () {
    var last = 0;
    var tick = function (t) {
      requestAnimationFrame(tick);
      if (t - last < 50) return;
      last = t;
      if (!G || (G.status !== "ready" && G.status !== "play") || held || D.hidden || reduced()) return;
      draw();
    };
    requestAnimationFrame(tick);
  })();
  new ResizeObserver(function () { requestAnimationFrame(draw); }).observe(cv);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { requestAnimationFrame(draw); });
  new MutationObserver(function () { requestAnimationFrame(draw); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  // ── ปุ่มลูกศร (เหมือน components/game/DPad.tsx ทุกจังหวะ) ทั้งกรอบกดได้ ทิศจากมุมรอบจุดกลาง กลาง 8 จุดไม่นับ
  //    กดค้างเกิน 280 มิลลิวินาทีเดินต่อทุก 110 · ตัวรับการแตะเปล่าแบบที่ React ใส่ให้ (onclick)
  var pd = { d: null, pid: null, to: 0, iv: 0 };
  var stopTimers = function () { clearTimeout(pd.to); clearInterval(pd.iv); pd.to = 0; pd.iv = 0; };
  var dirAt = function (e) {
    var r = dpad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : dy > 0 ? "d" : "u";
  };
  var showDir = function (d) { dbtns.forEach(function (b, i) { b.classList.toggle("on", d === ["u", "l", "d", "r"][i]); }); };
  var press = function (d) {
    if (d === pd.d) return;
    stopTimers();
    pd.d = d;
    showDir(d);
    if (!d) return;
    // แตะลูกศรครั้งแรกก่อนกดเริ่มเกม เริ่มเกมให้เองแล้วเดินเลย (padMove ใน components/game/GameView.tsx)
    var wasLocked = locked(), wasHeld = held;
    if (wasLocked) { armed = true; startcover.remove(); }
    var ok = doMove(d);
    if (wasLocked) sync();
    note((wasLocked ? "เริ่มเกมด้วยลูกศร " : "") + (ok ? "เดิน" + DIR_TH[d] : wasHeld ? "พักเกมอยู่" : "ชนกำแพง" + DIR_TH[d]), d);
    pd.to = setTimeout(function () { pd.iv = setInterval(function () { if (doMove(d) && lastTap) lastTap.m = (lastTap.m || 0) + 1; }, 110); }, 280);
  };
  var release = function () { stopTimers(); pd.d = null; pd.pid = null; showDir(null); };
  dpad.addEventListener("pointerdown", function (e) { e.preventDefault(); pd.pid = e.pointerId; try { dpad.setPointerCapture(e.pointerId); } catch (x) { /* ไม่เป็นไร */ } press(dirAt(e)); });
  dpad.addEventListener("pointermove", function (e) { if (e.pointerId === pd.pid) press(dirAt(e)); });
  dpad.addEventListener("pointerup", function (e) { if (e.pointerId === pd.pid) release(); });
  dpad.addEventListener("pointercancel", function (e) { if (e.pointerId === pd.pid) release(); });
  dpad.addEventListener("lostpointercapture", function (e) { if (e.pointerId === pd.pid) release(); });
  dpad.onclick = function () {};

  // ── ลากนิ้วบนวงกต (แบบ follow ใน components/game/GameView.tsx)
  var dragging = false;
  var follow = function (e) {
    var g = G;
    if (!g || locked()) return;
    var t = MZ.cellAt(cv, g.n, e.clientX, e.clientY);
    if (t < 0 || t === g.pos) return;
    var dirTo = function (a, b) { return b - a === 1 ? "r" : b - a === -1 ? "l" : b - a === g.n ? "d" : "u"; };
    var prev = new Map([[g.pos, -1]]), layer = [g.pos], sp = null;
    for (var d = 0; d < 2 && layer.length && !sp; d++) {
      var next = [];
      for (var i = 0; i < layer.length && !sp; i++) {
        var nb = MZ.openNb(layer[i], g.n, g.R, g.B);
        for (var j = 0; j < nb.length; j++) {
          var q = nb[j];
          if (prev.has(q)) continue;
          prev.set(q, layer[i]);
          if (q === t) { var p = [], x = q; while (x !== g.pos) { p.unshift(x); x = prev.get(x); } sp = p; break; }
          next.push(q);
        }
      }
      layer = next;
    }
    var moved = 0;
    if (sp) { for (var k = 0; k < sp.length; k++) { if (!doMove(dirTo(G.pos, sp[k]))) break; moved++; } }
    else {
      for (var s = 0; s < g.n * 2 && g.pos !== t; s++) {
        var px = g.pos % g.n, py = (g.pos / g.n) | 0, ddx = (t % g.n) - px, ddy = ((t / g.n) | 0) - py;
        var h = ddx > 0 ? "r" : "l", v = ddy > 0 ? "d" : "u";
        var order = Math.abs(ddx) >= Math.abs(ddy) ? [ddx && h, ddy && v] : [ddy && v, ddx && h];
        var ok = false;
        for (var o = 0; o < order.length; o++) if (order[o] && MZ.canMove(g, g.pos, order[o]) && doMove(order[o])) { ok = true; moved++; break; }
        if (!ok) break;
      }
    }
    if (moved && lastTap && lastTap.z === "วงกต") { lastTap.m = (lastTap.m || 0) + moved; lastTap.r = "เดินตามนิ้ว"; }
  };
  cv.addEventListener("pointerdown", function (e) { if (locked()) return; dragging = true; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ไม่เป็นไร */ } follow(e); });
  cv.addEventListener("pointermove", function (e) { if (dragging) follow(e); });
  cv.addEventListener("pointerup", function () { dragging = false; });
  cv.addEventListener("pointercancel", function () { dragging = false; });

  // ── แป้นพิมพ์ (ลองบนคอม)
  D.addEventListener("keydown", function (e) {
    var k = { ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" }[e.code];
    if (k) { e.preventDefault(); doMove(k); } else if (e.code === "KeyF") doFlag(); else if (e.code === "KeyR") doBack();
  });

  // ── แผ่นตั้งค่า (ปุ่มตั้งค่า) · ระดับ ด่านใหม่ ปิด · ส่วนทดลองกดอยู่บนสุดของแผ่น
  var sheetBack = null;
  var openSheet = function () { page.dataset.sheet = "set"; if (!sheetBack) { sheetBack = D.createElement("div"); sheetBack.className = "msheet-back"; sheetBack.setAttribute("aria-hidden", "true"); sheetBack.addEventListener("click", closeSheet); } page.appendChild(sheetBack); renderSum(); };
  var closeSheet = function () { delete page.dataset.sheet; if (sheetBack) sheetBack.remove(); };
  fbtns[3].addEventListener("click", function () { note("เปิดแผ่นตั้งค่า"); openSheet(); });
  var xbtn = $(".msheet-top .iconbtn"); if (xbtn) xbtn.addEventListener("click", closeSheet);
  var segBtns = $$(".pg-set .seg4 button"), lvLabel = $(".pg-set .ptitle b");
  segBtns.forEach(function (b, i) {
    b.addEventListener("click", function () {
      S.level = LV_IDS[i]; S.minLen = MZ.LV_MINL[S.level];
      segBtns.forEach(function (x, j) { x.setAttribute("aria-pressed", j === i ? "true" : "false"); });
      if (lvLabel) lvLabel.textContent = LEVELS[S.level] + " × " + LEVELS[S.level] + " ช่อง";
      note("เปลี่ยนระดับ");
      newLevel();
    });
  });
  var algoSel = $("#galgo"); if (algoSel) algoSel.value = S.algo;
  var newBtn = $(".pg-set > .row .btn.primary"); if (newBtn) newBtn.addEventListener("click", function () { closeSheet(); newLevel(); });

  // ════════ ตัวจดจุดที่กด ════════
  var SID = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  var started = new Date().toISOString(), T0 = performance.now();
  var part = 1, taps = [], all = [], layouts = [];
  var rect = function (el) { var r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  var probe = D.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none";
  D.body.appendChild(probe);
  var inset = function (side) { probe.style.height = "env(safe-area-inset-" + side + ", 0px)"; return Math.round(probe.getBoundingClientRect().height); };
  var rawDvh = function () { probe.style.height = "100dvh"; return Math.round(probe.getBoundingClientRect().height); };
  function snapLayout(why) {
    if (!dpad) return;
    var L = {
      t: Math.round(performance.now() - T0), why: why, vw: innerWidth, vh: innerHeight, sy: Math.round(scrollY), lv: S.level,
      safe: { t: inset("top"), b: inset("bottom") }, dvh: rawDvh(), docH: root.scrollHeight,
      dpad: rect(dpad), btn: dbtns.map(rect), hub: rect($(".dhub")), flag: fbtns.map(rect), board: rect(cv), bar: rect(bar),
    };
    var prev = layouts[layouts.length - 1];
    var same = prev && JSON.stringify([prev.vw, prev.vh, prev.sy, prev.dpad, prev.btn, prev.flag, prev.board]) === JSON.stringify([L.vw, L.vh, L.sy, L.dpad, L.btn, L.flag, L.board]);
    if (!same) { layouts.push(L); dirty(); }
  }
  addEventListener("resize", function () { setTimeout(function () { snapLayout("หน้าจอเปลี่ยนขนาด"); drawOverlay(); }, 150); });
  var scT = 0;
  addEventListener("scroll", function () { clearTimeout(scT); scT = setTimeout(function () { snapLayout("เลื่อนหน้า"); drawOverlay(); }, 250); }, { passive: true });
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { setTimeout(function () { snapLayout("ฟอนต์โหลดเสร็จ"); }, 50); });

  var nameOf = function (el) {
    var i = fbtns.indexOf(el);
    return i >= 0 ? FB_NAMES[i] : (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 20);
  };
  var distTo = function (x, y, el) { var q = el.getBoundingClientRect(); return Math.hypot(Math.max(q.left - x, 0, x - q.right), Math.max(q.top - y, 0, y - q.bottom)); };
  var refBtn = function (x, y) {
    var best = null, bd = 1e9;
    dbtns.concat(fbtns).forEach(function (b) { var dd = distTo(x, y, b); if (dd < bd) { bd = dd; best = b; } });
    return bd <= 160 ? best : null;
  };
  var nearest = function (x, y) {
    var best = null, bd = 1e9;
    dbtns.concat(fbtns).forEach(function (b) { var dd = distTo(x, y, b); if (dd < bd) { bd = dd; best = b; } });
    return { b: best ? nameOf(best) : "", e: Math.round(bd) };
  };
  function classify(e) {
    var x = e.clientX, y = e.clientY, el = e.target, c = el.closest ? el : el.parentElement;
    var inDpad = c.closest(".dpad");
    if (inDpad) {
      var dir = dirAt(e), inBtn = null;
      dbtns.forEach(function (b) { if (distTo(x, y, b) === 0) inBtn = b.getAttribute("aria-label"); });
      if (inBtn) return { z: "ปุ่มลูกศร", b: inBtn };
      var n = nearest(x, y);
      return { z: dir ? "ข้างปุ่มลูกศร" : "กลางปุ่มลูกศร", b: n.b, e: n.e };
    }
    var fb = c.closest(".fbtn");
    if (fb) return { z: "ปุ่มแถวล่าง", b: nameOf(fb), x: fb.disabled ? 1 : 0 };
    if (c.closest("canvas.board")) return { z: "วงกต" };
    if (c.closest(".startcover")) return { z: "ปุ่มเริ่มเกม" };
    if (c.closest(".awaycover, .pausecover")) return { z: "แผ่นทับวงกต" };
    if (c.closest(".tapchip")) return { z: "ป้ายจุดที่กด" };
    if (c.closest(".pg-set, .msheet-back")) return { z: "แผ่นตั้งค่า" };
    if (c.closest(".appbar")) return { z: "แถบบน" };
    var n2 = nearest(x, y);
    var where = c.closest(".pg-hud") ? "แถวเวลา" : c.closest(".pg-board") ? "ขอบกรอบวงกต" : c.closest(".pg-ctrl") ? "ช่องว่างในก้อนปุ่ม" : "ที่ว่าง";
    return { z: "ไม่โดนอะไร", w: where, b: n2.b, e: n2.e };
  }
  var GAME_ZONES = { "ปุ่มลูกศร": 1, "ข้างปุ่มลูกศร": 1, "กลางปุ่มลูกศร": 1, "ปุ่มแถวล่าง": 1, "วงกต": 1, "ไม่โดนอะไร": 1, "ปุ่มเริ่มเกม": 1, "แผ่นทับวงกต": 1 };
  var downAt = {};
  D.addEventListener("pointerdown", function (e) {
    var k = classify(e);
    var tap = { t: Math.round(performance.now() - T0), x: Math.round(e.clientX), y: Math.round(e.clientY), z: k.z, p: e.pointerType || "" };
    // ตำแหน่งนิ้วเทียบกลางปุ่มที่โดนหรือใกล้สุด วัดจากกรอบจริงตอนแตะ (รอบแรกเทียบกับตำแหน่งที่จดตอนเปิดหน้า ซึ่งเพี้ยนเมื่อหน้าเลื่อนหรือฟอนต์โหลดเสร็จทีหลัง)
    var ref = refBtn(e.clientX, e.clientY);
    if (ref) { var q = ref.getBoundingClientRect(); tap.ox = Math.round(e.clientX - (q.left + q.width / 2)); tap.oy = Math.round(e.clientY - (q.top + q.height / 2)); tap.bw = Math.round(q.width); tap.bh = Math.round(q.height); tap.rb = nameOf(ref); }
    if (scrollY) tap.sy = Math.round(scrollY);
    if (k.b) tap.b = k.b;
    if (k.e !== undefined) tap.e = k.e;
    if (k.w) tap.w = k.w;
    if (k.x) tap.dis = 1;
    if (layouts.length) tap.L = layouts.length - 1;
    lastTap = tap;
    downAt[e.pointerId] = { tap: tap, x: e.clientX, y: e.clientY, t: performance.now() };
    taps.push(tap); all.push(tap);
    dirty();
    drawOverlay();
    renderChip();
  }, true);
  var endTap = function (e, cancel) {
    var d = downAt[e.pointerId];
    if (!d) return;
    delete downAt[e.pointerId];
    var tap = d.tap;
    tap.h = Math.round(performance.now() - d.t);
    var mv = Math.round(Math.hypot(e.clientX - d.x, e.clientY - d.y));
    if (mv > 6) tap.s = mv;
    if (cancel) tap.c = 1;
    // ปุ่มทำงานตอน click ซึ่งมาหลัง pointerup · รอให้ปุ่มจดผลก่อน แล้วค่อยตัดสินว่าไม่มีผล
    setTimeout(function () { if (!tap.r) tap.r = "ไม่มีผล"; dirty(); renderChip(); }, 80);
  };
  D.addEventListener("pointerup", function (e) { endTap(e, false); }, true);
  D.addEventListener("pointercancel", function (e) { endTap(e, true); }, true);
  function note(r) { if (lastTap && !lastTap.r) lastTap.r = r; }

  // ── ที่เก็บ (db) · เอกสารเดียวต่อรอบเปิดหน้า taps/<รหัสรอบ> · เกิน 900 ครั้งขึ้นเอกสารใหม่ (-2 -3 ...)
  var db = null, writing = false, pending = false, wt = 0, saveMsg = "กำลังเชื่อมที่เก็บ";
  var setSave = function (m) { saveMsg = m; var el = $("#tapSave"); if (el) el.textContent = m; };
  function dirty() { pending = true; clearTimeout(wt); wt = setTimeout(function () { flush(false); }, 1200); }
  function body() {
    return {
      app: "maze-lab-tap-test", ver: 6, sid: SID, part: part, started: started, saved: new Date().toISOString(),
      ua: navigator.userAgent, dpr: devicePixelRatio || 1, screen: { w: screen.width, h: screen.height },
      standalone: matchMedia("(display-mode: standalone)").matches,
      layouts: layouts, n: taps.length, taps: taps,
    };
  }
  function flush(now) {
    if (!db || writing || !pending) return;
    clearTimeout(wt);
    writing = true; pending = false;
    var id = SID + (part > 1 ? "-" + part : "");
    db.doc("taps/" + id).set(body()).then(function () {
      setSave("บันทึกแล้ว " + all.length + " ครั้ง (รอบนี้ " + SID + ")");
      if (taps.length >= 900) { part++; taps = []; }
    }, function (err) {
      var code = err && err.code;
      setSave("บันทึกไม่สำเร็จ" + (code ? " (" + code + ")" : "") + " จุดที่กดยังอยู่ในหน้านี้");
      if (code === "unavailable" || code === "resource_exhausted") { pending = true; setTimeout(function () { flush(false); }, 2000 + Math.random() * 1500); }
    }).then(function () {
      writing = false;
      if (pending && !now) dirty();
    });
  }
  addEventListener("pagehide", function () { flush(true); });
  (window.claude && window.claude.use ? window.claude.use("db") : Promise.resolve(null)).then(function (x) {
    db = x;
    if (!db) { setSave("บันทึกลงที่เก็บไม่ได้ในมุมมองนี้ ดูจุดที่กดได้ในหน้านี้เท่านั้น"); return; }
    setSave("พร้อมบันทึก");
    pending = true;
    flush(false);
  }, function () { setSave("บันทึกลงที่เก็บไม่ได้ในมุมมองนี้ ดูจุดที่กดได้ในหน้านี้เท่านั้น"); });

  // ── ดูจุดที่กด · แผ่นใสทับทั้งจอ นิ้วทะลุ เล่นต่อได้ จุดใหม่ขึ้นทันที
  var COLORS = { "ปุ่มลูกศร": "--b1", "ข้างปุ่มลูกศร": "--front", "กลางปุ่มลูกศร": "--danger", "ปุ่มแถวล่าง": "--accent", "วงกต": "--b3", "ไม่โดนอะไร": "--danger" };
  var ov = D.createElement("canvas"); ov.className = "tapov"; ov.hidden = true; D.body.appendChild(ov);
  var chip = D.createElement("button"); chip.type = "button"; chip.className = "tapchip"; chip.hidden = true; D.body.appendChild(chip);
  chip.addEventListener("click", function () { showOv(false); });
  var tok = function (v) { return getComputedStyle(root).getPropertyValue(v).trim() || "#888"; };
  function showOv(on) { ov.hidden = !on; chip.hidden = !on; drawOverlay(); renderChip(); }
  // พื้นที่กดได้ระบายสี (พี่กันสั่ง 22 ต.ค. 2569 "ไฮไลต์หน่อย ว่าพื้นที่ที่กดได้ มันอยู่ตรงไหนได้")
  // ปุ่มเดิน ทั้งกรอบรับนิ้ว แบ่งทิศด้วยเส้นเฉียง 45 องศาจากจุดกลาง (แบบ dirAt) ไม่ใช่เส้นถึงมุมกรอบ · กลาง 16 × 16 จุดไม่นับ
  // ปุ่มแถวล่าง เฉพาะตัวปุ่ม · วงกต ลากนิ้วเดิน (หลังเริ่มเกม) · ที่ไม่ระบายสีคือแตะแล้วไม่มีอะไรเกิด
  function drawZones(ctx) {
    var r = dpad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, F = 3000;
    var zone = function (pts, col) {
      ctx.save();
      ctx.beginPath(); ctx.rect(r.left, r.top, r.width, r.height); ctx.clip();
      ctx.beginPath(); ctx.moveTo(cx, cy);
      pts.forEach(function (p) { ctx.lineTo(cx + p[0] * F, cy + p[1] * F); });
      ctx.closePath();
      ctx.globalAlpha = 0.28; ctx.fillStyle = tok(col); ctx.fill();
      ctx.restore();
    };
    zone([[-1, -1], [1, -1]], "--c1-bar");
    zone([[1, -1], [1, 1]], "--c4-bar");
    zone([[1, 1], [-1, 1]], "--c3-bar");
    zone([[-1, 1], [-1, -1]], "--c5-bar");
    ctx.globalAlpha = 0.85; ctx.fillStyle = tok("--danger"); ctx.fillRect(cx - 8, cy - 8, 16, 16); ctx.globalAlpha = 1;
    // เส้นแบ่งทิศ
    ctx.save(); ctx.beginPath(); ctx.rect(r.left, r.top, r.width, r.height); ctx.clip();
    ctx.strokeStyle = tok("--ink"); ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx - F, cy - F); ctx.lineTo(cx + F, cy + F); ctx.moveTo(cx + F, cy - F); ctx.lineTo(cx - F, cy + F); ctx.stroke();
    ctx.restore(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    fbtns.forEach(function (b) { var q = b.getBoundingClientRect(); ctx.globalAlpha = 0.22; ctx.fillStyle = tok("--accent"); ctx.fillRect(q.left, q.top, q.width, q.height); ctx.globalAlpha = 1; });
    var bq = cv.getBoundingClientRect();
    ctx.globalAlpha = 0.16; ctx.fillStyle = tok("--b3"); ctx.fillRect(bq.left, bq.top, bq.width, bq.height); ctx.globalAlpha = 1;
    var label = function (t, x, y) {
      ctx.font = "600 13px Sarabun, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = tok("--surface"); ctx.strokeText(t, x, y);
      ctx.fillStyle = tok("--ink"); ctx.fillText(t, x, y);
    };
    // ป้ายวางในพื้นที่ของทิศนั้น ไม่ทับตัวปุ่ม (ขึ้นลงอยู่ซ้ายของปุ่ม ซ้ายขวาอยู่เหนือปุ่ม)
    label("กดขึ้น", cx - 100, r.top + 14);
    label("กดลง", cx - 100, r.bottom - 14);
    label("กดซ้าย", r.left + 26, cy - 62);
    label("กดขวา", r.right - 26, cy - 62);
    label("ไม่นับ", cx, cy + 32);
    label("ลากนิ้วบนวงกต (หลังเริ่มเกม)", bq.left + bq.width / 2, bq.bottom - 14);
  }
  function drawOverlay() {
    if (ov.hidden) return;
    var dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
    if (ov.width !== Math.round(W * dpr) || ov.height !== Math.round(H * dpr)) { ov.width = Math.round(W * dpr); ov.height = Math.round(H * dpr); }
    var ctx = ov.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawZones(ctx);
    // กรอบปุ่มที่มองเห็น (เส้นทึบ) กับกรอบรับนิ้ว (เส้นประ) ตามหน้าจอตอนนี้
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = tok("--muted");
    ctx.setLineDash([5, 4]);
    var r = dpad.getBoundingClientRect(); ctx.strokeRect(r.left + 0.5, r.top + 0.5, r.width - 1, r.height - 1);
    ctx.setLineDash([]);
    dbtns.concat(fbtns).forEach(function (b) { var q = b.getBoundingClientRect(); ctx.strokeRect(q.left + 0.5, q.top + 0.5, q.width - 1, q.height - 1); });
    all.forEach(function (t, i) {
      if (!COLORS[t.z]) return;
      var col = tok(COLORS[t.z]), last = i === all.length - 1;
      ctx.beginPath(); ctx.arc(t.x, t.y, last ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.globalAlpha = 0.78; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = last ? 2.5 : 1; ctx.strokeStyle = tok("--surface"); ctx.stroke();
    });
  }
  function counts() {
    var c = {};
    all.forEach(function (t) { c[t.z] = (c[t.z] || 0) + 1; });
    return c;
  }
  function renderChip() {
    if (chip.hidden) return;
    var c = counts();
    chip.innerHTML = '<span><i style="background:var(--b1)"></i>ตรงปุ่ม ' + ((c["ปุ่มลูกศร"] || 0) + (c["ปุ่มแถวล่าง"] || 0)) + '</span><span><i style="background:var(--front)"></i>ข้างปุ่ม ' + (c["ข้างปุ่มลูกศร"] || 0) + '</span><span><i style="background:var(--danger)"></i>ไม่ติด ' + ((c["ไม่โดนอะไร"] || 0) + (c["กลางปุ่มลูกศร"] || 0)) + "</span><b>ปิด</b>";
  }
  var showBtn = $("#tapShow"); if (showBtn) showBtn.addEventListener("click", function () { closeSheet(); showOv(true); });
  function renderSum() {
    var el = $("#tapSum"); if (!el) return;
    var c = counts(), nGame = 0;
    Object.keys(c).forEach(function (k) { if (GAME_ZONES[k]) nGame += c[k]; });
    $("#tapN").textContent = th(nGame) + " ครั้ง";
    var rows = [["ปุ่มลูกศร", "ตรงตัวปุ่มลูกศร"], ["ข้างปุ่มลูกศร", "ข้างปุ่มลูกศร (พื้นที่กดที่ขยายไว้)"], ["กลางปุ่มลูกศร", "วงกลมกลาง (ไม่เดิน)"], ["ปุ่มแถวล่าง", "ปุ่มแถวล่าง"], ["วงกต", "บนวงกต"], ["ไม่โดนอะไร", "แตะแล้วไม่โดนอะไร"]];
    var miss = all.filter(function (t) { return t.z === "ไม่โดนอะไร"; }).slice(-5).reverse();
    el.innerHTML = rows.map(function (r) { return "<li><span>" + r[1] + "</span><b>" + th(c[r[0]] || 0) + "</b></li>"; }).join("") +
      (miss.length ? '<li class="tapmiss"><span>ไม่ติดล่าสุด ' + miss.map(function (t) { return (t.w || "") + " ห่างปุ่ม" + t.b + " " + t.e + " จุด"; }).join(" · ") + "</span></li>" : "");
    setSave(saveMsg);
  }

  newLevel();
  snapLayout("เปิดหน้า");
})();
