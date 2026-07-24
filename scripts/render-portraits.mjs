import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "apps/web/public");
const outDir = path.join(publicDir, "portraits");
mkdirSync(outDir, { recursive: true });

const portraits = [
  { id: "emi", file: "emi.glb" },
  { id: "charlie-morningstar", file: "charlie-morningstar.glb" },
  { id: "phil", file: "phil.glb" },
  { id: "banana-fortnite", file: "banana.glb" },
  { id: "carl-johnson", file: "cj.glb" },
  { id: "order-number-67", file: "order-67.glb" },
  { id: "simao-cowboy", file: "simao.glb" },
  { id: "look-212", file: "model-212.glb" }
];

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".css": "text/css",
  ".svg": "image/svg+xml"
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const filePath = path.join(publicDir, urlPath === "/" ? "portrait-viewer.html" : urlPath);
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const debugPort = 9229 + Math.floor(Math.random() * 200);

const chrome = spawn("google-chrome", [
  `--remote-debugging-port=${debugPort}`,
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--hide-scrollbars",
  "--window-size=512,640",
  "--use-gl=angle",
  "--use-angle=swiftshader-webgl",
  "--enable-webgl",
  "--ignore-gpu-blocklist",
  "about:blank"
], { stdio: ["ignore", "pipe", "pipe"] });

await sleep(800);

async function cdp(method, params = {}, sessionId) {
  const version = await fetch(`http://127.0.0.1:${debugPort}/json/version`).then((r) => r.json());
  // Use HTTP for Target.createTarget via websocket is needed for full CDP.
  // Simpler path: open page via /json/new then connect websocket.
  return { version };
}

async function openPage(url) {
  const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT"
  }).then((r) => r.json());
  return target;
}

async function waitReady(wsUrl, timeoutMs = 60000) {
  const { default: WebSocket } = await import("ws").catch(() => ({ default: null }));
  if (!WebSocket) {
    // Fallback without ws: poll title via chrome DevTools HTTP is limited.
    await sleep(8000);
    return;
  }
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const send = (method, params = {}) => {
      id += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return id;
    };
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("timeout waiting portrait"));
    }, timeoutMs);
    ws.on("open", () => {
      send("Runtime.enable");
      send("Page.enable");
      const poll = () => {
        const pollId = send("Runtime.evaluate", {
          expression: "({ ready: window.__portraitReady === true, error: window.__portraitError || null, title: document.title })",
          returnByValue: true
        });
        pending.set(pollId, (result) => {
          const value = result?.result?.value;
          if (value?.error) {
            clearTimeout(timer);
            ws.close();
            reject(new Error(value.error));
            return;
          }
          if (value?.ready || value?.title === "READY") {
            clearTimeout(timer);
            ws.close();
            resolve();
            return;
          }
          setTimeout(poll, 250);
        });
      };
      setTimeout(poll, 300);
    });
    const pending = new Map();
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.id && pending.has(msg.id)) {
        const cb = pending.get(msg.id);
        pending.delete(msg.id);
        cb(msg.result);
      }
    });
    ws.on("error", reject);
  });
}

async function capture(wsUrl, outPath) {
  const { default: WebSocket } = await import("ws").catch(() => ({ default: null }));
  if (!WebSocket) {
    // Last resort screenshot via chrome CLI of current URL won't work per-tab easily.
    throw new Error("ws package missing");
  }
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    ws.on("open", () => {
      id += 1;
      ws.send(JSON.stringify({
        id,
        method: "Page.captureScreenshot",
        params: { format: "png", fromSurface: true, captureBeyondViewport: false }
      }));
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.id === 1 && msg.result?.data) {
        writeFileSync(outPath, Buffer.from(msg.result.data, "base64"));
        ws.close();
        resolve();
      } else if (msg.id === 1 && msg.error) {
        reject(new Error(JSON.stringify(msg.error)));
      }
    });
    ws.on("error", reject);
  });
}

try {
  // Prefer ws if available; otherwise install-free path using long virtual budget is insufficient.
  let hasWs = true;
  try {
    await import("ws");
  } catch {
    hasWs = false;
  }

  if (!hasWs) {
    console.log("Installing ws for CDP...");
    await new Promise((resolve, reject) => {
      const child = spawn("npm", ["install", "-D", "ws@8", "--no-fund", "--no-audit"], {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, SKIP_POSTINSTALL_BUILD: "1" }
      });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`npm ws exit ${code}`))));
    });
  }

  for (const portrait of portraits) {
    const url = `${base}/portrait-viewer.html?model=${encodeURIComponent(`/models/${portrait.file}`)}`;
    console.log("rendering", portrait.id);
    const target = await openPage(url);
    await waitReady(target.webSocketDebuggerUrl);
    const outPath = path.join(outDir, `${portrait.id}.png`);
    await capture(target.webSocketDebuggerUrl, outPath);
    // close target
    await fetch(`http://127.0.0.1:${debugPort}/json/close/${target.id}`).catch(() => {});
    console.log(" ", portrait.id, readFileSync(outPath).length, "bytes");
  }
} finally {
  chrome.kill("SIGKILL");
  server.close();
}

writeFileSync(
  path.join(outDir, "meia-noite.svg"),
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="640" viewBox="0 0 512 640">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#37324e"/>
      <stop offset="100%" stop-color="#9d7be9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="640" fill="#1f1913"/>
  <circle cx="256" cy="360" r="180" fill="url(#g)" opacity=".9"/>
  <circle cx="256" cy="220" r="78" fill="#b77b5a"/>
  <rect x="178" y="290" width="156" height="190" rx="40" fill="#37324e"/>
  <text x="256" y="560" text-anchor="middle" fill="#d8d4e1" font-family="Arial,sans-serif" font-size="42" font-weight="700">A&amp;E</text>
</svg>`
);

console.log("done →", outDir);
