"use client";

import { FormEvent, useEffect, useState } from "react";

type LoginRole = "citizen" | "admin";

export default function LoginPage() {
  const [role, setRole] = useState<LoginRole>("citizen");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("role") === "admin") {
      setRole("admin");
    }
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password || (mode === "register" && !name)) {
      setError(mode === "register" ? "Enter your name, email, and password to continue." : "Enter your email and password to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to continue.");
      window.location.href = `/?role=${result.user.role}`;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to continue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-visual">
        <a className="logo auth-logo" href="/" aria-label="LoopCycle home"><span>↻</span><strong>loop<span>cycle</span></strong></a>
        <div className="auth-visual-content">
          <span className="public-eyebrow"><i />Waste management, made simple</span>
          <h1>Welcome back<br /><em>to the loop.</em></h1>
          <p>Pick up where you left off and keep making a difference in your neighborhood.</p>
          <div className="auth-impact-card"><span>♻</span><div><small>Community impact</small><strong>Your impact starts here</strong><em>Report your first item after signing in</em></div></div>
        </div>
        <div className="auth-visual-footer"><span>♧</span><p>Small actions. Real impact.</p></div>
      </div>
      <section className="auth-panel">
        <a className="back-home" href="/">← Back to home</a>
        <div className="auth-form-wrap">
          <div className="auth-heading"><p className="eyebrow">{mode === "login" ? "WELCOME BACK" : "JOIN THE LOOP"}</p><h2>{mode === "login" ? "Sign in to LoopCycle" : "Create your account"}</h2><p>{mode === "login" ? "Manage your reports, pickups, and local impact." : "Start reporting waste and making a difference."}</p></div>
          <div className="role-tabs" aria-label="Choose account type">
            <button className={role === "citizen" ? "role-tab selected" : "role-tab"} onClick={() => setRole("citizen")} type="button"><span>○</span>Citizen</button>
            <button className={role === "admin" ? "role-tab selected" : "role-tab"} onClick={() => setRole("admin")} type="button"><span>♙</span>Admin</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && <label>Full name<input type="text" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
            <label>Email address<input type="email" placeholder={role === "admin" ? "admin@loopcycle.org" : "you@example.com"} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
            <label>Password<div className="password-field"><input type="password" placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /><button type="button" aria-label="Password visibility is handled by browser" tabIndex={-1}>•••</button></div></label>
            {mode === "login" && <div className="auth-options"><label className="remember"><input type="checkbox" defaultChecked /> Remember me</label><a href="#forgot">Forgot password?</a></div>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? `Sign in as ${role === "admin" ? "admin" : "citizen"}` : "Create account"} <span>↗</span></button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <p className="auth-signup">{mode === "login" ? "New to LoopCycle?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
          <p className="demo-hint">{mode === "login" ? "Your credentials are securely checked against MongoDB." : "New public accounts are created as Citizen accounts. Admin access is provisioned separately."}</p>
        </div>
      </section>
    </main>
  );
}
