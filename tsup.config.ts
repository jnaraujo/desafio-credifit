import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  ...options,
  entryPoints: ["src/http/server.ts"],
  dts: false,
  format: ["esm"]
}));