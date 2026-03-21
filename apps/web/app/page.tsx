"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Brain, Zap, BarChart3, FileText, ArrowRight, CheckCircle, Star } from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "Nebius AI embeddings provide deep semantic understanding of your resume beyond simple keyword matching.",
    color: "#8b5cf6",
  },
  {
    icon: Zap,
    title: "Instant Matching",
    desc: "Cosine similarity matching between your resume and job descriptions gives precise match percentages in seconds.",
    color: "#3b82f6",
  },
  {
    icon: BarChart3,
    title: "Skill Gap Insights",
    desc: "Know exactly which skills you're missing for your target role with actionable recommendations.",
    color: "#14b8a6",
  },
  {
    icon: FileText,
    title: "ATS Optimization",
    desc: "LLM-generated feedback ensures your resume passes Applicant Tracking Systems with flying colors.",
    color: "#ec4899",
  },
];

const STATS = [
  { value: "98%", label: "ATS Pass Rate" },
  { value: "3x", label: "More Interviews" },
  { value: "60+", label: "Skills Tracked" },
  { value: "<5s", label: "Analysis Time" },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="container flex items-center justify-between" style={{ padding: "18px 24px" }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 36, height: 36, background: "var(--gradient-primary)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={20} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.03em" }}>
              Resume<span className="text-gradient">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="btn-secondary" style={{ padding: "8px 20px" }}>Sign In</Link>
            <Link href="/upload" className="btn-primary" style={{ padding: "8px 20px" }}>
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 0 60px", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800, height: 500,
          background: "radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />

        <div className="container text-center" style={{ position: "relative" }}>
          <div style={{ marginBottom: 24 }}>
            <span className="badge badge-purple animate-fade-up">
              <Star size={12} /> AI-Powered · Nebius AI Technology
            </span>
          </div>

          <h1 className="animate-fade-up" style={{ marginBottom: 24, animationDelay: "0.1s", maxWidth: 800, margin: "0 auto 24px" }}>
            Get Your Resume{" "}
            <span className="text-gradient">AI-Analyzed</span>{" "}
            in Seconds
          </h1>

          <p className="animate-fade-up" style={{
            fontSize: 18, color: "var(--text-secondary)", maxWidth: 600,
            margin: "0 auto 40px", lineHeight: 1.7, animationDelay: "0.2s"
          }}>
            Upload your resume, paste a job description, and get instant AI feedback —
            match score, skill gaps, and ATS optimization tips powered by state-of-the-art embeddings.
          </p>

          <div className="flex items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s", flexWrap: "wrap" }}>
            <Link href="/upload" className="btn-primary" style={{ fontSize: 16, padding: "14px 32px" }}>
              Analyze My Resume <ArrowRight size={18} />
            </Link>
            <Link href="#features" className="btn-secondary" style={{ fontSize: 16, padding: "14px 32px" }}>
              See How It Works
            </Link>
          </div>

          {/* Stats */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginTop: 80, maxWidth: 700, margin: "80px auto 0" }}>
            {STATS.map((stat) => (
              <div key={stat.label} className="glass-card" style={{ padding: "20px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "80px 0" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: 60 }}>
            <h2>Everything You Need to <span className="text-gradient">Land the Job</span></h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 12, fontSize: 16 }}>
              Powered by a full AI pipeline — from parsing to embedding to LLM feedback
            </p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card">
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `${f.color}20`, border: `1px solid ${f.color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20
                }}>
                  <f.icon size={24} color={f.color} />
                </div>
                <h3 style={{ marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 0", borderTop: "1px solid var(--border)" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: 60 }}>
            <h2>Built on a <span className="text-gradient">Robust Pipeline</span></h2>
          </div>
          <div className="flex items-center" style={{ gap: 16, overflowX: "auto", paddingBottom: 8 }}>
            {[
              { step: "1", label: "Upload PDF", desc: "Resume stored in Supabase" },
              { step: "→", label: "", desc: "" },
              { step: "2", label: "Parse Text", desc: "pdf-parse extracts content" },
              { step: "→", label: "", desc: "" },
              { step: "3", label: "Embed", desc: "Nebius BAAI vectors" },
              { step: "→", label: "", desc: "" },
              { step: "4", label: "Match", desc: "Cosine similarity" },
              { step: "→", label: "", desc: "" },
              { step: "5", label: "Feedback", desc: "LLaMA 3.1 70B tips" },
            ].map((item, i) =>
              item.label ? (
                <div key={i} className="glass-card" style={{ padding: "20px 24px", minWidth: 150, flex: 1, textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontWeight: 700, fontSize: 14 }}>
                    {item.step}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>{item.desc}</div>
                </div>
              ) : (
                <div key={i} style={{ color: "var(--text-muted)", fontSize: 20, flexShrink: 0 }}>→</div>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 0", borderTop: "1px solid var(--border)" }}>
        <div className="container text-center">
          <div className="glass-card" style={{ maxWidth: 620, margin: "0 auto", padding: "56px 48px" }}>
            <div style={{ marginBottom: 16 }}>
              <CheckCircle size={40} color="var(--purple-light)" style={{ margin: "0 auto" }} />
            </div>
            <h2 style={{ marginBottom: 16 }}>Ready to Get Hired?</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 16 }}>
              Join thousands who improved their resume with AI. It takes less than 60 seconds.
            </p>
            <Link href="/upload" className="btn-primary" style={{ fontSize: 16, padding: "14px 36px" }}>
              Analyze Your Resume Free <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 0", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          © 2026 ResumeAI · Powered by Nebius AI, Kafka, ClickHouse & PostgreSQL
        </p>
      </footer>
    </div>
  );
}
