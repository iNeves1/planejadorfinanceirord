import test from "node:test";
import assert from "node:assert/strict";
import { importWorkspace, exportWorkspace } from "../src/funds/workspace.js";
import { weightedPerformance, benchmarkComparison, fundReference } from "../src/funds/performance.js";
import { priorityClients } from "../src/funds/model.js";
import { fixture, marketFixture } from "./fixtures/workspace.js";

test("indicador usa somente saldo com retorno e revela cobertura parcial por período", () => {
  const { data } = importWorkspace(JSON.stringify(marketFixture()));
  const metric = weightedPerformance(data, data.positions);
  assert.ok(Math.abs(metric.value - 0.12) < 1e-12);
  assert.equal(metric.coveredBalance, 3001);
  assert.equal(metric.totalBalance, 4001);
  assert.equal(metric.fundCount, 1);
  assert.equal(metric.coverage, 3001 / 4001);
  assert.equal(weightedPerformance(data, data.positions, 3).value, null);
  assert.equal(weightedPerformance(data, data.positions, 3).coverage, 0);
  assert.equal(weightedPerformance(data, []).coverage, null);
  const negative = structuredClone(data);
  negative.funds[0].returns[2] = -0.1;
  assert.ok(Math.abs(weightedPerformance(negative, negative.positions).value + 0.1) < 1e-12);
  negative.funds[0].date = "2026-10-01";
  assert.equal(weightedPerformance(negative, negative.positions).value, null);
});

test("comparação exige vínculo explícito e datas equivalentes; índice não positivo não gera razão", () => {
  const { data } = importWorkspace(JSON.stringify(marketFixture()));
  const comparison = benchmarkComparison(data, "F1");
  assert.equal(comparison.ratio, 0.12 / 0.15);
  assert.equal(comparison.excess, 0.12 - 0.15);
  assert.equal(fundReference(data, "F3"), null);
  assert.equal(benchmarkComparison(data, "F3"), null);
  const metric = weightedPerformance(data, data.positions, 2, "CDI");
  assert.equal(metric.totalBalance, 3001);
  assert.equal(metric.coverage, 1);
  for (const value of [0, -0.05]) {
    data.market.benchmarks[0].returns[2] = value;
    assert.equal(benchmarkComparison(data, "F1").ratio, null);
  }
  data.market.benchmarks[0].date = "2026-10-01";
  assert.equal(benchmarkComparison(data, "F1"), null);
});

test("backup v2 preserva índices e vínculos sem quebrar arquivos v1", () => {
  const restored = importWorkspace(JSON.stringify(marketFixture()));
  const backup = JSON.parse(exportWorkspace(restored.data, restored.tasks, restored.limit));
  assert.equal(backup.version, 2);
  assert.deepEqual(backup.market, marketFixture().market);
  assert.deepEqual(importWorkspace(JSON.stringify(backup)).data.market, restored.data.market);
  const legacy = importWorkspace(JSON.stringify(fixture()));
  assert.equal(JSON.parse(exportWorkspace(legacy.data, legacy.tasks, legacy.limit)).version, 1);
});

test("contrato de índices rejeita mistura de períodos, origem inválida, vínculos ambíguos e pesquisa técnica", () => {
  const mutations = [
    (bundle) => { bundle.market.date = "2026-10-01"; },
    (bundle) => { bundle.market.benchmarks[0].date = "2026-10-01"; },
    (bundle) => { bundle.market.benchmarks[0].sourceUrl = "https://api.bcb.gov.br.evil.test/x"; },
    (bundle) => { bundle.market.benchmarks[0].sourceUrl = "https://u:p@api.bcb.gov.br/x"; },
    (bundle) => { bundle.market.benchmarks[0].returns = [null, null, null, null]; },
    (bundle) => { bundle.market.benchmarks[0].returns[2] = "0.15"; },
    (bundle) => { bundle.market.benchmarks.push({ ...bundle.market.benchmarks[0] }); },
    (bundle) => { bundle.market.fundReferences.push({ ...bundle.market.fundReferences[0] }); },
    (bundle) => { bundle.market.fundReferences[0].fundId = "ausente"; },
    (bundle) => { bundle.market.fundReferences[0].benchmarkId = "ausente"; },
    (bundle) => { bundle.market.fundReferences[0].sharpe = 1; },
    (bundle) => { bundle.market.correlation = [[1]]; },
    (bundle) => { bundle.version = 1; },
  ];
  for (const mutate of mutations) {
    const bundle = marketFixture(); mutate(bundle);
    assert.throws(() => importWorkspace(JSON.stringify(bundle)));
  }
});

test("prioridades por conta não duplicam exposição e preservam denominador completo ao filtrar", () => {
  const { data } = importWorkspace(JSON.stringify(marketFixture()));
  data.positions.push({ ...data.positions[0], fundId: "F3", balance: 3000 });
  const alerts = [
    { clientKey: "IN:A1", fundId: "F1", severity: "high" },
    { clientKey: "IN:A1", fundId: "F1", severity: "high" },
    { clientKey: "IN:A2", fundId: "F1", severity: "medium" },
  ];
  const ranked = priorityClients(data, data.positions.filter((position) => position.fundId === "F1"), alerts);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].exposure, 1000.56);
  assert.equal(ranked[0].accountBalance, 4000.56);
  assert.equal(ranked[0].weight, 1000.56 / 4000.56);
  assert.deepEqual(ranked[0].fundIds, ["F1"]);
});
