import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
const host = "127.0.0.1";
// Use a dedicated port so a developer's local `pnpm dev` process is never
// mistaken for the isolated E2E server.
const port = process.env.MEYUKBU_E2E_PORT ?? "3100";
const baseUrl = `http://${host}:${port}`;
const e2eDistDir = ".next-e2e";

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

function timeout(milliseconds) {
  return new Promise((resolve) => setTimeout(() => resolve(null), milliseconds));
}

async function waitForExitOrTimeout(child, milliseconds) {
  return Promise.race([waitForExit(child), timeout(milliseconds)]);
}

async function waitForServer(url, server) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js server exited before E2E started (code ${server.exitCode}).`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The server may still be compiling its first route.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Timed out waiting for the E2E Next.js server.");
}

async function stopServer(server) {
  if (!server.pid || server.exitCode !== null) {
    return;
  }
  server.kill();
  const gracefulExit = await waitForExitOrTimeout(server, 5_000);
  if (gracefulExit !== null || process.platform !== "win32") {
    server.unref();
    return;
  }

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    await waitForExitOrTimeout(killer, 5_000).catch(() => undefined);
    killer.unref();
    server.unref();
    return;
  }
}

const server = spawn(process.execPath, [nextCli, "dev", "--hostname", host, "--port", port], {
  cwd: root,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    // Keep E2E independent from a developer's local live-provider credentials
    // and persistent database. The scenario intentionally covers the demo flow.
    NEXON_PROVIDER: "mock",
    NEXON_OPEN_API_KEY: "",
    MEYUKBU_STORAGE: "memory",
    MEYUKBU_NEXT_DIST_DIR: e2eDistDir,
  },
  stdio: "inherit",
});

let exitCode = 1;
try {
  await waitForServer(baseUrl, server);
  const runner = spawn(process.execPath, [playwrightCli, "test"], {
    cwd: root,
    env: { ...process.env, PLAYWRIGHT_EXTERNAL_SERVER: "true", PLAYWRIGHT_BASE_URL: baseUrl },
    stdio: "inherit",
  });
  exitCode = await waitForExit(runner);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Failed to run E2E tests.");
} finally {
  await stopServer(server);
}

process.exitCode = exitCode;
