import {
  Sparkles, Users, PiggyBank, Briefcase, Wallet, TrendingUp,
  Globe, Home, Car, Building2, Target, Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  ETAPAS DO WIZARD                                                   */
/* ------------------------------------------------------------------ */

export const STEPS = [
  { key: "welcome",     label: "Boas-vindas",            icon: Sparkles   },
  { key: "family",      label: "Dados Familiares",        icon: Users      },
  { key: "retirement",  label: "Aposentadoria",           icon: PiggyBank  },
  { key: "income",      label: "Rendas",                  icon: Briefcase  },
  { key: "expenses",    label: "Despesas",                icon: Wallet     },
  { key: "investments", label: "Investimentos Nacionais", icon: TrendingUp },
  { key: "global",      label: "Investimentos Globais",   icon: Globe      },
  { key: "realestate",  label: "Imóveis",                 icon: Home       },
  { key: "vehicles",    label: "Veículos",                icon: Car        },
  { key: "companies",   label: "Participação Societária", icon: Building2  },
  { key: "otherbiens",  label: "Outros Bens",             icon: Target     },
  { key: "summary",     label: "Resumo",                  icon: Check      },
];

/* ------------------------------------------------------------------ */
/*  OPÇÕES                                                             */
/* ------------------------------------------------------------------ */

export const PARENTESCO_OPTIONS = ["Cônjuge","Filho(a)","Pai","Mãe","Irmão/Irmã","Neto(a)","Outro"];

// Requisito: adicionar campo "Estado Civil" no cadastro de familiares.
export const ESTADO_CIVIL_OPTIONS = [
  "Solteiro(a)","Casado(a)","União estável","Divorciado(a)","Separado(a)","Viúvo(a)","Outro"
];

export const RENDA_CAT = [
  "Salário","Aluguel","Férias","Rendimento","FGTS","Bônus",
  "Remuneração","Venda","Pensão Alimentícia","Comissão",
  "Aposentadoria","Todas as rendas","Outros"
];

export const DESP_CAT = [
  "Alimentação","Educação","Empregados","Família","Impostos",
  "Lazer","Moradia","Saúde","Inventário","Transporte",
  "Vestuário","Viagem","Pensão Alimentícia","Todas as despesas","Outros"
];

export const FREQ_OPTIONS = ["Mensal","Bimestral","Trimestral","Semestral","Anual","Eventual"];

export const INVEST_TIPO = [
  "Investimentos (exceto Previdência)","Previdência"
];

export const IMOVEL_TIPO = [
  "Casa","Fazenda","Loja","Sítio","Salas Comerciais","Galpão","Outros"
];

export const VEICULO_TIPO = [
  "Carro","Moto","Caminhão","Ônibus","Trator","Van","Outros"
];

export const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

/* ------------------------------------------------------------------ */
/*  Requisito: nenhum campo de ano em todo o app pode aceitar ano      */
/*  maior que 2026 (regra de negócio explícita, não é "ano atual").    */
/* ------------------------------------------------------------------ */
export const MAX_YEAR = 2026;
