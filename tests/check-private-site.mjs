// Verificação opcional, somente leitura. Não grava capturas nem imprime dados de contas.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { importWorkspace } from "../src/funds/workspace.js";
import { compact, sum, percent } from "../src/funds/model.js";
import { weightedPerformance } from "../src/funds/performance.js";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
if (!process.argv[2]) throw new Error("Informe o caminho externo do HTML privado a validar.");
const html = await readFile(process.argv[2], "utf8");
const seed = html.match(/<script type="application\/json" id="rd-private-workspace">([\s\S]*?)<\/script>/)?.[1];
const { data } = importWorkspace(seed);
const server = createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(html); });
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
server.unref();
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => { if (/^https?:/.test(r.url()) && r.url() !== url) external.push(r.url()); });
  await page.goto(url);
  await page.getByText("Carteira privada · arquivo de trabalho", { exact: true }).waitFor();
  assert.equal(await page.locator(".fd-stat").nth(0).locator("strong").innerText(), compact(sum(data.positions)));
  assert.equal(await page.locator(".fd-stat").nth(1).locator("strong").innerText(), String(new Set(data.positions.map((p) => p.account)).size));
  await page.getByRole("navigation").getByRole("button", { name: "Pontos de atenção", exact: true }).click();
  await page.getByRole("button", { name: "Desempenho", exact: true }).click();
  while (await page.getByRole("button", { name: "Mostrar mais prioridades", exact: true }).count()) await page.getByRole("button", { name: "Mostrar mais prioridades", exact: true }).click();
  assert.equal(await page.locator(".fd-alert").count(), data.reviews.filter((r) => r.type === "Desempenho").length);
  await page.getByRole("navigation").getByRole("button", { name: "Rentabilidade", exact: true }).click();
  const metric = weightedPerformance(data, data.positions);
  const performance = await page.locator(".fd-performance-summary").innerText();
  assert.ok(performance.includes(percent(metric.value)));
  assert.ok(performance.includes(percent(metric.coverage)));
  if (data.market) {
    const captions = await page.getByRole("table").nth(1).innerText();
    for (const benchmark of data.market.benchmarks.filter((index) => data.market.fundReferences.some((reference) => reference.benchmarkId === index.id)))
      assert.ok(captions.includes(benchmark.name));
  }
  await page.getByRole("navigation").getByRole("button", { name: "Realocação", exact: true }).click();
  for (const [id, alternatives] of Object.entries(data.suggestions)) {
    await page.getByLabel("Fundo", { exact: true }).selectOption(id);
    await page.getByRole("heading", { name: alternatives[0].name, exact: true }).waitFor();
    const card = page.locator(".fd-return-card").last();
    const rendered = await card.innerText();
    for (const value of alternatives[0].returns) assert.ok(rendered.includes(percent(value)));
    assert.ok(!/Sharpe|volatilidade|correlação|quartil|taxa adm/i.test(rendered));
  }
  await page.getByRole("navigation").getByRole("button", { name: "Clientes", exact: true }).click();
  await page.getByLabel("Buscar", { exact: true }).fill(data.positions[0].account);
  await page.getByRole("button", { name: data.positions[0].client, exact: true }).click();
  await page.getByRole("button", { name: "Preparar conversa", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(JSON.stringify({ passed: true, positions: data.positions.length, accounts: new Set(data.positions.map((p) => p.account)).size, researchedReviews: data.reviews.length, alternativesByOrigin: Object.keys(data.suggestions).length, benchmarkBindings: data.market?.fundReferences.length || 0, externalRequests: external.length }));
} finally { await browser.close(); server.close(); }
