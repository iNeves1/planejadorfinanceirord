export const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
export const compact = (value) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
export const percent = (value) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
export const dateLabel = (value) =>
  value ? value.split("-").reverse().join("/") : "Não informada";
export const sum = (positions) =>
  positions.reduce((total, p) => total + p.balance, 0);
export function groupClients(positions) {
  const groups = new Map();
  for (const p of positions) {
    // Importações usam a conta como identidade: nenhuma fusão de pessoas por nome.
    const key = `${p.advisor}:${p.clientId}`;
    if (!groups.has(key))
      groups.set(key, {
        key,
        id: p.clientId,
        name: p.client,
        advisor: p.advisor,
        positions: [],
      });
    groups.get(key).positions.push(p);
  }
  return [...groups.values()]
    .map((c) => ({ ...c, balance: sum(c.positions) }))
    .sort((a, b) => b.balance - a.balance);
}
export function buildAlerts(data, positions, limit = 0.35) {
  const clients = groupClients(positions);
  const concentration = clients.flatMap((c) => {
    const byFund = new Map();
    for (const p of c.positions)
      byFund.set(p.fundId, (byFund.get(p.fundId) || 0) + p.balance);
    return [...byFund].flatMap(([fundId, balance]) =>
      c.balance > 0 &&
      balance /
        sum(
          data.positions.filter(
            (p) => p.advisor === c.advisor && p.clientId === c.id,
          ),
        ) >
        limit
        ? [
            {
              id: `concentration:${c.key}:${fundId}`,
              fundId,
              clientKey: c.key,
              type: "Concentração",
              severity: "medium",
              title: `${c.name}: concentração em um fundo`,
              reason: `${percent(balance / sum(data.positions.filter((p) => p.advisor === c.advisor && p.clientId === c.id)))} dos fundos desta conta, acima do limite de triagem de ${percent(limit)}.`,
              next: "Revisar o papel do fundo e a diversificação da conta.",
              period: dateLabel(data.date),
              source: data.source,
              clients: [c],
              balance,
            },
          ]
        : [],
    );
  });
  const imported = data.mode === "imported" ? (data.reviews || []).flatMap((review) => {
    const affected = clients.filter((c) => c.key === review.clientKey && c.positions.some((p) => p.fundId === review.fundId));
    return affected.length ? [{ ...review, clients: affected, period: dateLabel(review.date),
      balance: sum(positions.filter((p) => `${p.advisor}:${p.clientId}` === review.clientKey && p.fundId === review.fundId)) }] : [];
  }) : [];
  return [...imported, ...concentration].sort(
    (a, b) =>
      Number(b.severity === "high") - Number(a.severity === "high") ||
      b.balance - a.balance,
  );
}
export function exposedBalance(positions, alerts) {
  return sum(
    positions.filter((p) =>
      alerts.some(
        (a) =>
          a.fundId === p.fundId &&
          (!a.clientKey || a.clientKey === `${p.advisor}:${p.clientId}`),
      ),
    ),
  );
}
export function priorityClients(data, positions, alerts) {
  return groupClients(positions).map((client) => {
    const applicable = alerts.filter((alert) => alert.severity === "high" &&
      (!alert.clientKey || alert.clientKey === client.key));
    const affected = client.positions.filter((position) => applicable.some((alert) => alert.fundId === position.fundId));
    const exposure = sum(affected);
    const accountBalance = sum(data.positions.filter((position) => `${position.advisor}:${position.clientId}` === client.key));
    return { ...client, exposure, accountBalance, weight: accountBalance > 0 ? exposure / accountBalance : null,
      fundIds: [...new Set(affected.map((position) => position.fundId))] };
  }).filter((client) => client.exposure > 0).sort((a, b) => b.exposure - a.exposure || a.key.localeCompare(b.key));
}
// Exposição ao fundo sinalizado, sem atribuir a todas as contas o alerta individual.
export const isPerformanceReview = (alert) => ["Desempenho", "Desempenho a investigar"].includes(alert.type);
export function underperformanceExposure(data, positions, alerts) {
  const fundIds = new Set(alerts.filter(isPerformanceReview).map((alert) => alert.fundId));
  const affected = positions.filter((position) => fundIds.has(position.fundId));
  const clients = groupClients(affected).map((client) => {
    const accountBalance = sum(data.positions.filter((p) => `${p.advisor}:${p.clientId}` === client.key));
    return { ...client, accountBalance, weight: accountBalance > 0 ? client.balance / accountBalance : null };
  });
  const funds = data.funds.filter((fund) => affected.some((p) => p.fundId === fund.id)).map((fund) => {
    const fundPositions = affected.filter((p) => p.fundId === fund.id);
    return { fund, balance: sum(fundPositions), clients: groupClients(fundPositions) };
  });
  return { positions: affected, clients, funds };
}
export function allocation(positions, funds, field = "strategy") {
  const total = sum(positions),
    groups = new Map();
  for (const p of positions) {
    const name =
      funds.find((f) => f.id === p.fundId)?.[field] || "Não informado";
    groups.set(name, (groups.get(name) || 0) + p.balance);
  }
  return [...groups]
    .map(([name, balance]) => ({
      name,
      balance,
      weight: total ? balance / total : 0,
    }))
    .sort((a, b) => b.balance - a.balance);
}
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text) && !/^-\d+(?:[,.]\d+)?$/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function positionCsv(data, positions) {
  const rows = [
    [
      "conta",
      "cliente",
      "assessor",
      "fundo_id",
      "fundo",
      "estrategia",
      "gestora",
      "saldo",
      "data",
      "liquidez",
      "ret_mes_pct", "ret_ano_pct", "ret_12m_pct", "ret_24m_aa_pct", "data_cota", "fonte_url",
    ],
  ];
  for (const p of positions) {
    const f = data.funds.find((f) => f.id === p.fundId);
    rows.push([
      p.account,
      p.client,
      p.advisor,
      p.fundId,
      f?.name,
      f?.strategy,
      f?.manager,
      p.balance.toFixed(2).replace(".", ","),
      p.date,
      f?.liquidity,
      ...(data.mode === "imported" ? f?.returns || [] : [null, null, null, null]).map((v) => v == null ? "" : (v * 100).toFixed(8).replace(".", ",")),
      data.mode === "imported" ? f?.date || "" : "", data.mode === "imported" ? f?.sourceUrl || "" : "",
    ]);
  }
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
// CSV delimitado por ponto e vírgula; aspas e quebras em campos são suportadas.
export function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\ufeff/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted) quoted = false;
      else if (cell === "") quoted = true;
      else throw new Error("Aspas inválidas no CSV.");
    } else if (!quoted && ch === ";") {
      row.push(cell);
      cell = "";
    } else if (!quoted && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("Campo com aspas não fechadas.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function importPositions(text, filename = "CSV importado") {
  const [header, ...rows] = parseCsv(text);
  const required = [
    "conta",
    "cliente",
    "assessor",
    "fundo_id",
    "fundo",
    "estrategia",
    "gestora",
    "saldo",
    "data",
  ];
  if (
    !header ||
    required.some((k) => !header.includes(k)) ||
    new Set(header).size !== header.length
  )
    throw new Error("Cabeçalho inválido. Baixe o modelo de importação.");
  if (!rows.length || rows.length > 10000)
    throw new Error("O lote deve conter entre 1 e 10.000 posições.");
  const positions = [],
    funds = new Map(),
    keys = new Set(),
    accounts = new Map();
  let date;
  for (const [idx, row] of rows.entries()) {
    const label = `Linha ${idx + 2}`;
    if (row.length !== header.length)
      throw new Error(`${label}: quantidade de colunas inválida.`);
    const item = Object.fromEntries(header.map((k, i) => [k, row[i].trim()]));
    if (
      required.some((k) => !item[k]) ||
      Object.values(item).some((v) => v.length > 300)
    )
      throw new Error(`${label}: campo obrigatório ausente ou muito longo.`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(item.data) ||
      Number.isNaN(Date.parse(item.data)) ||
      new Date(item.data).toISOString().slice(0, 10) !== item.data
    )
      throw new Error(`${label}: use uma data válida AAAA-MM-DD.`);
    if (date && date !== item.data)
      throw new Error(`${label}: o lote deve ter uma única data de posição.`);
    date = item.data;
    if (/prev|vgbl|pgbl/i.test(`${item.fundo} ${item.estrategia}`))
      throw new Error(
        `${label}: produto de previdência fora do escopo. Classifique e revise a origem.`,
      );
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(item.saldo))
      throw new Error(
        `${label}: saldo inválido; use 1234,56, sem símbolo de moeda.`,
      );
    const balance = Number(item.saldo.replaceAll(".", "").replace(",", "."));
    if (!Number.isFinite(balance) || balance <= 0 || balance > 1e12)
      throw new Error(
        `${label}: o saldo deve ser positivo e não exceder R$ 1 trilhão.`,
      );
    const key = JSON.stringify([item.conta, item.fundo_id]);
    if (keys.has(key))
      throw new Error(
        `${label}: conta e fundo duplicados. Consolide a posição na origem.`,
      );
    keys.add(key);
    const accountInfo = JSON.stringify([item.cliente, item.assessor]);
    if (accounts.has(item.conta) && accounts.get(item.conta) !== accountInfo)
      throw new Error(`${label}: cadastro conflitante para a mesma conta.`);
    accounts.set(item.conta, accountInfo);
    const fund = {
      id: item.fundo_id,
      name: item.fundo,
      short: item.fundo,
      strategy: item.estrategia,
      manager: item.gestora,
      liquidity: item.liquidez || "Não informada",
      role: "Não cadastrado",
      returns: ["ret_mes_pct", "ret_ano_pct", "ret_12m_pct", "ret_24m_aa_pct"].map((key) => {
        if (!item[key]) return null;
        if (!/^-?\d+(?:,\d{1,10})?$/.test(item[key]))
          throw new Error(`${label}: retorno inválido; use percentual decimal com vírgula, sem símbolo de %.`);
        const value = Number(item[key].replace(",", ".")) / 100;
        if (!Number.isFinite(value) || value < -1 || value > 100)
          throw new Error(`${label}: retorno fora dos limites aceitos.`);
        return value;
      }),
      date: item.data_cota || null,
      sourceUrl: item.fonte_url || "",
    };
    if (fund.returns.some((v) => v != null)) {
      if (!validDate(fund.date) || fund.date !== date || !publicSource(fund.sourceUrl))
        throw new Error(`${label}: retornos exigem data_cota igual à posição e fonte_url HTTPS pública.`);
    } else if (fund.date || fund.sourceUrl) {
      throw new Error(`${label}: referência de retorno informada sem rentabilidade.`);
    }
    if (
      funds.has(fund.id) &&
      JSON.stringify(funds.get(fund.id)) !== JSON.stringify(fund)
    )
      throw new Error(`${label}: cadastro conflitante para o mesmo fundo.`);
    funds.set(fund.id, fund);
    positions.push({
      account: item.conta,
      clientId: item.conta,
      client: item.cliente,
      advisor: item.assessor,
      fundId: item.fundo_id,
      balance,
      date,
    });
  }
  return {
    mode: "imported",
    date,
    source: filename,
    funds: [...funds.values()],
    positions,
  };
}
export const templateCsv =
  "\ufeffconta;cliente;assessor;fundo_id;fundo;estrategia;gestora;saldo;data;liquidez;ret_mes_pct;ret_ano_pct;ret_12m_pct;ret_24m_aa_pct;data_cota;fonte_url\r\n";
function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function publicSource(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["maisretorno.com", "www.maisretorno.com", "dados.cvm.gov.br", "www.xpasset.com.br"].includes(url.hostname);
  } catch { return false; }
}
// O pacote contém somente identificação, retornos e fonte. A pesquisa fica fora do painel.
export function importSuggestions(text, data) {
  if (data.mode !== "imported") throw new Error("Importe primeiro uma carteira real.");
  const bundle = JSON.parse(text);
  const keysAre = (value, keys) => value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
  if (!keysAre(bundle, ["version", "date", "suggestions"]) || bundle.version !== 1 ||
      bundle.date !== data.date || !Array.isArray(bundle.suggestions) || bundle.suggestions.length > 200)
    throw new Error("Pacote inválido ou referência diferente da carteira.");
  const result = Object.create(null), seen = new Set();
  for (const entry of bundle.suggestions) {
    if (!keysAre(entry, ["currentFundId", "alternatives"]) ||
        !data.funds.some((f) => f.id === entry.currentFundId) || seen.has(entry.currentFundId) ||
        !Array.isArray(entry.alternatives) || !entry.alternatives.length || entry.alternatives.length > 3)
      throw new Error("Fundo atual ausente, repetido ou lista de alternativas inválida.");
    seen.add(entry.currentFundId);
    const ids = new Set();
    result[entry.currentFundId] = entry.alternatives.map((fund) => {
      if (!keysAre(fund, ["id", "name", "returns", "date", "sourceUrl"]) ||
          typeof fund.id !== "string" || !fund.id || fund.id.length > 120 || fund.id === entry.currentFundId || ids.has(fund.id) ||
          typeof fund.name !== "string" || !fund.name.trim() || fund.name.length > 300 ||
          fund.date !== data.date || !publicSource(fund.sourceUrl) ||
          !Array.isArray(fund.returns) || fund.returns.length !== 4 || !fund.returns.some((v) => v != null) ||
          fund.returns.some((v) => v !== null && (typeof v !== "number" || !Number.isFinite(v) || v < -1 || v > 100)))
        throw new Error("Alternativa inválida: confira identificação, quatro retornos decimais, referência e fonte.");
      ids.add(fund.id);
      return fund;
    });
  }
  return result;
}
export function download(filename, content, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
