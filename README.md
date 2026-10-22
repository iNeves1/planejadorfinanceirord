# RD Investimentos — Carteira de fundos

Painel React/Vite para organizar prioridades, consultar exposição por conta e fundo e acompanhar conversas. A rota `/` abre o painel. O formulário de planejamento patrimonial anterior foi preservado em `/planejamento`.

A aplicação inicia com **dados fictícios identificados**. Posições e retornos podem ser importados por CSV e alternativas condicionais por um pacote JSON local, com identificação, rentabilidades e fonte. A pesquisa técnica permanece fora do site. Não há autenticação, banco de dados ou persistência de atendimentos. As importações são locais e temporárias; use uma base anonimizada para validar o protótipo.

Leia [funcionalidades, formato CSV, limitações e testes](docs/painel-fundos.md).

Para gerar um site que abre em um único HTML, sem instalação no computador de quem vai usá-lo:

```sh
npm ci
npm run build:offline
```

O arquivo `dist/rd-fundos.html` contém a aplicação com demonstração identificada. No site, “Importar posições” também abre um arquivo de trabalho `.rdfundos`, que reúne a carteira, revisões por conta, alternativas e atendimentos. “Salvar trabalho” exporta o histórico para continuar em outra sessão. O arquivo é privado e processado no navegador, sem upload.

Para uma cópia HTML já preenchida com uma carteira, gere-a **fora do checkout**, após o build:

```sh
node scripts/build-offline.mjs --workspace /caminho/privado/carteira.rdfundos --output /caminho/privado/site.html
```

Essa cópia contém contas e decisões; deve ficar em local privado. O gerador impede salvar HTML preenchido dentro do repositório. A aplicação não se conecta à rede nessa versão independente; fontes são links abertos por ação do usuário.

## Publicação na Vercel

`vercel.json` configura Vite, o build `npm run build:public`, a pasta `dist`, os headers e o fallback de navegação. A versão publicada começa em demonstração; carteiras e decisões são carregadas pelo arquivo privado no navegador. O HTML preenchido e os `.rdfundos` não devem ser publicados.

O build público é limpo pelo Vite e conferido por `scripts/check-public-build.mjs`, que interrompe a publicação se encontrar documentos de clientes ou HTML com carteira incorporada. `.vercelignore` exclui arquivos privados e diretórios auxiliares do upload. O painel na raiz bloqueia conexões de dados com CSP; o formulário legado mantém sua rota e sua integração próprias.

Após autenticar a conta Vercel, execute `vercel --prod` na raiz deste repositório. Nenhum token é incluído no projeto. O deploy precisa ser concluído e a URL verificada antes de ser anunciado como publicado.

```sh
npm ci --cache /tmp/rd-npm-cache --no-audit --no-fund
npm run dev
npm run build
node --test tests/funds.test.js
```

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
