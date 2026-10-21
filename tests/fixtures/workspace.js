export function fixture() {
  return {
    format: "rd-fundos-workspace", version: 1, date: "2026-09-30",
    positionsCsv: "conta;cliente;assessor;fundo_id;fundo;estrategia;gestora;saldo;data\nA1;Conta de teste 1;IN;F1;Fundo de teste;Multimercado;Gestora fictícia;1000,56;2026-09-30\nA2;Conta de teste 2;IN;F1;Fundo de teste;Multimercado;Gestora fictícia;2000,44;2026-09-30",
    curation: { version: 1, date: "2026-09-30", suggestions: [{ currentFundId: "F1", alternatives: [{ id: "F2", name: "Alternativa sintética", returns: [0.01, 0.1, 0.14, null], date: "2026-09-30", sourceUrl: "https://maisretorno.com/fundo/exemplo" }] }] },
    reviews: [{ account: "A1", fundId: "F1", type: "Desempenho", severity: "high", title: "Revisar posição de teste", reason: "Motivo sintético para testar revisão por conta.", next: "Conferir o contexto antes da conversa.", source: "Teste automatizado", date: "2026-09-30" }],
    tasks: [{ id: "task-1", title: "Conversa de teste", notes: "Revisar tese", clientKey: "IN:A1", fundId: "F1", owner: "Assessor de teste", due: "2026-11-05", status: "Conversado", history: [{ status: "Em análise", notes: "Revisar tese", at: "2026-10-20T12:00:00.000Z" }, { status: "Conversado", notes: "Decisão sintética: manter e revisar.", at: "2026-10-21T12:00:00.000Z" }] }],
    settings: { concentrationLimit: 0.4 },
  };
}
