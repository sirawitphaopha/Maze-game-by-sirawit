"use client";

import { useSyncExternalStore } from "react";

/** ที่เก็บสถานะเล็ก ๆ ที่หลายส่วนของหน้าจออ่านร่วมกัน (ยกจาก city-lab lib/store.ts)
    🔴 ตัวเลือกต้องคืนค่าเดิมเมื่อข้อมูลไม่เปลี่ยน ห้ามสร้างวัตถุใหม่ในตัวเลือก */
export interface Store<T> {
  get(): T;
  set(patch: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(fn: () => void): () => void;
}

export function createStore<T extends object>(init: T): Store<T> {
  let state = init;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === "function" ? patch(state) : patch;
      state = { ...state, ...p };
      subs.forEach((fn) => fn());
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export function useStore<T, U>(store: Store<T>, sel: (s: T) => U): U {
  return useSyncExternalStore(store.subscribe, () => sel(store.get()), () => sel(store.get()));
}
