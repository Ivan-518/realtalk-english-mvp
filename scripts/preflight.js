const { spawn } = require("node:child_process");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8000";
const serverCommand = process.env.SERVER_CMD || "";
const runMobileQa = process.argv.includes("--mobile");

function log(message) {
  console.log(`[preflight] ${message}`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...options.env },
      shell: Boolean(options.shell),
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

async function waitForHealth(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  const healthUrl = `${baseUrl.replace(/\/$/, "")}/api/health`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok") {
          return data;
        }
      }
    } catch {
      // Service is still starting.
    }

    await wait(500);
  }

  throw new Error(`Timed out waiting for ${healthUrl}`);
}

async function isServerReachable() {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function startServer() {
  if (serverCommand) {
    log(`starting server: ${serverCommand}`);
    return spawn(serverCommand, {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  const args = ["-m", "uvicorn", "server.main:app", "--host", "127.0.0.1", "--port", "8000"];
  log(`starting server: python ${args.join(" ")}`);
  return spawn("python", args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;

  log("stopping server");
  server.kill(process.platform === "win32" ? "SIGTERM" : "SIGINT");
  await Promise.race([new Promise((resolve) => server.once("exit", resolve)), wait(5000)]);

  if (server.exitCode !== null) return;
  if (!(await isServerReachable())) return;

  try {
    if (process.platform === "win32") {
      await runCommand("taskkill", ["/PID", String(server.uvicornPid || server.pid), "/T", "/F"]);
    } else {
      server.kill("SIGTERM");
    }
  } catch (error) {
    console.warn(`[preflight] warning: server did not stop cleanly: ${error.message}`);
  }
}

(async () => {
  const server = startServer();

  server.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    const match = text.match(/Started server process \[(\d+)\]/);
    if (match) {
      server.uvicornPid = match[1];
    }
    process.stdout.write(chunk);
  });
  server.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    const match = text.match(/Started server process \[(\d+)\]/);
    if (match) {
      server.uvicornPid = match[1];
    }
    process.stderr.write(chunk);
  });

  try {
    const health = await waitForHealth();
    log(`health ok: model=${health.model}, keyConfigured=${health.openaiKeyConfigured}`);

    await runCommand(process.execPath, ["scripts/smoke-test.js"], { env: { BASE_URL: baseUrl } });

    if (runMobileQa) {
      await runCommand(process.execPath, ["scripts/mobile-qa.js"], { env: { BASE_URL: baseUrl } });
    }

    log("preflight passed");
  } finally {
    await stopServer(server);
  }
})().catch((error) => {
  console.error("[preflight] failed");
  console.error(error);
  process.exit(1);
});
