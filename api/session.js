import { authorized, configured, privateHeaders, respond, sameOrigin, sessionCookie, logoutCookie, passwordMatches, rateLimited, readJson } from "../server/access.js";

export default async function handler(req, res) {
  privateHeaders(res);
  if (req.method === "GET") return respond(res, 200, { configured: configured(), authenticated: authorized(req), persistent: Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) });
  if (!["POST", "DELETE"].includes(req.method)) { res.setHeader("Allow", "GET, POST, DELETE"); return respond(res, 405, { error: "Método inválido." }); }
  if (!sameOrigin(req)) return respond(res, 403, { error: "Origem inválida." });
  if (req.method === "DELETE") { res.setHeader("Set-Cookie", logoutCookie); return respond(res, 200, { authenticated: false }); }
  if (!configured()) return respond(res, 503, { error: "Acesso privado ainda não ativado no servidor." });
  if (rateLimited(req)) { res.setHeader("Retry-After", "60"); return respond(res, 429, { error: "Aguarde um minuto antes de tentar novamente." }); }
  try {
    const body = await readJson(req, 2048);
    if (!body || Object.keys(body).length !== 1 || !(await passwordMatches(body.password))) return respond(res, 401, { error: "Senha inválida." });
    res.setHeader("Set-Cookie", sessionCookie());
    return respond(res, 200, { authenticated: true });
  } catch { return respond(res, 400, { error: "Pedido de acesso inválido." }); }
}
