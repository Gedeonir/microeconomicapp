import { useState, useEffect } from "react";
import { supabase } from "./lib/api.js";
import App from "./App.jsx";
import LoginPage from "./LoginPage.jsx";

// ─────────────────────────────────────────────────────────────
// Thin full-screen spinner shown while Supabase checks session
// ─────────────────────────────────────────────────────────────
function AuthLoading() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 48, height: 48,
        background: "var(--blue)", borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 16 16" fill="white">
          <path d="M8 1L2 4v8l6 3 6-3V4L8 1z"/>
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root — manages auth state, renders Login or Dashboard
// ─────────────────────────────────────────────────────────────
export default function Root() {
  // null = still checking, false = not logged in, true = logged in
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? false);
    });

    // Listen for auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still resolving session
  if (session === null) return <AuthLoading />;

  // Not authenticated — show login
  if (!session) return <LoginPage onLogin={() => {}} />;

  // Authenticated — show dashboard with sign-out
  return <App onSignOut={() => supabase.auth.signOut()} session={session} />;
}
