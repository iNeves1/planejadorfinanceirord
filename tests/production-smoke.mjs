import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fixture } from "./fixtures/workspace.js";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const relative = pathname.startsWith("/assets/") || pathname === "/logo.png" ? pathname.slice(1) : "index.html";
    const file = path.resolve(root, "dist", relative);
    if (!file.startsWith(path.join(root, "dist") + path.sep)) { res.writeHead(404); res.end(); return; }
    const headers = { "Content-Type": `${types[path.extname(file)] || "application/octet-stream"}; charset=utf-8` };
    for (const rule of config.headers) if (rule.source === "/(.*)" || rule.source === pathname) for (const h of rule.headers) headers[h.key] = h.value;
    res.writeHead(200, headers); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
server.unref();
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [], external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => { if (!r.url().startsWith(url) && /^https?:/.test(r.url())) external.push(r.url()); });
  const response = await page.goto(url);
  assert.ok(response.headers()["content-security-policy"].includes("connect-src 'none'"));
  await page.getByText("Modo demonstração", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Importar posições", exact: true }).click();
  await page.getByLabel("Arquivo de carteira").setInputFiles({ name: "carteira-teste.rdfundos", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fixture())) });
  await page.getByRole("button", { name: "Confirmar e usar esta base" }).click();
  await page.getByText("Carteira privada · arquivo de trabalho", { exact: true }).waitFor();
  await page.getByRole("navigation").getByRole("button", { name: "Comparador", exact: true }).click();
  await page.getByRole("heading", { name: "Alternativa sintética", exact: true }).waitFor();
  const saving = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar trabalho", exact: true }).click();
  assert.ok((await saving).suggestedFilename().endsWith(".rdfundos"));
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  const legacy = await page.request.get(url + "planejamento");
  assert.equal(legacy.status(), 200);
  assert.ok((await legacy.text()).includes('<div id="root"></div>'));
  console.log("PASS: build de produção com headers Vercel; importação privada, alternativas e backup sob CSP; sem solicitações externas; fallback SPA do formulário legado.");
} finally { await browser.close(); server.close(); }
