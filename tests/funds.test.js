import test from "node:test";
import assert from "node:assert/strict";
import {
  importPositions,
  parseCsv,
  positionCsv,
  groupClients,
  buildAlerts,
  exposedBalance,
  sum,
  importSuggestions,
} from "../src/funds/model.js";
const header =
  "conta;cliente;assessor;fundo_id;fundo;estrategia;gestora;saldo;data;liquidez\n";
const row =
  "001;Cliente anônimo;IN;f-1;Fundo exemplo;Crédito privado;Gestora exemplo;1.234,56;2026-09-30;D+30 úteis";
test("importação valida saldo brasileiro e mantém identidades de conta", () => {
  const data = importPositions(
    header + row + "\n" + row.replace("001;", "002;"),
  );
  assert.equal(data.positions[0].balance, 1234.56);
  assert.equal(groupClients(data.positions).length, 2);
  assert.equal(data.funds.length, 1);
  assert.deepEqual(data.funds[0].returns, [null, null, null, null]);
  assert.equal(data.mode, "imported");
});
test("CSV com aspas, delimitador e quebras em campos faz roundtrip sem mudar saldos", () => {
  const data = importPositions(
    header +
      row.replace("Cliente anônimo", '"Cliente; \"\"anônimo\"\"\nexemplo"'),
  );
  assert.equal(data.positions[0].client, 'Cliente; "anônimo"\nexemplo');
  const again = importPositions(positionCsv(data, data.positions));
  assert.equal(sum(again.positions), 1234.56);
  assert.equal(again.positions[0].client, data.positions[0].client);
  assert.equal(parseCsv('"a;b";c\r\n"linha\n2";d').length, 2);
});
test("lotes ambíguos, duplicados e inválidos são rejeitados integralmente", () => {
  for (const body of [
    row + "\n" + row,
    row.replace("2026-09-30", "2026-02-30"),
    row.replace("1.234,56", "-100"),
    row.replace("1.234,56", "1234.56"),
    row.replace("Fundo exemplo", "Plano VGBL"),
    row +
      "\n" +
      row.replace("001;", "002;").replace("2026-09-30", "2026-09-29"),
    row +
      "\n" +
      row.replace("f-1;", "f-2;").replace("Cliente anônimo", "Outra pessoa"),
  ])
    assert.throws(() => importPositions(header + body));
  assert.throws(() => parseCsv('"sem fechamento'));
});
test("filtrar estratégia não transforma concentração parcial em 100% da conta", () => {
  const data = importPositions(header + row + "\n" + row.replace("f-1;", "f-2;").replace("1.234,56", "5.000,00"));
  const selected = data.positions.filter((p) => p.fundId === "f-1");
  const alerts = buildAlerts(data, selected, 0.35).filter(
    (a) => a.type === "Concentração",
  );
  assert.equal(alerts.length, 0);
  assert.ok(
    buildAlerts(data, data.positions, 0.35).some(
      (a) => a.type === "Concentração",
    ),
  );
});
test("exposição em múltiplos alertas não soma duas vezes a mesma posição", () => {
  const data = importPositions(header + row);
  const a = { fundId: "f-1", clientKey: "IN:001" };
  assert.equal(exposedBalance(data.positions, [a, a]), 1234.56);
  assert.equal(buildAlerts(data, data.positions, 0.35).length, 1);
  assert.ok(
    buildAlerts(data, data.positions, 0.35).every(
      (a) => a.type === "Concentração",
    ),
  );
});
test("exportação neutraliza fórmulas e mantém apenas posições selecionadas", () => {
  const data = importPositions(
    header + row.replace("Cliente anônimo", '"=HYPERLINK(""x"")"'),
  );
  const csv = positionCsv(data, data.positions);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.equal(parseCsv(csv).length, 2);
});
test("retornos importados exigem fonte e data equivalentes; negativos sobrevivem à exportação", () => {
  const expanded = header.trim() + ";ret_mes_pct;ret_ano_pct;ret_12m_pct;ret_24m_aa_pct;data_cota;fonte_url\n";
  const body = row + ";-0,50;10,2;14,53;;2026-09-30;https://maisretorno.com/fundo/exemplo";
  const data = importPositions(expanded + body);
  [-0.005, 0.102, 0.1453].forEach((v, i) => assert.ok(Math.abs(data.funds[0].returns[i] - v) < 1e-12));
  assert.equal(data.funds[0].returns[3], null);
  assert.deepEqual(importPositions(positionCsv(data, data.positions)).funds[0].returns, data.funds[0].returns);
  for (const bad of [body.replace(";2026-09-30;https", ";2026-10-01;https"), body.replace("https://maisretorno.com", "http://maisretorno.com"), body.replace("14,53", "14.53")])
    assert.throws(() => importPositions(expanded + bad));
});
test("curadoria local aceita somente campos de exibição e impede mistura de datas e fundos", () => {
  const data = importPositions(header + row);
  const bundle = { version: 1, date: data.date, suggestions: [{ currentFundId: "f-1", alternatives: [{ id: "f-2", name: "Alternativa pública", returns: [0.01, 0.1, 0.14, null], date: data.date, sourceUrl: "https://maisretorno.com/fundo/exemplo" }] }] };
  const read = () => importSuggestions(JSON.stringify(bundle), data);
  assert.equal(read()["f-1"][0].name, "Alternativa pública");
  bundle.suggestions[0].alternatives[0].sharpe = 1;
  assert.throws(read);
  delete bundle.suggestions[0].alternatives[0].sharpe;
  bundle.date = "2026-10-16";
  assert.throws(read);
  bundle.date = data.date;
  bundle.suggestions[0].currentFundId = "ausente";
  assert.throws(read);
});
