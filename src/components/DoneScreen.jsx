import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { TOKENS } from "../tokens.js";

export function DoneScreen({ nome }) {
  const [checkIn, setCheckIn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setCheckIn(true), 120); return () => clearTimeout(t); }, []);
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{
        width:64, height:64, borderRadius:"50%", background:TOKENS.mintSoft,
        border:`1px solid ${TOKENS.mint}`, display:"flex", alignItems:"center",
        justifyContent:"center", margin:"0 auto 28px",
        transform: checkIn ? "scale(1)" : "scale(0.6)", opacity: checkIn ? 1 : 0,
        transition:"transform 480ms cubic-bezier(0.34,1.56,0.64,1), opacity 400ms ease",
      }}>
        <Check size={28} color={TOKENS.mint} strokeWidth={2.5} />
      </div>
      <h1 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:600, fontSize:26, color:TOKENS.bone, margin:0, marginBottom:14 }}>
        Obrigado pela confiança{nome ? `, ${nome}` : ""}.
      </h1>
      <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:TOKENS.boneMuted, lineHeight:1.7, maxWidth:420, margin:"0 auto 8px" }}>
        Seu assessor já recebeu suas informações e iniciará a preparação do seu planejamento financeiro personalizado.
      </p>
      <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:TOKENS.boneFaint, marginTop:20 }}>
        Nosso time entrará em contato em breve.
      </p>
    </div>
  );
}
