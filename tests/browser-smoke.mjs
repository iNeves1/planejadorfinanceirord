const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page
  .getByRole("heading", { name: "Clareza para o seu próximo passo." })
  .waitFor();
await page.screenshot({ path: "/tmp/rd-fundos-desktop.png", fullPage: true });
await page
  .getByRole("button", { name: "Acompanhar", exact: true })
  .first()
  .click();
await page.getByLabel("Próxima revisão", { exact: true }).fill("2026-11-05");
await page
  .getByRole("button", { name: "Criar acompanhamento", exact: true })
  .last()
  .click();
await page
  .getByRole("navigation", { name: "Navegação principal" })
  .getByRole("button", { name: "Acompanhamento" })
  .click();
await page
  .getByRole("button", { name: "Registrar decisão", exact: true })
  .click();
await page.getByLabel("Status do atendimento").selectOption("Concluído");
await page
  .getByLabel("O que foi conversado ou decidido?")
  .fill("Decisão sintética: manter e revisar no prazo acordado.");
await page.getByRole("button", { name: "Salvar registro" }).click();
await page.getByRole("button", { name: "Resumo da reunião" }).click();
await page
  .getByRole("dialog")
  .getByText("Decisão sintética: manter e revisar no prazo acordado.")
  .waitFor();
const downloadWait = page.waitForEvent("download");
await page.getByRole("button", { name: "Baixar resumo" }).click();
assert.equal((await downloadWait).suggestedFilename(), "resumo_reuniao.txt");
await page.getByRole("button", { name: "Fechar", exact: true }).click();
await page
  .getByRole("navigation")
  .getByRole("button", { name: "Comparador", exact: true })
  .click();
const comparison = await page.locator(".fd-fund-layout").innerText();
assert.ok(comparison.includes("Exemplo Crédito Seleção"));
for (const forbidden of [
  "Sharpe",
  "Volatilidade",
  "Correlação",
  "Quartil",
  "Taxa adm.",
  "seriam",
])
  assert.ok(!comparison.includes(forbidden));
await page
  .getByRole("navigation")
  .getByRole("button", { name: "Clientes", exact: true })
  .click();
await page
  .getByRole("button", { name: "Cliente exemplo 01", exact: true })
  .click();
await page.getByRole("button", { name: "Preparar conversa" }).waitFor();
await page
  .getByRole("navigation")
  .getByRole("button", { name: "Fundos", exact: true })
  .click();
await page
  .getByRole("navigation")
  .getByRole("button", { name: "Carteira de fundos", exact: true })
  .click();
await page.getByRole("heading", { name: "Posições por fundo" }).waitFor();
const csvDownload = page.waitForEvent("download");
await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
assert.ok((await csvDownload).suggestedFilename().includes("demonstracao"));
await page
  .getByRole("navigation")
  .getByRole("button", { name: "Meu dia", exact: true })
  .click();
await page.getByLabel("Estratégia", { exact: true }).selectOption("Ações");
await page.getByRole("button", { name: "Concentração", exact: true }).click();
await page
  .getByRole("heading", { name: "Nenhuma situação neste filtro" })
  .waitFor();
await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
await page.getByRole("button", { name: "Todas", exact: true }).click();
await page.locator(".fd-toast").waitFor({ state: "detached" });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/tmp/rd-fundos-mobile.png", fullPage: true });
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
  "sem overflow horizontal no mobile",
);
await page
  .getByRole("button", { name: "Importar posições", exact: true })
  .click();
await page
  .getByLabel("Arquivo de carteira")
  .setInputFiles({
    name: "anonimizado.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "conta;cliente;assessor;fundo_id;fundo;estrategia;gestora;saldo;data;liquidez\nA1;Cliente anonimo;IN;F1;Fundo anonimizado;Crédito privado;Gestora anonima;1000,56;2026-09-30;D+30 úteis",
    ),
  });
await page.locator(".fd-import-preview dd").filter({ hasText: "1.000,56" }).waitFor();
await page.getByRole("button", { name: "Confirmar e usar esta base" }).click();
await page
  .getByText("CSV local · sessão temporária", { exact: true })
  .waitFor();
await page
  .getByRole("navigation")
  .getByRole("button", { name: "Comparador", exact: true })
  .click();
await page
  .getByRole("heading", { name: "Nenhuma alternativa carregada" })
  .waitFor();
assert.ok(
  !(await page.locator(".fd-fund-layout").innerText()).includes(
    "Exemplo Crédito Seleção",
  ),
);
await page.getByLabel("Arquivo de alternativas").setInputFiles({
  name: "alternativas-teste.json", mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify({ version: 1, date: "2026-09-30", suggestions: [{ currentFundId: "F1", alternatives: [{ id: "F2", name: "Alternativa de teste anonimizada", returns: [0.01, 0.1, 0.1453, null], date: "2026-09-30", sourceUrl: "https://maisretorno.com/fundo/exemplo" }] }] })),
});
await page.getByRole("heading", { name: "Alternativa de teste anonimizada" }).waitFor();
assert.ok((await page.locator(".fd-return-card").last().innerText()).includes("14,53%"));
assert.ok(!(await page.locator(".fd-return-card").last().innerText()).includes("fictícios"));
assert.ok(!/Sharpe|volatilidade|correlação|quartil|taxa adm/i.test(await page.locator(".fd-return-card").last().innerText()));
await page.getByText("Alternativas condicionais à revisão", { exact: false }).waitFor();
await page.reload({ waitUntil: "networkidle" });
await page.getByText("Modo demonstração", { exact: true }).waitFor();
await page.goto("http://127.0.0.1:5173/planejamento", {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: "Iniciar planejamento" }).waitFor();
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: seis abas; prioridade → tarefa → decisão → histórico; resumo e CSV; comparador sem métricas técnicas; filtros; mobile; importação anônima e descarte no reload; formulário original preservado.",
);
