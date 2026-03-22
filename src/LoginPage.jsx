import { useState } from "react";
import { supabase } from "./lib/api.js";

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPw, setShowPw]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message === "Invalid login credentials"
        ? "Incorrect email or password."
        : err.message);
    } else {
      onLogin();
    }
  }

  return (
    <div className="auth-shell">
      {/* Left panel — branding */}
      <div className="auth-left">
        <div className="auth-flag">
          <div className="auth-flag-blue" />
          <div className="auth-flag-yellow" />
          <div className="auth-flag-green" />
        </div>

        <div className="auth-brand">
          <div className="auth-brand-logo">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="white">
              <path d="M8 1L2 4v8l6 3 6-3V4L8 1z"/>
            </svg>
          </div>
          <span className="auth-brand-name">CoK Indicators</span>
        </div>

        <div className="auth-hero">
          <h1 className="auth-hero-title">Microeconomic Indicators<br/>Database</h1>
          <p className="auth-hero-desc">
            Central data management portal for tracking, updating and
            monitoring Kigali's economic, social and environmental
            indicators across 17 thematic modules.
          </p>
        </div>

        <div className="auth-stats">
          {[
            { value: "17", label: "Data modules" },
            { value: "25", label: "Source sheets" },
            { value: "200+", label: "Indicators" },
          ].map(s => (
            <div key={s.label} className="auth-stat">
              <span className="auth-stat-value">{s.value}</span>
              <span className="auth-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="auth-left-footer">
          Microeconomic Indicators Database . {new Date().getFullYear()}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h2 className="auth-form-title">Sign in</h2>
            <p className="auth-form-sub">Enter your credentials to access the dashboard</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="admin@gmail.gov.rw"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  className="auth-input"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)}>
                  {showPw
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={loading || !email || !password}>
              {loading
                ? <><span className="auth-spinner" /> Signing in…</>
                : "Sign in to dashboard"
              }
            </button>
          </form>

          <div className="auth-form-footer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Access is restricted to authorised personnel only
          </div>
        </div>
      </div>
    </div>
  );
}