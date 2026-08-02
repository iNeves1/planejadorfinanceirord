import { MONTHS_PT } from "../data/options.js";

export function fmtBRL(digits) {
  const n = parseInt(digits || "0", 10);
  return (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtUSD(digits) {
  const n = parseInt(digits || "0", 10);
  return (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function onlyDigits(v) { return v.replace(/\D/g, "") || "0"; }

export function formatMonthYear(value) {
  if (!value) return "—";
  const [y, m] = value.split("-");
  if (!y || !m) return "—";
  const mi = parseInt(m, 10) - 1;
  return MONTHS_PT[mi] ? `${MONTHS_PT[mi]}/${y}` : "—";
}

// value esperado no formato "YYYY-MM-DD" (data completa, com dia)
export function formatFullDate(value) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return "—";
  const mi = parseInt(m, 10) - 1;
  return MONTHS_PT[mi] ? `${parseInt(d, 10)} de ${MONTHS_PT[mi]}/${y}` : "—";
}
