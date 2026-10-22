# RD Investimentos — Carteira de fundos

Painel de posições reais, revisões por cliente/fundo e acompanhamento. A rota `/` exige acesso privado e carrega a carteira do servidor. Não há dados nem fallback de demonstração. O formulário anterior permanece em `/planejamento`.

A autenticação e a persistência precisam ser ativadas no projeto Vercel antes de acessar dados reais online. O frontend e o repositório não contêm posições ou credenciais. A pesquisa de seleção fica fora da interface; sugestões apresentam identificação, retornos históricos e fonte.

Leia [funcionalidades, configuração privada, contratos e testes](docs/painel-fundos.md).

```sh
npm ci --cache /tmp/rd-npm-cache --no-audit --no-fund
npm test
npm run build:public
PLAYWRIGHT_MODULE=/tmp/rd-browser-tools/node_modules/playwright/index.mjs node tests/production-smoke.mjs
```

## Publicação privada

`api/session.js` autentica o proprietário do workspace. `api/workspace.js` entrega a carteira somente com sessão válida e salva alterações no Vercel Blob privado. Configure os segredos `RD_LOGIN_SALT`, `RD_LOGIN_HASH`, `RD_SESSION_SECRET` e `RD_WORKSPACE_GZIP` apenas no servidor, e conecte um Blob privado. Nenhum deles usa prefixo `VITE_`. Sem configuração, o acesso fica fechado e nenhuma carteira substituta é exibida.

Os backups `.rdfundos` preservam posições, referências, revisões e atendimentos. O salvamento online usa revisões para impedir perda de alterações entre sessões. Datas, origens e pendências permanecem visíveis. Filtros não são controles de acesso; o acesso atual é de um único proprietário para a carteira completa.

## Cópia HTML privada

Após o build, gere a cópia preenchida fora do repositório:

```sh
node scripts/build-offline.mjs --workspace /caminho/privado/carteira.rdfundos --output /caminho/privado/site.html
```

O gerador exige uma carteira validada e impede salvar o HTML preenchido no checkout. Essa cópia tem código e estilos incorporados, funciona sem conexões de dados e guarda alterações por exportação de backup. Não publique o HTML privado ou seus backups.

## Formulário legado

# Planejamento Financeiro — Onboarding

A multi-step (12-slide) financial planning onboarding wizard, in Brazilian
Portuguese, for a wealth-management advisory workflow. The user answers
questions about family, retirement goals, income, expenses, national and
global investments, real estate, vehicles, company holdings and other
assets. On the final step the whole plan is reviewed and submitted by
email to the advisor.

This project was rebuilt from a single compiled/minified HTML prototype
(`.netlify/assets/6a6b9fc2536cce209b934013/Planejamento Financeiro —
Onboarding1.html`) into a proper, editable React source tree. The original
JSX was recovered from the prototype's inline sourcemap
(`sourcesContent`), which contained the full, non-minified original code.

## Tech stack

- **React 18** with plain function components and hooks (no external
  state library — a single `useState` form object in `src/App.jsx` holds
  all wizard data).
- **Vite** as the dev server / bundler (chosen over keeping the
  importmap + in-browser Babel approach from the prototype, since a
  proper `npm run build` step and real source files are easier to
  maintain, review and deploy on Netlify).
- **lucide-react** for icons.
- **Web3Forms** (https://web3forms.com) as the email delivery backend for
  the final "Enviar planejamento" submission — this is a plain client-side
  `fetch` POST, no server code or database involved.

## Running locally

```bash
npm install
npm run dev       # starts Vite dev server
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## Project structure

```
src/
  App.jsx                  Wizard shell: screen/step state, navigation, submit
  tokens.js                Shared design tokens (colors, font import)
  data/
    options.js              Static option lists (STEPS, dropdown options, MAX_YEAR)
    factories.js             Empty-item factories + INITIAL_FORM shape
  utils/
    format.js                Currency/date formatting helpers
    web3forms.js              Builds the plain-text summary + sends it via Web3Forms
    useAutoSaveNotice.js      Small hook powering the "Salvo automaticamente" toast
  components/
    ui.jsx                    Reusable field/button/layout primitives (TextField,
                               SelectField, CurrencyField, DateField, MonthYearField, …)
    StepBody.jsx               Renders the form fields for each wizard step
    SummaryStep.jsx            Final review step, with per-section "Editar" links
    DoneScreen.jsx / LandingScreen.jsx
```

## Notable behavior

- **Editing from the summary step**: every section of the final review
  has an "Editar" button that jumps straight to the corresponding step
  without clearing any other answers. A small banner reminds the user
  they're editing, with a "Voltar ao resumo" shortcut back to the
  review screen at any time.
- **Year restriction**: every year picker in the app (birth date, and any
  month/year reference field) is capped at `MAX_YEAR = 2026` — years
  after that are not selectable, per business rule (see
  `src/data/options.js`).
- **Family members**: each member now has a full date of birth (day,
  month, year — not just month/year) and an "Estado civil" dropdown
  (Solteiro(a), Casado(a), União estável, Divorciado(a), Separado(a),
  Viúvo(a), Outro).
