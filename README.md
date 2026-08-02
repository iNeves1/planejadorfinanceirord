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
