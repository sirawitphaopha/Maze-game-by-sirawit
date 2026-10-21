import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/* ════════════════════════════════════════════════════════════════════
   ตัวตรวจโค้ดของเกมเขาวงกต (ยกจาก city-lab)

   🔴 สมองของเกมแยกจากหน้าจอ
      โค้ดใน lib/maze กับ lib/game ต้องรันได้ใน Node โดยไม่มีหน้าจอ (ชุดทดสอบรันตรง ๆ)
      ตัวตรวจชุดล่างจึงห้ามสองโฟลเดอร์นั้นเรียกของหน้าจอ
      กระดานเปลี่ยนเป็น 3D รอบหน้าได้โดยไม่ต้องแตะตรรกะ
   ════════════════════════════════════════════════════════════════════ */

const BRAIN_FILES = ["lib/maze/**/*.ts", "lib/game/**/*.ts"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".open-next/**", ".wrangler/**", "docs/**"]),

  {
    rules: {
      // รายการเฝ้าดูไม่ครบ = ปุ่มบันทึกส่งของเก่าไปเงียบ ๆ (สกิล save-status ข้อ 6)
      "react-hooks/exhaustive-deps": "error",
      // Node รันไฟล์ TypeScript ตรง ๆ ด้วยการลบชนิดข้อมูลทิ้ง ต้องเขียน import type เสมอ
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },

  {
    files: BRAIN_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["react", "react-dom", "next", "next/*", "@/components/*", "@/app/*"] },
      ],
      "no-restricted-globals": ["error", "window", "document", "localStorage", "sessionStorage", "navigator"],
    },
  },
]);

export default eslintConfig;
