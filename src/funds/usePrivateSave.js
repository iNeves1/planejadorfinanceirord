import { useEffect, useMemo, useRef, useState } from "react";
import { exportWorkspace } from "./workspace.js";

export function usePrivateSave(data, tasks, limit, remote) {
  const serialized = useMemo(() => exportWorkspace(data, tasks, limit), [data, tasks, limit]);
  const current = useRef(serialized), saved = useRef(serialized), revision = useRef(remote?.revision);
  const saving = useRef(false), stopped = useRef(false);
  const [state, setState] = useState("saved"), [error, setError] = useState(""), [tick, setTick] = useState(0);
  current.current = serialized;
  async function persist() {
    if (!remote?.persistent || saving.current) return false;
    if (current.current === saved.current) return true;
    const snapshot = current.current;
    saving.current = true; setState("saving");
    try {
      const response = await fetch("/api/workspace", { method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: snapshot, revision: revision.current }),
        signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao salvar. Exporte uma cópia do trabalho.");
      revision.current = result.revision; saved.current = snapshot; stopped.current = false;
      setState("saved"); setError(""); setTick((value) => value + 1); return true;
    } catch (err) { stopped.current = true; setState("error"); setError(err.message); return false; }
    finally { saving.current = false; }
  }
  useEffect(() => {
    if (!remote?.persistent || current.current === saved.current || stopped.current) return;
    setState("pending");
    const timeout = setTimeout(() => { void persist(); }, 1200);
    return () => clearTimeout(timeout);
  }, [serialized, remote?.persistent, tick]);
  useEffect(() => {
    if (!remote?.persistent) return;
    function unload(event) {
      if (current.current !== saved.current) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [remote?.persistent]);
  return { state, dirty: current.current !== saved.current, saveNow: () => { stopped.current = false; return persist(); },
    message: state === "error" ? error : state === "saving" ? "Salvando no acesso privado…" : state === "pending" ? "Alterações aguardando salvamento…" : "Trabalho salvo no acesso privado." };
}
