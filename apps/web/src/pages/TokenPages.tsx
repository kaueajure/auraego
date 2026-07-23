import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Logo } from "../components/Logo";

export function VerifyPage() {
  const [params] = useSearchParams(), [state, setState] = useState<"loading" | "success" | "error">("loading"), [message, setMessage] = useState("Validando seu link…");
  useEffect(() => { const token = params.get("token"); if (!token) { setState("error"); setMessage("Token ausente."); return; } api<{ message: string }>("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }).then(r => { setState("success"); setMessage(r.message); }).catch(e => { setState("error"); setMessage(e.message); }); }, [params]);
  return <TokenShell><span className={`token-sigil ${state}`}>{state === "loading" ? "…" : state === "success" ? "✓" : "×"}</span><h1>{state === "success" ? "Presença confirmada" : state === "error" ? "Esse link perdeu a aura" : "Só um momento"}</h1><p>{message}</p><Link className="primary link-button" to="/entrar">Ir para o login →</Link></TokenShell>;
}
export function ResetPage() {
  const [params] = useSearchParams(), [password, setPassword] = useState(""), [message, setMessage] = useState("");
  const submit = async (e: FormEvent) => { e.preventDefault(); try { const r = await api<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token: params.get("token"), password }) }); setMessage(r.message); } catch (error) { setMessage(error instanceof Error ? error.message : "Link inválido."); } };
  return <TokenShell><h1>Nova senha</h1><p>Use pelo menos oito caracteres, uma letra e um número.</p><form onSubmit={submit}><label>Nova senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>{message && <p className="form-message">{message}</p>}<button className="primary">Salvar nova senha</button></form></TokenShell>;
}
function TokenShell({ children }: { children: React.ReactNode }) { return <main className="token-page"><div className="token-card"><Logo />{children}</div></main>; }
