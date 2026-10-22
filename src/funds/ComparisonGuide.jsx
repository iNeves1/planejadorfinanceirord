import { FundPanel as Panel } from "../components/ui.jsx";
import { dateLabel } from "./model.js";

const precise = (value) => value == null ? "—" : new Intl.NumberFormat("pt-BR", {
  style: "percent", minimumFractionDigits: 5, maximumFractionDigits: 5,
}).format(value);

export default function ComparisonGuide({ data }) {
  const sources = (data.market?.benchmarks || []).filter((benchmark) =>
    ["CDI", "CDI-MR"].includes(benchmark.id) && benchmark.date === data.date);
  return <Panel title="Como ler a comparação com o CDI" className="fd-comparison-guide" eyebrow="MESMA JANELA · FONTES IDENTIFICADAS">
    <p className="fd-caption"><b>% do CDI</b> = retorno do fundo ÷ retorno do CDI, exibido em percentual. <b>Diferença em p.p.</b> = retorno do fundo menos retorno do índice. Os cálculos usam valores sem arredondamento intermediário.</p>
    {sources.length ? <div className="fd-table-wrap"><table aria-label="CDI por fonte e período">
      <thead><tr><th>Fonte do CDI</th><th>Mês</th><th>Ano</th><th>12 meses</th><th>24M (a.a.)</th></tr></thead>
      <tbody>{sources.map((benchmark) => <tr key={benchmark.id}>
        <td>{benchmark.id === "CDI" ? "BACEN · usado nas comparações" : "Mais Retorno · conferência da fonte"}<small><a href={benchmark.sourceUrl} target="_blank" rel="noreferrer">Fonte</a> · {dateLabel(benchmark.date)}</small></td>
        {benchmark.returns.map((value, i) => <td key={i}>{precise(value)}</td>)}
      </tr>)}</tbody>
    </table></div> : <p className="fd-caption">CDI ainda não carregado para esta referência.</p>}
    <p className="fd-panel-note">A tabela separa as fontes; o site usa o CDI BACEN quando essa é a referência identificada. Para outros mandatos, mostra o benchmark próprio. CDI como oportunidade não confirma adequação nem equivale a um benchmark declarado. Retornos de 24M a.a. são comparados com índices também anualizados.</p>
    {data.audit && <p className="fd-panel-note">Conferência registrada em {dateLabel(data.audit.checkedAt)} · posição e janelas encerradas em {dateLabel(data.date)}. Retornos publicados hoje em outra data não são misturados com este fechamento.</p>}
  </Panel>;
}
