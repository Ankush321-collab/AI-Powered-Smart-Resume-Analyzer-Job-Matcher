"use client";
import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
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
  const [isLogin, setIsLogin] = useState(true);
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
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px] animate-float" />
      <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-accent/10 rounded-full blur-[80px]" />

      {/* Nav */}
      <nav className="relative z-10 w-full px-6 py-8">
        <div className="max-w-7xl mx-auto flex justify-center">
          <Link href="/" className="flex items-center gap-3 no-underline transition-transform hover:scale-105 active:scale-95">
            <div className="w-10 h-10 bg-premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Brain size={22} color="#fff" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-main">
              Resume<span className="text-gradient">AI</span>
            </span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card w-full max-w-[460px] p-10 md:p-12"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-dimmed text-sm md:text-base leading-relaxed">
              {isLogin ? "Sign in to access your analysis history" : "Join today to optimize your resume with AI"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-dimmed ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    className="input-field pl-12"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-dimmed ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  className="input-field pl-12"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dimmed ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  className="input-field pl-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              className="btn-primary w-full justify-center mt-4 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner w-5 h-5" />
              ) : (
                <>
                  <span className="mr-1">{isLogin ? "Sign In" : "Sign Up"}</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <div className="text-center mt-10 text-sm text-dimmed">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-primary font-bold hover:underline underline-offset-4 transition-all ml-1"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
