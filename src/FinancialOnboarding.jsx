import { useState, useCallback } from "react";
import { Check, Lock } from "lucide-react";
import { TOKENS, FONT_IMPORT } from "./tokens.js";
import { STEPS } from "./data/options.js";
import { INITIAL_FORM } from "./data/factories.js";
import { sendPlanToAdvisor } from "./utils/web3forms.js";
import { ProgressHeader, ScreenTransition, GhostButton } from "./components/ui.jsx";
import { StepBody } from "./components/StepBody.jsx";
import { SummaryStep } from "./components/SummaryStep.jsx";
import { DoneScreen } from "./components/DoneScreen.jsx";
import { LandingScreen } from "./components/LandingScreen.jsx";
import { useAutoSaveNotice } from "./utils/useAutoSaveNotice.js";

const LOGO_SRC = "/logo.png";

export default function FinancialOnboarding() {
  const [screen, setScreen] = useState("landing");
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Requisito 1: permite editar qualquer etapa a partir do Resumo (última
  // etapa) sem perder os dados já preenchidos nas demais. `editingFrom`
  // guarda de onde o usuário veio, para oferecer um atalho de retorno
  // rápido ao Resumo, sem obrigá-lo a repetir todas as etapas seguintes.
  const [editingFrom, setEditingFrom] = useState(null);

  const showSaved = useAutoSaveNotice(form);
  const update = useCallback(patch => setForm(f => ({ ...f, ...patch })), []);

  const totalSteps = STEPS.length;
  const summaryIdx = totalSteps - 1;
  const currentStepDef = STEPS[stepIdx];

  const goNext = () => {
    if (stepIdx < totalSteps - 1) setStepIdx(i => i + 1);
  };
  const goBack = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  };

  // Chamado pelos botões "Editar" do Resumo: navega direto para a etapa
  // escolhida, preservando o restante do form. `editingFrom` fica marcado
  // para exibir o atalho "Voltar ao resumo".
  function editStep(stepKey) {
    const idx = STEPS.findIndex(s => s.key === stepKey);
    if (idx >= 0) {
      setEditingFrom(idx);
      setStepIdx(idx);
    }
  }

  function returnToSummary() {
    setEditingFrom(null);
    setStepIdx(summaryIdx);
  }

  async function handleSubmit() {
    setSending(true);
    setSendError(null);
    try {
      await sendPlanToAdvisor(form);
      setScreen("done");
    } catch (err) {
      setSendError(err.message || "Erro desconhecido");
    } finally {
      setSending(false);
    }
  }

  const requerConjuge = form.estadoCivilCliente === "Casado(a)" || form.estadoCivilCliente === "União estável";

  const nextDisabledFor = {
    welcome: !form.nomeCompleto.trim(),
    family: requerConjuge && (!form.nomeConjuge.trim() || !form.dataNascConjuge),
    retirement:false, income:false, expenses:false,
    investments:false, global:false, realestate:false,
    vehicles:false, companies:false, otherbiens:false, summary:false,
  };

  return (
    <div style={{
      minHeight:"100vh", width:"100%",
      background:`radial-gradient(ellipse 120% 60% at 10% -5%,${TOKENS.petrolDeep} 0%,${TOKENS.void} 55%),${TOKENS.void}`,
      fontFamily:"Inter,sans-serif", display:"flex", flexDirection:"column", alignItems:"center",
      padding:"0 24px", boxSizing:"border-box",
    }}>
      <style>{FONT_IMPORT}</style>
      <style>{`
        @media (max-width: 640px) {
          .field-grid-2 { grid-template-columns: 1fr !important; }
          .field-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ width:"100%", maxWidth:1080, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"28px 0 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{
            background:"#FFFFFF", borderRadius:8, padding:"6px 11px",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <img src={LOGO_SRC} alt="RD Investimentos · XP" style={{ height:20, width:"auto", display:"block" }} />
          </div>
          <span style={{ fontFamily:"Montserrat,sans-serif", fontWeight:600, fontSize:14, color:TOKENS.bone }}>Planejamento Patrimonial</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:TOKENS.boneFaint, opacity:showSaved?1:0, transition:"opacity 400ms ease" }}>
          <Check size={12} color={TOKENS.mint} /> Salvo automaticamente
        </div>
      </div>

      {/* Content */}
      <div style={{ width:"100%", maxWidth:1080, flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"52px 0 80px" }}>
        {screen === "landing" && (
          <ScreenTransition screenKey="landing">
            <LandingScreen onStart={() => setScreen("step")} />
          </ScreenTransition>
        )}
        {screen === "step" && (
          <ScreenTransition screenKey={currentStepDef.key}>
            <>
              <ProgressHeader stepIndex={stepIdx} totalSteps={totalSteps} />

              {editingFrom !== null && currentStepDef.key !== "summary" && (
                <div style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
                  border:`1px solid rgba(95,216,184,0.3)`, background:TOKENS.mintSoft,
                  borderRadius:12, padding:"10px 16px", marginBottom:24,
                }}>
                  <span style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:TOKENS.mint, fontWeight:500 }}>
                    Editando a partir do Resumo — suas outras respostas continuam salvas.
                  </span>
                  <button onClick={returnToSummary} style={{
                    background:"transparent", border:"none", color:TOKENS.mint, fontFamily:"Inter,sans-serif",
                    fontWeight:600, fontSize:12.5, cursor:"pointer", textDecoration:"underline", whiteSpace:"nowrap",
                  }}>
                    Voltar ao resumo
                  </button>
                </div>
              )}

              {currentStepDef.key === "summary" ? (
                <SummaryStep
                  form={form}
                  onBack={goBack}
                  onSubmit={handleSubmit}
                  sending={sending}
                  sendError={sendError}
                  onEditStep={editStep}
                />
              ) : (
                <StepBody
                  stepKey={currentStepDef.key} form={form} update={update}
                  onBack={stepIdx > 0 ? goBack : undefined}
                  onNext={goNext}
                  onSubmit={handleSubmit}
                  sending={sending}
                  sendError={sendError}
                  nextDisabled={nextDisabledFor[currentStepDef.key]}
                />
              )}
            </>
          </ScreenTransition>
        )}
        {screen === "done" && (
          <ScreenTransition screenKey="done">
            <DoneScreen nome={form.nomeCompleto} />
          </ScreenTransition>
        )}
      </div>

      {/* Footer */}
      <div style={{ paddingBottom:24, display:"flex", alignItems:"center", gap:6, color:TOKENS.boneFaint, fontSize:11 }}>
        <Lock size={11} /> Seus dados são criptografados e visíveis apenas para seu assessor
      </div>
    </div>
  );
}
