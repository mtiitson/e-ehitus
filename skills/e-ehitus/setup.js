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
  if (isWindows) {
    try {
      // npm's global prefix is always on PATH for Node/npm users on Windows
      return execSync("npm prefix -g", { encoding: "utf8" }).trim();
    } catch {
      return join(process.env.APPDATA ?? homedir(), "npm");
    }
  }
  return join(homedir(), ".local", "bin");
}

function isOnPath(dir) {
  return (process.env.PATH ?? "").split(isWindows ? ";" : ":").some(p => p === dir);
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
      `for /f "delims=" %%i in ('node -e "const{readdirSync,statSync}=require('fs'),{join}=require('path'),{homedir}=require('os');function f(d,n){try{for(const i of readdirSync(d)){const p=join(d,i);if(i===n)return p;if(statSync(p).isDirectory()){const r=f(p,n);if(r)return r;}}}catch{}return''}console.log(f(join(homedir(),'.claude'),'${scriptName}'))"') do set _S=%%i`,
      `node "%_S%" %*`,
    ].join("\r\n") + "\r\n");
    console.log(`Installed: ${shimPath}`);
  } else {
    const shimPath = join(installDir, cmd);
    writeFileSync(shimPath,
      `#!/bin/sh\nexec node "$(find ~/.claude -name '${scriptName}' 2>/dev/null | head -1)" "$@"\n`
    );
    chmodSync(shimPath, 0o755);
    console.log(`Installed: ${shimPath}`);
  }
}

if (!isWindows && !isOnPath(installDir)) {
  console.log(`\n~/.local/bin is not on your PATH. Add this to ~/.zshrc or ~/.bashrc:`);
  console.log(`  export PATH="$HOME/.local/bin:$PATH"`);
}

console.log("\nDone. Test with: ehr-auth --help");
