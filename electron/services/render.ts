import { app } from "electron";
import { join } from "path";
import { writeFileSync } from "fs";
import { store } from "./store";

// @remotion/bundler and @remotion/renderer both pull in esbuild, which reads
// ESBUILD_BINARY_PATH once at load. A static import of either gets hoisted to
// the very top of the bundle — above main.ts's esbuild-env side effect that
// sets that variable. So we import BOTH lazily, at first render, by which point
// esbuild-env has run and the binary path is set.

let bundlePromise: Promise<string> | null = null;

const uniqueOut = () => join(store.rendersDir(), `render_${Date.now()}_${Math.round(Math.random() * 1e6)}.mp4`);

/** Path to the Remotion render entry. In dev it is in the project; when
 *  packaged, ship `src` via electron-builder extraResources and point here. */
function entryPoint() {
  // We ship the TS source (electron-builder extraResources: src -> engine).
  // @remotion/bundler compiles TS at bundle time.
  return app.isPackaged
    ? join(process.resourcesPath, "engine", "render", "index.ts")
    : join(app.getAppPath(), "src", "render", "index.ts");
}
function publicDir() {
  return app.isPackaged ? join(process.resourcesPath, "public") : join(app.getAppPath(), "public");
}

async function getBundle() {
  if (!bundlePromise) {
    const { bundle } = await import("@remotion/bundler");
    bundlePromise = bundle({ entryPoint: entryPoint(), publicDir: publicDir() });
  }
  return bundlePromise;
}

export async function renderSpec(spec: any, themeOverride?: any) {
  // Fast path for E2E tests: skip the (slow) Remotion bundle+encode and write a
  // placeholder file so flows that end in "a file exists" stay deterministic.
  if (process.env.AUTOVID_FAKE_RENDER === "1") {
    const out = uniqueOut();
    writeFileSync(out, Buffer.from("FAKE_MP4\n"));
    return out;
  }
  const { selectComposition, renderMedia } = await import("@remotion/renderer");
  const serveUrl = await getBundle();
  const inputProps = { spec, themeOverride };
  const composition = await selectComposition({ serveUrl, id: "Render", inputProps });
  const out = uniqueOut();
  await renderMedia({ serveUrl, composition, codec: "h264", outputLocation: out, inputProps });
  return out;
}
