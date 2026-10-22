import { Fragment } from "react";
import { FundEmpty as Empty } from "../components/ui.jsx";
import { money, percent, dateLabel, sum } from "./model.js";
import { cdiComparison, fundReference } from "./performance.js";

const periods = ["Mês", "Ano", "12 meses", "24M (a.a.)"];
export default function FundPerformanceTable({ data, funds, positions, onFund, orderedByCdi }) {
  const total = sum(positions);
  const cdi = data.market?.date === data.date ? data.market.benchmarks.find((b) => b.id === "CDI" && b.date === data.date) : null;
  // A linha divide o retorno no ano somente quando essa é a ordenação escolhida.
  const split = orderedByCdi && cdi ? funds.findIndex((f) => !(cdiComparison(data, f.id, 1)?.excess >= 0)) : 0;
  const divider = split < 0 ? funds.length : split;
  const referenceRow = <tr className="fd-cdi-row"><th scope="row">CDI <a aria-label="Fonte oficial do CDI" href={cdi?.sourceUrl} target="_blank" rel="noreferrer">↗</a></th><td>Referência</td><td>{dateLabel(data.date)}</td><td>—</td><td>—</td>{periods.map((_, i) => <td key={i}>{percent(cdi?.returns[i])}</td>)}{periods.map((_, i) => <td key={i}>{cdi?.returns[i] > 0 ? "100,00%" : "—"}</td>)}</tr>;
  return <>
    <p className="fd-caption">{!cdi ? "CDI não disponível para esta data; comparações permanecem ausentes. " : orderedByCdi ? "Acima da linha do CDI: fundos que alcançaram ou superaram o CDI no ano. " : "Ordenação personalizada; linha do CDI no início da tabela. "}Posições e retornos até {dateLabel(data.date)}. Clique no fundo para consultar os clientes.</p>
    <div className="fd-table-wrap"><table className="fd-performance-table" aria-label="Rentabilidade dos fundos e comparação com CDI">
      <thead><tr><th colSpan={5} scope="colgroup">FUNDO</th><th colSpan={4} scope="colgroup" className="fd-absolute-group">RENTABILIDADE ABSOLUTA</th><th colSpan={4} scope="colgroup" className="fd-cdi-group">RENTABILIDADE % CDI</th></tr>
        <tr><th scope="col">Fundo</th><th scope="col">Classe</th><th scope="col">Data cota</th><th scope="col">NET (R$)</th><th scope="col">% da carteira</th>{periods.map((label) => <th scope="col" key={label}>{label}</th>)}{periods.map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{funds.map((fund, index) => {
        const balance = sum(positions.filter((p) => p.fundId === fund.id));
        const native = fundReference(data, fund.id);
        return <Fragment key={fund.id}>{cdi && index === divider && referenceRow}<tr>
          <td><button className="fd-table-link" onClick={() => onFund(fund.id)}>{fund.name}</button><small>{native?.benchmark.id !== "CDI" ? "CDI de oportunidade" : "Benchmark CDI"}{fund.sourceUrl && <> · <a href={fund.sourceUrl} target="_blank" rel="noreferrer">Fonte</a></>}</small></td>
          <td>{fund.strategy}<small>{native ? <a href={native.sourceUrl} target="_blank" rel="noreferrer">Ref.: {native.benchmark.name}</a> : "Referência não confirmada"}</small></td><td>{dateLabel(fund.date)}</td><td>{money(balance)}</td><td>{percent(total ? balance / total : null)}</td>
          {periods.map((_, i) => <td key={i} className={fund.returns[i] < 0 ? "negative" : ""}>{percent(fund.date === data.date ? fund.returns[i] : null)}</td>)}
          {periods.map((_, i) => { const comparison = cdiComparison(data, fund.id, i); return <td key={i} className={comparison?.ratio == null ? "" : comparison.excess >= 0 ? "fd-above-cdi" : "fd-below-cdi"}>{percent(comparison?.ratio)}</td>; })}
        </tr></Fragment>;
      })}{cdi && divider === funds.length && referenceRow}</tbody>
    </table></div>
    {!funds.length && <Empty title="Nenhum fundo encontrado">Altere a busca ou os filtros para consultar as posições.</Empty>}
    <p className="fd-panel-note">% CDI = retorno do fundo ÷ retorno do CDI na mesma janela × 100. CDI de oportunidade não substitui a referência própria do fundo. 24M (a.a.) compara retornos anualizados; retorno desde o início e quartis não estão disponíveis nesta base. Ausências aparecem como “—”.</p>
  </>;
}
