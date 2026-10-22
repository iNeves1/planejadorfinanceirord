import { authorized, configured, privateHeaders, respond, sameOrigin, readJson } from "../server/access.js";
import { loadWorkspace, saveWorkspace, persistenceEnabled, Conflict } from "../server/workspace-store.js";

export function createWorkspaceHandler({ load = loadWorkspace, save = saveWorkspace, canPersist = persistenceEnabled } = {}) {
return async function handler(req, res) {
  privateHeaders(res);
  if (!configured()) return respond(res, 503, { error: "Carteira privada ainda não ativada no servidor." });
  if (!authorized(req)) return respond(res, 401, { error: "Entre para acessar a carteira." });
  if (req.method === "GET") {
    try {
      const workspace = await load();
      return respond(res, 200, { workspace: JSON.parse(workspace.content), revision: workspace.revision, persistent: workspace.persistent });
    } catch { return respond(res, 503, { error: "Não foi possível carregar a carteira privada. Nenhum exemplo foi utilizado." }); }
  }
  if (req.method !== "PUT") { res.setHeader("Allow", "GET, PUT"); return respond(res, 405, { error: "Método inválido." }); }
  if (!sameOrigin(req)) return respond(res, 403, { error: "Origem inválida." });
  if (!canPersist()) return respond(res, 503, { error: "Armazenamento privado indisponível. Exporte o arquivo para preservar o trabalho." });
  let body;
  try {
    body = await readJson(req, 4 * 1024 * 1024);
    if (!body || Object.keys(body).length !== 2 || typeof body.revision !== "string" || body.revision.length > 200 || typeof body.workspace !== "string") throw new Error();
  } catch { return respond(res, 400, { error: "Arquivo ou revisão inválidos." }); }
  try { return respond(res, 200, await save(body.workspace, body.revision)); }
  catch (error) {
    if (error instanceof Conflict) return respond(res, 409, { error: "Outra sessão atualizou a carteira. Exporte seu trabalho antes de recarregar para conferir as alterações." });
    return respond(res, 400, { error: "Não foi possível salvar. Preserve uma cópia em Salvar trabalho." });
  }
};
}
export default createWorkspaceHandler();
