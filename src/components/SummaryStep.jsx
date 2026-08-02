import { Users, PiggyBank, Briefcase, Wallet, Building2, TrendingUp, Check, Edit3 } from "lucide-react";
import { TOKENS } from "../tokens.js";
import { GhostButton, PrimaryButton } from "./ui.jsx";
import { fmtBRL, formatFullDate } from "../utils/format.js";

function SummaryRow({ label, value, emphasize }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"10px 0", borderBottom:`1px solid ${TOKENS.hairline}` }}>
      <span style={{ fontSize:13, color:TOKENS.boneMuted }}>{label}</span>
      <span style={{
        fontSize: emphasize ? 14.5 : 13, color: emphasize ? TOKENS.mint : TOKENS.bone,
        fontWeight: emphasize ? 700 : 500, textAlign:"right", maxWidth:"58%",
        fontFamily: emphasize ? "Montserrat,sans-serif" : "Inter,sans-serif",
      }}>{value || "—"}</span>
    </div>
  );
}

/* Requisito 1: cada bloco do resumo tem um botão "Editar" que leva o
   usuário direto para a etapa correspondente do wizard. Ao terminar
   de editar, o botão principal daquela etapa ("Salvar e voltar ao
   resumo") retorna diretamente para cá — sem percorrer as etapas
   intermediárias — preservando todos os demais dados já preenchidos. */
function SummaryBlock({ title, icon: Icon, children, onEdit }) {
  return (
    <div style={{
      position:"relative", border:`1px solid ${TOKENS.hairline}`, borderRadius:16,
      background:"linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01))",
      padding:"20px 22px", marginBottom:14, overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:20, right:20, height:1, background:`linear-gradient(90deg, transparent, ${TOKENS.mint}, transparent)`, opacity:0.6 }} />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:11, marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          {Icon && (
            <div style={{ width:32, height:32, borderRadius:9, background:TOKENS.mintSoft, border:`1px solid rgba(95,216,184,0.25)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon size={15} color={TOKENS.mint} strokeWidth={2} />
            </div>
          )}
          <div style={{ fontFamily:"Montserrat,sans-serif", fontWeight:600, fontSize:14.5, color:TOKENS.bone, letterSpacing:"0.01em" }}>{title}</div>
        </div>
        {onEdit && (
          <button onClick={onEdit} style={{
            display:"inline-flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8,
            border:`1px solid ${TOKENS.hairlineStrong}`, background:"transparent", color:TOKENS.boneMuted,
            fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:12.5, cursor:"pointer",
            transition:"color 160ms ease, border-color 160ms ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.color=TOKENS.mint; e.currentTarget.style.borderColor=TOKENS.mint; }}
            onMouseLeave={e => { e.currentTarget.style.color=TOKENS.boneMuted; e.currentTarget.style.borderColor=TOKENS.hairlineStrong; }}
          >
            <Edit3 size={12} /> Editar
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function SummaryStep({ form, onBack, onSubmit, sending, sendError, onEditStep }) {
  const fmtR = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const fmtU = v => v.toLocaleString("en-US",{style:"currency",currency:"USD"});
  const totalNac = form.investNacionais.reduce((s,i) => s + parseInt(i.patrimonio||"0",10)/100, 0);
  const totalGlb = form.investGlobais.reduce((s,i) => s + parseInt(i.valor||"0",10)/100, 0);
  const totalIm  = form.imoveis.reduce((s,i) => s + parseInt(i.valor||"0",10)/100, 0);
  const totalVei = form.veiculos.reduce((s,i) => s + parseInt(i.valor||"0",10)/100, 0);
  const totalEmp = form.empresas.reduce((s,e) => s + parseInt(e.valorEmpresa||"0",10)/100*(parseFloat(e.participacao||"0")/100), 0);
  const totalOut = form.outrosBens.reduce((s,b) => s + parseInt(b.valor||"0",10)/100, 0);
  const totalPatrimonio = totalNac + totalIm + totalVei + totalEmp + totalOut;

  return (
    <div>
      <div style={{ fontFamily:"Inter,sans-serif", fontSize:11.5, fontWeight:600, color:TOKENS.mint, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Resumo Executivo</div>
      <h1 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:600, fontSize:26, color:TOKENS.bone, margin:0, marginBottom:8 }}>Revisão do seu planejamento</h1>
      <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:TOKENS.boneMuted, marginTop:0, marginBottom:26, lineHeight:1.6 }}>
        Confira as informações reunidas abaixo antes de enviarmos ao seu assessor patrimonial. Use "Editar" em qualquer
        seção para corrigir os dados — você voltará direto para cá, sem perder o restante do que já preencheu.
      </p>

      {/* Card de destaque — patrimônio total */}
      <div style={{
        position:"relative", overflow:"hidden", borderRadius:18, padding:"28px 26px", marginBottom:24,
        background:`linear-gradient(135deg, ${TOKENS.petrolDeep} 0%, #08120F 100%)`,
        border:`1px solid ${TOKENS.hairlineStrong}`,
      }}>
        <div style={{ position:"absolute", top:-50, right:-50, width:170, height:170, borderRadius:"50%", background:TOKENS.mintSoft, filter:"blur(38px)" }} />
        <div style={{ position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, fontFamily:"Inter,sans-serif", fontSize:11.5, fontWeight:600, color:TOKENS.mint, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>
            <TrendingUp size={13} /> Patrimônio total estimado
          </div>
          <div style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, fontSize:36, color:TOKENS.bone, letterSpacing:"-0.02em", lineHeight:1.1 }}>
            {fmtR(totalPatrimonio)}
          </div>
          <div style={{ display:"flex", gap:18, marginTop:16, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"Inter,sans-serif", fontSize:12.5, color:TOKENS.boneMuted }}>{form.nomeCompleto || "Cliente"}</span>
            {totalGlb > 0 && (
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:12.5, color:TOKENS.boneFaint }}>+ {fmtU(totalGlb)} em ativos internacionais</span>
            )}
          </div>
        </div>
      </div>

      <SummaryBlock title="Dados Pessoais" icon={Users} onEdit={() => onEditStep("welcome")}>
        <SummaryRow label="Nome" value={form.nomeCompleto} />
      </SummaryBlock>

      <SummaryBlock title="Família" icon={Users} onEdit={() => onEditStep("family")}>
        <SummaryRow label="Estado civil" value={form.estadoCivilCliente} />
        {(form.estadoCivilCliente === "Casado(a)" || form.estadoCivilCliente === "União estável") && (
          <>
            <SummaryRow label="Nome do cônjuge" value={form.nomeConjuge} />
            <SummaryRow label="Nascimento do cônjuge" value={formatFullDate(form.dataNascConjuge)} />
          </>
        )}
        <SummaryRow label="Membros cadastrados" value={form.membros.length > 0 ? form.membros.map(m=>m.nome||"—").join(", ") : "Nenhum"} />
      </SummaryBlock>

      <SummaryBlock title="Aposentadoria" icon={PiggyBank} onEdit={() => onEditStep("retirement")}>
        <SummaryRow label="Idade desejada" value={form.idadeAposentadoria ? `${form.idadeAposentadoria} anos` : "—"} />
        <SummaryRow label="Renda mensal desejada" value={fmtBRL(form.rendaAposentadoria)} emphasize />
        <SummaryRow label="Expectativa de vida" value={form.expectativaVida ? `${form.expectativaVida} anos` : "—"} />
      </SummaryBlock>

      <SummaryBlock title="Rendas" icon={Briefcase} onEdit={() => onEditStep("income")}>
        <SummaryRow label="Fontes cadastradas" value={`${form.rendas.length}`} />
      </SummaryBlock>

      <SummaryBlock title="Despesas" icon={Wallet} onEdit={() => onEditStep("expenses")}>
        <SummaryRow label="Itens cadastrados" value={`${form.despesas.length}`} />
      </SummaryBlock>

      <SummaryBlock title="Patrimônio" icon={Building2} onEdit={() => onEditStep("investments")}>
        <SummaryRow label="Investimentos nacionais" value={fmtR(totalNac)} emphasize />
        <SummaryRow label="Investimentos globais" value={fmtU(totalGlb)} emphasize />
        <SummaryRow label="Imóveis" value={fmtR(totalIm)} />
        <SummaryRow label="Veículos" value={fmtR(totalVei)} />
        <SummaryRow label="Participação societária (minha parte)" value={fmtR(totalEmp)} />
        <SummaryRow label="Outros bens" value={fmtR(totalOut)} />
      </SummaryBlock>

      <div style={{ display:"flex", gap:12, marginTop:28, alignItems:"center", flexWrap:"wrap" }}>
        <GhostButton onClick={onBack}>Voltar</GhostButton>
        <PrimaryButton onClick={onSubmit} disabled={sending} icon={sending ? undefined : Check}>
          {sending ? "Enviando..." : "Enviar planejamento"}
        </PrimaryButton>
      </div>
      {sendError && (
        <p style={{ color:TOKENS.danger, fontFamily:"Inter,sans-serif", fontSize:13, marginTop:14 }}>
          Não foi possível enviar: {sendError}. Verifique sua conexão e tente novamente.
        </p>
      )}
    </div>
  );
}
