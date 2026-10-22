import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const blocked = new Set([".csv", ".xlsx", ".xls", ".pdf", ".zip", ".rdfundos"]);
let checked = 0;
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Link simbólico não permitido na saída pública.");
    if (entry.isDirectory()) { await check(file); continue; }
    if (blocked.has(path.extname(entry.name).toLowerCase())) throw new Error("Arquivo de dados ou análise encontrado na saída pública. Publicação interrompida.");
    if (entry.name.endsWith(".html")) {
      const html = await readFile(file, "utf8");
      if (/<script\b[^>]*\bid\s*=\s*["']rd-private-workspace["']/i.test(html))
        throw new Error("Carteira privada incorporada ao HTML. Publicação interrompida.");
    }
    if (/\.(js|html)$/.test(entry.name)) {
      const content = await readFile(file, "utf8");
      if (/Modo demonstração|Cliente exemplo 0|Horizonte Crédito Privado|Exemplo Crédito Seleção|demo-credito|demo-macro/.test(content))
        throw new Error("Dados de demonstração encontrados na publicação. Build interrompido.");
      if (/RD_WORKSPACE_GZIP|RD_LOGIN_HASH|RD_SESSION_SECRET|vercel_blob_rw_/.test(content))
        throw new Error("Configuração privada do servidor encontrada na saída pública.");
    }
    checked++;
  }
}
await check(root);
console.log(`Build público conferido: ${checked} arquivos; sem carteiras incorporadas ou documentos de clientes.`);
