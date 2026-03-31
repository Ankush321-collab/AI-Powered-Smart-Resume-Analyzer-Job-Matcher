"use client";
import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brain, ArrowRight, Lock, Mail, User } from "lucide-react";
import { motion } from "framer-motion";

const SIGN_IN = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      token
      user { id email name }
    }
  }
`;

const SIGN_UP = gql`
  mutation SignUp($email: String!, $password: String!, $name: String) {
    signUp(email: $email, password: $password, name: $name) {
      token
      user { id email name }
    }
  }
`;

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [signIn] = useMutation(SIGN_IN);
  const [signUp] = useMutation(SIGN_UP);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!isLogin && !name) return;

    setError("");
    setLoading(true);

    try {
      let token = "";
      if (isLogin) {
        const { data } = await signIn({ variables: { email, password } });
        token = data.signIn.token;
      } else {
        const { data } = await signUp({ variables: { email, password, name } });
        token = data.signUp.token;
      }

      if (token) {
        localStorage.setItem("auth_token", token);
        router.push("/upload");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", position: "relative", overflow: "hidden" }}>
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[360px] h-[360px] bg-secondary/20 rounded-full blur-[120px] animate-float" />
      {/* Nav */}
      <nav className="navbar" style={{ padding: "18px 24px" }}>
        <div className="container" style={{ display: "flex", justifyContent: "center" }}>
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, background: "var(--gradient-primary)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={20} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              Resume<span className="text-gradient">AI</span>
            </span>
          </Link>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          whileHover={{ y: -4, scale: 1.01 }}
          className="glass-card group"
          style={{ width: "100%", maxWidth: 440, padding: 44, position: "relative" }}
        >
          <div className="absolute inset-0 bg-premium-gradient opacity-0 group-hover:opacity-15 transition-opacity" />
          <div className="absolute -top-24 right-[-60px] w-56 h-56 rounded-full bg-primary/20 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-center" style={{ marginBottom: 32, position: "relative" }}>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>{isLogin ? "Welcome Back" : "Create Account"}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              {isLogin ? "Sign in to access your analysis history" : "Join today to optimize your resume with AI"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isLogin && (
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                  Full Name
                </label>
                <div style={{ position: "relative" }}>
                  <User size={18} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: 14 }} />
                  <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: 42 }}
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: 14 }} />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: 14 }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{ padding: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#fca5a5", fontSize: 13 }}>
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Sign Up"} <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div className="text-center" style={{ marginTop: 24, fontSize: 14, color: "var(--text-secondary)" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              style={{ background: "none", border: "none", color: "var(--purple-light)", fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
