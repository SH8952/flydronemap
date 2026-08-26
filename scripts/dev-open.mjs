#!/usr/bin/env node
/**
 * Runs `next dev` and, once the dev server reports it's ready, opens the
 * app in Google Chrome automatically (macOS/Windows/Linux).
 *
 * Used by `npm run dev`. If you don't want the browser to open, use
 * `npm run dev:plain` instead.
 */
import { spawn, exec } from "node:child_process";

const URL_REGEX = /(https?:\/\/localhost:\d+)/;
const FALLBACK_URL = "http://localhost:3000";
const FALLBACK_DELAY_MS = 8000;

const child = spawn("next", ["dev"], {
  stdio: ["inherit", "pipe", "inherit"],
  shell: process.platform === "win32",
});

let opened = false;

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  if (!opened) {
    const match = text.match(URL_REGEX);
    if (match) {
      opened = true;
      openInChrome(match[1]);
    }
  }
});

const fallbackTimer = setTimeout(() => {
  if (!opened) {
    opened = true;
    openInChrome(FALLBACK_URL);
  }
}, FALLBACK_DELAY_MS);

function openInChrome(url) {
  clearTimeout(fallbackTimer);

  let cmd;
  switch (process.platform) {
    case "darwin":
      cmd = `open -a "Google Chrome" "${url}"`;
      break;
    case "win32":
      cmd = `start chrome "${url}"`;
      break;
    default:
      cmd = `google-chrome "${url}" || xdg-open "${url}"`;
      break;
  }

  exec(cmd, (err) => {
    if (err) {
      console.warn(
        `\n⚠ Couldn't auto-open Chrome (is it installed?). Open manually: ${url}\n`,
      );
    }
  });
}

function shutdown() {
  child.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
