"use client";
import { use, useEffect, useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import Link from "next/link";
import { Brain, ArrowLeft, RefreshCw, TrendingUp, Target, Zap, BookOpen, CheckCircle, XCircle, BarChart2 } from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const GET_RESUME = gql`
  query GetResume($resumeId: ID!) {
    getResume(resumeId: $resumeId) {
      id fileName status feedback skills
      matchResults { id jobId score matchPercentage skillGap confidence createdAt }
    }
  }
`;

const GET_ANALYTICS = gql`
  query GetAnalytics {
    getAnalyticsOverview { totalResumes avgScore topMissingSkills { skill count } }
  }
`;

function ScoreRing({ value, size = 130 }: { value: number; size?: number }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value, 100) / 100;
  const color = value >= 75 ? "#14b8a6" : value >= 50 ? "#8b5cf6" : "#ef4444";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 26, fontWeight: 800, color }}>{Math.round(value)}%</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Match</span>
      </div>
    </div>
  );
}

export default function DashboardPage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = use(params);
  const [pollingInterval, setPollingInterval] = useState(3000);

  const { data, loading, error, startPolling, stopPolling } = useQuery(GET_RESUME, {
    variables: { resumeId },
    pollInterval: pollingInterval,
  });

  const { data: analyticsData } = useQuery(GET_ANALYTICS);

  const resume = data?.getResume;
  const topMatch = resume?.matchResults?.[0];
  const status = resume?.status;

  useEffect(() => {
    if (status === "COMPLETED" || status === "FAILED") {
      stopPolling();
      setPollingInterval(0);
    }
  }, [status, stopPolling]);

  const skillGap = topMatch?.skillGap ?? [];
  const presentSkills = resume?.skills ?? [];

  // Prepare radar data (first 6 skill gap items)
  const radarData = skillGap.slice(0, 6).map((skill: string) => ({
    skill, hasSkill: presentSkills.includes(skill) ? 80 : 20,
  }));

  const analyticsOverview = analyticsData?.getAnalyticsOverview;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4, margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <div className="glass-card text-center" style={{ maxWidth: 400, padding: "40px" }}>
          <XCircle size={48} color="#f87171" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ marginBottom: 8 }}>Failed to Load</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>{error.message}</p>
          <Link href="/upload" className="btn-primary">Try Again</Link>
        </div>
      </div>
    );
  }

  const isProcessing = !["COMPLETED", "FAILED"].includes(status || "");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="container flex items-center justify-between" style={{ padding: "18px 24px" }}>
          <div className="flex items-center gap-4">
            <Link href="/upload" className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }}>
              <ArrowLeft size={14} /> Back
            </Link>
            <div className="flex items-center gap-2">
              <div style={{ width: 32, height: 32, background: "var(--gradient-primary)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} color="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Resume<span className="text-gradient">AI</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${status === "COMPLETED" ? "badge-green" : status === "FAILED" ? "badge-red" : "badge-purple"}`}>
              {status === "COMPLETED" ? <CheckCircle size={10} /> : null}
              {status || "Loading..."}
            </span>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: "32px 24px" }}>
        {/* Processing State */}
        {isProcessing && (
          <div className="glass-card" style={{ marginBottom: 24, padding: "24px 32px", borderColor: "rgba(139,92,246,0.3)" }}>
            <div className="flex items-center gap-4">
              <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
              <div>
                <h3 style={{ marginBottom: 4 }}>AI Analysis in Progress</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                  Parsing PDF → Generating embeddings → Extracting skills → Matching jobs → Generating feedback...
                </p>
              </div>
            </div>
            <div className="progress-bar" style={{ marginTop: 20 }}>
              <div className="progress-fill" style={{ width: "60%", animation: "none", background: "var(--gradient-primary)" }} />
            </div>
          </div>
        )}

        {/* Top Row: Score + Info */}
        <div className="grid" style={{ gridTemplateColumns: topMatch ? "200px 1fr" : "1fr", gap: 24, marginBottom: 24 }}>
          {topMatch && (
            <div className="glass-card text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <ScoreRing value={topMatch.matchPercentage} />
              <div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Confidence</p>
                <p style={{ fontSize: 18, fontWeight: 700 }}>{Math.round(topMatch.confidence * 100)}%</p>
              </div>
            </div>
          )}

          {/* Resume Info */}
          <div className="glass-card">
            <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
              <Target size={20} color="var(--purple-light)" />
              <h2 style={{ fontSize: "1.25rem" }}>{resume?.fileName || "Resume Analysis"}</h2>
            </div>

            {/* Skill stats */}
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Skills Found", value: presentSkills.length, color: "var(--teal)" },
                { label: "Skills Missing", value: skillGap.length, color: "#f87171" },
                { label: "Match Score", value: topMatch ? `${Math.round(topMatch.score)}/100` : "—", color: "var(--purple-light)" },
              ].map((s) => (
                <div key={s.label} style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar for match */}
            {topMatch && (
              <div>
                <div className="flex justify-between" style={{ marginBottom: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Job Match</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{Math.round(topMatch.matchPercentage)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${topMatch.matchPercentage}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        {(presentSkills.length > 0 || skillGap.length > 0) && (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Present Skills */}
            <div className="glass-card">
              <h3 className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                <CheckCircle size={16} color="#5eead4" /> Your Skills ({presentSkills.length})
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {presentSkills.map((skill: string) => (
                  <span key={skill} className="skill-chip present">{skill}</span>
                ))}
                {presentSkills.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Processing...</p>}
              </div>
            </div>

            {/* Missing Skills */}
            <div className="glass-card">
              <h3 className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                <XCircle size={16} color="#fca5a5" /> Missing Skills ({skillGap.length})
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {skillGap.map((skill: string) => (
                  <span key={skill} className="skill-chip missing">{skill}</span>
                ))}
                {skillGap.length === 0 && status === "COMPLETED" && (
                  <p style={{ color: "#5eead4", fontSize: 13 }}>🎉 No skill gaps detected!</p>
                )}
                {skillGap.length === 0 && status !== "COMPLETED" && (
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Processing...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        {(radarData.length > 0 || analyticsOverview?.topMissingSkills?.length > 0) && (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Radar Chart */}
            {radarData.length > 0 && (
              <div className="glass-card">
                <h3 className="flex items-center gap-2" style={{ marginBottom: 20 }}>
                  <BarChart2 size={16} color="var(--purple-light)" /> Skill Radar
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" outerRadius={80} data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Radar name="Skills" dataKey="hasSkill" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Missing Skills Bar Chart */}
            {analyticsOverview?.topMissingSkills?.length > 0 && (
              <div className="glass-card">
                <h3 className="flex items-center gap-2" style={{ marginBottom: 20 }}>
                  <TrendingUp size={16} color="var(--blue-light)" /> Top Skills to Learn
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analyticsOverview.topMissingSkills.slice(0, 7)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis dataKey="skill" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={80} />
                    <Tooltip
                      contentStyle={{ background: "#1c1c28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f8fafc" }}
                    />
                    <Bar dataKey="count" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* AI Feedback */}
        {resume?.feedback && (
          <div className="glass-card" style={{ borderColor: "rgba(139,92,246,0.25)" }}>
            <h3 className="flex items-center gap-2" style={{ marginBottom: 20 }}>
              <Zap size={16} color="var(--purple-light)" />
              <span>AI Resume Feedback</span>
              <span className="badge badge-purple" style={{ marginLeft: 8 }}>Nebius LLaMA 3.1 70B</span>
            </h3>
            <div style={{
              background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.15)",
              borderRadius: 12, padding: 20,
              color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8,
              whiteSpace: "pre-wrap"
            }}>
              {resume.feedback}
            </div>
          </div>
        )}

        {/* No feedback yet */}
        {!resume?.feedback && status === "COMPLETED" && (
          <div className="glass-card text-center" style={{ padding: "40px" }}>
            <BookOpen size={40} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-secondary)" }}>AI feedback is being generated...</p>
          </div>
        )}

        {/* Analytics Summary Card */}
        {analyticsOverview && (
          <div className="glass-card" style={{ marginTop: 24 }}>
            <h3 className="flex items-center gap-2" style={{ marginBottom: 16 }}>
              <BarChart2 size={16} color="var(--teal)" /> Your Analytics Overview
            </h3>
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { label: "Total Resumes", value: analyticsOverview.totalResumes },
                { label: "Avg Score", value: `${Math.round(analyticsOverview.avgScore)}/100` },
                { label: "Skills to Learn", value: analyticsOverview.topMissingSkills.length },
              ].map((s) => (
                <div key={s.label} style={{ padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }} className="text-gradient">{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
