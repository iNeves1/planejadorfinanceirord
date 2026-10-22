import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  PieChart,
  Users,
  Layers,
  ArrowLeftRight,
  ClipboardList,
  ArrowUpRight,
  ArrowRight,
  Search,
  Download,
  Upload,
  SlidersHorizontal,
  X,
  Check,
  Plus,
  Bell,
  ShieldCheck,
  FileText,
  Printer,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import {
  FundButton as Button,
  FundField as Field,
  FundPanel as Panel,
  FundBadge as Badge,
  FundEmpty as Empty,
} from "./components/ui.jsx";
import FinancialOnboarding from "./FinancialOnboarding.jsx";
import {
  money,
  compact,
  percent,
  dateLabel,
  sum,
  groupClients,
  buildAlerts,
  exposedBalance,
  priorityClients,
  allocation,
  importPositions,
  importSuggestions,
  positionCsv,
  templateCsv,
  download,
} from "./funds/model.js";
import "./funds/funds.css";
import "./funds/reference.css";
import { importWorkspace, exportWorkspace } from "./funds/workspace.js";
import Performance from "./funds/Performance.jsx";
import PrivateAccess from "./funds/PrivateAccess.jsx";
import { usePrivateSave } from "./funds/usePrivateSave.js";
import { benchmarkComparison, fundReference, relocationAlternatives } from "./funds/performance.js";

const navigation = [
  ["day", "Resumo", LayoutDashboard],
  ["funds", "Consulta por fundo", Layers],
  ["portfolio", "Rentabilidade", PieChart],
  ["clients", "Clientes", Users],
  ["compare", "Realocação", ArrowLeftRight],
  ["attention", "Pontos de atenção", Bell],
  ["follow", "Acompanhamento", ClipboardList],
];
const statuses = [
  "Em análise",
  "Conversado",
  "Aguardando cliente",
  "Concluído",
];
const returnLabels = ["Mês", "Ano", "12 meses", "24M (a.a.)"];
const textMatch = (value, query) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes(
      query
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    );

function Returns({ fund, current = false, period = 2, difference, onReview }) {
  return (
    <article className={`fd-return-card ${current ? "current" : ""}`}>
      <div className="fd-return-title">
        <span className="fd-eyebrow">
          {current ? "Fundo atual" : "Alternativa"}
        </span>
        <h3>{fund.name}</h3>
      </div>
      <div className="fd-return-grid">
        {returnLabels.map((label, i) => (
          <div key={label} className={i === period ? "selected" : ""}>
            <span>{label}</span>
            <strong className={fund.returns[i] < 0 ? "negative" : ""}>
              {percent(fund.returns[i])}
            </strong>
          </div>
        ))}
      </div>
      {difference != null && <p className="fd-return-difference">Em {returnLabels[period].toLowerCase()}: <b>+{(difference * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.</b> sobre o fundo atual, no período encerrado.</p>}
      <p className="fd-caption">
        {fund.date
          ? `Referência: ${dateLabel(fund.date)} · retornos históricos do fundo`
          : "Rentabilidade ainda não verificada."}
        {fund.sourceUrl && <> · <a href={fund.sourceUrl} target="_blank" rel="noreferrer">Fonte</a></>}
      </p>
      {onReview && <Button variant="secondary" onClick={onReview}>Analisar esta alternativa</Button>}
    </article>
  );
}
function Allocation({ positions, funds, field = "strategy" }) {
  const values = allocation(positions, funds, field);
  return (
    <div className="fd-allocation-bars">
      {values.map((v) => <div className="fd-allocation-row" key={v.name}>
        <span>{v.name}</span><div className="fd-allocation-track"><i style={{ width: `${v.weight * 100}%` }} /></div><strong>{percent(v.weight)}</strong>
      </div>)}
      {!values.length && <p>Sem posições neste filtro.</p>}
    </div>
  );
}
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null),
    close = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    function keyboard(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusable = [
          ...ref.current.querySelectorAll(
            "button, input, select, textarea, a[href]",
          ),
        ].filter((el) => !el.disabled && el.getClientRects().length);
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keyboard);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="fd-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={`fd-modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fd-modal-title"
      >
        <div className="fd-modal-heading">
          <h2 id="fd-modal-title">{title}</h2>
          <button
            ref={close}
            className="fd-icon-button"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Suggestions({ fund, data, comparisonPeriod, setComparisonPeriod, activeClient, fundClients, makeTask, onImport }) {
  const alternatives = relocationAlternatives(data, fund.id, comparisonPeriod);
  const hasCurrentReturn = fund.date === data.date && Number.isFinite(fund.returns[comparisonPeriod]);
  function review(alternative) {
    const seed = { fundId: fund.id, clientKey: activeClient?.key || fundClients[0]?.key,
      title: `Analisar ${alternative.name} como alternativa`,
      notes: `Fundo atual: ${fund.name}. Alternativa pesquisada: ${alternative.name}. Em ${returnLabels[comparisonPeriod].toLowerCase()} até ${dateLabel(data.date)}: atual ${percent(fund.returns[comparisonPeriod])}; alternativa ${percent(alternative.returns[comparisonPeriod])}. Conferir perfil, objetivos, risco, liquidez, disponibilidade, custos e tributação antes de decidir. Fonte: ${alternative.sourceUrl}` };
    makeTask(seed);
  }
  return (
    <Panel
      title="Sugestões de realocação"
      className="fd-suggestions"
      action={
        <Badge>
          {alternatives.length} fundo{alternatives.length !== 1 ? "s" : ""}
        </Badge>
      }
    >
      <Field label="Período da comparação" className="fd-period-select"><select value={comparisonPeriod} onChange={(e) => setComparisonPeriod(Number(e.target.value))}>
        {returnLabels.map((label, i) => <option key={label} value={i}>{label}</option>)}
      </select></Field>
      <Returns fund={fund} current period={comparisonPeriod} />
      {alternatives.map((f) => (
        <Returns key={f.id} fund={f} period={comparisonPeriod} difference={f.difference} onReview={() => review(f)} />
      ))}
      {!alternatives.length && (
        <Empty title={hasCurrentReturn ? "Sem alternativa superior neste período" : "Retorno atual não confirmado neste período"}>
          {hasCurrentReturn ? "A seleção pesquisada para este fundo não contém uma alternativa com retorno superior na mesma referência. Revise a tese e mantenha a análise em acompanhamento; isso não é recomendação de manter a posição." : "Sem retorno comparável, o site não indica substitutos por desempenho."}
        </Empty>
      )}
      <Button variant="secondary" icon={Upload} onClick={onImport}>Carregar alternativas</Button>
      <p className="fd-disclaimer">
        Rentabilidade passada não representa garantia de resultados futuros.
        {alternatives.length > 0 && " Seleção pesquisada por fundo de origem; retorno superior no período selecionado. Compatibilidade final condicionada à conferência de documentação, perfil, objetivos, risco, liquidez, custos, tributos e disponibilidade pelo assessor. Não representa ordem de troca."}
      </p>
    </Panel>
  );
}

export function FundsDashboard({ initial, onLogout }) {
  const [data, setData] = useState(initial.data);
  const [page, setPage] = useState("day");
  const [advisor, setAdvisor] = useState("all");
  const [strategy, setStrategy] = useState("all");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("Todas");
  const [limit, setLimit] = useState(initial.limit);
  const [fundId, setFundId] = useState(initial.data.funds[0]?.id);
  const [clientKey, setClientKey] = useState(null);
  const [tasks, setTasks] = useState(initial.tasks);
  const [modal, setModal] = useState(initial.error ? "import" : null);
  const [taskSeed, setTaskSeed] = useState(null);
  const [taskAccountKey, setTaskAccountKey] = useState("");
  const [taskFundId, setTaskFundId] = useState("");
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(initial.error || "");
  const [notice, setNotice] = useState("");
  const [followStatus, setFollowStatus] = useState("Todos");
  const [alertCount, setAlertCount] = useState(6);
  const [fundSort, setFundSort] = useState("balance");
  const [comparisonPeriod, setComparisonPeriod] = useState(2);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const remoteSave = usePrivateSave(data, tasks, limit, initial.remote);
  useEffect(() => setAlertCount(6), [advisor, strategy, query, priority, data]);
  useEffect(() => {
    document.title = "RD Investimentos · Carteira de fundos";
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const funds = data.funds;
  const advisors = [...new Set(data.positions.map((p) => p.advisor))].sort();
  const strategies = [...new Set(funds.map((f) => f.strategy))].sort();
  const positions = useMemo(
    () =>
      data.positions.filter((p) => {
        const fund = funds.find((f) => f.id === p.fundId);
        return (
          (advisor === "all" || p.advisor === advisor) &&
          (strategy === "all" || fund?.strategy === strategy)
        );
      }),
    [data, advisor, strategy, funds],
  );
  const clients = useMemo(() => groupClients(positions), [positions]);
  const allAlerts = useMemo(
    () => buildAlerts(data, positions, limit),
    [data, positions, limit],
  );
  const alerts = allAlerts.filter(
    (a) =>
      (priority === "Todas" || a.type === priority) &&
      textMatch(
        `${a.title} ${funds.find((f) => f.id === a.fundId)?.name} ${a.clients.map((c) => c.name).join(" ")}`,
        query,
      ),
  );
  const total = sum(positions);
  const attentionClients = priorityClients(data, positions, allAlerts).filter((client) =>
    textMatch(`${client.name} ${client.id} ${client.fundIds.map((id) => funds.find((fund) => fund.id === id)?.name).join(" ")}`, query));
  const visibleFunds = funds.filter(
    (f) =>
      positions.some((p) => p.fundId === f.id) &&
      textMatch(`${f.name} ${f.manager} ${f.strategy}`, query),
  ).sort((a, b) => {
    if (fundSort === "name") return a.name.localeCompare(b.name, "pt-BR");
    const value = (fund) => fundSort === "return12"
      ? (Number.isFinite(fund.returns[2]) ? fund.returns[2] : -Infinity)
      : sum(positions.filter((position) => position.fundId === fund.id));
    return value(b) - value(a) || a.name.localeCompare(b.name, "pt-BR");
  });
  const activeClient = groupClients(
    data.positions.filter((p) => advisor === "all" || p.advisor === advisor),
  ).find((c) => c.key === clientKey);
  const consultationFunds = visibleFunds.filter((fund) => !activeClient || activeClient.positions.some((p) => p.fundId === fund.id));
  const selectedFund = consultationFunds.find((fund) => fund.id === fundId) || consultationFunds[0];
  const activeClientAlerts = activeClient ? buildAlerts(data, activeClient.positions, limit) : [];
  const accountBalance = (key) =>
    sum(data.positions.filter((p) => `${p.advisor}:${p.clientId}` === key));
  const scopedTasks = tasks.filter(
    (t) =>
      clients.some((c) => c.key === t.clientKey) &&
      (followStatus === "Todos" || t.status === followStatus) &&
      textMatch(`${t.client} ${t.title} ${t.fund}`, query),
  );
  function go(next) {
    setPage(next);
    setQuery("");
    if (!["funds", "compare"].includes(next)) setClientKey(null);
  }
  function openFund(id, next = "funds", accountKey = null) {
    setFundId(id);
    if (strategy !== "all" && funds.find((fund) => fund.id === id)?.strategy !== strategy) setStrategy("all");
    go(next);
    setClientKey(accountKey);
  }
  function makeTask(seed = {}) {
    setTaskSeed(seed);
    const eligibleClients = clients.filter((client) => !seed.fundId || client.positions.some((p) => p.fundId === seed.fundId));
    const client = eligibleClients.find((c) => c.key === seed.clientKey) || eligibleClients[0];
    setTaskAccountKey(client?.key || "");
    setTaskFundId(client?.positions.some((p) => p.fundId === seed.fundId) ? seed.fundId : client?.positions[0]?.fundId || "");
    setError("");
    setModal("task");
  }
  function reset(nextData) {
    const restored = nextData.data ? nextData : { data: nextData, tasks: [], limit: 0.35 };
    setData(restored.data);
    setAdvisor("all");
    setStrategy("all");
    setQuery("");
    setPriority("Todas");
    setFollowStatus("Todos");
    setTasks(restored.tasks);
    setLimit(restored.limit);
    setClientKey(null);
    setFundId(restored.data.funds[0]?.id);
    setPending(null);
    setError("");
    setModal(null);
    setPage("day");
    setNotice(initial.remote?.persistent ? "Base carregada para salvamento no acesso privado." : "Base carregada. Salve o arquivo de trabalho para continuar depois.");
  }
  async function readFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPending(null);
    setModal("import");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Arquivo acima do limite de 10 MB.");
      const content = await file.text();
      const parsed = file.name.toLowerCase().endsWith(".csv")
        ? { data: importPositions(content, file.name), tasks: [], limit: 0.35 }
        : importWorkspace(content, file.name);
      setPending(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = "";
    }
  }
  function saveWorkspace() {
    try {
      download(`RD_Fundos_${data.date}.rdfundos`, exportWorkspace(data, tasks, limit), "application/json;charset=utf-8");
      setNotice("Arquivo salvo com a carteira, alternativas e histórico de acompanhamento.");
    } catch (err) { setError(err.message); setModal("workspace-error"); }
  }
  async function readSuggestions(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error("Pacote acima do limite de 1 MB.");
      const suggestions = importSuggestions(await file.text(), data);
      setData((current) => ({ ...current, suggestions }));
      setNotice("Alternativas pesquisadas carregadas para os respectivos fundos de origem.");
    } catch (err) {
      setError(err.message);
      setModal("suggestions-error");
    } finally { e.target.value = ""; }
  }
  const pageTitle = navigation.find((n) => n[0] === page)[1];
  const currentFundPositions = positions.filter(
    (p) => p.fundId === selectedFund?.id && (!activeClient || `${p.advisor}:${p.clientId}` === activeClient.key),
  );
  const fundClients = groupClients(currentFundPositions);
  function exportPositions(list = positions) {
    download(
      `fundos_${data.date}.csv`,
      positionCsv(data, list),
    );
    setNotice("CSV exportado com as posições do filtro atual.");
  }
  function taskForm(e) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    const client = clients.find((c) => c.key === values.get("client"));
    const fund = funds.find((f) => f.id === values.get("fund"));
    if (
      !client ||
      !fund ||
      !client.positions.some((p) => p.fundId === fund.id)
    ) {
      setError("Selecione um fundo presente na conta escolhida.");
      return;
    }
    const title = String(values.get("title") || "").trim(),
      notes = String(values.get("notes") || "").trim();
    if (!title || !notes) {
      setError("Informe o assunto e a justificativa da revisão.");
      return;
    }
    const timestamp = new Date().toISOString();
    setTasks((t) => [
      {
        id: crypto.randomUUID(),
        title,
        notes,
        clientKey: client.key,
        client: client.name,
        fundId: fund.id,
        fund: fund.name,
        owner: String(values.get("owner")).trim(),
        due: String(values.get("due")),
        status: "Em análise",
        history: [{ status: "Em análise", notes, at: timestamp }],
      },
      ...t,
    ]);
    setModal(null);
    setNotice("Acompanhamento criado com a conta e o fundo selecionados.");
  }
  function updateTask(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      status = String(form.get("status")),
      notes = String(form.get("notes") || "").trim();
    if (!notes) {
      setError("Registre o que foi conversado ou decidido.");
      return;
    }
    setTasks((ts) =>
      ts.map((t) =>
        t.id === taskSeed.id
          ? {
              ...t,
              status,
              due: String(form.get("due")),
              history: [
                ...t.history,
                { status, notes, at: new Date().toISOString() },
              ],
            }
          : t,
      ),
    );
    setModal(null);
    setNotice("Decisão registrada no histórico do acompanhamento.");
  }
  const fundTable = (
    <div className="fd-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fundo / estratégia</th>
            <th>Saldo</th>
            <th>Peso no filtro</th>
            <th>Mês</th>
            <th>Ano</th>
            <th>12 meses</th>
            <th>24M (a.a.)</th>
            <th>Referência · 12M</th>
            <th>% da referência · 12M</th>
            <th>Revisões</th>
            <th>
              <span className="sr-only">Abrir fundo</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleFunds.map((f) => {
            const balance = sum(positions.filter((p) => p.fundId === f.id)),
              count = allAlerts.filter((a) => a.fundId === f.id).length;
            const reference = fundReference(data, f.id), comparison = benchmarkComparison(data, f.id);
            return (
              <tr key={f.id}>
                <td>
                  <button
                    className="fd-table-link"
                    onClick={() => openFund(f.id)}
                  >
                    {f.name}
                  </button>
                  <small>
                    {f.strategy} · {f.manager}
                  </small>
                  <small>{f.date ? `Cota: ${dateLabel(f.date)}` : "Sem retorno confirmado"}{f.sourceUrl && <> · <a href={f.sourceUrl} target="_blank" rel="noreferrer">Fonte dos retornos</a></>}</small>
                </td>
                <td className="fd-nowrap">{money(balance)}</td>
                <td>{percent(total ? balance / total : 0)}</td>
                {[0, 1, 2, 3].map((i) => (
                  <td key={i} className={f.returns[i] < 0 ? "negative" : ""}>
                    {percent(f.returns[i])}
                  </td>
                ))}
                <td>{reference ? <><a href={reference.sourceUrl} target="_blank" rel="noreferrer">{reference.benchmark.name}</a><small>{percent(reference.benchmark.returns[2])}</small></> : "Não confirmada"}</td>
                <td>{percent(comparison?.ratio)}<small>{comparison?.ratio != null ? "Razão dos retornos históricos" : "Sem dados comparáveis"}</small></td>
                <td>
                  <Badge tone={count ? "amber" : "neutral"}>
                    {count
                      ? `${count} pendente${count > 1 ? "s" : ""}`
                      : "Sem alerta"}
                  </Badge>
                </td>
                <td>
                  <button
                    className="fd-icon-button"
                    aria-label={`Abrir ${f.name}`}
                    onClick={() => openFund(f.id)}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!visibleFunds.length && (
        <Empty title="Nenhum fundo encontrado">
          Altere a busca ou os filtros.
        </Empty>
      )}
    </div>
  );

  return (
    <div className="funds-app fd-reference">
      <header className="fd-reference-header">
        <div className="fd-reference-wrap">
          <a href="#conteudo" className="fd-reference-brand" aria-label="RD Investimentos"><svg width="330" height="56" viewBox="0 0 330 56" role="img" aria-label="RD Investimentos">
      <path d="M28 4 A24 24 0 0 0 16 48.78" fill="none" stroke="#B8C7BF" strokeWidth="3.6" strokeLinecap="round"/>
      <path d="M16 48.78 A24 24 0 1 0 28 4" fill="none" stroke="#3CE2A7" strokeWidth="3.6" strokeLinecap="round"/>
      <text x="21" y="36.5" fill="#CCD1CF" fontFamily="Calibri,Segoe UI,Arial" fontWeight="700" fontSize="24" textAnchor="middle">R</text>
      <text x="36" y="36.5" fill="#CCD1CF" fontFamily="Calibri,Segoe UI,Arial" fontWeight="700" fontSize="24" textAnchor="middle">D</text>
      <line x1="72" y1="11" x2="72" y2="45" stroke="#9EADA6" strokeWidth="1.4"/>
      <text x="86" y="36" fill="#fff" fontFamily="Calibri,Segoe UI,Arial" fontSize="23" letterSpacing="3">INVESTIMENTOS</text>
    </svg></a>
          <h1>Carteira de Fundos de Investimento</h1>
          <p className="fd-reference-owner">{advisor === "all" ? "Visão consolidada dos assessores" : `Assessor ${advisor}`}</p>
          <p>{clients.length} contas · {new Set(positions.map((p) => p.fundId)).size} fundos · {money(total)} em fundos</p>
          <div className="fd-reference-dates"><b>DATAS DE REFERÊNCIA</b><span>Posições e rentabilidade: {dateLabel(data.date)}</span><small>Retornos do mês, ano, 12 meses e 24 meses anualizados, quando disponíveis</small></div>
        </div>
      </header>
      <div className="fd-reference-nav">
        <nav aria-label="Navegação principal" className="fd-reference-wrap">
          {navigation.map(([id, label]) => <button key={id} aria-current={page === id ? "page" : undefined} className={page === id ? "active" : ""} onClick={() => go(id)}>{label}</button>)}
          <button onClick={() => setModal("method")}>Metodologia</button>
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Imprimir</Button>
          {onLogout && <Button variant="secondary" onClick={async () => {
            if (remoteSave.dirty && initial.remote?.persistent && !(await remoteSave.saveNow())) return;
            onLogout();
          }}>Sair</Button>}
        </nav>
      </div>
      <div className="fd-main">
        <main className="fd-content" id="conteudo">
          {initial.remote?.persistent && <p className={remoteSave.state === "error" ? "fd-error" : "fd-caption"} role="status">{remoteSave.message}</p>}
          <div className="fd-base-banner">
            <span>
              <span className="fd-pulse" />
              <b>{initial.remote ? "Carteira real · acesso privado" : data.workspace ? "Carteira privada · arquivo de trabalho" : "CSV local · sessão temporária"}</b>
              <span className="fd-banner-detail"> · referência: {dateLabel(data.date)} · posições dos relatórios enviados.</span>
            </span>
            <button
              onClick={() => {
                setPending(null);
                setError("");
                setModal("import");
              }}
            >
              {" "}
              Trocar base{" "}
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="fd-page-heading">
            <div>
              <h2>{page === "day" ? "Resumo da carteira" : pageTitle}</h2>
              <p>
                {
                  {
                    day: "Alocação, rentabilidade dos fundos e situações para revisar.",
                    attention: "Entenda o motivo, as contas expostas e a próxima análise de cada alerta.",
                    portfolio:
                      "Uma visão consolidada das posições e da distribuição da carteira.",
                    clients:
                      "Contexto, exposição e próximos passos de cada conta.",
                    funds:
                      "Conheça as posições e os clientes expostos em cada fundo.",
                    compare:
                      "Alternativas para revisão, com rentabilidades em períodos equivalentes.",
                    follow:
                      "Da primeira análise à próxima conversa: acompanhe cada decisão.",
                  }[page]
                }
              </p>
            </div>
            <div className="fd-page-actions">
              <Button variant="secondary" icon={Download} onClick={saveWorkspace}>Salvar trabalho</Button>
              {initial.remote?.persistent && <Button variant="secondary" onClick={remoteSave.saveNow} disabled={remoteSave.state === "saving"}>{remoteSave.state === "saving" ? "Salvando…" : "Salvar no site"}</Button>}
              <Button
                variant="secondary"
                icon={Download}
                onClick={() => exportPositions()}
              >
                Exportar CSV
              </Button>
              <Button
                icon={page === "follow" ? Plus : Upload}
                onClick={() =>
                  page === "follow" ? makeTask() : setModal("import")
                }
              >
                {page === "follow"
                  ? "Novo acompanhamento"
                  : "Importar posições"}
              </Button>
            </div>
          </div>
          <div className="fd-filters">
            <div className="fd-filter-leading">
              <SlidersHorizontal size={16} />
              <span>Filtrar carteira</span>
            </div>
            <Field label="Assessor">
              <select
                value={advisor}
                onChange={(e) => {
                  setAdvisor(e.target.value);
                  setClientKey(null);
                }}
              >
                <option value="all">Todos os assessores</option>
                {advisors.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estratégia">
              <select
                value={strategy}
                onChange={(e) => {
                  setStrategy(e.target.value);
                  setClientKey(null);
                }}
              >
                <option value="all">Todas as estratégias</option>
                {strategies.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Buscar" className="fd-search">
              <span className="fd-search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    page === "clients" ? "Buscar cliente ou conta…" : ["funds", "compare", "portfolio"].includes(page) ? "Buscar fundo da carteira…" : "Buscar fundo, cliente ou tarefa…"
                  }
                />
              </span>
            </Field>
            {(advisor !== "all" || strategy !== "all" || query) && (
              <button
                className="fd-icon-button"
                title="Limpar filtros"
                aria-label="Limpar filtros"
                onClick={() => {
                  setAdvisor("all");
                  setStrategy("all");
                  setQuery("");
                }}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>

          {page === "day" && <>
            <div className="fd-stats fd-summary-stats">
              <Stat label="Patrimônio em fundos" value={compact(total)} icon={PieChart} note={`${new Set(positions.map((p) => p.fundId)).size} fundos na seleção`} />
              <Stat label="Contas na carteira" value={clients.length} icon={Users} note="Identificadas por conta e assessor" />
              <Stat label="Fundos" value={new Set(positions.map((p) => p.fundId)).size} icon={Layers} note="Fora da previdência" />
              <Stat label="Situações para revisão" value={allAlerts.length} icon={Bell} note="Desempenho, concentração e dados" accent />
              <Stat label="Saldo exposto a alertas" value={compact(exposedBalance(positions, allAlerts))} icon={Layers} note="Sem dupla contagem" accent />
              <Stat label="% do saldo com alerta" value={percent(total ? exposedBalance(positions, allAlerts) / total : null)} icon={PieChart} note="Sobre os fundos selecionados" />
            </div>
            <div className="fd-summary-actions"><Button onClick={() => go("funds")}>Consultar um fundo e seus clientes</Button><Button variant="secondary" onClick={() => go("attention")}>Ver pontos de atenção · {allAlerts.length}</Button></div>
            <div className="fd-two-columns">
              <Panel title="Alocação por classe"><Allocation positions={positions} funds={funds} /></Panel>
              <Panel title="Alocação por gestora"><Allocation positions={positions} funds={funds} field="manager" /></Panel>
            </div>
            <Performance data={data} positions={positions} />
          </>}

          {page === "attention" && (
            <>
              <div className="fd-stats">
                <Stat
                  label="Patrimônio em fundos"
                  value={compact(total)}
                  icon={PieChart}
                  note={`${new Set(positions.map((p) => p.fundId)).size} fundos na seleção`}
                />
                <Stat
                  label="Contas na carteira"
                  value={clients.length}
                  icon={Users}
                  note="Sem consolidação por nome"
                />
                <Stat
                  label="Situações para revisão"
                  value={allAlerts.length}
                  icon={Bell}
                  note="Triagem, sem ordem de venda"
                  accent
                />
                <Stat
                  label="Saldo exposto a alertas"
                  value={compact(exposedBalance(positions, allAlerts))}
                  icon={Layers}
                  note="Posições sem dupla contagem"
                />
              </div>
              <div className="fd-day-layout">
                <div className="fd-priorities-column">
                  <Panel
                    title="O que merece sua atenção"
                    eyebrow="CENTRAL DE PRIORIDADES"
                    action={<Badge>{alerts.length} situações</Badge>}
                  >
                    <div
                      className="fd-priority-tabs"
                      role="group"
                      aria-label="Tipo de prioridade"
                    >
                      {[
                        "Todas",
                        "Desempenho",
                        "Concentração",
                        "Mudança no fundo",
                        "Queda",
                        ...(data.reviews?.some((r) => r.type === "Dados") ? ["Dados"] : []),
                        ...(data.reviews?.some((r) => r.type === "Liquidez") ? ["Liquidez"] : []),
                      ].map((p) => (
                        <button
                          key={p}
                          className={priority === p ? "active" : ""}
                          onClick={() => setPriority(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <div className="fd-alert-list">
                      {alerts.slice(0, alertCount).map((a, i) => (
                        <article key={a.id} className="fd-alert">
                          <div className={`fd-alert-icon ${a.severity}`}>
                            <ArrowUpRight size={19} />
                          </div>
                          <div className="fd-alert-body">
                            <div className="fd-alert-top">
                              <Badge
                                tone={a.severity === "high" ? "red" : "amber"}
                              >
                                {a.type}
                              </Badge>
                              <span>{a.period}</span>
                            </div>
                            <h3>{a.title}</h3>
                            <p>{a.reason}</p>
                            <div className="fd-alert-meta">
                              <span>
                                <Users size={13} />
                                {a.clients.length} conta
                                {a.clients.length !== 1 ? "s" : ""}
                              </span>
                              <span>
                                <b>{compact(a.balance)}</b> expostos
                              </span>
                            </div>
                            <div className="fd-alert-next">
                              <b>Próxima análise</b>
                              <span>{a.next}</span>
                            </div>
                            <div className="fd-alert-footer">
                              <button
                                className="fd-text-button"
                                onClick={() => openFund(a.fundId)}
                              >
                                Ver fundo e clientes <ArrowRight size={14} />
                              </button>
                              <button
                                className="fd-small-button"
                                onClick={() =>
                                  makeTask({
                                    fundId: a.fundId,
                                    clientKey: a.clients[0].key,
                                    title: a.title,
                                    notes: `${a.reason}\nPróxima análise: ${a.next}`,
                                  })
                                }
                              >
                                <Plus size={14} />
                                Acompanhar
                              </button>
                            </div>
                            <details className="fd-source">
                              <summary>Fonte e referência</summary>
                              <p>
                                {a.source} · {a.period}
                              </p>
                            </details>
                          </div>
                        </article>
                      ))}
                    </div>
                    {!alerts.length && (
                      <Empty title="Nenhuma situação neste filtro">
                        Sem alerta não significa recomendação de manter. A
                        cobertura depende dos dados disponíveis.
                      </Empty>
                    )}
                    {alerts.length > alertCount && (
                      <p className="fd-panel-note">
                        Mostrando {alertCount} de {alerts.length} situações.{" "}
                        <button onClick={() => setAlertCount((n) => n + 6)}>Mostrar mais prioridades</button>
                      </p>
                    )}
                    <div className="fd-panel-note">
                      Concentração: limite de triagem {percent(limit)} por fundo
                      sobre os fundos da conta.{" "}
                      <button onClick={() => setModal("settings")}>
                        Ajustar limite
                      </button>
                    </div>
                  </Panel>
                </div>
                <div className="fd-day-side">
                  <Panel
                    title="Como a carteira se distribui"
                    eyebrow="ALOCAÇÃO POR ESTRATÉGIA"
                  >
                    <Allocation positions={positions} funds={funds} />
                    <button
                      className="fd-panel-link"
                      onClick={() => go("portfolio")}
                    >
                      Explorar carteira <ArrowUpRight size={15} />
                    </button>
                  </Panel>
                  <Panel
                    title="Próximas conversas"
                    eyebrow="ACOMPANHAMENTO"
                    action={
                      <button
                        className="fd-icon-button"
                        aria-label="Criar acompanhamento"
                        onClick={() => makeTask()}
                      >
                        <Plus size={17} />
                      </button>
                    }
                  >
                    {tasks
                      .filter(
                        (t) =>
                          t.status !== "Concluído" &&
                          clients.some((c) => c.key === t.clientKey),
                      )
                      .slice(0, 3)
                      .map((t) => (
                        <button
                          className="fd-task-preview"
                          key={t.id}
                          onClick={() => {
                            go("follow");
                          }}
                        >
                          <span className="fd-task-date">
                            {dateLabel(t.due)}
                          </span>
                          <strong>{t.client}</strong>
                          <span>{t.title}</span>
                        </button>
                      ))}
                    {!tasks.some(
                      (t) =>
                        t.status !== "Concluído" &&
                        clients.some((c) => c.key === t.clientKey),
                    ) && (
                      <div className="fd-mini-empty">
                        <ClipboardList size={24} />
                        <h3>Uma boa análise pede continuidade.</h3>
                        <p>
                          Crie um acompanhamento a partir de uma prioridade e
                          organize sua próxima conversa.
                        </p>
                        <button
                          className="fd-text-button"
                          onClick={() => makeTask()}
                        >
                          Criar acompanhamento <Plus size={14} />
                        </button>
                      </div>
                    )}
                    <p className="fd-caption">
                      {initial.remote?.persistent ? "Acompanhamentos salvos no acesso privado." : "Salve o arquivo de trabalho para preservar os registros."}
                    </p>
                  </Panel>
                  <div className="fd-editorial">
                    <span className="fd-eyebrow">UM LEMBRETE IMPORTANTE</span>
                    <h3>
                      O alerta inicia a análise.
                      <br />A conversa orienta a decisão.
                    </h3>
                    <p>
                      Considere o contexto, o objetivo e o horizonte de cada
                      cliente antes de avaliar uma mudança.
                    </p>
                    <ShieldCheck size={25} />
                  </div>
                </div>
              </div>
              <Panel title="Contas com maior exposição a revisões prioritárias" eyebrow="PREPARAÇÃO DAS CONVERSAS"
                action={<Badge>{attentionClients.length} contas</Badge>}>
                {attentionClients.length > 0 ? <div className="fd-table-wrap"><table>
                  <thead><tr><th>Cliente / conta</th><th>Saldo em revisão</th><th>Total em fundos da conta</th><th>% dos fundos da conta</th><th>Fundos para revisar</th></tr></thead>
                  <tbody>{attentionClients.slice(0, 25).map((client) => <tr key={client.key}>
                    <td><button className="fd-table-link" onClick={() => { go("clients"); setClientKey(client.key); }}>{client.name}</button><small>{client.id} · {client.advisor}</small></td>
                    <td>{money(client.exposure)}</td><td>{money(client.accountBalance)}</td><td>{percent(client.weight)}</td>
                    <td>{client.fundIds.map((id) => <button key={id} className="fd-table-link fd-priority-fund" onClick={() => openFund(id, "funds", client.key)}>{funds.find((fund) => fund.id === id)?.name}</button>)}</td>
                  </tr>)}</tbody>
                </table></div> : <Empty title="Sem revisões de prioridade alta nesta seleção">Alertas de prioridade média e concentrações continuam disponíveis na central.</Empty>}
                <p className="fd-panel-note">Até 25 contas, ordenadas pelo saldo exposto a alertas de prioridade alta. Cada posição é contada uma vez. O percentual usa todos os fundos importados da conta, mesmo com filtro de estratégia. Esta lista orienta a revisão, sem determinar uma venda.</p>
              </Panel>
            </>
          )}

          {page === "portfolio" && (
            <>
              <div className="fd-stats">
                <Stat
                  label="Patrimônio selecionado"
                  value={compact(total)}
                  icon={PieChart}
                  note={`Posições de ${dateLabel(data.date)}`}
                />
                <Stat
                  label="Fundos"
                  value={new Set(positions.map((p) => p.fundId)).size}
                  icon={Layers}
                  note="Produtos fora da previdência"
                />
                <Stat
                  label="Contas"
                  value={clients.length}
                  icon={Users}
                  note="Universo dos filtros atuais"
                />
                <Stat
                  label="Fonte das posições"
                  value={initial.remote ? "XPerformance" : "Arquivo privado"}
                  icon={FileText}
                  note={data.source}
                />
              </div>
              <div className="fd-two-columns">
                <Panel title="Distribuição por estratégia">
                  <Allocation positions={positions} funds={funds} />
                </Panel>
                <Panel title="Concentração por gestora">
                  <Allocation
                    positions={positions}
                    funds={funds}
                    field="manager"
                  />
                </Panel>
              </div>
              <Performance data={data} positions={positions} />
              <Panel
                title="Posições por fundo"
                eyebrow="CARTEIRA CONSOLIDADA"
                action={<Field label="Ordenar fundos"><select value={fundSort} onChange={(event) => setFundSort(event.target.value)}>
                  <option value="balance">Maior saldo</option><option value="return12">Maior retorno em 12M</option><option value="name">Nome do fundo</option>
                </select></Field>}
              >
                {fundTable}
                <p className="fd-panel-note">
                  Os pesos usam o saldo do filtro atual. Retornos dos fundos não
                  representam o resultado efetivo dos clientes.
                </p>
              </Panel>
            </>
          )}

          {page === "clients" && !activeClient && (
            <Panel
              title="Contas e clientes"
              eyebrow="VISÃO INDIVIDUAL"
              action={<Badge>{clients.length} contas</Badge>}
            >
              <div className="fd-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente / conta</th>
                      <th>Assessor</th>
                      <th>Saldo no filtro</th>
                      <th>Fundos</th>
                      <th>Revisões</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {clients
                      .filter((c) => textMatch(`${c.name} ${c.id}`, query))
                      .map((c) => (
                        <tr key={c.key}>
                          <td>
                            <button
                              className="fd-table-link"
                              onClick={() => setClientKey(c.key)}
                            >
                              {c.name}
                            </button>
                            <small>Conta {c.id}</small>
                          </td>
                          <td>{c.advisor}</td>
                          <td>{money(c.balance)}</td>
                          <td>
                            {new Set(c.positions.map((p) => p.fundId)).size}
                          </td>
                          <td>
                            <Badge tone="amber">
                              {
                                allAlerts.filter((a) =>
                                  a.clients.some((x) => x.key === c.key),
                                ).length
                              }{" "}
                              revisões
                            </Badge>
                          </td>
                          <td>
                            <button
                              className="fd-icon-button"
                              aria-label={`Abrir ${c.name}`}
                              onClick={() => setClientKey(c.key)}
                            >
                              <ArrowUpRight size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!clients.some((c) => textMatch(`${c.name} ${c.id}`, query)) && (
                <Empty title="Nenhum cliente encontrado">
                  Ajuste a busca e os filtros.
                </Empty>
              )}
            </Panel>
          )}
          {page === "clients" && activeClient && (
            <>
              <button
                className="fd-text-button fd-back"
                onClick={() => setClientKey(null)}
              >
                <ArrowLeft size={16} />
                Voltar aos clientes
              </button>
              <Panel
                title={activeClient.name}
                eyebrow={`CONTA ${activeClient.id} · ASSESSOR ${activeClient.advisor}`}
                action={
                  <Button
                    variant="secondary"
                    icon={Plus}
                    onClick={() =>
                      makeTask({
                        clientKey: activeClient.key,
                        fundId: activeClient.positions[0].fundId,
                      })
                    }
                  >
                    Preparar conversa
                  </Button>
                }
              >
                <div className="fd-client-summary">
                  <div>
                    <span>Saldo em fundos</span>
                    <strong>{money(activeClient.balance)}</strong>
                  </div>
                  <div>
                    <span>Objetivo e alocação de referência</span>
                    <strong className="fd-normal-value">
                      Ainda não cadastrados
                    </strong>
                  </div>
                  <div>
                    <span>Experiência efetiva do cliente</span>
                    <strong className="fd-normal-value">
                      Movimentações não disponíveis
                    </strong>
                  </div>
                </div>
                <div className="fd-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fundo</th>
                        <th>Estratégia / função</th>
                        <th>Saldo</th>
                        <th>Peso na conta</th>
                        <th>Liquidez informada</th>
                        <th>Mês</th><th>Ano</th><th>12 meses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeClient.positions.map((p) => {
                        const f = funds.find((f) => f.id === p.fundId);
                        return (
                          <tr key={`${p.account}:${p.fundId}`}>
                            <td>
                              <button
                                className="fd-table-link"
                                onClick={() => openFund(f.id, "funds", activeClient.key)}
                              >
                                {f.name}
                              </button>
                            </td>
                            <td>
                              {f.strategy}
                              <small>{f.role}</small>
                            </td>
                            <td>{money(p.balance)}</td>
                            <td>{percent(p.balance / activeClient.balance)}</td>
                            <td>{f.liquidity}</td>
                            {[0, 1, 2].map((period) => <td key={period}>{percent(f.returns[period])}</td>)}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="fd-panel-note">
                  Esta página mostra todos os fundos importados da conta,
                  independentemente do filtro de estratégia. Os percentuais
                  cobrem somente esses fundos. Liquidez informada não garante
                  disponibilidade em situações extraordinárias. As rentabilidades são dos fundos, não o resultado efetivo desta conta.
                </p>
              </Panel>
              <div className="fd-two-columns">
                <Panel title="Concentração por estratégia">
                  <Allocation
                    positions={activeClient.positions}
                    funds={funds}
                  />
                </Panel>
                <Panel title="Últimas decisões">
                  {tasks
                    .filter((t) => t.clientKey === activeClient.key)
                    .map((t) => (
                      <div key={t.id} className="fd-client-task">
                        <Badge>{t.status}</Badge>
                        <h3>{t.title}</h3>
                        <p>{t.history.at(-1).notes}</p>
                        <span>Próxima revisão: {dateLabel(t.due)}</span>
                      </div>
                    ))}
                  {!tasks.some((t) => t.clientKey === activeClient.key) && (
                    <Empty title="Ainda sem histórico">
                      Registre a primeira conversa para acompanhar as próximas
                      decisões.
                    </Empty>
                  )}
                </Panel>
              </div>
              <Panel title="O que revisar nesta conta" eyebrow="MOTIVO E PRÓXIMA ANÁLISE">
                {activeClientAlerts.map((alert) => <article className="fd-account-review" key={alert.id}>
                  <Badge tone={alert.severity === "high" ? "amber" : "neutral"}>{alert.type}</Badge>
                  <h3>{funds.find((fund) => fund.id === alert.fundId)?.name}</h3>
                  <p>{alert.reason}</p><p><strong>Próxima análise:</strong> {alert.next}</p>
                  <p className="fd-caption">Exposição: {money(alert.balance)} · {alert.period} · Fonte: {alert.source}</p>
                  <Button variant="secondary" onClick={() => makeTask({ clientKey: activeClient.key, fundId: alert.fundId, title: `Revisar ${funds.find((fund) => fund.id === alert.fundId)?.name}`, notes: `${alert.reason}\nPróxima análise: ${alert.next}` })}>Preparar conversa sobre este fundo</Button>
                </article>)}
                {!activeClientAlerts.length && <Empty title="Sem revisão sinalizada nos dados disponíveis">A ausência de alerta não confirma adequação aos objetivos do cliente. Perfil, objetivos e restrições são conferidos pelo assessor.</Empty>}
              </Panel>
            </>
          )}

          {(page === "funds" || page === "compare") && (
            <>
              <Panel
                title={
                  page === "compare"
                    ? "Selecione o fundo atual"
                    : "Consultar um fundo"
                }
                eyebrow={
                  page === "compare"
                    ? "SUGESTÕES DE REALOCAÇÃO"
                    : "FUNDOS DA CARTEIRA"
                }
              >
                <Field label="Conta na consulta" className="fd-account-select">
                  <select value={activeClient?.key || "all"} onChange={(e) => {
                    const key = e.target.value === "all" ? null : e.target.value;
                    setClientKey(key);
                    setQuery("");
                  }}>
                    <option value="all">Todas as contas · visão do assessor</option>
                    {groupClients(data.positions.filter((p) => advisor === "all" || p.advisor === advisor)).map((client) => <option key={client.key} value={client.key}>{client.name} · {client.id} · {client.advisor}</option>)}
                  </select>
                </Field>
                <Field label="Fundo" className="fd-fund-select">
                  <select
                    value={selectedFund?.id || ""}
                    onChange={(e) => setFundId(e.target.value)}
                  >
                    {!consultationFunds.length && <option value="">Nenhum fundo nesta seleção</option>}
                    {consultationFunds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} · {f.strategy}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="fd-caption">{activeClient ? `Somente fundos presentes na conta ${activeClient.id}. Pesos calculados sobre todos os fundos importados desta conta.` : "Escolha uma conta para consultar apenas os fundos em que ela está posicionada."}</p>
              </Panel>
              {selectedFund ? (
                <div className="fd-fund-layout">
                  <div>
                    <Panel
                      title={selectedFund.name}
                      eyebrow={selectedFund.strategy}
                      action={
                        <Badge>
                          Posição importada
                        </Badge>
                      }
                    >
                      <div className="fd-fund-info">
                        <div>
                          <span>Gestora</span>
                          <strong>{selectedFund.manager}</strong>
                        </div>
                        <div>
                          <span>Saldo no filtro</span>
                          <strong>{money(sum(currentFundPositions))}</strong>
                        </div>
                        <div>
                          <span>Liquidez informada</span>
                          <strong>{selectedFund.liquidity}</strong>
                        </div>
                      </div>
                      <div className="fd-section-label">CLIENTES EXPOSTOS</div>
                      <Button variant="secondary" icon={Download} onClick={() => download("clientes_do_fundo.csv", positionCsv(data, currentFundPositions))}>Exportar clientes deste fundo</Button>
                      <div className="fd-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Cliente / conta</th>
                              <th>Saldo no fundo</th>
                              <th>% do saldo do fundo no filtro</th>
                              <th>Total em fundos da conta</th>
                              <th>% dos fundos da conta</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {fundClients
                              .filter((c) =>
                                textMatch(
                                  `${c.name} ${c.id} ${selectedFund.name}`,
                                  query,
                                ),
                              )
                              .map((c) => {
                                return (
                                  <tr key={c.key}>
                                    <td>
                                      <button
                                        className="fd-table-link"
                                        onClick={() => {
                                          go("clients");
                                          setClientKey(c.key);
                                        }}
                                      >
                                        {c.name}
                                      </button>
                                      <small>
                                        {c.id} · {c.advisor}
                                      </small>
                                    </td>
                                    <td>{money(c.balance)}</td>
                                    <td>{percent(sum(currentFundPositions) > 0 ? c.balance / sum(currentFundPositions) : null)}</td>
                                    <td>{money(accountBalance(c.key))}</td>
                                    <td>
                                      {percent(
                                        accountBalance(c.key)
                                          ? c.balance / accountBalance(c.key)
                                          : 0,
                                      )}
                                    </td>
                                    <td>
                                      <button
                                        className="fd-icon-button"
                                        aria-label={`Preparar reunião com ${c.name}`}
                                        onClick={() =>
                                          makeTask({
                                            clientKey: c.key,
                                            fundId: selectedFund.id,
                                            title: `Revisar ${selectedFund.name}`,
                                          })
                                        }
                                      >
                                        <Plus size={17} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                      {!fundClients.length && (
                        <Empty title="Sem posições neste filtro">
                          Selecione outro fundo ou amplie o filtro da carteira.
                        </Empty>
                      )}
                      <p className="fd-panel-note">
                        Prazos de resgate e disponibilidade devem ser
                        confirmados antes de qualquer realocação.
                      </p>
                    </Panel>
                    <Panel title="O que analisar antes da conversa" eyebrow={activeClient ? `CONTA ${activeClient.id}` : "REVISÃO DO FUNDO"}>
                      {(() => {
                        const reviews = buildAlerts(data, activeClient ? activeClient.positions : positions, limit).filter((alert) => alert.fundId === selectedFund.id);
                        return reviews.length ? reviews.map((alert) => <article className="fd-account-review" key={alert.id}>
                          <Badge tone={alert.severity === "high" ? "red" : "amber"}>{alert.type}</Badge>
                          <h3>{alert.title}</h3><p>{alert.reason}</p><p><b>Próximo passo:</b> {alert.next}</p>
                          <p className="fd-caption">{alert.source} · {alert.period}</p>
                          <Button variant="secondary" onClick={() => makeTask({ clientKey: activeClient?.key || alert.clients[0]?.key, fundId: selectedFund.id, title: alert.title, notes: `${alert.reason}\nPróxima análise: ${alert.next}` })}>Preparar conversa sobre este fundo</Button>
                        </article>) : <Empty title="Sem revisão sinalizada para esta posição">A conferência de objetivos, perfil e restrições cabe ao assessor. Ausência de alerta não confirma adequação.</Empty>;
                      })()}
                    </Panel>
                  </div>
                  <Suggestions fund={selectedFund} data={data} comparisonPeriod={comparisonPeriod} setComparisonPeriod={setComparisonPeriod} activeClient={activeClient} fundClients={fundClients} makeTask={makeTask} onImport={() => suggestionsRef.current?.click()} />
                </div>
              ) : (
                <Empty title="Nenhum fundo disponível">
                  Importe posições para começar.
                </Empty>
              )}
            </>
          )}

          {page === "follow" && (
            <>
              <div className="fd-follow-summary">
                {statuses.map((s) => (
                  <button
                    key={s}
                    className={followStatus === s ? "active" : ""}
                    onClick={() =>
                      setFollowStatus(followStatus === s ? "Todos" : s)
                    }
                  >
                    <span>{s}</span>
                    <strong>
                      {
                        tasks.filter(
                          (t) =>
                            t.status === s &&
                            clients.some((c) => c.key === t.clientKey),
                        ).length
                      }
                    </strong>
                  </button>
                ))}
              </div>
              <Panel
                title="Conversas, decisões e próximas revisões"
                eyebrow="HISTÓRICO DA SESSÃO"
                action={<Badge>{scopedTasks.length} registros</Badge>}
              >
                <div className="fd-task-list">
                  {scopedTasks.map((t) => (
                    <article key={t.id} className="fd-task">
                      <div>
                        <Badge
                          tone={t.status === "Concluído" ? "green" : "amber"}
                        >
                          {t.status}
                        </Badge>
                        <h3>{t.title}</h3>
                        <p>
                          {t.client} · {t.fund}
                        </p>
                        <p className="fd-task-note">{t.history.at(-1).notes}</p>
                        <small>
                          Responsável: {t.owner} · Próxima revisão:{" "}
                          {dateLabel(t.due)}
                        </small>
                      </div>
                      <div className="fd-task-actions">
                        <Button
                          variant="secondary"
                          icon={FileText}
                          onClick={() => {
                            setTaskSeed(t);
                            setModal("meeting");
                          }}
                        >
                          Resumo da reunião
                        </Button>
                        <Button
                          variant="secondary"
                          icon={Check}
                          onClick={() => {
                            setTaskSeed(t);
                            setError("");
                            setModal("decision");
                          }}
                        >
                          Registrar decisão
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
                {!scopedTasks.length && (
                  <Empty title="Seu próximo passo começa com uma conversa">
                    Crie um acompanhamento para registrar a análise, a decisão e
                    a próxima revisão.
                  </Empty>
                )}
                <p className="fd-panel-note">
                  {initial.remote?.persistent ? "Alterações salvas no acesso privado, com histórico de decisões. Você também pode baixar um backup em Salvar trabalho." : "Salve o arquivo de trabalho para continuar depois com a carteira e o histórico de decisões."}
                </p>
              </Panel>
            </>
          )}
          <footer className="fd-footer">
            <span>
              RD Investimentos <span className="fd-footer-divider">/</span>{" "}
              Inteligência de carteira
            </span>
            <span>
              {`Posições de ${dateLabel(data.date)}`}{" "}
              <span className="fd-footer-divider">·</span>
              <button onClick={() => setModal("method")}>
                Fontes e metodologia
              </button>
            </span>
          </footer>
        </main>
      </div>
      <input
        className="sr-only"
        ref={inputRef}
        tabIndex={-1}
        aria-label="Arquivo de carteira"
        type="file"
        accept=".csv,.rdfundos,.json,text/csv,application/json"
        onChange={readFile}
      />
      {notice && (
        <div className="fd-toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}

      <input ref={suggestionsRef} type="file" accept=".json,application/json" hidden aria-label="Arquivo de alternativas" onChange={readSuggestions} />
      {modal === "suggestions-error" && <Modal title="Não foi possível carregar as alternativas" onClose={() => setModal(null)}><p role="alert">{error}</p></Modal>}
      {modal === "workspace-error" && <Modal title="Não foi possível salvar o trabalho" onClose={() => setModal(null)}><p role="alert">{error}</p></Modal>}
      {modal === "import" && (
        <Modal
          title="Importar posições de fundos"
          onClose={() => setModal(null)}
        >
          <p className="fd-modal-intro">
            Abra um arquivo de trabalho RD Fundos para carregar a carteira,
            as prioridades, as alternativas e os acompanhamentos juntos.
            Também é possível importar posições em CSV.
          </p>
          <div className="fd-import-drop">
            <Upload size={30} />
            <h3>Uma fotografia clara da carteira</h3>
            <p>Arquivo RD Fundos ou CSV · até 10 MB / 10.000 posições</p>
            <Button icon={Upload} onClick={() => inputRef.current.click()}>
              Selecionar carteira ou arquivo de trabalho
            </Button>
            <button
              className="fd-text-button"
              onClick={() =>
                download("modelo_posicoes_fundos.csv", templateCsv)
              }
            >
              Baixar modelo de colunas <Download size={14} />
            </button>
          </div>
          <p className="fd-caption">
            Saldo: 1234,56 · Data: AAAA-MM-DD · Uma linha por conta e fundo.
            Datas diferentes, duplicidades e produtos identificados como
            previdência são rejeitados. O fundo deve estar classificado na
            origem.
          </p>
          <p className="fd-local-note">
            <ShieldCheck size={17} />
            O arquivo é processado neste navegador. Carteiras e registros não
            são enviados a um servidor. Guarde os arquivos de trabalho em um local privado.
          </p>
          {error && (
            <p className="fd-error" role="alert">
              {error}
            </p>
          )}
          {pending && (
            <div className="fd-import-preview">
              <Badge tone="green">Estrutura validada</Badge>
              <h3>Conferência do lote</h3>
              <dl>
                <div>
                  <dt>Posições</dt>
                  <dd>{pending.data.positions.length}</dd>
                </div>
                <div>
                  <dt>Contas</dt>
                  <dd>{groupClients(pending.data.positions).length}</dd>
                </div>
                <div>
                  <dt>Data única</dt>
                  <dd>{dateLabel(pending.data.date)}</dd>
                </div>
                <div>
                  <dt>Saldo total</dt>
                  <dd>{money(sum(pending.data.positions))}</dd>
                </div>
                {pending.data.workspace && <>
                  <div><dt>Prioridades pesquisadas</dt><dd>{pending.data.reviews.length}</dd></div>
                  <div><dt>Fundos com alternativas</dt><dd>{Object.keys(pending.data.suggestions).length}</dd></div>
                  <div><dt>Acompanhamentos</dt><dd>{pending.tasks.length}</dd></div>
                </>}
              </dl>
              <p>
                Compare este total com a origem. A validação de estrutura não
                comprova a exatidão dos dados.
              </p>
              <Button icon={Check} onClick={() => reset(pending)}>
                Confirmar e usar esta base
              </Button>
            </div>
          )}
          <div className="fd-modal-bottom">
            <span>Trocar a base limpa os acompanhamentos da sessão.</span>

          </div>
        </Modal>
      )}

      {modal === "settings" && (
        <Modal
          title="Limite de triagem de concentração"
          onClose={() => setModal(null)}
        >
          <p className="fd-modal-intro">
            O limite se aplica a cada fundo sobre o total de fundos da conta,
            sem presumir o patrimônio total do cliente. É um parâmetro de
            triagem, não uma regra aprovada de suitability.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setLimit(
                Number(new FormData(e.currentTarget).get("limit")) / 100,
              );
              setModal(null);
              setNotice("Limite de triagem atualizado.");
            }}
          >
            <Field label="Percentual máximo por fundo">
              <input
                name="limit"
                type="number"
                min="1"
                max="100"
                step="1"
                defaultValue={Math.round(limit * 100)}
                required
              />
            </Field>
            <Button icon={Check} type="submit">
              Aplicar à sessão
            </Button>
          </form>
        </Modal>
      )}

      {modal === "task" && (
        <Modal title="Preparar acompanhamento" onClose={() => setModal(null)}>
          <p className="fd-modal-intro">
            Vincule uma conta e um fundo, registre o motivo e defina o próximo
            contato.
          </p>
          {clients.length ? (
            <form onSubmit={taskForm}>
              <div className="fd-form-grid">
                <Field label="Cliente / conta">
                  <select
                    required
                    name="client"
                    value={taskAccountKey}
                    onChange={(e) => {
                      setTaskAccountKey(e.target.value);
                      setTaskFundId(taskSeed?.fundId || clients.find((c) => c.key === e.target.value)?.positions[0]?.fundId || "");
                    }}
                  >
                    {clients.filter((c) => !taskSeed?.fundId || c.positions.some((p) => p.fundId === taskSeed.fundId)).map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.name} · {c.id}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fundo">
                  <select
                    required
                    name="fund"
                    value={taskFundId}
                    onChange={(e) => setTaskFundId(e.target.value)}
                  >
                    {funds.filter((fund) => (!taskSeed?.fundId || taskSeed.fundId === fund.id) && clients.find((c) => c.key === taskAccountKey)?.positions.some((p) => p.fundId === fund.id)).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Assunto">
                <input
                  name="title"
                  maxLength={160}
                  defaultValue={taskSeed?.title || ""}
                  placeholder="O que você quer revisar nesta conversa?"
                  required
                />
              </Field>
              <Field label="Justificativa e próxima análise">
                <textarea
                  name="notes"
                  rows={4}
                  maxLength={3000}
                  defaultValue={taskSeed?.notes || ""}
                  placeholder="Registre o contexto e o que precisa ser conferido."
                  required
                />
              </Field>
              <div className="fd-form-grid">
                <Field label="Responsável">
                  <input
                    name="owner"
                    maxLength={100}
                    defaultValue="Ícaro Neves"
                    required
                  />
                </Field>
                <Field label="Próxima revisão">
                  <input name="due" type="date" required />
                </Field>
              </div>
              {error && (
                <p className="fd-error" role="alert">
                  {error}
                </p>
              )}
              <div className="fd-modal-bottom">
                <span>Registro temporário nesta sessão.</span>
                <Button type="submit" icon={Plus}>
                  Criar acompanhamento
                </Button>
              </div>
            </form>
          ) : (
            <Empty title="Sem contas neste filtro">
              Amplie os filtros ou carregue posições.
            </Empty>
          )}
        </Modal>
      )}

      {modal === "decision" && (
        <Modal
          title="Registrar conversa ou decisão"
          onClose={() => setModal(null)}
        >
          <p className="fd-modal-intro">
            {taskSeed.client} · {taskSeed.fund}
          </p>
          <form onSubmit={updateTask}>
            <Field label="Status do atendimento">
              <select name="status" defaultValue={taskSeed.status}>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="O que foi conversado ou decidido?">
              <textarea
                name="notes"
                maxLength={3000}
                rows={4}
                required
                placeholder="Inclua a justificativa, inclusive quando a decisão for manter."
              />
            </Field>
            <Field label="Próxima revisão">
              <input
                name="due"
                type="date"
                defaultValue={taskSeed.due}
                required
              />
            </Field>
            <p className="fd-caption">
              Concluir o atendimento não registra a execução de uma ordem.
            </p>
            {error && (
              <p className="fd-error" role="alert">
                {error}
              </p>
            )}
            <Button icon={Check} type="submit">
              Salvar registro
            </Button>
          </form>
        </Modal>
      )}

      {modal === "meeting" && (
        <Modal
          title="Resumo para a reunião"
          wide
          onClose={() => setModal(null)}
        >
          <div className="fd-meeting" id="resumo-reuniao">
            <Badge>
              Resumo do atendimento
            </Badge>
            <h3>{taskSeed.client}</h3>
            <p>
              {taskSeed.title} · {taskSeed.fund}
            </p>
            <dl>
              <div>
                <dt>Responsável</dt>
                <dd>{taskSeed.owner}</dd>
              </div>
              <div>
                <dt>Próxima revisão</dt>
                <dd>{dateLabel(taskSeed.due)}</dd>
              </div>
              <div>
                <dt>Posições de referência</dt>
                <dd>{dateLabel(data.date)}</dd>
              </div>
            </dl>
            <h4>Contexto da revisão</h4>
            <p className="fd-pre-wrap">{taskSeed.notes}</p>
            <h4>Antes da conversa</h4>
            <ul>
              <li>Confirmar objetivo, horizonte e necessidade de liquidez.</li>
              <li>
                Revisar a documentação vigente e o papel do fundo na conta.
              </li>
              <li>
                Verificar elegibilidade, custos e efeitos tributários antes de
                propor alteração.
              </li>
            </ul>
            <h4>Histórico</h4>
            {taskSeed.history.map((h, i) => (
              <div className="fd-history" key={i}>
                <Badge>{h.status}</Badge>
                <time>
                  {new Date(h.at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </time>
                <p className="fd-pre-wrap">{h.notes}</p>
              </div>
            ))}
          </div>
          <div className="fd-modal-bottom">
            <Button
              variant="secondary"
              icon={Download}
              onClick={() =>
                download(
                  "resumo_reuniao.txt",
                  `${taskSeed.client}\n${taskSeed.title}\nFundo: ${taskSeed.fund}\nFonte das posições: ${data.source}\nReferência: ${dateLabel(data.date)}\nResponsável: ${taskSeed.owner}\nPróxima revisão: ${dateLabel(taskSeed.due)}\n\n${taskSeed.notes}\n\nHistórico:\n${taskSeed.history.map((h) => `${h.at} | ${h.status}\n${h.notes}`).join("\n\n")}`,
                  "text/plain;charset=utf-8",
                )
              }
            >
              Baixar resumo
            </Button>
            <Button icon={Printer} onClick={() => window.print()}>
              Imprimir pauta
            </Button>
          </div>
        </Modal>
      )}

      {modal === "method" && (
        <Modal
          title="Fontes, cobertura e metodologia"
          wide
          onClose={() => setModal(null)}
        >
          <div className="fd-method">
            <Badge>
              Carteira privada
            </Badge>
            <h3>O que esta versão faz</h3>
            <p>
              Consolida posições da mesma data, calcula pesos e concentrações,
              relaciona fundos a contas e permite registrar acompanhamentos.
              Os alertas de concentração usam o limite configurado de{" "}
              {percent(limit)}. Contas distintas não são unificadas por nome.
              {data.reviews?.length > 0 && " As revisões pesquisadas são carregadas do arquivo de trabalho, com motivo, fonte e referência; não são calculadas automaticamente neste navegador."}
            </p>
            <h3>Origem e referência</h3>
            <p>
              Fonte atual: {data.source}. Data das posições:{" "}
              {dateLabel(data.date)}.{" "}
              Posições extraídas dos relatórios enviados. Ausências e divergências de dados
              são mantidas como pendências. Retornos não são inferidos a partir dos saldos.
            </p>
            <h3>Sugestões de realocação</h3>
            <p>
              A curadoria pesquisada é específica para cada fundo de origem,
              condicionada à conferência documental e de compatibilidade pelo assessor.
              A sugestão exige retorno superior na janela escolhida e a mesma data de referência.
              Retorno ausente, empate ou desempenho inferior impedem a sugestão nessa janela.
              Estratégias ou benchmarks conhecidos e diferentes também impedem a comparação.
              A diferença em pontos percentuais descreve o passado e não é projeção de ganho em reais.
              A interface apresenta apenas identificação,
              retornos e referência. A análise técnica não integra a interface
              nem o pacote público.
            </p>
            <h3>Cobertura e limitações</h3>
            <p>
              Os indicadores consolidados são médias dos retornos dos fundos ponderadas
              pelos saldos da fotografia. Cada período exclui retornos ausentes e mostra
              sua cobertura em saldo. Não são rentabilidade da carteira nem do investidor.
              Benchmarks exigem vínculo explícito por fundo e períodos equivalentes;
              CDI não é atribuído automaticamente. A razão entre retornos só aparece
              quando o retorno do índice é positivo; referência zero ou negativa permanece
              disponível sem produzir essa razão.
            </p>
            <p>
              Pesos são calculados sobre os fundos disponíveis no universo
              indicado. Alertas são triagem. Não há cálculo de rentabilidade
              efetiva do investidor, impostos, correlação ou sobreposição nesta
              versão. Taxas refletidas nas cotas não são descontadas novamente.
              A rentabilidade histórica não prevê resultados futuros.
            </p>
            <h3>Privacidade e registros</h3>
            <p>
              {initial.remote?.persistent ? "O acesso online exige uma sessão autenticada. O trabalho é salvo no armazenamento privado; consulte o status de salvamento. Use ‘Salvar trabalho’ para baixar um backup da carteira e do histórico." : "Alterações ficam na memória do navegador. Use ‘Salvar trabalho’ para exportar a carteira e o histórico e reabra esse arquivo para continuar. Esta cópia é um arquivo privado, sem sincronização com o servidor."} Os filtros não são
              controles de acesso. A versão HTML privada abre a fotografia que recebeu;
              os arquivos com contas e decisões devem permanecer em local privado.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Stat({ label, value, icon: Icon, note, accent }) {
  return (
    <div className={`fd-stat ${accent ? "accent" : ""}`}>
      <div>
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}
export default function App() {
  return typeof window !== "undefined" &&
    window.location.pathname.replace(/\/$/, "") === "/planejamento" ? (
    <FinancialOnboarding />
  ) : (
    <PrivateAccess Dashboard={FundsDashboard} />
  );
}
