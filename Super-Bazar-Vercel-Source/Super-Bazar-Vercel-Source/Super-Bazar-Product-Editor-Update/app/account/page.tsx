"use client";

import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Mode = "login" | "signup";

function credentials(identifier: string, password: string) {
  const value = identifier.trim();
  if (value.includes("@")) return { email: value.toLowerCase(), password };
  const digits = value.replace(/\D/g, "");
  const phone = digits.length === 10 ? `+91${digits}` : value.startsWith("+") ? value : `+${digits}`;
  return { phone, password };
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    setRecovery(new URLSearchParams(window.location.search).has("reset"));
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function notify(text: string, isError = false) {
    setMessage(text);
    setError(isError);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || password.length < 8) {
      notify("Enter a valid email/mobile number and a password of at least 8 characters.", true);
      return;
    }
    setBusy(true);
    notify("");
    const values = credentials(identifier, password);
    const result = mode === "signup"
      ? await supabase.auth.signUp({ ...values, options: { emailRedirectTo: `${window.location.origin}/account` } })
      : await supabase.auth.signInWithPassword(values);
    setBusy(false);
    if (result.error) return notify(result.error.message, true);
    if (mode === "signup" && !result.data.session) {
      notify(identifier.includes("@") ? "Account created. Check your email to confirm it." : "Account created. Complete mobile verification to activate it.");
    } else {
      notify(mode === "signup" ? "Your account is ready." : "Welcome back! You are signed in.");
    }
  }

  async function googleLogin() {
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (authError) {
      setBusy(false);
      notify(authError.message, true);
    }
  }

  async function resetPassword() {
    if (!identifier.includes("@")) return notify("Enter your registered email address first.", true);
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(identifier.trim(), {
      redirectTo: `${window.location.origin}/account?reset=1`,
    });
    setBusy(false);
    notify(resetError ? resetError.message : "If an account exists, a password-reset email has been sent.", Boolean(resetError));
  }

  async function updatePassword() {
    if (newPassword.length < 8) return notify("Your new password must contain at least 8 characters.", true);
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) return notify(updateError.message, true);
    setRecovery(false);
    setNewPassword("");
    window.history.replaceState({}, "", "/account");
    notify("Password updated successfully.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    notify("You have been signed out.");
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || user?.phone || "Customer";
  const identity = user?.email || user?.phone || "Verified customer";

  return <main className="account-page">
    <header><a className="brand" href="/"><span>super</span>bazar<i>.</i></a><a href="/">← Back to store</a></header>
    <section>
      <aside>
        <div className="account-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <h2>{user ? displayName : "Your account"}</h2>
        <p>{user ? identity : "Sign in to see your details"}</p>
        <nav>
          <a href="/orders">📦 My orders</a>
          <button onClick={() => notify(user ? "Saved addresses will appear here." : "Sign in to view saved addresses.")}>⌖ Saved addresses</button>
          <button onClick={() => notify(user ? "Wishlist is connected to the storefront." : "Sign in to view your wishlist.")}>♡ Wishlist</button>
          <a href="/admin">⚙ Store admin</a>
          {user && <button className="logout-button" onClick={logout}>↪ Sign out</button>}
        </nav>
      </aside>
      <article>
        {user && !recovery ? <>
          <p className="eyebrow">SIGNED IN</p>
          <h1>Welcome, {displayName}</h1>
          <p>Your Super Bazar account is active. You can access orders, saved addresses and your wishlist.</p>
          <div className="signed-in-card"><span>✓</span><div><b>Account verified</b><small>{identity}</small></div></div>
          <a className="account-primary account-link" href="/orders">View my orders</a>
        </> : recovery ? <>
          <p className="eyebrow">SECURE ACCOUNT</p>
          <h1>Create a new password</h1>
          <p>Choose a strong password with at least 8 characters.</p>
          <label>New password<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter a new password" /></label>
          <button className="account-primary" disabled={busy} onClick={updatePassword}>{busy ? "Updating…" : "Update password"}</button>
        </> : <>
          <p className="eyebrow">CUSTOMER ACCOUNT</p>
          <h1>{mode === "login" ? "Sign in to Super Bazar" : "Create your account"}</h1>
          <p>{mode === "login" ? "Use Google or your registered email/mobile number." : "Register using your email or Indian mobile number."}</p>
          <button className="google-login" disabled={busy} onClick={googleLogin}>G　Continue with Google</button>
          <div className="or"><span />or<span /></div>
          <form onSubmit={submit}>
            <label>Email or mobile number<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="name@email.com or 10-digit mobile" autoComplete="username" /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
            <button className="account-primary" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Login" : "Create account"}</button>
          </form>
          {mode === "login" && <button className="forgot-button" onClick={resetPassword} disabled={busy}>Forgot password?</button>}
          <p className="signup">{mode === "login" ? "New customer? " : "Already registered? "}<button onClick={() => { setMode(mode === "login" ? "signup" : "login"); notify(""); }}>{mode === "login" ? "Create an account" : "Login"}</button></p>
        </>}
        {message && <div className={`account-message${error ? " error" : ""}`}>{message}</div>}
      </article>
    </section>
  </main>;
}
