import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { marketFixture } from "./fixtures/workspace.js";
import { importWorkspace } from "../src/funds/workspace.js";
import { importPositions } from "../src/funds/model.js";
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
  await page.getByLabel("Arquivo de carteira").setInputFiles({ name: "carteira-teste.rdfundos", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(marketFixture())) });
  await page.getByRole("button", { name: "Confirmar e usar esta base" }).click();
  await page.getByText("Carteira privada · arquivo de trabalho", { exact: true }).waitFor();
  const priorityPanel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Contas com maior exposição a revisões prioritárias", exact: true }) });
  assert.equal(await priorityPanel.locator("tbody tr").count(), 1);
  assert.ok((await priorityPanel.innerText()).includes("Conta de teste 1"));
  await page.getByRole("navigation").getByRole("button", { name: "Carteira de fundos", exact: true }).click();
  const performance = page.locator("section").filter({ has: page.getByRole("heading", { name: "Indicadores históricos dos fundos", exact: true }) });
  assert.ok((await performance.locator(".fd-performance-summary").innerText()).includes("75,01%"));
  assert.ok((await performance.innerText()).includes("15,00%"));
  assert.ok((await page.getByRole("table").last().innerText()).includes("80,00%"));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "indicadores sem overflow no mobile");
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.getByRole("navigation").getByRole("button", { name: "Comparador", exact: true }).click();
  await page.getByRole("heading", { name: "Alternativa sintética", exact: true }).waitFor();
  const exporting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar clientes deste fundo", exact: true }).click();
  const exported = await exporting;
  const fundClients = importPositions(await readFile(await exported.path(), "utf8"));
  assert.equal(fundClients.positions.length, 2);
  assert.ok(fundClients.positions.every((position) => position.fundId === "F1"));
  const saving = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar trabalho", exact: true }).click();
  const saved = await saving;
  assert.ok(saved.suggestedFilename().endsWith(".rdfundos"));
  const restored = importWorkspace(await readFile(await saved.path(), "utf8"));
  assert.deepEqual(restored.data.market, marketFixture().market);
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  const legacy = await page.request.get(url + "planejamento");
  assert.equal(legacy.status(), 200);
  assert.ok((await legacy.text()).includes('<div id="root"></div>'));
  console.log("PASS: build de produção com headers Vercel; índices, cobertura parcial, ranking por conta, exportação por fundo e backup v2 sob CSP; mobile sem overflow; sem solicitações externas; fallback SPA do formulário legado.");
} finally { await browser.close(); server.close(); }
