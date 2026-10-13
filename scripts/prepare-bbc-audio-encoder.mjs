import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = dirname(dirname(require.resolve("@ffmpeg/core")));
const output = new URL("../public/vendor/bbc-audio/", import.meta.url);
await mkdir(output, { recursive: true });
for (const name of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  await copyFile(resolve(root, "esm", name), new URL(name, output));
}
const workerRoot = dirname(dirname(require.resolve("@ffmpeg/ffmpeg")));
// Keep the worker's runtime core import intact; Turbopack rewrites it to an error.
for (const name of ["worker.js", "const.js", "errors.js", "types.js"]) {
  await copyFile(resolve(workerRoot, "esm", name), new URL(name, output));
}
console.log("BBC MP3 encoder assets prepared.");
