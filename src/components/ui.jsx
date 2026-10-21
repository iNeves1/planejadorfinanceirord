import { useState, useEffect, useRef, useId, cloneElement, isValidElement, Children } from "react";
import { ArrowRight, ArrowLeft, Check, ChevronDown, Trash2 } from "lucide-react";
import { TOKENS } from "../tokens.js";
import { fmtBRL, fmtUSD, onlyDigits } from "../utils/format.js";
import { MAX_YEAR, MONTHS_PT } from "../data/options.js";

/* ------------------------------------------------------------------ */
/*  BOTÕES                                                             */
/* ------------------------------------------------------------------ */

export function PrimaryButton({ children, onClick, disabled, icon: Icon = ArrowRight }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center", gap:10,
      padding:"15px 28px", borderRadius:12, border:"none",
      background: disabled ? "rgba(95,216,184,0.25)" : "linear-gradient(135deg,#5FD8B8 0%,#2E9C82 100%)",
      color: disabled ? "rgba(10,14,13,0.5)" : "#08211C",
      fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:15, letterSpacing:"0.01em",
      cursor: disabled ? "not-allowed" : "pointer",
      transition:"transform 180ms ease, box-shadow 180ms ease",
      boxShadow: disabled ? "none" : "0 8px 24px -8px rgba(95,216,184,0.45)",
    }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform="scale(0.98)"; }}
      onMouseUp={e => { if (!disabled) e.currentTarget.style.transform="scale(1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
    >
      {children}
      {Icon && <Icon size={17} strokeWidth={2.25} />}
    </button>
  );
}

export function GhostButton({ children, onClick, icon: Icon = ArrowLeft }) {
  return (
    <button onClick={onClick} style={{
      display:"inline-flex", alignItems:"center", gap:8, padding:"14px 18px",
      borderRadius:12, border:`1px solid ${TOKENS.hairlineStrong}`, background:"transparent",
      color:TOKENS.boneMuted, fontFamily:"Inter,sans-serif", fontWeight:500, fontSize:14, cursor:"pointer",
      transition:"color 160ms ease, background 160ms ease",
    }}
      onMouseEnter={e => { e.currentTarget.style.color=TOKENS.bone; e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}
      onMouseLeave={e => { e.currentTarget.style.color=TOKENS.boneMuted; e.currentTarget.style.background="transparent"; }}
    >
      {Icon && <Icon size={15} />}{children}
    </button>
  );
}

export function SmallButton({ children, onClick, variant = "primary" }) {
  const isPrimary = variant === "primary";
  return (
    <button onClick={onClick} style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"9px 16px", borderRadius:9,
      border:`1px solid ${isPrimary ? TOKENS.mint : TOKENS.danger}`,
      background: isPrimary ? TOKENS.mintSoft : "rgba(255,107,107,0.12)",
      color: isPrimary ? TOKENS.mint : TOKENS.danger,
      fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:13, cursor:"pointer",
    }}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  CAMPOS                                                             */
/* ------------------------------------------------------------------ */

export function TextField({ label, value, onChange, placeholder, type = "text", hint, cols = 1 }) {
  return (
    <div style={{ gridColumn: cols > 1 ? `span ${cols}` : undefined, marginBottom:16 }}>
      <label>
        <span style={{ display:"block", fontFamily:"Inter,sans-serif", fontSize:12.5, fontWeight:500, color:TOKENS.boneMuted, marginBottom:6 }}>{label}</span>
        <input type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{
            width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${TOKENS.hairlineStrong}`,
            borderRadius:10, padding:"12px 14px", color:TOKENS.bone, fontFamily:"Inter,sans-serif", fontSize:14.5,
            outline:"none", boxSizing:"border-box", transition:"border-color 160ms ease, background 160ms ease",
          }}
          onFocus={e => { e.currentTarget.style.borderColor=TOKENS.mint; e.currentTarget.style.background="rgba(95,216,184,0.05)"; }}
          onBlur={e => { e.currentTarget.style.borderColor=TOKENS.hairlineStrong; e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}
        />
        {hint && <span style={{ display:"block", marginTop:5, fontSize:11.5, color:TOKENS.boneFaint }}>{hint}</span>}
      </label>
    </div>
  );
}

const selectStyleBase = (hasValue) => ({
  flex:1, minWidth:0, background:"rgba(255,255,255,0.03)", border:`1px solid ${TOKENS.hairlineStrong}`,
  borderRadius:10, padding:"12px 14px", color: hasValue ? TOKENS.bone : TOKENS.boneFaint,
  fontFamily:"Inter,sans-serif", fontSize:14.5, outline:"none", boxSizing:"border-box", cursor:"pointer",
});

/* Anos disponíveis para qualquer campo de data do app.
   Regra de negócio: nenhum ano pode ser maior que MAX_YEAR (2026). */
function buildYearOptions() {
  return Array.from({ length: 95 }, (_, i) => String(MAX_YEAR - i));
}

/* Mês/Ano field — dois selects simples (evita bugs do input nativo type="month" em WebViews Android) */
export function MonthYearField({ label, value, onChange, cols = 1 }) {
  const [yy, mm] = (value || "").split("-");
  const YEARS = buildYearOptions();
  const MONTH_OPTS = MONTHS_PT.map((name, idx) => ({ value: String(idx + 1).padStart(2, "0"), label: name }));

  function setPart(newY, newM) {
    const y = newY || "";
    const m = newM || "";
    onChange(y || m ? `${y}-${m}` : "");
  }

  return (
    <div style={{ gridColumn: cols > 1 ? `span ${cols}` : undefined, marginBottom:16 }}>
      <span style={{ display:"block", fontFamily:"Inter,sans-serif", fontSize:12.5, fontWeight:500, color:TOKENS.boneMuted, marginBottom:6 }}>{label}</span>
      <div style={{ display:"flex", gap:8 }}>
        <select value={mm || ""} onChange={e => setPart(yy, e.target.value)} style={selectStyleBase(!!mm)}>
          <option value="" style={{ background:"#0A0E0D" }}>Mês</option>
          {MONTH_OPTS.map(o => <option key={o.value} value={o.value} style={{ background:"#0A0E0D" }}>{o.label}</option>)}
        </select>
        <select value={yy || ""} onChange={e => setPart(e.target.value, mm)} style={selectStyleBase(!!yy)}>
          <option value="" style={{ background:"#0A0E0D" }}>Ano</option>
          {YEARS.map(y => <option key={y} value={y} style={{ background:"#0A0E0D" }}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

/* Data completa (dia/mês/ano) — usada onde é preciso registrar o dia exato,
   por exemplo a data de nascimento dos membros da família.
   Segue o mesmo padrão do MonthYearField (selects, para evitar bugs do
   input nativo type="date" em WebViews Android) e aplica o teto de ano
   MAX_YEAR (2026) em todas as opções disponíveis. */
export function DateField({ label, value, onChange, cols = 1 }) {
  const [yy, mm, dd] = (value || "").split("-");
  const YEARS = buildYearOptions();
  const MONTH_OPTS = MONTHS_PT.map((name, idx) => ({ value: String(idx + 1).padStart(2, "0"), label: name }));

  function daysInMonth(y, m) {
    if (!y || !m) return 31;
    return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  }
  const maxDay = daysInMonth(yy, mm);
  const DAY_OPTS = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, "0"));

  function setPart(newY, newM, newD) {
    const y = newY || "";
    const m = newM || "";
    let d = newD || "";
    // se o dia atual não existir no novo mês/ano, descarta
    if (d && (y || m)) {
      const max = daysInMonth(y || yy, m || mm);
      if (parseInt(d, 10) > max) d = String(max).padStart(2, "0");
    }
    onChange(y || m || d ? `${y}-${m}-${d}` : "");
  }

  return (
    <div style={{ gridColumn: cols > 1 ? `span ${cols}` : undefined, marginBottom:16 }}>
      <span style={{ display:"block", fontFamily:"Inter,sans-serif", fontSize:12.5, fontWeight:500, color:TOKENS.boneMuted, marginBottom:6 }}>{label}</span>
      <div style={{ display:"flex", gap:8 }}>
        <select value={dd || ""} onChange={e => setPart(yy, mm, e.target.value)} style={{ ...selectStyleBase(!!dd), flex:0.6 }}>
          <option value="" style={{ background:"#0A0E0D" }}>Dia</option>
          {DAY_OPTS.map(d => <option key={d} value={d} style={{ background:"#0A0E0D" }}>{d}</option>)}
        </select>
        <select value={mm || ""} onChange={e => setPart(yy, e.target.value, dd)} style={selectStyleBase(!!mm)}>
          <option value="" style={{ background:"#0A0E0D" }}>Mês</option>
          {MONTH_OPTS.map(o => <option key={o.value} value={o.value} style={{ background:"#0A0E0D" }}>{o.label}</option>)}
        </select>
        <select value={yy || ""} onChange={e => setPart(e.target.value, mm, dd)} style={selectStyleBase(!!yy)}>
          <option value="" style={{ background:"#0A0E0D" }}>Ano</option>
          {YEARS.map(y => <option key={y} value={y} style={{ background:"#0A0E0D" }}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

/* Select padrão */
export function SelectField({ label, value, onChange, options, placeholder = "Selecione...", cols = 1 }) {
  return (
    <div style={{ gridColumn: cols > 1 ? `span ${cols}` : undefined, marginBottom:16 }}>
      <label>
        <span style={{ display:"block", fontFamily:"Inter,sans-serif", fontSize:12.5, fontWeight:500, color:TOKENS.boneMuted, marginBottom:6 }}>{label}</span>
        <div style={{ position:"relative" }}>
          <select value={value} onChange={e => onChange(e.target.value)} style={{
            width:"100%", background:"rgba(255,255,255,0.03)", border:`1px solid ${TOKENS.hairlineStrong}`,
            borderRadius:10, padding:"12px 38px 12px 14px", color: value ? TOKENS.bone : TOKENS.boneFaint,
            fontFamily:"Inter,sans-serif", fontSize:14.5, outline:"none", boxSizing:"border-box",
            cursor:"pointer", appearance:"none", WebkitAppearance:"none",
          }}>
            <option value="" style={{ background:"#0A0E0D" }}>{placeholder}</option>
            {options.map(o => <option key={o} value={o} style={{ background:"#0A0E0D" }}>{o}</option>)}
          </select>
          <ChevronDown size={14} color={TOKENS.boneFaint} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
        </div>
      </label>
    </div>
  );
}

/* Chips selecionáveis (single) */
export function ChipSelect({ label, options, value, onChange, cols = 1 }) {
  return (
    <div style={{ gridColumn: cols > 1 ? `span ${cols}` : undefined, marginBottom:16 }}>
      <span style={{ display:"block", fontFamily:"Inter,sans-serif", fontSize:12.5, fontWeight:500, color:TOKENS.boneMuted, marginBottom:8 }}>{label}</span>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {options.map(opt => {
          const active = value === opt;
          return (
            <button key={opt} onClick={() => onChange(active ? "" : opt)} style={{
              padding:"7px 14px", borderRadius:20,
              border:`1px solid ${active ? TOKENS.mint : TOKENS.hairlineStrong}`,
              background: active ? TOKENS.mintSoft : "rgba(255,255,255,0.02)",
              color: active ? TOKENS.mint : TOKENS.boneMuted,
              fontFamily:"Inter,sans-serif", fontSize:13, fontWeight: active ? 600 : 400,
              cursor:"pointer", transition:"all 160ms ease",
            }}>{opt}</button>
          );
        })}
      </div>
    </div>
  );
}

/* Campo de moeda */
export function CurrencyField({ label, digits, onChange, hint, currency = "BRL", cols = 1 }) {
  const fmt = currency === "USD" ? fmtUSD : fmtBRL;
  const prefix = currency === "USD" ? "US$" : "R$";
  const displayVal = fmt(digits).replace(currency === "USD" ? "US$" : "R$", "").replace("$","").trim();
  return (
    <div style={{ gridColumn: cols > 1 ? `span ${cols}` : undefined, marginBottom:16 }}>
      <label>
        <span style={{ display:"block", fontFamily:"Inter,sans-serif", fontSize:12.5, fontWeight:500, color:TOKENS.boneMuted, marginBottom:6 }}>{label}</span>
        <div style={{
          display:"flex", alignItems:"center",
          border:`1px solid ${TOKENS.hairlineStrong}`, borderRadius:10,
          background:"rgba(255,255,255,0.03)", padding:"12px 14px",
        }}>
          <span style={{ color:TOKENS.mint, fontFamily:"Inter,sans-serif", fontWeight:600, fontSize:14, marginRight:8, whiteSpace:"nowrap" }}>{prefix}</span>
          <input inputMode="numeric"
            value={displayVal}
            onChange={e => onChange(onlyDigits(e.target.value))}
            style={{ flex:1, minWidth:0, background:"transparent", border:"none", outline:"none", color:TOKENS.bone, fontFamily:"Inter,sans-serif", fontSize:14.5 }}
          />
        </div>
        {hint && <span style={{ display:"block", marginTop:5, fontSize:11.5, color:TOKENS.boneFaint }}>{hint}</span>}
      </label>
    </div>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:14 }} onClick={() => onChange(!checked)}>
      <div style={{
        width:20, height:20, borderRadius:6,
        border:`1.5px solid ${checked ? TOKENS.mint : TOKENS.hairlineStrong}`,
        background: checked ? TOKENS.mintSoft : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        transition:"all 160ms ease",
      }}>
        {checked && <Check size={12} color={TOKENS.mint} strokeWidth={3} />}
      </div>
      <span style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:TOKENS.boneMuted, userSelect:"none" }}>{label}</span>
    </div>
  );
}

export function ItemCard({ children, onRemove, title }) {
  return (
    <div style={{
      border:`1px solid ${TOKENS.hairline}`, borderRadius:14,
      padding:"18px 20px 8px", background:"rgba(255,255,255,0.02)", marginBottom:14,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontFamily:"Montserrat,sans-serif", fontWeight:600, fontSize:13, color:TOKENS.boneMuted }}>{title}</span>
        <SmallButton onClick={onRemove} variant="danger"><Trash2 size={13} /> Remover</SmallButton>
      </div>
      {children}
    </div>
  );
}

/* Grid responsivo — 1 col mobile, N col desktop */
export function FieldGrid({ cols = 2, children }) {
  return (
    <div className={`field-grid-${cols}`} style={{
      display:"grid",
      gridTemplateColumns:`repeat(${cols}, minmax(0, 1fr))`,
      gap:"0 16px",
    }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ESTRUTURA DE TELA                                                  */
/* ------------------------------------------------------------------ */

export function ProgressHeader({ stepIndex, totalSteps }) {
  const pct = Math.round(((stepIndex + 1) / totalSteps) * 100);
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ marginBottom:10 }}>
        <span style={{ fontFamily:"Inter,sans-serif", fontSize:12, color:TOKENS.boneMuted }}>
          Etapa {stepIndex + 1} de {totalSteps}
        </span>
      </div>
      <div style={{ height:3, width:"100%", background:"rgba(255,255,255,0.06)", borderRadius:999, overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${pct}%`,
          background:`linear-gradient(90deg,${TOKENS.petrolLight},${TOKENS.mint})`,
          borderRadius:999, transition:"width 550ms cubic-bezier(0.22,1,0.36,1)",
        }} />
      </div>
    </div>
  );
}

export function ScreenTransition({ screenKey, children }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(t);
  }, [screenKey]);
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(14px)",
      transition:"opacity 480ms cubic-bezier(0.22,1,0.36,1), transform 480ms cubic-bezier(0.22,1,0.36,1)",
    }}>
      {children}
    </div>
  );
}

export function QuestionShell({ eyebrow, title, subtitle, children, onBack, onNext, nextDisabled, nextLabel = "Continuar", backLabel = "Voltar" }) {
  return (
    <div>
      {eyebrow && (
        <div style={{ fontFamily:"Inter,sans-serif", fontSize:11.5, fontWeight:600, color:TOKENS.mint, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
          {eyebrow}
        </div>
      )}
      <h1 style={{ fontFamily:"Montserrat,sans-serif", fontWeight:600, fontSize:26, color:TOKENS.bone, margin:0, marginBottom:8, letterSpacing:"-0.01em", lineHeight:1.25 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:TOKENS.boneMuted, marginTop:0, marginBottom:26, lineHeight:1.6 }}>
          {subtitle}
        </p>
      )}
      <div>{children}</div>
      <div style={{ display:"flex", gap:12, marginTop:30 }}>
        {onBack && <GhostButton onClick={onBack}>{backLabel}</GhostButton>}
        <PrimaryButton onClick={onNext} disabled={nextDisabled}>{nextLabel}</PrimaryButton>
      </div>
    </div>
  );
}

// Primitivas do painel de fundos. Estilos isolados em .funds-app.
export function FundButton({ children, icon: Icon, variant = 'primary', className = '', ...props }) {
  return <button className={`fd-button ${variant} ${className}`} {...props}>{Icon && <Icon size={16} aria-hidden="true" />}{children}</button>;
}
export function FundField({ label, children, className = '' }) {
  const labelId = useId();
  function nameControl(node) {
    if (!isValidElement(node)) return node;
    if (['input', 'select', 'textarea'].includes(node.type)) return cloneElement(node, { 'aria-labelledby': labelId });
    return node.props.children ? cloneElement(node, {}, Children.map(node.props.children, nameControl)) : node;
  }
  return <label className={`fd-field ${className}`}><span id={labelId}>{label}</span>{Children.map(children, nameControl)}</label>;
}
export function FundPanel({ title, eyebrow, action, children, className = '', id }) {
  return <section id={id} className={`fd-panel ${className}`}><div className="fd-panel-heading"><div>{eyebrow && <span className="fd-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>{children}</section>;
}
export function FundBadge({ children, tone = 'neutral' }) {
  return <span className={`fd-badge ${tone}`}>{children}</span>;
}
export function FundEmpty({ title, children }) {
  return <div className="fd-empty"><span aria-hidden="true">↗</span><h3>{title}</h3><p>{children}</p></div>;
}
