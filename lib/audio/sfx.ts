"use client";

/* เสียงสังเคราะห์ด้วย Web Audio ไม่มีไฟล์เสียง เริ่มทำงานหลังผู้ใช้กดครั้งแรก (ยกจากไฟล์เดิม · เอกสารหัวข้อ 8)
   เดินหน้า ติ๊ก 560 ถึง 640 Hz (ห่างกันอย่างน้อย 38 มิลลิวินาที) · ถอย 330 Hz · ชนกำแพง 140 Hz
   ปักธง สองโน้ตขึ้น · วาร์ป หวิวลง · ชนะ C E G C · ยอมแพ้ ไล่โน้ตลง 3 ตัว */

let AC: AudioContext | null = null;
let lastTick = 0;
let enabled = true;

export function setSoundEnabled(v: boolean): void { enabled = v; }

function audio(): AudioContext | null {
  if (!enabled) return null;
  if (!AC) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      AC = new Ctor();
    } catch { return null; }
  }
  if (AC.state === "suspended") AC.resume().catch(() => {});
  return AC;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide?: number, at = 0): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

export const SFX = {
  step(back: boolean) {
    const now = performance.now();
    if (now - lastTick < 38) return;
    lastTick = now;
    if (back) tone(330, 0.07, "triangle", 0.16, 0.8);
    else tone(560 + Math.random() * 80, 0.055, "triangle", 0.16, 1.15);
  },
  bump() { tone(140, 0.11, "square", 0.07, 0.6); },
  flag() { tone(784, 0.08, "triangle", 0.18); tone(1175, 0.14, "triangle", 0.18, 0, 0.08); },
  warp() { tone(1100, 0.28, "sine", 0.16, 0.35); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.45 : 0.14, "triangle", 0.2, 0, i * 0.11)); },
  giveUp() { [392, 330, 262].forEach((f, i) => tone(f, 0.2, "triangle", 0.15, 0, i * 0.15)); },
  on() { tone(660, 0.08, "triangle", 0.16, 1.2); },
};
