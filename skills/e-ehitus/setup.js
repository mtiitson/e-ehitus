#!/usr/bin/env node
/**
 * One-time setup: installs ehr-auth and ehr-api as global commands.
 * Run once after installing the plugin:
 *   node <skill-dir>/setup.js
 */

import { mkdirSync, writeFileSync, chmodSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";
import { execSync } from "child_process";

const isWindows = platform() === "win32";
const commands = ["ehr-auth", "ehr-api"];

function getInstallDir() {
  try {
    const prefix = execSync("npm prefix -g", { encoding: "utf8" }).trim();
    return isWindows ? prefix : join(prefix, "bin");
  } catch {
    // fallback
    return isWindows
      ? join(process.env.APPDATA ?? homedir(), "npm")
      : join(homedir(), ".local", "bin");
  }
}

const installDir = getInstallDir();
mkdirSync(installDir, { recursive: true });

for (const cmd of commands) {
  const scriptName = `${cmd}.js`;

  if (isWindows) {
    // .cmd shim: use node to search ~/.claude for the script and run it
    const shimPath = join(installDir, `${cmd}.cmd`);
    writeFileSync(shimPath, [
      "@echo off",
      `for /f "delims=" %%i in ('node -e "const{readdirSync,statSync}=require('fs'),{join}=require('path'),{homedir}=require('os');function f(d,n){try{for(const i of readdirSync(d)){const p=join(d,i);if(i===n&&p.includes('scripts'))return p;if(statSync(p).isDirectory()){const r=f(p,n);if(r)return r;}}}catch{}return''}console.log(f(join(homedir(),'.claude'),'${scriptName}'))"') do set _S=%%i`,
      `node "%_S%" %*`,
    ].join("\r\n") + "\r\n");
    console.log(`Installed: ${shimPath}`);
  } else {
    const shimPath = join(installDir, cmd);
    writeFileSync(shimPath,
      `#!/bin/sh\nexec node "$(find ~/.claude -path '*/scripts/${scriptName}' 2>/dev/null | head -1)" "$@"\n`
    );
    chmodSync(shimPath, 0o755);
    console.log(`Installed: ${shimPath}`);
  }
}

console.log("\nDone. Test with: ehr-auth --help");
