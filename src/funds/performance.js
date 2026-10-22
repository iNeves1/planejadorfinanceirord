// Indicadores históricos dos fundos, ponderados pelos saldos da fotografia.
// Não representam TWR, MWR ou rentabilidade efetiva de uma conta.
const keysAre = (value, keys) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const label = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const returnsAreValid = (values) => Array.isArray(values) && values.length === 4 &&
  values.some((value) => value !== null) && values.every((value) => value === null ||
    (typeof value === "number" && Number.isFinite(value) && value >= -1 && value <= 100));
function sourceIsValid(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["api.bcb.gov.br", "www.bcb.gov.br", "dados.cvm.gov.br", "maisretorno.com",
        "www.maisretorno.com", "www.xpasset.com.br", "xpasset-files.s3.amazonaws.com", "www.anbima.com.br"].includes(url.hostname);
  } catch { return false; }
}

export function importMarket(input, data) {
  if (!keysAre(input, ["date", "benchmarks", "fundReferences"]) || input.date !== data.date ||
      !Array.isArray(input.benchmarks) || input.benchmarks.length > 100 ||
      !Array.isArray(input.fundReferences) || input.fundReferences.length > data.funds.length)
    throw new Error("Referências de mercado inválidas ou com data diferente da carteira.");
  const benchmarkIds = new Set(), fundIds = new Set();
  for (const benchmark of input.benchmarks) {
    if (!keysAre(benchmark, ["id", "name", "returns", "date", "sourceUrl"]) ||
        !label(benchmark.id, 120) || benchmarkIds.has(benchmark.id) || !label(benchmark.name, 120) ||
        !returnsAreValid(benchmark.returns) || benchmark.date !== data.date || !sourceIsValid(benchmark.sourceUrl))
      throw new Error("Índice inválido: confira identificação, retornos, referência e fonte.");
    benchmarkIds.add(benchmark.id);
  }
  for (const reference of input.fundReferences) {
    if (!keysAre(reference, ["fundId", "benchmarkId", "sourceUrl"]) ||
        !data.funds.some((fund) => fund.id === reference.fundId) || fundIds.has(reference.fundId) ||
        !benchmarkIds.has(reference.benchmarkId) || !sourceIsValid(reference.sourceUrl))
      throw new Error("Benchmark do fundo ausente, duplicado ou sem fonte de identificação.");
    fundIds.add(reference.fundId);
  }
  return input;
}

export function fundReference(data, fundId) {
  const reference = data.market?.fundReferences.find((item) => item.fundId === fundId);
  const benchmark = data.market?.benchmarks.find((item) => item.id === reference?.benchmarkId);
  return reference && benchmark ? { ...reference, benchmark } : null;
}

export function benchmarkComparison(data, fundId, period = 2) {
  const fund = data.funds.find((item) => item.id === fundId), reference = fundReference(data, fundId);
  if (!reference || data.market.date !== data.date || fund?.date !== data.date ||
      reference.benchmark.date !== data.date || !Number.isFinite(fund.returns?.[period]) ||
      !Number.isFinite(reference.benchmark.returns[period])) return null;
  const fundReturn = fund.returns[period], benchmarkReturn = reference.benchmark.returns[period];
  return { ...reference, fundReturn, benchmarkReturn, excess: fundReturn - benchmarkReturn,
    ratio: benchmarkReturn > 0 ? fundReturn / benchmarkReturn : null };
}

// A lista de origem vem da curadoria por par de fundos, nunca de um ranking global.
// Rentabilidade superior é um filtro adicional; não comprova adequação ao cliente.
export function relocationAlternatives(data, fundId, period = 2) {
  const current = data.funds.find((fund) => fund.id === fundId);
  if (![0, 1, 2, 3].includes(period) || current?.date !== data.date ||
      !Number.isFinite(current.returns?.[period])) return [];
  return (data.suggestions?.[fundId] || []).filter((candidate) => {
    const known = data.funds.find((fund) => fund.id === candidate.id);
    const currentReference = fundReference(data, fundId), candidateReference = fundReference(data, candidate.id);
    return candidate.id !== fundId && candidate.date === current.date &&
      (!known || known.strategy === current.strategy) &&
      (!currentReference || !candidateReference || currentReference.benchmark.id === candidateReference.benchmark.id) &&
      Number.isFinite(candidate.returns?.[period]) &&
      candidate.returns[period] - current.returns[period] > 1e-10;
  }).map((candidate) => ({ ...candidate, difference: candidate.returns[period] - current.returns[period] }))
    .sort((a, b) => b.difference - a.difference || a.name.localeCompare(b.name, "pt-BR"));
}

export function weightedPerformance(data, positions, period = 2, benchmarkId = null) {
  const funds = new Map(data.funds.map((fund) => [fund.id, fund]));
  let totalBalance = 0, coveredBalance = 0, weighted = 0;
  const coveredFunds = new Set();
  for (const position of positions) {
    if (benchmarkId && fundReference(data, position.fundId)?.benchmark.id !== benchmarkId) continue;
    totalBalance += position.balance;
    const fund = funds.get(position.fundId), value = fund?.returns?.[period];
    if (fund?.date !== data.date || !Number.isFinite(value) ||
        (benchmarkId && !benchmarkComparison(data, position.fundId, period))) continue;
    coveredBalance += position.balance;
    weighted += position.balance * value;
    coveredFunds.add(position.fundId);
  }
  return { value: coveredBalance > 0 ? weighted / coveredBalance : null,
    totalBalance, coveredBalance, coverage: totalBalance > 0 ? coveredBalance / totalBalance : null,
    fundCount: coveredFunds.size };
}
