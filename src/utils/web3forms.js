// 🔑 Cole aqui a chave gerada em https://web3forms.com (Access Key)
const WEB3FORMS_ACCESS_KEY = "a8926532-fc01-4c07-8346-d5fbc4602ec1";

import { fmtBRL, fmtUSD, formatFullDate, formatMonthYear } from "./format.js";

/* ------------------------------------------------------------------ */
/*  MONTA O CORPO DO E-MAIL COM TODAS AS INFORMAÇÕES                   */
/* ------------------------------------------------------------------ */

export function buildSummaryText(form) {
  const L = [];
  const p = (s = "") => L.push(s);

  p(`PLANEJAMENTO FINANCEIRO — ${form.nomeCompleto || "Sem nome"}`);
  p("=".repeat(50));

  p("\n1. DADOS FAMILIARES");
  p(`  Estado civil: ${form.estadoCivilCliente || "—"}`);
  if (form.estadoCivilCliente === "Casado(a)" || form.estadoCivilCliente === "União estável") {
    p(`  Cônjuge: ${form.nomeConjuge || "—"} | Nascimento: ${formatFullDate(form.dataNascConjuge)}`);
  }
  if (form.membros.length === 0) p("  Nenhum membro cadastrado.");
  form.membros.forEach((m, i) => {
    p(`  • ${m.nome || `Membro ${i + 1}`}`);
    p(`    Parentesco: ${m.parentesco || "—"} | Nascimento: ${formatFullDate(m.dataNasc)} | Estado civil: ${m.estadoCivil || "—"} | Dependente: ${m.dependente ? "Sim" : "Não"}`);
  });

  p("\n2. OBJETIVOS — APOSENTADORIA");
  p(`  Idade desejada: ${form.idadeAposentadoria || "—"}`);
  p(`  Forma de resgate: ${form.formaResgate || "—"}`);
  p(`  Renda mensal desejada: ${fmtBRL(form.rendaAposentadoria)}`);
  p(`  Expectativa de vida: ${form.expectativaVida || "—"}`);

  p("\n3. RENDAS");
  if (form.rendas.length === 0) p("  Nenhuma renda cadastrada.");
  form.rendas.forEach((r, i) => {
    p(`  • ${r.descricao || `Renda ${i + 1}`} (${r.categoria || "—"})`);
    p(`    Bruto: ${fmtBRL(r.bruto)} | Imposto: ${fmtBRL(r.imposto)} | Líquido: ${fmtBRL(r.liquido)} | Frequência: ${r.frequencia || "—"}`);
  });

  p("\n4. DESPESAS");
  if (form.despesas.length === 0) p("  Nenhuma despesa cadastrada.");
  form.despesas.forEach((d, i) => {
    p(`  • ${d.descricao || `Despesa ${i + 1}`} (${d.categoria || "—"})`);
    p(`    Valor: ${fmtBRL(d.valor)} | Frequência: ${d.frequencia || "—"}`);
  });

  p("\n5. INVESTIMENTOS NACIONAIS");
  if (form.investNacionais.length === 0) p("  Nenhum investimento cadastrado.");
  form.investNacionais.forEach((inv, i) => {
    p(`  • ${inv.instituicao || `Investimento ${i + 1}`} — ${inv.tipo || "—"}`);
    p(`    Referência: ${formatMonthYear(inv.dataRef)} | Patrimônio: ${fmtBRL(inv.patrimonio)}`);
    if (inv.comentarios) p(`    Comentários: ${inv.comentarios}`);
  });

  p("\n6. INVESTIMENTOS GLOBAIS");
  if (form.investGlobais.length === 0) p("  Nenhum investimento global cadastrado.");
  form.investGlobais.forEach((inv, i) => {
    p(`  • ${inv.instituicao || `Investimento global ${i + 1}`}`);
    p(`    Referência: ${formatMonthYear(inv.dataRef)} | Valor: ${fmtUSD(inv.valor)}`);
    if (inv.comentarios) p(`    Comentários: ${inv.comentarios}`);
  });

  p("\n7. IMÓVEIS");
  if (form.imoveis.length === 0) p("  Nenhum imóvel cadastrado.");
  form.imoveis.forEach((im, i) => {
    p(`  • ${im.descricao || `Imóvel ${i + 1}`} — ${im.tipo || "—"}`);
    p(`    Local: ${im.cidade || "—"}/${im.estado || "—"} | Valor: ${fmtBRL(im.valor)}`);
  });

  p("\n8. VEÍCULOS");
  if (form.veiculos.length === 0) p("  Nenhum veículo cadastrado.");
  form.veiculos.forEach((v, i) => {
    p(`  • ${v.descricao || `Veículo ${i + 1}`} — ${v.tipo || "—"} | Valor: ${fmtBRL(v.valor)}`);
  });

  p("\n9. PARTICIPAÇÃO SOCIETÁRIA");
  if (form.empresas.length === 0) p("  Nenhuma empresa cadastrada.");
  form.empresas.forEach((e, i) => {
    p(`  • ${e.nome || `Empresa ${i + 1}`} (CNPJ: ${e.cnpj || "—"})`);
    p(`    Valor da empresa: ${fmtBRL(e.valorEmpresa)} | Participação: ${e.participacao || "—"}%`);
  });

  p("\n10. OUTROS BENS");
  if (form.outrosBens.length === 0) p("  Nenhum bem cadastrado.");
  form.outrosBens.forEach((b, i) => {
    p(`  • ${b.descricao || `Bem ${i + 1}`} | Valor: ${fmtBRL(b.valor)}`);
  });

  return L.join("\n");
}

export async function sendPlanToAdvisor(form) {
  const payload = {
    access_key: WEB3FORMS_ACCESS_KEY,
    subject: `Novo planejamento financeiro — ${form.nomeCompleto || "Cliente"}`,
    from_name: form.nomeCompleto || "Formulário de Onboarding",
    message: buildSummaryText(form),
  };
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Falha ao enviar o e-mail.");
  }
  return data;
}
