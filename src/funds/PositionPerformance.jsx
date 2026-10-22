import { FundPanel as Panel, FundEmpty as Empty } from "../components/ui.jsx";
import { percent, dateLabel } from "./model.js";

export default function PositionPerformance({ data, positions }) {
  const records = positions.map((p) => (data.positionPerformance || []).find((entry) =>
    p.account === entry.account && p.advisor === entry.advisor && p.fundId === entry.fundId) ||
    { account: p.account, advisor: p.advisor, fundId: p.fundId, source: "Retorno da posição não informado no pacote" });
  return <Panel title="Retornos informados no XPerformance" eyebrow="EXPERIÊNCIA INFORMADA DA POSIÇÃO" className="fd-position-performance">
    <p className="fd-caption">Referência {dateLabel(data.date)}. Valores transcritos do relatório da XP para cada posição. A janela da posição pode diferir da janela completa do fundo. Os percentuais do CDI abaixo são os informados pela XP, preservados sem recalcular pelo CDI do ano inteiro.</p>
    {records.length ? <div className="fd-table-wrap"><table aria-label="Retornos da posição informados pela XP">
      <thead><tr><th>Fundo / fonte</th><th>Mês · XP</th><th>% CDI mês · XP</th><th>Ano · XP</th><th>% CDI ano · XP</th><th>24M · XP</th><th>% CDI 24M · XP</th></tr></thead>
      <tbody>{records.map((entry) => <tr key={`${entry.advisor}:${entry.account}:${entry.fundId}`}>
        <td>{data.funds.find((fund) => fund.id === entry.fundId)?.name}<small>{entry.source}</small></td>
        {[entry.month, entry.monthCdi, entry.year, entry.yearCdi, entry.months24, entry.months24Cdi].map((value, i) => <td key={i}>{percent(value)}</td>)}
      </tr>)}</tbody>
    </table></div> : <Empty title="Retornos da posição ainda não carregados">O retorno do fundo não preenche os campos ausentes da posição.</Empty>}
    <p className="fd-panel-note">24M reproduz o campo do relatório, sem convertê-lo em taxa anual. Movimentações e metodologia da XP são necessárias para conferir a rentabilidade efetiva e explicar as diferenças. Esta tabela não estima impostos ou resultados futuros.</p>
  </Panel>;
}
