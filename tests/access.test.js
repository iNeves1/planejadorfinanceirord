import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { configured, authorized, sessionCookie, passwordMatches, readJson } from "../server/access.js";
import session from "../api/session.js";
import workspace from "../api/workspace.js";
import { seedWorkspace, loadWorkspace, saveWorkspace, Conflict, blobRevision } from "../server/workspace-store.js";
import { serverFixture, testPassword } from "./fixtures/server.js";
import { marketFixture } from "./fixtures/workspace.js";

const env = serverFixture();
Object.assign(process.env, env);
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_STORE_ID;
function request(method = "GET", body, headers = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  req.method = method; req.headers = { host: "site.test", origin: "https://site.test", ...headers };
  return req;
}
async function invoke(handler, req) {
  const headers = {};
  const res = { statusCode: 200, setHeader(key, value) { headers[key.toLowerCase()] = value; }, end(body) { this.body = body; } };
  await handler(req, res);
  return { status: res.statusCode, headers, body: JSON.parse(res.body) };
}
test("sessão exige senha, assina cookie restrito e rejeita adulteração, expiração e chave diferente", async () => {
  assert.equal(configured(env), true);
  assert.equal(configured({}), false);
  assert.equal(await passwordMatches(testPassword, env), true);
  assert.equal(await passwordMatches("errada", env), false);
  const cookie = sessionCookie(env);
  for (const flag of ["__Host-rd_session=", "Secure", "HttpOnly", "SameSite=Strict", "Path=/"]) assert.ok(cookie.includes(flag));
  const req = request("GET", undefined, { cookie });
  assert.equal(authorized(req, env), true);
  assert.equal(authorized(req, env, Date.now() + 9 * 60 * 60 * 1000), false);
  assert.equal(authorized(request("GET", undefined, { cookie: cookie.replace("=", "=x") }), env), false);
  assert.equal(authorized(req, { ...env, RD_SESSION_SECRET: "outro-segredo".repeat(4) }), false);
});
test("API não expõe posições sem sessão e não aceita origem externa", async () => {
  const denied = await invoke(workspace, request());
  assert.equal(denied.status, 401);
  assert.ok(!JSON.stringify(denied.body).includes("A1"));
  assert.ok(denied.headers["cache-control"].includes("no-store"));
  assert.equal(denied.headers.vary, "Cookie");
  const cross = await invoke(session, request("POST", { password: testPassword }, { origin: "https://evil.test" }));
  assert.equal(cross.status, 403);
  const bad = await invoke(session, request("POST", { password: "errada" }));
  assert.equal(bad.status, 401);
  const login = await invoke(session, request("POST", { password: testPassword }));
  assert.equal(login.status, 200);
  const cookie = login.headers["set-cookie"];
  const opened = await invoke(workspace, request("GET", undefined, { cookie }));
  assert.equal(opened.status, 200);
  assert.equal(opened.body.workspace.market.benchmarks[0].id, "CDI");
  const invalidWrite = await invoke(workspace, request("PUT", { workspace: "{}", revision: "x" }, { cookie, origin: "https://evil.test" }));
  assert.equal(invalidWrite.status, 403);
  const logout = await invoke(session, request("DELETE", undefined, { cookie }));
  assert.ok(logout.headers["set-cookie"].includes("Max-Age=0"));
});
test("ausência de configuração fecha o acesso e limite do corpo é verificado", async () => {
  const previous = process.env.RD_WORKSPACE_GZIP;
  delete process.env.RD_WORKSPACE_GZIP;
  try {
    assert.equal((await invoke(workspace, request())).status, 503);
    const status = await invoke(session, request());
    assert.deepEqual(status.body, { configured: false, authenticated: false, persistent: false });
  } finally { process.env.RD_WORKSPACE_GZIP = previous; }
  await assert.rejects(readJson(request("POST", { value: "x".repeat(3000) }), 1024));
});
test("armazenamento privado restaura decisões e rejeita conflito sem sobrescrever outra sessão", async () => {
  const local = { ...env, BLOB_READ_WRITE_TOKEN: "token-sintetico-nunca-usado-na-rede" };
  let saved = null, calls = 0;
  const storage = {
    async read() { return saved; },
    async write(path, content, revision) {
      assert.equal(revision, saved?.revision || null);
      saved = { content, revision: `version-${++calls}` }; return saved.revision;
    },
  };
  const first = await loadWorkspace(local, storage);
  assert.ok(first.revision.startsWith("seed:"));
  const updated = marketFixture(); updated.tasks[0].title = "Decisão registrada no acesso privado";
  const written = await saveWorkspace(JSON.stringify(updated), first.revision, local, storage);
  const again = await loadWorkspace(local, storage);
  assert.equal(again.revision, written.revision);
  assert.equal(JSON.parse(again.content).tasks[0].title, updated.tasks[0].title);
  await assert.rejects(saveWorkspace(JSON.stringify(marketFixture()), first.revision, local, storage), Conflict);
  assert.equal(calls, 1);
  await assert.rejects(saveWorkspace('{"invalid":true}', again.revision, local, storage));
  assert.equal(calls, 1);
  assert.throws(() => seedWorkspace({ RD_WORKSPACE_GZIP: "invalid" }));
});
test("ETag fraco de leitura só usa revisão forte confirmada pela API de armazenamento", () => {
  assert.equal(blobRevision('"revision-1"'), '"revision-1"');
  assert.equal(blobRevision('W/"revision-1"', '"revision-1"'), '"revision-1"');
  assert.throws(() => blobRevision('W/"revision-1"'), Conflict);
  assert.throws(() => blobRevision('W/"revision-1"', '"revision-2"'), Conflict);
  assert.throws(() => blobRevision('"revision-1"', '"revision-2"'), Conflict);
  assert.throws(() => blobRevision(""), Conflict);
});
