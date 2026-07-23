import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth-context";
import { Logo } from "../components/Logo";
import { AuthScene } from "../components/Scenes";

type Mode = "register" | "login" | "forgot" | "sent";
export function AuthPage() {
  const { user, login } = useAuth(), navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("register"), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [values, setValues] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  if (user) return <Navigate to="/" replace />;
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, [key]: e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "register") { await api("/auth/register", { method: "POST", body: JSON.stringify(values) }); setMode("sent"); }
      else if (mode === "login") { await login(values.email, values.password); navigate("/"); }
      else { await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: values.email }) }); setMessage("Se a conta existir, as instruções já estão a caminho."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível continuar."); }
    finally { setBusy(false); }
  };
  const password = values.password, rules = [{ ok: password.length >= 8, label: "8 caracteres" }, { ok: /[A-Za-z]/.test(password), label: "uma letra" }, { ok: /\d/.test(password), label: "um número" }];
  return <main className="auth-layout">
    <section className="auth-stage"><div className="scene-fill"><AuthScene /></div><div className="stage-copy"><span className="eyebrow">TIMING. LEITURA. PRESENÇA.</span><h1>Não force.<br />Faça parecer <em>fácil.</em></h1><p>Entre na quadra, leia o momento e proteja seu ego.</p></div><div className="stage-sticker">TEMPORADA<br /><b>01</b></div></section>
    <section className="auth-panel"><div className="auth-card"><Logo />
      <AnimatePresence mode="wait"><motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      {mode === "sent" ? <div className="sent-state"><span className="mail-icon">↗</span><h2>Confira sua caixa de entrada</h2><p>Enviamos um link de uso único. Confirme seu e-mail para liberar a quadra.</p><button className="primary" onClick={() => setMode("login")}>Ir para o login</button></div> : <>
        <div className="auth-heading"><span>{mode === "register" ? "NOVA PRESENÇA" : mode === "login" ? "DE VOLTA À QUADRA" : "RECUPERAR CONTA"}</span><h2>{mode === "register" ? "Crie sua conta" : mode === "login" ? "Entre no jogo" : "Esqueceu a senha?"}</h2></div>
        {mode !== "forgot" && <div className="tabs" role="tablist"><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Cadastro</button><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button></div>}
        <form onSubmit={submit}>
          {mode === "register" && <label>Nome de usuário<input autoComplete="username" value={values.username} onChange={set("username")} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required placeholder="sua_presenca" /></label>}
          <label>E-mail<input type="email" autoComplete="email" value={values.email} onChange={set("email")} required placeholder="voce@exemplo.com" /></label>
          {mode !== "forgot" && <label>Senha<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={values.password} onChange={set("password")} required placeholder="••••••••" /></label>}
          {mode === "register" && <><div className="password-rules">{rules.map(r => <span className={r.ok ? "ok" : ""} key={r.label}><i>{r.ok ? "✓" : "·"}</i>{r.label}</span>)}</div><label>Confirmar senha<input type="password" autoComplete="new-password" value={values.confirmPassword} onChange={set("confirmPassword")} required placeholder="••••••••" /></label></>}
          {message && <p className="form-message" role="alert">{message}</p>}
          <button className="primary" disabled={busy}>{busy ? "Um instante…" : mode === "register" ? "Criar minha conta" : mode === "login" ? "Entrar" : "Enviar instruções"}<span>→</span></button>
        </form>
        {mode === "login" && <button className="text-button" onClick={() => setMode("forgot")}>Esqueci minha senha</button>}
        {mode === "forgot" && <button className="text-button" onClick={() => setMode("login")}>Voltar ao login</button>}
      </>}</motion.div></AnimatePresence>
      <p className="legal">Ao continuar, você concorda com os <a href="/termos">Termos de Uso</a> e a <a href="/privacidade">Política de Privacidade</a>.</p>
    </div></section>
  </main>;
}
