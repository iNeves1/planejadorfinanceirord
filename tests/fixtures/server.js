import { scryptSync } from "node:crypto";
import { gzipSync } from "node:zlib";
import { marketFixture } from "./workspace.js";

export const testPassword = "senha-exclusiva-dos-testes-locais";
export function serverFixture() {
  const salt = "b".repeat(32);
  return {
    RD_LOGIN_SALT: salt,
    RD_LOGIN_HASH: scryptSync(testPassword, salt, 64).toString("hex"),
    RD_SESSION_SECRET: "segredo_sintetico_apenas_para_testes_".repeat(2),
    RD_WORKSPACE_GZIP: gzipSync(JSON.stringify(marketFixture())).toString("base64"),
  };
}
