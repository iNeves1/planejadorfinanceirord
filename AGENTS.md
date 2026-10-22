# Painel de fundos — carteira real e acesso privado

O usuário recusou demonstrações. Não reintroduzir dados, produtos, retornos, alertas ou alternativas sintéticas no aplicativo ou no build. Fixtures anônimas existem somente em `tests/fixtures` e nunca são publicadas. A rota `/` começa no acesso privado; `/planejamento` preserva o formulário legado.

`src/funds/PrivateAccess.jsx` carrega a carteira autenticada de `/api/workspace`. Não há fallback de dados quando a configuração ou a requisição falha. O HTML privado pode receber uma carteira validada em `#rd-private-workspace`, exclusivamente fora do checkout. `scripts/build-offline.mjs` exige `--workspace` e `--output` fora do checkout. Reutilize as primitivas `Fund*` em `src/components/ui.jsx` e isole estilos sob `.funds-app`.

`api/session.js`, `server/access.js` e `api/workspace.js` implementam acesso do proprietário do workspace (não multiusuário). Senha scrypt e cookies HMAC Secure/HttpOnly/SameSite=Strict, expiração, checagem de origem em escritas e respostas privadas sem cache. Segredos RD_* só existem no servidor e nunca usam prefixo VITE_. O bootstrap RD_WORKSPACE_GZIP é uma variável secreta contendo o pacote validado e comprimido. A persistência usa Vercel Blob **privado**, sem URL de leitura pública, com controle de revisão para não sobrescrever outra sessão. Não imprimir, versionar ou embutir credenciais nem posições reais no frontend.

`src/funds/usePrivateSave.js` salva alterações do acesso online, informa falhas e mantém exportação de backup. No HTML local não há sincronização. Os filtros não são autorização. Nunca publicar contas em `src`, `public`, `dist` ou fixtures. A análise de seleção permanece privada; sugestões mostram identificação, retornos e referência. Ausências ficam ausentes, sem inventar CNPJ, liquidez, rentabilidade ou adequação ao cliente. O assessor assumiu conferir perfil, objetivos e restrições.

Contrato em `src/funds/workspace.js`: versões v1/v2, revisões ligadas a conta/fundo, histórico e limite de concentração. Índices exigem vínculo explícito por fundo e períodos equivalentes. Médias históricas ponderadas exibem cobertura por período e não são retorno da carteira/cliente. Cada posição exposta é contada uma vez e filtros preservam o denominador completo da conta.

V3 acrescenta `audit` e `positionPerformance`: retornos e %CDI informados pela XP são preservados por posição e não recalculados com a janela completa do fundo. O campo 24M XP não é anualizado. `Desempenho a investigar` distingue lacuna de benchmark de defasagem contra referência própria. CDI de oportunidade tem identificação explícita. Preservar a serialização v1/v2 para não mudar o caminho do bootstrap e perder acesso ao trabalho salvo. Publicar o leitor v3 antes de gravar v3 no armazenamento privado; qualquer migração deve preservar tarefas atuais usando revisão condicional.

Verificação: `npm test`, `npm run build:public` e `PLAYWRIGHT_MODULE=/tmp/rd-browser-tools/node_modules/playwright/index.mjs node tests/production-smoke.mjs`. O smoke valida autenticação, carregamento automático, persistência e logout usando somente fixtures locais. O offline é validado por `tests/offline-smoke.mjs`; carteira real, sem capturas, por `tests/check-private-site.mjs /caminho/externo/site.html`. Não verificar URLs de publicação com curl/browser quando aplicar a skill de deploy; consultar status da publicação.

---

# Formulário legado — /planejamento

## What this is

A client-only React SPA, no backend. `src/App.jsx` owns all wizard state
in one `form` object (`useState(INITIAL_FORM)`) and a `stepIdx` pointer
into `STEPS` (from `src/data/options.js`). Every step component receives
`form` + an `update(patch)` callback that shallow-merges into the form
state — there is no per-step local state for form values, so navigating
back and forth never loses data.

## Key directories

- `src/data/options.js` — all static option lists (dropdown values,
  `STEPS` step definitions with icons, and `MAX_YEAR`).
- `src/data/factories.js` — factory functions for list items (family
  members, incomes, expenses, investments, etc.) and `INITIAL_FORM`.
- `src/components/ui.jsx` — the field/button/layout primitives. All new
  fields should be added here and reused, not hand-rolled inline, to
  keep visual consistency (colors from `src/tokens.js`, spacing,
  border-radius, etc. all come from this file).
- `src/components/StepBody.jsx` — one big function component with an
  `if (stepKey === "...")` per step. This mirrors the structure of the
  original prototype and was kept as-is (rather than splitting into 11
  separate files) to stay close to the recovered source and make diffing
  against the original easy.
- `src/components/SummaryStep.jsx` — final review screen.
- `src/utils/web3forms.js` — builds the plain-text plan summary and POSTs
  it to Web3Forms. `WEB3FORMS_ACCESS_KEY` is the same key used in the
  original prototype; it's a public form-submission access key (not a
  secret credential), consistent with how Web3Forms is meant to be used
  client-side.

## Non-obvious decisions

- **Vite instead of the prototype's importmap + in-browser Babel setup.**
  The original HTML file transpiled JSX at runtime via a CDN Babel
  script and ESM imports from esm.sh. That works as a zero-build static
  page, but it's harder to maintain as "real" reviewable source and
  doesn't fit a normal `npm run build` Netlify deploy. Vite was chosen
  as the more standard, maintainable option; fidelity with the original
  design was preserved by copying the recovered JSX almost verbatim into
  modules.
- **Original source recovery**: the prototype file's `<script
  type="module">` had a `//# sourceMappingURL=data:...;base64,...`
  comment. Decoding it revealed a sourcemap whose `sourcesContent[0]`
  field contained the full original, non-minified JSX — this is what was
  split into the current module structure, not a reverse-engineering of
  the minified/inlined code.
- **`MAX_YEAR = 2026` is a hardcoded business rule**, not
  `new Date().getFullYear()`. Every year-bearing field (`MonthYearField`,
  `DateField`) builds its year options with this constant so that no
  year after 2026 is ever selectable, per an explicit product
  requirement (not "current year").
- **`DateField` (day/month/year)** was added specifically for family
  members' date of birth, replacing the original month/year-only
  picker. It's implemented as three `<select>`s (day/month/year), same
  pattern as the existing `MonthYearField`, rather than a native
  `<input type="date">`, to stay consistent with the original app's
  documented reasoning ("evita bugs do input nativo … em WebViews
  Android").
- **Editing from the summary step** is implemented via `editStep(key)` /
  `returnToSummary()` in `App.jsx` plus an `editingFrom` step-index
  marker (not a full undo/history stack). Clicking "Editar" on any
  summary block jumps `stepIdx` straight to that step; the user can then
  either continue forward through the normal step sequence (data is
  never cleared) or use the "Voltar ao resumo" shortcut banner to jump
  directly back to the summary at any point.
- No backend/build step beyond static hosting is required — form
  submission is a direct client-side `fetch` to `api.web3forms.com`,
  exactly as in the original prototype. Do not introduce Netlify
  Forms/Database for this unless a future requirement needs
  server-side persistence.
