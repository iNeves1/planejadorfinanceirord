import { FundPanel as Panel, FundBadge as Badge } from "../components/ui.jsx";
import { percent, money, dateLabel } from "./model.js";
import { weightedPerformance } from "./performance.js";

const periods = ["Mês", "Ano", "12 meses"];

export default function Performance({ data, positions }) {
  const strategies = [...new Set(positions.map((position) => data.funds.find((fund) => fund.id === position.fundId)?.strategy))].sort();
  const benchmarkIds = new Set((data.market?.fundReferences || []).filter((reference) =>
    positions.some((position) => position.fundId === reference.fundId)).map((reference) => reference.benchmarkId));
  const benchmarks = (data.market?.benchmarks || []).filter((benchmark) => benchmarkIds.has(benchmark.id));
  return <Panel title="Indicadores históricos dos fundos" eyebrow="RENTABILIDADE E COBERTURA"
    action={<Badge>{dateLabel(data.date)}</Badge>}>
    <p className="fd-caption">Média dos retornos dos fundos, ponderada pelos saldos atuais da seleção. Não representa a rentabilidade da carteira nem o resultado dos clientes.</p>
    <div className="fd-performance-summary">
      {periods.map((label, period) => {
        const metric = weightedPerformance(data, positions, period);
        return <div key={label}>
          <span>{label}</span><strong>{percent(metric.value)}</strong>
          <small>Cobertura: {percent(metric.coverage)} do saldo · {metric.fundCount} fundos</small>
        </div>;
      })}
    </div>
    <div className="fd-table-wrap"><table>
      <caption className="sr-only">Indicador de retorno de 12 meses por estratégia, com cobertura do saldo</caption>
      <thead><tr><th>Estratégia</th><th>Indicador 12M</th><th>Cobertura do saldo</th><th>Saldo com retorno</th></tr></thead>
      <tbody>{strategies.map((strategy) => {
        const ids = new Set(data.funds.filter((fund) => fund.strategy === strategy).map((fund) => fund.id));
        const metric = weightedPerformance(data, positions.filter((position) => ids.has(position.fundId)));
        return <tr key={strategy}><td>{strategy}</td><td>{percent(metric.value)}</td>
          <td>{percent(metric.coverage)}</td><td>{money(metric.coveredBalance)}</td></tr>;
      })}</tbody>
    </table></div>
    {benchmarks.length > 0 ? <>
      <h3 className="fd-section-label">COMPARAÇÃO POR REFERÊNCIA DECLARADA</h3>
      <div className="fd-table-wrap"><table>
        <caption className="sr-only">Comparação de 12 meses restrita aos fundos com a mesma referência identificada</caption>
        <thead><tr><th>Referência / fonte</th><th>Índice 12M</th><th>Fundos vinculados · indicador 12M</th><th>Cobertura do saldo vinculado</th></tr></thead>
        <tbody>{benchmarks.map((benchmark) => {
          const metric = weightedPerformance(data, positions, 2, benchmark.id);
          return <tr key={benchmark.id}><td>{benchmark.name}<small><a href={benchmark.sourceUrl} target="_blank" rel="noreferrer">Fonte do índice</a> · {dateLabel(benchmark.date)}</small></td>
            <td>{percent(benchmark.returns[2])}</td><td>{percent(metric.value)}<small>{metric.fundCount} fundos com dados comparáveis</small></td>
            <td>{percent(metric.coverage)}<small>{money(metric.totalBalance)} vinculados à referência</small></td></tr>;
        })}</tbody>
      </table></div>
    </> : <p className="fd-panel-note">Benchmarks ainda não carregados. O site não atribui CDI automaticamente aos fundos.</p>}
    <p className="fd-panel-note">Valores ausentes ficam fora da média e reduzem a cobertura. Cada período usa seu próprio saldo coberto. A comparação com um índice abrange somente os fundos explicitamente vinculados a ele e com retornos na mesma referência. Taxas refletidas nas cotas não são descontadas novamente.</p>
  </Panel>;
}
