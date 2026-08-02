# AGENTS.md

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
