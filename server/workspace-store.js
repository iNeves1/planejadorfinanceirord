import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { get, head, put, BlobNotFoundError, BlobPreconditionFailedError } from "@vercel/blob";
import { importWorkspace, exportWorkspace } from "../src/funds/workspace.js";

export class Conflict extends Error {}
// GET pode fornecer ETag fraco após transformação HTTP. A escrita precisa da
// revisão forte da API, cuja identidade deve coincidir com o conteúdo lido.
export function blobRevision(readTag, writeTag = readTag) {
  if (typeof readTag !== "string" || !readTag || typeof writeTag !== "string" || !writeTag ||
      writeTag.startsWith("W/") || (readTag.startsWith("W/") ? readTag.slice(2) : readTag) !== writeTag)
    throw new Conflict();
  return writeTag;
}
export function canonicalWorkspace(content) {
  const { data, tasks, limit } = importWorkspace(content, "XPerformance · carteira privada");
  return exportWorkspace(data, tasks, limit);
}
export function seedWorkspace(env = process.env) {
  const content = gunzipSync(Buffer.from(env.RD_WORKSPACE_GZIP || "", "base64"), { maxOutputLength: 10 * 1024 * 1024 }).toString("utf8");
  const raw = canonicalWorkspace(content);
  const revision = createHash("sha256").update(raw).digest("hex");
  return { content: raw, revision: `seed:${revision}`, path: `rd-fundos/workspace-${revision}.json` };
}
const blobStorage = {
  async read(path) {
    try {
      const result = await get(path, { access: "private", useCache: false });
      if (!result) return null;
      if (result.statusCode !== 200 || result.blob.size > 10 * 1024 * 1024) throw new Error("Arquivo privado inválido.");
      const content = await new Response(result.stream).text();
      const tag = result.blob.etag;
      const metadata = tag.startsWith("W/") ? await head(path) : null;
      const revision = blobRevision(tag, metadata?.etag || tag);
      return { content, revision };
    } catch (error) { if (error instanceof BlobNotFoundError) return null; throw error; }
  },
  async write(path, content, revision) {
    try {
      const result = await put(path, content, { access: "private", addRandomSuffix: false,
        contentType: "application/json", cacheControlMaxAge: 60,
        ...(revision ? { ifMatch: revision, allowOverwrite: true } : { allowOverwrite: false }) });
      return result.etag;
    } catch (error) { if (error instanceof BlobPreconditionFailedError) throw new Conflict(); throw error; }
  },
};
export function persistenceEnabled(env = process.env) { return Boolean(env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID); }
export async function loadWorkspace(env = process.env, storage = blobStorage) {
  const seed = seedWorkspace(env);
  if (!persistenceEnabled(env)) return { ...seed, persistent: false };
  const saved = await storage.read(seed.path);
  return saved ? { content: canonicalWorkspace(saved.content), revision: saved.revision, persistent: true } : { ...seed, persistent: true };
}
export async function saveWorkspace(content, revision, env = process.env, storage = blobStorage) {
  if (!persistenceEnabled(env)) throw new Error("Armazenamento privado indisponível.");
  const seed = seedWorkspace(env), current = await storage.read(seed.path);
  if (revision !== (current?.revision || seed.revision)) throw new Conflict();
  const raw = canonicalWorkspace(content);
  const next = await storage.write(seed.path, raw, current?.revision || null);
  return { revision: next };
}
