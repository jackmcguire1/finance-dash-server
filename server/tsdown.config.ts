import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/handlers/api.ts", "src/handlers/cron.ts"],
    outDir: "dist/handlers",
    format: "cjs",
    outExtensions: () => ({ js: ".js" }),
    clean: true,
    sourcemap: true,
});
