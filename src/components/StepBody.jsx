import {
  QuestionShell, ItemCard, SmallButton, TextField, SelectField, ChipSelect,
  CurrencyField, CheckboxField, FieldGrid, MonthYearField, DateField,
} from "./ui.jsx";
import { TOKENS } from "../tokens.js";
import {
  PARENTESCO_OPTIONS, ESTADO_CIVIL_OPTIONS, RENDA_CAT, DESP_CAT, FREQ_OPTIONS,
  INVEST_TIPO, IMOVEL_TIPO, VEICULO_TIPO, ESTADOS_BR,
} from "../data/options.js";
import {
  newMember, newIncome, newExpense, newInvestNac, newInvestGlb,
  newImovel, newVeiculo, newEmpresa, newOutroBem,
} from "../data/factories.js";

/* ------------------------------------------------------------------ */
/*  CORPO DE CADA ETAPA DO WIZARD                                      */
/*                                                                      */
/*  Quando `editing` é verdadeiro (usuário chegou aqui clicando em      */
/*  "Editar" no Resumo), o rótulo do botão principal muda para deixar   */
/*  claro que ele volta direto para o Resumo — e não avança para a      */
/*  próxima etapa da sequência normal. Isso cobre o requisito de poder  */
/*  editar qualquer etapa a partir do resumo final sem perder os dados  */
/*  já preenchidos nas demais etapas.                                   */
/* ------------------------------------------------------------------ */
export function StepBody({ stepKey, form, update, onBack, onNext, nextDisabled, onSubmit, sending, sendError, editing }) {

  function listAdd(field, factory)       { update({ [field]: [...form[field], factory()] }); }
  function listRemove(field, idx)        { update({ [field]: form[field].filter((_,i) => i !== idx) }); }
  function listPatch(field, idx, patch)  {
    update({ [field]: form[field].map((item,i) => i === idx ? {...item,...patch} : item) });
  }

  const nextLabel = editing ? "Salvar e voltar ao resumo" : "Continuar";
  const backLabel = editing ? "Cancelar edição" : "Voltar";

  /* WELCOME */
  if (stepKey === "welcome") {
    return (
      <QuestionShell eyebrow="Início" title="Bem-vindo ao seu planejamento financeiro"
        subtitle="Vamos coletar as informações necessárias para o seu assessor construir uma estratégia personalizada."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        <TextField label="Nome completo" value={form.nomeCompleto} onChange={v => update({ nomeCompleto:v })} placeholder="Ex: Carlos Eduardo Mendes" />
      </QuestionShell>
    );
  }

  /* FAMÍLIA */
  if (stepKey === "family") {
    return (
      <QuestionShell eyebrow="1 · Dados Familiares" title="Quem faz parte da sua família?"
        subtitle="Inclua cônjuge, filhos e outros dependentes."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        <div style={{
          border:`1px solid ${TOKENS.hairline}`, borderRadius:14,
          padding:"18px 20px", background:"rgba(255,255,255,0.02)", marginBottom:20,
        }}>
          <div style={{ fontFamily:"Montserrat,sans-serif", fontWeight:600, fontSize:13, color:TOKENS.boneMuted, marginBottom:14 }}>
            Seu estado civil
          </div>
          <SelectField label="Estado civil" value={form.estadoCivilCliente} onChange={v => update({ estadoCivilCliente:v, ...(v!=="Casado(a)" && v!=="União estável" ? { nomeConjuge:"", dataNascConjuge:"" } : {}) })} options={ESTADO_CIVIL_OPTIONS} />
          {(form.estadoCivilCliente === "Casado(a)" || form.estadoCivilCliente === "União estável") && (
            <FieldGrid cols={2}>
              <TextField label="Nome do cônjuge" value={form.nomeConjuge} onChange={v => update({ nomeConjuge:v })} placeholder="Nome completo do cônjuge" />
              <DateField label="Data de nascimento do cônjuge" value={form.dataNascConjuge} onChange={v => update({ dataNascConjuge:v })} />
            </FieldGrid>
          )}
        </div>
        {form.membros.map((m, i) => (
          <ItemCard key={i} title={m.nome || `Membro ${i+1}`} onRemove={() => listRemove("membros", i)}>
            <TextField label="Nome do membro" value={m.nome} onChange={v => listPatch("membros",i,{nome:v})} placeholder="Nome completo" />
            <DateField label="Data de nascimento" value={m.dataNasc} onChange={v => listPatch("membros",i,{dataNasc:v})} />
            <FieldGrid cols={2}>
              <SelectField label="Grau de parentesco" value={m.parentesco} onChange={v => listPatch("membros",i,{parentesco:v})} options={PARENTESCO_OPTIONS} />
              <SelectField label="Estado civil" value={m.estadoCivil} onChange={v => listPatch("membros",i,{estadoCivil:v})} options={ESTADO_CIVIL_OPTIONS} />
            </FieldGrid>
            <CheckboxField label="É dependente" checked={m.dependente} onChange={v => listPatch("membros",i,{dependente:v})} />
          </ItemCard>
        ))}
        <SmallButton onClick={() => listAdd("membros", newMember)}>+ Adicionar membro</SmallButton>
      </QuestionShell>
    );
  }

  /* APOSENTADORIA */
  if (stepKey === "retirement") {
    return (
      <QuestionShell eyebrow="2 · Objetivos — Aposentadoria" title="Como você imagina sua aposentadoria?"
        subtitle="Essas informações são essenciais para projetar seu futuro financeiro."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        <FieldGrid cols={2}>
          <TextField label="Idade desejada para se aposentar" value={form.idadeAposentadoria} onChange={v => update({ idadeAposentadoria:v })} placeholder="Ex: 60" type="number" />
          <TextField label="Expectativa de vida (anos)" value={form.expectativaVida} onChange={v => update({ expectativaVida:v })} placeholder="Ex: 85" type="number" />
          <TextField label="Forma de resgate" value={form.formaResgate} onChange={v => update({ formaResgate:v })} placeholder="Ex: Parcelado mensal, resgate total..." cols={2} />
          <CurrencyField label="Renda mensal desejada na aposentadoria (R$)" digits={form.rendaAposentadoria} onChange={v => update({ rendaAposentadoria:v })} cols={2} />
        </FieldGrid>
      </QuestionShell>
    );
  }

  /* RENDAS */
  if (stepKey === "income") {
    return (
      <QuestionShell eyebrow="3 · Rendas" title="Quais são suas fontes de renda?"
        subtitle="Liste todas as rendas."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        {form.rendas.map((r, i) => (
          <ItemCard key={i} title={r.descricao || `Renda ${i+1}`} onRemove={() => listRemove("rendas", i)}>
            <ChipSelect label="Categoria" options={RENDA_CAT} value={r.categoria} onChange={v => listPatch("rendas",i,{categoria:v})} />
            <TextField label="Descrição" value={r.descricao} onChange={v => listPatch("rendas",i,{descricao:v})} placeholder="Ex: Salário CLT — Empresa X" />
            <FieldGrid cols={2}>
              <CurrencyField label="Valor bruto (R$)" digits={r.bruto} onChange={v => listPatch("rendas",i,{bruto:v})} />
              <CurrencyField label="Imposto (R$)" digits={r.imposto} onChange={v => listPatch("rendas",i,{imposto:v})} />
            </FieldGrid>
            <CurrencyField label="Valor líquido (R$)" digits={r.liquido} onChange={v => listPatch("rendas",i,{liquido:v})} />
            <SelectField label="Frequência" value={r.frequencia} onChange={v => listPatch("rendas",i,{frequencia:v})} options={FREQ_OPTIONS} />
          </ItemCard>
        ))}
        <SmallButton onClick={() => listAdd("rendas", newIncome)}>+ Adicionar renda</SmallButton>
      </QuestionShell>
    );
  }

  /* DESPESAS */
  if (stepKey === "expenses") {
    return (
      <QuestionShell eyebrow="4 · Despesas" title="Quais são suas principais despesas?"
        subtitle="Inclua gastos fixos e variáveis."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        {form.despesas.map((d, i) => (
          <ItemCard key={i} title={d.descricao || `Despesa ${i+1}`} onRemove={() => listRemove("despesas", i)}>
            <ChipSelect label="Categoria" options={DESP_CAT} value={d.categoria} onChange={v => listPatch("despesas",i,{categoria:v})} />
            <TextField label="Descrição" value={d.descricao} onChange={v => listPatch("despesas",i,{descricao:v})} placeholder="Ex: Aluguel apartamento" />
            <FieldGrid cols={2}>
              <CurrencyField label="Valor (R$)" digits={d.valor} onChange={v => listPatch("despesas",i,{valor:v})} />
              <SelectField label="Frequência" value={d.frequencia} onChange={v => listPatch("despesas",i,{frequencia:v})} options={FREQ_OPTIONS} />
            </FieldGrid>
          </ItemCard>
        ))}
        <SmallButton onClick={() => listAdd("despesas", newExpense)}>+ Adicionar despesa</SmallButton>
      </QuestionShell>
    );
  }

  /* INVESTIMENTOS NACIONAIS */
  if (stepKey === "investments") {
    return (
      <QuestionShell eyebrow="5 · Investimentos Nacionais" title="Quais são seus investimentos no Brasil?"
        subtitle="Liste todos os ativos financeiros nacionais."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        {form.investNacionais.map((inv, i) => (
          <ItemCard key={i} title={inv.instituicao || `Investimento ${i+1}`} onRemove={() => listRemove("investNacionais", i)}>
            <FieldGrid cols={2}>
              <MonthYearField label="Data de referência (mês/ano)" value={inv.dataRef} onChange={v => listPatch("investNacionais",i,{dataRef:v})} />
              <ChipSelect label="Tipo de investimento" options={INVEST_TIPO} value={inv.tipo} onChange={v => listPatch("investNacionais",i,{tipo:v})} cols={2} />
              <TextField label="Instituição financeira" value={inv.instituicao} onChange={v => listPatch("investNacionais",i,{instituicao:v})} placeholder="Ex: XP Investimentos" cols={2} />
              <CurrencyField label="Patrimônio investido (R$)" digits={inv.patrimonio} onChange={v => listPatch("investNacionais",i,{patrimonio:v})} cols={2} />
            </FieldGrid>
            <TextField label="Comentários" value={inv.comentarios} onChange={v => listPatch("investNacionais",i,{comentarios:v})} placeholder="Observações..." />
          </ItemCard>
        ))}
        <SmallButton onClick={() => listAdd("investNacionais", newInvestNac)}>+ Adicionar investimento</SmallButton>
      </QuestionShell>
    );
  }

  /* INVESTIMENTOS GLOBAIS */
  if (stepKey === "global") {
    return (
      <QuestionShell eyebrow="6 · Investimentos Globais" title="Você possui investimentos no exterior?"
        subtitle="Informe ativos mantidos em instituições estrangeiras."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        {form.investGlobais.map((inv, i) => (
          <ItemCard key={i} title={inv.instituicao || `Investimento global ${i+1}`} onRemove={() => listRemove("investGlobais", i)}>
            <FieldGrid cols={2}>
              <MonthYearField label="Data de referência (mês/ano)" value={inv.dataRef} onChange={v => listPatch("investGlobais",i,{dataRef:v})} />
              <TextField label="Instituição financeira" value={inv.instituicao} onChange={v => listPatch("investGlobais",i,{instituicao:v})} placeholder="Ex: Interactive Brokers" />
              <CurrencyField label="Valor investido (US$)" digits={inv.valor} onChange={v => listPatch("investGlobais",i,{valor:v})} currency="USD" cols={2} />
            </FieldGrid>
            <TextField label="Comentários" value={inv.comentarios} onChange={v => listPatch("investGlobais",i,{comentarios:v})} placeholder="Observações..." />
          </ItemCard>
        ))}
        <SmallButton onClick={() => listAdd("investGlobais", newInvestGlb)}>+ Adicionar investimento global</SmallButton>
      </QuestionShell>
    );
  }

  /* IMÓVEIS */
  if (stepKey === "realestate") {
    return (
      <QuestionShell eyebrow="7 · Imóveis" title="Quais imóveis você possui?"
        subtitle="Inclua todos os bens imóveis de sua propriedade."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        {form.imoveis.map((im, i) => (
          <ItemCard key={i} title={im.descricao || `Imóvel ${i+1}`} onRemove={() => listRemove("imoveis", i)}>
            <TextField label="Descrição" value={im.descricao} onChange={v => listPatch("imoveis",i,{descricao:v})} placeholder="Ex: Apartamento Jardins" />
            <ChipSelect label="Tipo do imóvel" options={IMOVEL_TIPO} value={im.tipo} onChange={v => listPatch("imoveis",i,{tipo:v})} />
            <FieldGrid cols={2}>
              <SelectField label="Estado" value={im.estado} onChange={v => listPatch("imoveis",i,{estado:v})} options={ESTADOS_BR} />
              <TextField label="Cidade" value={im.cidade} onChange={v => listPatch("imoveis",i,{cidade:v})} placeholder="Ex: São Paulo" />
              <CurrencyField label="Valor atual (R$)" digits={im.valor} onChange={v => listPatch("imoveis",i,{valor:v})} cols={2} />
            </FieldGrid>
          </ItemCard>
        ))}
        <SmallButton onClick={() => listAdd("imoveis", newImovel)}>+ Adicionar imóvel</SmallButton>
      </QuestionShell>
    );
  }

  /* VEÍCULOS */
  if (stepKey === "vehicles") {
    return (
      <QuestionShell eyebrow="8 · Veículos" title="Quais veículos você possui?"
        subtitle="Inclua todos os veículos de sua propriedade."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        {form.veiculos.map((v, i) => (
          <ItemCard key={i} title={v.descricao || `Veículo ${i+1}`} onRemove={() => listRemove("veiculos", i)}>
            <TextField label="Descrição" value={v.descricao} onChange={v2 => listPatch("veiculos",i,{descricao:v2})} placeholder="Ex: Toyota Corolla 2023" />
            <ChipSelect label="Tipo do veículo" options={VEICULO_TIPO} value={v.tipo} onChange={v2 => listPatch("veiculos",i,{tipo:v2})} />
            <CurrencyField label="Valor atual (R$)" digits={v.valor} onChange={v2 => listPatch("veiculos",i,{valor:v2})} />
          </ItemCard>
        ))}
        <SmallButton onClick={() => listAdd("veiculos", newVeiculo)}>+ Adicionar veículo</SmallButton>
      </QuestionShell>
    );
  }

  /* PARTICIPAÇÃO SOCIETÁRIA */
  if (stepKey === "companies") {
    return (
      <QuestionShell eyebrow="9 · Participação Societária" title="Você possui participação em empresas?"
        subtitle="Informe todas as empresas das quais é sócio ou acionista."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        {form.empresas.map((e, i) => (
          <ItemCard key={i} title={e.nome || `Empresa ${i+1}`} onRemove={() => listRemove("empresas", i)}>
            <FieldGrid cols={2}>
              <TextField label="Nome da empresa" value={e.nome} onChange={v => listPatch("empresas",i,{nome:v})} placeholder="Ex: Mendes Consultoria Ltda." cols={2} />
              <TextField label="CNPJ" value={e.cnpj} onChange={v => listPatch("empresas",i,{cnpj:v})} placeholder="00.000.000/0001-00" cols={2} />
              <CurrencyField label="Valor atual da empresa (R$)" digits={e.valorEmpresa} onChange={v => listPatch("empresas",i,{valorEmpresa:v})} />
              <TextField label="Participação (%)" value={e.participacao} onChange={v => listPatch("empresas",i,{participacao:v})} placeholder="Ex: 50" type="number" />
            </FieldGrid>
          </ItemCard>
        ))}
        <SmallButton onClick={() => listAdd("empresas", newEmpresa)}>+ Adicionar empresa</SmallButton>
      </QuestionShell>
    );
  }

  /* OUTROS BENS */
  if (stepKey === "otherbiens") {
    return (
      <QuestionShell eyebrow="10 · Outros Bens" title="Você possui outros bens de valor?"
        subtitle="Obras de arte, joias, coleções, direitos e outros ativos não listados anteriormente."
        onBack={onBack} onNext={onNext} nextDisabled={nextDisabled} nextLabel={nextLabel} backLabel={backLabel}>
        {form.outrosBens.map((b, i) => (
          <ItemCard key={i} title={b.descricao || `Bem ${i+1}`} onRemove={() => listRemove("outrosBens", i)}>
            <FieldGrid cols={2}>
              <TextField label="Descrição" value={b.descricao} onChange={v => listPatch("outrosBens",i,{descricao:v})} placeholder="Ex: Coleção de arte, joias..." cols={2} />
              <CurrencyField label="Valor atual (R$)" digits={b.valor} onChange={v => listPatch("outrosBens",i,{valor:v})} cols={2} />
            </FieldGrid>
          </ItemCard>
        ))}
        <SmallButton onClick={() => listAdd("outrosBens", newOutroBem)}>+ Adicionar bem</SmallButton>
      </QuestionShell>
    );
  }

  return null;
}
