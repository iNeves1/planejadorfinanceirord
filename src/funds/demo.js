// Todos os nomes, posições, retornos e eventos deste arquivo são fictícios.
export const demoFunds = [
  {
    id: "demo-credito",
    name: "Horizonte Crédito Privado",
    short: "Horizonte Crédito",
    manager: "Horizonte · fictícia",
    strategy: "Crédito privado",
    liquidity: "D+30 úteis",
    role: "Estabilidade",
    returns: [0.0072, 0.0784, 0.1082, 0.1124],
    date: "2026-09-30",
  },
  {
    id: "demo-macro",
    name: "Vértice Macro Multimercado",
    short: "Vértice Macro",
    manager: "Vértice · fictícia",
    strategy: "Multimercado",
    liquidity: "D+15 úteis",
    role: "Diversificação",
    returns: [0.0081, 0.0652, 0.0918, 0.1067],
    date: "2026-09-30",
  },
  {
    id: "demo-reserva",
    name: "Norte Reserva DI",
    short: "Norte Reserva",
    manager: "Norte · fictícia",
    strategy: "Pós-fixado",
    liquidity: "D+0 úteis",
    role: "Reserva",
    returns: [0.0101, 0.1014, 0.1432, 0.1241],
    date: "2026-09-30",
  },
  {
    id: "demo-acoes",
    name: "Aurora Ações Brasil",
    short: "Aurora Ações",
    manager: "Aurora · fictícia",
    strategy: "Ações",
    liquidity: "D+4 úteis",
    role: "Crescimento",
    returns: [-0.018, 0.1242, 0.1635, 0.0948],
    date: "2026-09-30",
  },
  {
    id: "demo-inflacao",
    name: "Norte Inflação",
    short: "Norte Inflação",
    manager: "Norte · fictícia",
    strategy: "Inflação",
    liquidity: "D+1 úteis",
    role: "Proteção",
    returns: [0.0062, 0.0864, 0.1192, 0.1096],
    date: "2026-09-30",
  },
];
const clients = [
  ["demo-01", "Cliente exemplo 01", "IN", 540000, 280000, 180000, 0, 0],
  ["demo-02", "Cliente exemplo 02", "IN", 320000, 0, 210000, 90000, 100000],
  ["demo-03", "Cliente exemplo 03", "IN", 250000, 160000, 190000, 85000, 0],
  [
    "demo-04",
    "Cliente exemplo 04",
    "IN",
    180000,
    220000,
    200000,
    120000,
    160000,
  ],
  ["demo-05", "Cliente exemplo 05", "RD", 140000, 80000, 130000, 0, 0],
  ["demo-06", "Cliente exemplo 06", "RD", 90000, 0, 180000, 40000, 60000],
];
export const demoData = {
  mode: "demo",
  date: "2026-09-30",
  source: "Base sintética de demonstração",
  funds: demoFunds,
  positions: clients.flatMap(([clientId, client, advisor, ...balances]) =>
    balances.flatMap((balance, i) =>
      balance
        ? [
            {
              clientId,
              client,
              advisor,
              account: `${clientId}-conta`,
              fundId: demoFunds[i].id,
              balance,
              date: "2026-09-30",
            },
          ]
        : [],
    ),
  ),
};
export const demoAlternatives = {
  "demo-credito": [
    {
      id: "alt-1",
      name: "Exemplo Crédito Seleção",
      returns: [0.0094, 0.0941, 0.1318, 0.1196],
      date: "2026-09-30",
    },
    {
      id: "alt-2",
      name: "Exemplo Crédito Essencial",
      returns: [0.0098, 0.0972, 0.1374, 0.1218],
      date: "2026-09-30",
    },
  ],
};
export const demoEvents = [
  {
    id: "event-credito",
    fundId: "demo-credito",
    type: "Desempenho",
    severity: "high",
    title: "Revisar a tese de crédito",
    reason: "Evento fictício: revisão de desempenho em janelas recorrentes.",
    next: "Conferir consistência, lâmina e composição antes de conversar.",
    period: "12 meses · até 30/09/2026",
    source: "Cenário demonstrativo; não calculado de uma série real",
  },
  {
    id: "event-macro",
    fundId: "demo-macro",
    type: "Mudança no fundo",
    severity: "medium",
    title: "Revisitar o papel do multimercado",
    reason: "Evento fictício: atualização do mandato recebida pelo escritório.",
    next: "Validar o novo mandato e sua adequação ao objetivo do cliente.",
    period: "Setembro de 2026",
    source: "Cenário demonstrativo; não representa evento real",
  },
  {
    id: "event-acoes",
    fundId: "demo-acoes",
    type: "Queda",
    severity: "medium",
    title: "Preparar conversa sobre a oscilação",
    reason:
      "Evento fictício de queda; o retorno do mês não foi tratado como drawdown.",
    next: "Revisar horizonte e necessidade de caixa antes de discutir alterações.",
    period: "Setembro de 2026",
    source: "Cenário demonstrativo; drawdown não calculado",
  },
];
