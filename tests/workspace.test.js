import test from "node:test";
import assert from "node:assert/strict";
import { importWorkspace, exportWorkspace } from "../src/funds/workspace.js";
import { buildAlerts, exposedBalance } from "../src/funds/model.js";

import { fixture, marketFixture, auditFixture } from "./fixtures/workspace.js";

test("arquivo único restaura posições, alternativas, prioridades e histórico", () => {
  const restored = importWorkspace(JSON.stringify(fixture()));
  assert.equal(restored.data.positions.length, 2);
  assert.equal(restored.data.suggestions.F1[0].id, "F2");
  assert.equal(restored.tasks[0].client, "Conta de teste 1");
  assert.equal(restored.tasks[0].history.at(-1).notes, "Decisão sintética: manter e revisar.");
  assert.equal(restored.limit, 0.4);
  const again = importWorkspace(exportWorkspace(restored.data, restored.tasks, restored.limit));
  assert.deepEqual(again.tasks, restored.tasks);
  assert.deepEqual(again.data.reviews, restored.data.reviews);
});

test("v3 preserva conferência, retornos XP e investigações sem mudar a serialização v2", () => {
  const input = auditFixture();
  const restored = importWorkspace(JSON.stringify(input));
  const backup = JSON.parse(exportWorkspace(restored.data, restored.tasks, restored.limit));
  assert.equal(backup.version, 3);
  assert.deepEqual(backup.positionPerformance, input.positionPerformance);
  assert.deepEqual(backup.audit, input.audit);
  assert.equal(restored.data.funds.find((fund) => fund.id === "F1").returns[1], .08);
  assert.equal(restored.data.positionPerformance[0].year, .03, "retorno do cliente não é substituído pelo retorno do fundo");
  assert.equal(restored.data.positionPerformance[0].yearCdi, 1.02, "%CDI XP não é recalculado pela janela completa");
  const v2 = importWorkspace(JSON.stringify(marketFixture()));
  const legacy = JSON.parse(exportWorkspace(v2.data, v2.tasks, v2.limit));
  assert.equal(legacy.version, 2);
  assert.ok(!Object.hasOwn(legacy, "audit") && !Object.hasOwn(legacy, "positionPerformance"));
  for (const mutate of [
    (b) => { b.audit.reference = "2026-08-31"; },
    (b) => { b.audit.checkedAt = "2026-08-31"; },
    (b) => { b.positionPerformance[0].account = "A3"; },
    (b) => { b.positionPerformance[0].advisor = "OUTRO"; },
    (b) => { b.positionPerformance[0].year = "3"; },
    (b) => { b.positionPerformance[0].date = "2026-10-01"; },
    (b) => { b.positionPerformance.push({ ...b.positionPerformance[0] }); },
    (b) => { b.positionPerformance[0].sharpe = 1; },
  ]) { const b = auditFixture(); mutate(b); assert.throws(() => importWorkspace(JSON.stringify(b))); }
});
test("revisão de uma conta não é atribuída às demais que têm o mesmo fundo", () => {
  const { data } = importWorkspace(JSON.stringify(fixture()));
  const alerts = buildAlerts(data, data.positions, 1);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].balance, 1000.56);
  assert.equal(exposedBalance(data.positions, alerts), 1000.56);
  assert.equal(buildAlerts(data, data.positions.filter((p) => p.account === "A2"), 1).length, 0);
});
test("pacote rejeita mistura de contas, datas, análise técnica e histórico inconsistente", () => {
  const mutations = [
    (b) => { b.reviews[0].account = "inexistente"; },
    (b) => { b.reviews[0].date = "2026-10-01"; },
    (b) => { b.reviews.push({ ...b.reviews[0] }); },
    (b) => { b.sharpe = 1; },
    (b) => { b.reviews[0].correlation = 0.5; },
    (b) => { b.tasks[0].fundId = "inexistente"; },
    (b) => { b.tasks[0].status = "Concluído"; },
    (b) => { b.tasks[0].history.reverse(); },
    (b) => { b.settings.concentrationLimit = 1.1; },
    (b) => { b.date = "2026-10-01"; },
  ];
  for (const mutate of mutations) { const b = fixture(); mutate(b); assert.throws(() => importWorkspace(JSON.stringify(b))); }
});
