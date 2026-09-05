import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false, // <--- เพิ่มบรรทัดนี้ เพื่อให้รันทีละไฟล์ ป้องกันปัญหาตั๋วชนกัน
  },
});
