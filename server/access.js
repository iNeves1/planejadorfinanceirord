import { createHmac, randomBytes, scrypt as derive, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(derive);
const cookieName = "__Host-rd_session";
const lifetime = 8 * 60 * 60;
const attempts = new Map();

export function configured(env = process.env) {
  return /^[a-f0-9]{128}$/.test(env.RD_LOGIN_HASH || "") && /^[a-f0-9]{32}$/.test(env.RD_LOGIN_SALT || "") &&
    (env.RD_SESSION_SECRET || "").length >= 40 && Boolean(env.RD_WORKSPACE_GZIP);
}
export function privateHeaders(res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}
export function respond(res, status, value) { res.statusCode = status; res.end(JSON.stringify(value)); }
export function sameOrigin(req) {
  try { return new URL(req.headers.origin).host === req.headers.host; } catch { return false; }
}
export function authorized(req, env = process.env, now = Date.now()) {
  if (!configured(env)) return false;
  const cookie = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(cookieName + "="));
  if (!cookie) return false;
  const value = cookie.slice(cookieName.length + 1);
  if (value.length > 500) return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", env.RD_SESSION_SECRET).update(payload).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.role === "owner" && session.exp > now && session.exp <= now + lifetime * 1000;
  } catch { return false; }
}
export function sessionCookie(env = process.env) {
  const payload = Buffer.from(JSON.stringify({ role: "owner", exp: Date.now() + lifetime * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  const signature = createHmac("sha256", env.RD_SESSION_SECRET).update(payload).digest("hex");
  return `${cookieName}=${payload}.${signature}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${lifetime}`;
}
export const logoutCookie = `${cookieName}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`;
export async function passwordMatches(password, env = process.env) {
  if (typeof password !== "string" || password.length > 200 || !configured(env)) return false;
  const hash = await scrypt(password, env.RD_LOGIN_SALT, 64);
  return timingSafeEqual(hash, Buffer.from(env.RD_LOGIN_HASH, "hex"));
}
export function rateLimited(req, now = Date.now()) {
  const key = String(req.headers["x-vercel-forwarded-for"] || req.socket?.remoteAddress || "unknown");
  if (attempts.size > 10000) for (const [ip, entry] of attempts) if (entry.until <= now) attempts.delete(ip);
  const entry = attempts.get(key);
  if (!entry || entry.until <= now) { attempts.set(key, { count: 1, until: now + 60000 }); return false; }
  entry.count++;
  return entry.count > 5;
}
export async function readJson(req, maxBytes) {
  if (Number(req.headers["content-length"]) > maxBytes) throw new Error("LIMIT");
  if (req.body !== undefined) {
    const value = typeof req.body === "string" || Buffer.isBuffer(req.body) ? JSON.parse(String(req.body)) : req.body;
    if (Buffer.byteLength(JSON.stringify(value)) > maxBytes) throw new Error("LIMIT");
    return value;
  }
  const parts = []; let size = 0;
  for await (const part of req) { size += part.length; if (size > maxBytes) throw new Error("LIMIT"); parts.push(part); }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
