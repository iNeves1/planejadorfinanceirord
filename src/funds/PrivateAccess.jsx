import { useEffect, useState } from "react";
import { ShieldCheck, Upload } from "lucide-react";
import { FundButton as Button, FundField as Field, FundPanel as Panel } from "../components/ui.jsx";
import { importWorkspace, readInitialWorkspace } from "./workspace.js";
import { importPositions } from "./model.js";

export default function PrivateAccess({ Dashboard }) {
  const [initial, setInitial] = useState(readInitialWorkspace);
  const [status, setStatus] = useState("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initial?.error || "");
  const [busy, setBusy] = useState(false);
  async function openRemote() {
    const response = await fetch("/api/workspace", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar a carteira.");
    const restored = importWorkspace(JSON.stringify(result.workspace), "XPerformance · carteira privada");
    setInitial({ ...restored, remote: { revision: result.revision, persistent: result.persistent } });
  }
  useEffect(() => {
    if (initial) return;
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(15000) });
        const session = await response.json();
        if (!response.ok) throw new Error("Não foi possível consultar o acesso privado.");
        if (!active) return;
        if (session.authenticated) await openRemote();
        else setStatus(session.configured ? "ready" : "unconfigured");
      } catch {
        if (active) { setStatus("error"); setError("A carteira privada não pôde ser carregada. Nenhum dado substituto será exibido."); }
      }
    })();
    return () => { active = false; };
  }, [initial]);
  async function login(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/session", { method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      setPassword(""); await openRemote();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function localFile(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo acima de 10 MB.");
      const content = await file.text();
      setInitial(file.name.toLowerCase().endsWith(".csv")
        ? { data: importPositions(content, file.name), tasks: [], limit: 0.35 }
        : importWorkspace(content, file.name));
    } catch (err) { setError(err.message); }
    event.target.value = "";
  }
  async function logout() {
    try {
      const response = await fetch("/api/session", { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      setStatus("ready"); setInitial(null); setError("");
    } catch { setError("Não foi possível encerrar a sessão. Tente novamente."); }
  }
  if (initial?.data) return <Dashboard initial={initial} onLogout={initial.remote ? logout : undefined} />;
  return <main className="funds-app fd-access"><div className="fd-access-content">
    <div className="fd-access-brand">RD <span>INVESTIMENTOS</span></div>
    <Panel title="Carteira de clientes" eyebrow="FUNDOS DE INVESTIMENTO · ACESSO PRIVADO">
      <div className="fd-access-body"><ShieldCheck size={30} aria-hidden="true" />
        {status === "loading" && !initial?.error && <p role="status">Verificando acesso à carteira…</p>}
        {status === "ready" && <form onSubmit={login}>
          <p>Entre para acessar as posições dos clientes e os acompanhamentos.</p>
          <Field label="Senha de acesso"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required maxLength={200} /></Field>
          <Button type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar na carteira"}</Button>
        </form>}
        {status === "unconfigured" && <p>A carteira real aguarda a ativação do acesso privado no servidor.</p>}
        {error && <p className="fd-error" role="alert">{error}</p>}
        <p className="fd-access-note">As posições dos clientes exigem acesso privado. A análise usa a data dos relatórios enviados, com fonte e pendências de dados identificadas.</p>
        <details><summary>Abrir uma cópia privada neste navegador</summary>
          <Field label="Arquivo de carteira"><input type="file" accept=".rdfundos,.csv,.json" onChange={localFile} /></Field>
          <p>O arquivo é aberto localmente. Use o pacote de carteira preparado a partir dos relatórios.</p>
          <Upload size={16} aria-hidden="true" />
        </details>
      </div>
    </Panel>
  </div></main>;
}
