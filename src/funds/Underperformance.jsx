import { useState } from "react";
import { FundPanel as Panel, FundBadge as Badge, FundEmpty as Empty, FundField as Field } from "../components/ui.jsx";
import { money, percent, dateLabel, sum, underperformanceExposure } from "./model.js";
import { benchmarkComparison, cdiComparison, percentagePoints } from "./performance.js";

const normalized = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function Underperformance({ data, positions, alerts, query, onFund, onClient }) {
  const [period, setPeriod] = useState(2);
  const labels = ["Mês", "Ano", "12 meses", "24M (a.a.)"];
  const exposure = underperformanceExposure(data, positions, alerts);
  const matches = (value) => normalized(value).includes(normalized(query));
  const funds = exposure.funds.map((item) => {
    const native = benchmarkComparison(data, item.fund.id, period);
    return { ...item, comparison: native || cdiComparison(data, item.fund.id, period),
      opportunity: !native, investigate: alerts.some((alert) => alert.fundId === item.fund.id && alert.type === "Desempenho a investigar") };
  })
    .filter((item) => matches(`${item.fund.name} ${item.clients.map((client) => `${client.name} ${client.id}`).join(" ")}`))
    .sort((a, b) => (a.comparison?.excess ?? Infinity) - (b.comparison?.excess ?? Infinity) || b.balance - a.balance);
  const clients = exposure.clients.filter((client) => matches(`${client.name} ${client.id} ${client.positions.map((p) => data.funds.find((fund) => fund.id === p.fundId)?.name).join(" ")}`));
  return <Panel id="baixo-desempenho" tabIndex={-1} className="fd-underperformance" title="Clientes em fundos com baixo desempenho"
    eyebrow="FUNDOS SINALIZADOS PARA REVISÃO" action={<Badge>{clients.length} conta{clients.length !== 1 ? "s" : ""} · {funds.length} fundo{funds.length !== 1 ? "s" : ""}</Badge>}>
    <p className="fd-caption">Posições de {dateLabel(data.date)}. Lista baseada na revisão de 12 meses. Confira outras janelas abaixo. Clique no fundo para subir à consulta de clientes, códigos e valores aplicados.</p>
    {exposure.funds.length ? <>
      <h3 className="fd-section-label">Fundos para revisar</h3>
      <Field label="Janela da comparação" className="fd-period-select"><select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>{labels.map((label, i) => <option key={label} value={i}>{label}</option>)}</select></Field>
      <div className="fd-table-wrap"><table aria-label="Fundos sinalizados por baixo desempenho">
        <thead><tr><th>Fundo / classe</th><th>{labels[period]}</th><th>Índice · {labels[period]}</th><th>% do índice</th><th>Diferença (p.p.)</th><th>Contas posicionadas</th><th>Saldo no fundo</th></tr></thead>
        <tbody>{funds.map(({ fund, comparison, opportunity, investigate, clients: holders, balance }) => <tr key={fund.id}>
          <td><button className="fd-table-link" onClick={() => onFund(fund.id)}>{fund.name}</button><small>{fund.strategy}</small><Badge tone={investigate ? "amber" : "red"}>{investigate ? "Investigar benchmark e desempenho" : "Revisar desempenho"}</Badge></td>
          <td>{percent(fund.date === data.date ? fund.returns[period] : null)}</td>
          <td>{comparison ? <>{comparison.benchmark.name}<small>{percent(comparison.benchmarkReturn)} · <a href={comparison.benchmark.sourceUrl} target="_blank" rel="noreferrer">Fonte</a></small><small>{opportunity ? "Oportunidade · benchmark não comparável ou não confirmado nesta janela" : "Referência identificada do fundo"}</small></> : "Sem comparação confirmada"}</td>
          <td>{percent(comparison?.ratio)}</td>
          <td className={comparison?.excess < 0 ? "negative" : ""}>{percentagePoints(comparison?.excess)}</td>
          <td>{holders.length}</td><td>{money(balance)}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="fd-panel-note">Ordenados pela defasagem na janela escolhida. % do índice é a razão dos retornos; p.p. é a subtração. CDI de oportunidade não substitui o benchmark do fundo e não comprova desempenho inadequado. Ausências permanecem ausentes.</p>
      <h3 className="fd-section-label">Clientes posicionados nesses fundos</h3>
      <div className="fd-table-wrap"><table aria-label="Clientes posicionados em fundos com baixo desempenho">
        <thead><tr><th>Cliente / código da conta</th><th>Assessor</th><th>Saldo nesses fundos</th><th>Total em fundos da conta</th><th>% dos fundos da conta</th><th>Fundos e valores aplicados</th></tr></thead>
        <tbody>{clients.map((client) => <tr key={client.key}>
          <td><button className="fd-table-link" onClick={() => onClient(client.key)}>{client.name}</button><small>Conta {client.id}</small></td>
          <td>{client.advisor}</td><td>{money(client.balance)}</td><td>{money(client.accountBalance)}</td><td>{percent(client.weight)}</td>
          <td>{[...new Set(client.positions.map((p) => p.fundId))].map((id) => <div className="fd-underperformance-holding" key={id}>
            <button className="fd-table-link" onClick={() => onFund(id, client.key)}>{data.funds.find((fund) => fund.id === id)?.name}</button>
            <small>{money(sum(client.positions.filter((p) => p.fundId === id)))}</small>
          </div>)}</td>
        </tr>)}</tbody>
      </table></div>
      {!funds.length && !clients.length && <Empty title="Nenhum resultado nesta busca">Altere a busca para consultar os fundos e as contas sinalizados.</Empty>}
      <p className="fd-panel-note">Todas as contas posicionadas nos fundos sinalizados da seleção, ordenadas pelo saldo exposto. O percentual usa todos os fundos importados da conta. A lista mostra exposição ao fundo; não representa a rentabilidade efetiva do cliente ou ordem de venda. Posições não comprovam novas compras.</p>
    </> : <Empty title="Nenhum fundo sinalizado por baixo desempenho nesta seleção">Esta lista usa revisões de desempenho pesquisadas. Alertas de concentração e pendências de dados ficam em Pontos de atenção.</Empty>}
  </Panel>;
}
