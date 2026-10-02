import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(filePath) {
  let raw = "";
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) 
      continue;

    const eq = trimmed.indexOf("=");
    if (eq < 0) 
      continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("'") && value.endsWith("'")) 
      || (value.startsWith('"') && value.endsWith('"')))
      value = value.slice(1, -1);

    if (process.env[key] === undefined)
      process.env[key] = value;
  }
}

loadEnv(resolve(process.cwd(), ".env"));

const args = process.argv.slice(2);
const dbFile = process.env.NUXT_DB_FILE;

if (args[0] === "restore" 
  && dbFile 
  && !args.includes(dbFile))
  args.push(dbFile);

const child = spawn("litestream", args, {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
