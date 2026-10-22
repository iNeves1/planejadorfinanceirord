import { readFile, writeFile, readdir, mkdir, chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importWorkspace } from "../src/funds/workspace.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : null;
const workspace = option("--workspace");
if (!workspace) throw new Error("Informe --workspace com a carteira validada e --output fora do checkout. Não há base de demonstração.");
const output = path.resolve(option("--output") || path.join(root, "dist/rd-fundos.html"));
const insideCheckout = (name) => name === root || name.startsWith(root + path.sep);
if (workspace && insideCheckout(output)) throw new Error("O HTML com dados reais deve ficar fora do checkout e de dist/public.");
let seed = "";
if (workspace) {
  const input = await readFile(path.resolve(workspace), "utf8");
  importWorkspace(input); // Valida também que nenhum campo de análise técnica foi incluído.
  seed = `<script type="application/json" id="rd-private-workspace">${input.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026")}</script>`;
}
const assets = await readdir(path.join(root, "dist/assets"));
const scripts = assets.filter((f) => f.endsWith(".js"));
const styles = assets.filter((f) => f.endsWith(".css"));
if (scripts.length !== 1 || styles.length !== 1) throw new Error("Esperado um bundle JS e um CSS. Execute npm run build antes de gerar o HTML.");
const js = await readFile(path.join(root, "dist/assets", scripts[0]), "utf8");
const css = await readFile(path.join(root, "dist/assets", styles[0]), "utf8");
const logo = (await readFile(path.join(root, "public/logo.png"))).toString("base64");
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'">
<meta name="referrer" content="no-referrer"><title>RD Investimentos · Carteira de fundos</title>
<link rel="icon" href="data:image/png;base64,${logo}">
<style>html,body{margin:0;padding:0;background:#f5f7f6}#root{min-height:100vh}${css.replaceAll("</style", "<\\/style")}</style></head>
<body><noscript>Ative o JavaScript para abrir o painel de fundos.</noscript><div id="root"></div>${seed}
<script type="module">${js.replaceAll("</script", "<\\/script")}</script></body></html>`;
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html, { mode: workspace ? 0o600 : 0o644 });
if (workspace) await chmod(output, 0o600);
console.log(`HTML independente gerado: ${output} (arquivo privado; não publicar)`);
