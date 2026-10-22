import test from "node:test";
import assert from "node:assert/strict";
import { importWorkspace, exportWorkspace } from "../src/funds/workspace.js";
import { buildAlerts, exposedBalance } from "../src/funds/model.js";

import { fixture } from "./fixtures/workspace.js";

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
