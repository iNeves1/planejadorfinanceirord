import { importPositions, importSuggestions, positionCsv } from "./model.js";
import { importMarket } from "./performance.js";

const statuses = ["Em análise", "Conversado", "Aguardando cliente", "Concluído"];
const keysAre = (value, keys) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const text = (value, max, required = true) => typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);
const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

// Somente campos usados pelo painel. Nenhuma métrica de seleção ou documento técnico.
export function importWorkspace(content, filename = "Arquivo de trabalho") {
  if (typeof content !== "string" || content.length > 10 * 1024 * 1024)
    throw new Error("O arquivo de trabalho deve ter até 10 MB.");
  const input = JSON.parse(content);
  const fields = ["format", "version", "date", "positionsCsv", "curation", "reviews", "tasks", "settings"];
  if (input?.version === 2) fields.push("market");
  if (!keysAre(input, fields) ||
      input.format !== "rd-fundos-workspace" || ![1, 2].includes(input.version) || !validDate(input.date) ||
      !text(input.positionsCsv, 5 * 1024 * 1024) || !Array.isArray(input.reviews) || input.reviews.length > 20000 ||
      !Array.isArray(input.tasks) || input.tasks.length > 5000 ||
      !keysAre(input.settings, ["concentrationLimit"]) ||
      typeof input.settings.concentrationLimit !== "number" || !Number.isFinite(input.settings.concentrationLimit) ||
      input.settings.concentrationLimit < 0.01 || input.settings.concentrationLimit > 1)
    throw new Error("Arquivo de trabalho inválido. Use o pacote RD Fundos ou um backup exportado pelo painel.");
  const data = importPositions(input.positionsCsv, filename);
  if (data.date !== input.date) throw new Error("A referência do pacote difere das posições.");
  if (input.version === 2) data.market = importMarket(input.market, data);
  data.suggestions = importSuggestions(JSON.stringify(input.curation), data);
  data.workspace = true;
  const reviewIds = new Set();
  data.reviews = input.reviews.map((review, index) => {
    if (!keysAre(review, ["account", "fundId", "type", "severity", "title", "reason", "next", "source", "date"]) ||
        !text(review.account, 120) || !text(review.fundId, 120) ||
        !["Desempenho", "Dados", "Liquidez", "Mudança no fundo", "Queda"].includes(review.type) ||
        !["high", "medium"].includes(review.severity) || !text(review.title, 300) ||
        !text(review.reason, 1500) || !text(review.next, 1500) || !text(review.source, 500) || review.date !== data.date)
      throw new Error(`Prioridade ${index + 1}: campos inválidos ou referência incompatível.`);
    const position = data.positions.find((p) => p.account === review.account && p.fundId === review.fundId);
    const key = JSON.stringify([review.account, review.fundId, review.type]);
    if (!position || reviewIds.has(key)) throw new Error(`Prioridade ${index + 1}: posição ausente ou revisão duplicada.`);
    reviewIds.add(key);
    return { ...review, id: `review:${index}`, clientKey: `${position.advisor}:${position.clientId}` };
  });
  const ids = new Set();
  const tasks = input.tasks.map((task, index) => {
    if (!keysAre(task, ["id", "title", "notes", "clientKey", "fundId", "owner", "due", "status", "history"]) ||
        !text(task.id, 120) || ids.has(task.id) || !text(task.title, 300) || !text(task.notes, 6000) ||
        !text(task.owner, 300, false) || !validDate(task.due) || !statuses.includes(task.status) ||
        !Array.isArray(task.history) || !task.history.length || task.history.length > 1000)
      throw new Error(`Acompanhamento ${index + 1}: registro inválido.`);
    const position = data.positions.find((p) => `${p.advisor}:${p.clientId}` === task.clientKey && p.fundId === task.fundId);
    if (!position) throw new Error(`Acompanhamento ${index + 1}: conta ou fundo ausente na carteira.`);
    let previous = -Infinity;
    const history = task.history.map((entry) => {
      if (!keysAre(entry, ["status", "notes", "at"]) || !statuses.includes(entry.status) ||
          !text(entry.notes, 6000) || !text(entry.at, 40) || !/^\d{4}-\d{2}-\d{2}T/.test(entry.at) ||
          !Number.isFinite(Date.parse(entry.at)) || Date.parse(entry.at) < previous)
        throw new Error(`Acompanhamento ${index + 1}: histórico inválido.`);
      previous = Date.parse(entry.at);
      return entry;
    });
    if (history.at(-1).status !== task.status) throw new Error(`Acompanhamento ${index + 1}: status não corresponde ao histórico.`);
    ids.add(task.id);
    return { ...task, history, client: position.client, fund: data.funds.find((f) => f.id === task.fundId).name };
  });
  return { data, tasks, limit: input.settings.concentrationLimit };
}

export function exportWorkspace(data, tasks, limit) {
  if (data.mode !== "imported") throw new Error("Carregue uma carteira para salvar um arquivo de trabalho.");
  const bundle = {
    format: "rd-fundos-workspace", version: data.market ? 2 : 1, date: data.date,
    positionsCsv: positionCsv(data, data.positions),
    curation: { version: 1, date: data.date, suggestions: Object.entries(data.suggestions || {}).map(([currentFundId, alternatives]) => ({ currentFundId, alternatives })) },
    reviews: (data.reviews || []).map(({ account, fundId, type, severity, title, reason, next, source, date }) => ({ account, fundId, type, severity, title, reason, next, source, date })),
    tasks: tasks.map(({ id, title, notes, clientKey, fundId, owner, due, status, history }) => ({ id, title, notes, clientKey, fundId, owner, due, status, history })),
    settings: { concentrationLimit: limit },
  };
  if (data.market) bundle.market = data.market;
  const serialized = JSON.stringify(bundle);
  // Garante que um backup gerado também pode ser restaurado pelo mesmo contrato.
  importWorkspace(serialized);
  return serialized;
}

export function readInitialWorkspace(fallback) {
  const seed = typeof document !== "undefined" && document.getElementById("rd-private-workspace");
  if (!seed) return { data: fallback, tasks: [], limit: 0.35 };
  try { return importWorkspace(seed.textContent, "XPerformance · arquivo privado"); }
  catch (error) { return { data: fallback, tasks: [], limit: 0.35, error: error.message }; }
}
