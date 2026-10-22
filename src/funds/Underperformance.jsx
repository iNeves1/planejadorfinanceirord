import { FundPanel as Panel, FundBadge as Badge, FundEmpty as Empty } from "../components/ui.jsx";
import { money, percent, dateLabel, sum, underperformanceExposure } from "./model.js";
import { benchmarkComparison } from "./performance.js";

const points = (value) => value == null ? "—" : `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`;
const normalized = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function Underperformance({ data, positions, alerts, query, onFund, onClient }) {
  const exposure = underperformanceExposure(data, positions, alerts);
  const matches = (value) => normalized(value).includes(normalized(query));
  const funds = exposure.funds.map((item) => ({ ...item, comparison: benchmarkComparison(data, item.fund.id) }))
    .filter((item) => matches(`${item.fund.name} ${item.clients.map((client) => `${client.name} ${client.id}`).join(" ")}`))
    .sort((a, b) => (a.comparison?.excess ?? Infinity) - (b.comparison?.excess ?? Infinity) || b.balance - a.balance);
  const clients = exposure.clients.filter((client) => matches(`${client.name} ${client.id} ${client.positions.map((p) => data.funds.find((fund) => fund.id === p.fundId)?.name).join(" ")}`));
  return <Panel id="baixo-desempenho" tabIndex={-1} className="fd-underperformance" title="Clientes em fundos com baixo desempenho"
    eyebrow="FUNDOS SINALIZADOS PARA REVISÃO" action={<Badge>{clients.length} conta{clients.length !== 1 ? "s" : ""} · {funds.length} fundo{funds.length !== 1 ? "s" : ""}</Badge>}>
    <p className="fd-caption">Posições de {dateLabel(data.date)}. Fundos com sinalização de desempenho na pesquisa. Clique no fundo para subir à consulta de clientes, códigos e valores aplicados.</p>
    {exposure.funds.length ? <>
      <h3 className="fd-section-label">Fundos para revisar</h3>
      <div className="fd-table-wrap"><table aria-label="Fundos sinalizados por baixo desempenho">
        <thead><tr><th>Fundo / classe</th><th>12 meses</th><th>Referência · 12M</th><th>Diferença · 12M</th><th>Contas posicionadas</th><th>Saldo no fundo</th></tr></thead>
        <tbody>{funds.map(({ fund, comparison, clients: holders, balance }) => <tr key={fund.id}>
          <td><button className="fd-table-link" onClick={() => onFund(fund.id)}>{fund.name}</button><small>{fund.strategy}</small></td>
          <td>{percent(fund.date === data.date ? fund.returns[2] : null)}</td>
          <td>{comparison ? <>{comparison.benchmark.name}<small>{percent(comparison.benchmarkReturn)}</small></> : "Não confirmada"}</td>
          <td className={comparison?.excess < 0 ? "negative" : ""}>{points(comparison?.excess)}</td>
          <td>{holders.length}</td><td>{money(balance)}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="fd-panel-note">Ordenados pela maior defasagem em 12 meses frente à referência própria, quando comparável. Sem dados comparáveis, não calculamos a defasagem.</p>
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
