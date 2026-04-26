import { build } from "esbuild";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../scripts");

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
};

await build({ ...common, entryPoints: [join(__dirname, "src/ehr-auth.js")], outfile: join(outDir, "ehr-auth.js") });

console.log("Built → scripts/ehr-auth.js");
