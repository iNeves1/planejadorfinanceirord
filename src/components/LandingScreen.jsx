import { Sparkles } from "lucide-react";
import { TOKENS } from "../tokens.js";
import { PrimaryButton } from "./ui.jsx";

export function LandingScreen({ onStart }) {
  return (
    <div>
      <div style={{
        display:"inline-flex", alignItems:"center", gap:8, padding:"7px 14px",
        borderRadius:999, border:`1px solid ${TOKENS.hairlineStrong}`,
        background:"rgba(255,255,255,0.02)", marginBottom:26,
      }}>
        <Sparkles size={13} color={TOKENS.mint} />
        <span style={{ fontSize:12, color:TOKENS.boneMuted, fontFamily:"Inter,sans-serif" }}>Processo exclusivo e personalizado</span>
      </div>
      <h1 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:700, fontSize:40, lineHeight:1.12, color:TOKENS.bone, margin:0, marginBottom:18, letterSpacing:"-0.02em" }}>
        Vamos construir o seu<br />planejamento financeiro.
      </h1>
      <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:TOKENS.boneMuted, lineHeight:1.65, maxWidth:540, marginBottom:38 }}>
        Seu assessor terá uma visão completa do seu momento de vida, patrimônio e objetivos, para desenhar uma estratégia feita sob medida para você.
      </p>
      <PrimaryButton onClick={onStart}>Iniciar planejamento</PrimaryButton>
    </div>
  );
}
