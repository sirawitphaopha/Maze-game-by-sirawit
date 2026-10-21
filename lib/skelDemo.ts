"use client";

/* สวิตช์ดูโครงจางค้างไว้ (สกิล loading-skeleton สวิตช์ให้พี่กันกดดูเอง)
   🚨 ไม่เก็บลงเครื่อง เป็นเครื่องมือดูงาน ปิดหน้าต่างแล้วเปิดใหม่กลับเป็นปกติเสมอ */

import { createStore } from "./store";

export const skelStore = createStore<{ on: boolean }>({ on: false });
export const toggleSkel = () => skelStore.set((s) => ({ on: !s.on }));
