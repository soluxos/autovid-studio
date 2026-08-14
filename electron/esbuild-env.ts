// Must be imported BEFORE anything that pulls in @remotion/bundler (esbuild).
// esbuild reads process.env.ESBUILD_BINARY_PATH once, at module load, and can't
// otherwise locate its native binary when spawned inside Electron. Setting it
// here — as the very first import in main.ts — makes real renders work.
//
// Packaging note: when packaged, @esbuild must be asar-unpacked and this path
// resolved against process.resourcesPath (see README first-run checklist).
import { app } from "electron";
import { join } from "path";
import { existsSync } from "fs";

if (!process.env.ESBUILD_BINARY_PATH) {
  const platform = `${process.platform}-${process.arch}`;
  const base = join(app.getAppPath(), "node_modules", "@esbuild", platform);
  const candidate = process.platform === "win32" ? join(base, "esbuild.exe") : join(base, "bin", "esbuild");
  if (existsSync(candidate)) process.env.ESBUILD_BINARY_PATH = candidate;
}
