"use client";

/* แถบบอกผลกลางล่างจอ ตัวกลางของทั้งเว็บ (สกิล save-status ข้อ 3 · ยกจาก city-lab)
   ตัวแถบวาดครั้งเดียวที่ app/layout.tsx (components/ui/BannerHost.tsx) จึงอยู่ตำแหน่งเดียวกันทุกหน้า */

import { createStore } from "./store";

export type BannerState =
  | { kind: "idle" }
  | { kind: "progress"; title: string; lines?: string[] }
  | { kind: "ok"; title: string }
  | { kind: "warn"; title: string; lines?: string[] }
  | { kind: "error"; title: string; lines?: string[] };

export const bannerStore = createStore<{ state: BannerState }>({ state: { kind: "idle" } });

export function showBanner(state: BannerState): void {
  bannerStore.set({ state });
}

export function closeBanner(): void {
  bannerStore.set({ state: { kind: "idle" } });
}
