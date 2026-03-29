"use client";
import { use, useEffect, useState } from "react";
import { useQuery, gql } from "@apollo/client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, ArrowLeft, TrendingUp, Target, Zap, 
  CheckCircle, XCircle, BarChart2, Sparkles, 
  ShieldCheck, Award, Layers
} from "lucide-react";
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

function ScoreRing({ value, size = 160 }: { value: number; size?: number }) {
  const radius = 65;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value, 100) / 100;
  const color = value >= 80 ? "#14b8a6" : value >= 60 ? "#8b5cf6" : "#f43f5e";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-white/5"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
          strokeLinecap="round"
          className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-4xl font-black tracking-tighter"
          style={{ color }}
        >
          {Math.round(value)}%
        </motion.span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1">Match Score</span>
      </div>
    </div>
  );
}

export default function DashboardPage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = use(params);
  const [pollingInterval, setPollingInterval] = useState(12000);

  const { data, loading, error, stopPolling } = useQuery(GET_RESUME, {
    variables: { resumeId },
    pollInterval: pollingInterval,
  });

  const { data: analyticsData } = useQuery(GET_ANALYTICS);

  const resume = data?.getResume;
  const topMatch = resume?.matchResults?.[0];
  const status = resume?.status;
  const isFeedbackPending = status === "COMPLETED" && !resume?.feedback;

  useEffect(() => {
    if (status === "FAILED" || (status === "COMPLETED" && !!resume?.feedback)) {
      stopPolling();
      setPollingInterval(0);
      return;
    }
    if (status === "COMPLETED" && !resume?.feedback) {
      setPollingInterval(5000);
    }
  }, [status, resume?.feedback, stopPolling]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPollingInterval(0);
      stopPolling();
    }, 12 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [stopPolling]);

  const skillGap = topMatch?.skillGap ?? [];
  const presentSkills = resume?.skills ?? [];
  const radarData = skillGap.slice(0, 6).map((skill: string) => ({
    skill, hasSkill: presentSkills.includes(skill) ? 80 : 20,
  }));
  const analyticsOverview = analyticsData?.getAnalyticsOverview;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto w-12 h-12 border-4" />
          <p className="text-muted text-sm font-medium animate-pulse">Initializing Neural Engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card max-w-md w-full p-10 text-center border-red-500/20"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <XCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Sync Error</h2>
          <p className="text-muted mb-8 text-sm">{error.message}</p>
          <Link href="/upload" className="btn-premium w-full justify-center">
            Return to Upload
          </Link>
        </motion.div>
      </div>
    );
  }

  const isProcessing = !["COMPLETED", "FAILED"].includes(status || "");

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/upload" className="btn-premium-outline !py-2 !px-4 !text-xs group">
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Back
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse-glow">
                <Brain size={20} className="text-white" />
              </div>
              <span className="font-black text-xl tracking-tight uppercase">
                Resume<span className="premium-gradient-text tracking-widest">AI</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <span className={`badge-premium ${status === 'COMPLETED' ? 'text-accent-light' : 'text-primary-light'}`}>
                  {status === "COMPLETED" ? <CheckCircle size={10} /> : <Sparkles size={10} className="animate-spin" />}
                  {status || "Initializing"}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-6 pt-32 pb-20"
      >
        {/* Processing State */}
        {isProcessing && (
          <motion.div 
            variants={itemVariants}
            className="glass-card mb-8 p-8 border-primary/30 bg-primary/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain size={120} />
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="spinner !w-10 !h-10 border-4" />
              <div>
                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                  Deep Analysis in Progress <Sparkles size={16} className="text-primary-light animate-pulse" />
                </h3>
                <p className="text-muted text-sm max-w-2xl">
                  Our neural engine is currently parsing your document, extracting multi-dimensional skill vectors, and cross-referencing with 10k+ industry job profiles.
                </p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full mt-8 overflow-hidden">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="h-full bg-premium-gradient w-1/3 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]"
              />
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-[380px_1fr] gap-8">
          {/* Left Column: Score Card */}
          <motion.div variants={itemVariants} className="space-y-8">
            <div className="glass-card p-10 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors border-white/5">
              <ScoreRing value={topMatch?.matchPercentage || 0} />
              <div className="mt-8 space-y-4 w-full">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Confidence Vector</p>
                  <p className="text-2xl font-black text-white">{Math.round((topMatch?.confidence || 0) * 100)}%</p>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-2">
                  <span className="text-muted">Status</span>
                  <span className="text-accent-light">Verified</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-6 border-white/5 hover:border-primary/30 transition-all">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <CheckCircle size={16} className="text-accent-light" />
                </div>
                <p className="text-2xl font-black">{presentSkills.length}</p>
                <p className="text-[10px] uppercase font-bold text-muted tracking-tighter">Skills Found</p>
              </div>
              <div className="glass-card p-6 border-white/5 hover:border-red-500/30 transition-all">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                  <XCircle size={16} className="text-red-400" />
                </div>
                <p className="text-2xl font-black">{skillGap.length}</p>
                <p className="text-[10px] uppercase font-bold text-muted tracking-tighter">Gap Detected</p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Main Content */}
          <div className="space-y-8">
            {/* Header / Filename */}
            <motion.div variants={itemVariants} className="glass-card p-8 flex items-center justify-between border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Layers size={24} className="text-primary-light" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{resume?.fileName || "Analysis Report"}</h2>
                  <p className="text-muted text-xs font-medium">ATS Strategy Optimized • AI-Generated Feedback</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary-light" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary-light">Secure Node</span>
              </div>
            </motion.div>

            {/* AI Feedback Section */}
            {resume?.feedback && (
              <motion.div variants={itemVariants} className="glass-card p-8 border-primary/20 bg-primary/5 relative">
                <div className="absolute -top-3 left-8">
                  <span className="badge-premium !bg-primary !text-white flex items-center gap-2 shadow-lg shadow-primary/40 leading-none py-2">
                    <Brain size={12} /> Nebius Intelligence
                  </span>
                </div>
                <div className="mt-4 prose prose-invert max-w-none">
                  <div className="text-muted leading-relaxed text-[15px] space-y-4 whitespace-pre-wrap">
                    {resume.feedback}
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-accent-light px-3 py-1.5 rounded-lg bg-accent/5 border border-accent/10">
                    <Award size={14} /> Optimization Ready
                  </div>
                  <span className="text-[10px] uppercase font-bold text-muted tracking-widest">Model: LLaMA 3.1 70B</span>
                </div>
              </motion.div>
            )}

            {/* Pending Feedback */}
            {!resume?.feedback && status === "COMPLETED" && (
              <motion.div variants={itemVariants} className="glass-card p-12 text-center border-dashed border-white/10 bg-white/[0.01]">
                <div className="spinner !w-12 !h-12 border-4 mb-6 mx-auto opacity-50" />
                <h3 className="text-xl font-bold mb-2">Generating Strategic Insights</h3>
                <p className="text-muted text-sm max-w-sm mx-auto font-medium">
                  We're finalizing your personalized career path based on the detected skill matrix. This usually takes 5-10 seconds.
                </p>
              </motion.div>
            )}

            {/* Skills Radar and Learn Section */}
            <div className="grid md:grid-cols-2 gap-8">
              {radarData.length > 0 && (
                <motion.div variants={itemVariants} className="glass-card p-8 border-white/5">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Target size={18} className="text-primary-light" /> Skill Radar
                  </h3>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis 
                          dataKey="skill" 
                          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600 }} 
                        />
                        <Radar
                          name="Competency"
                          dataKey="hasSkill"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.15}
                          strokeWidth={2}
                          animationDuration={1500}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {analyticsOverview?.topMissingSkills?.length > 0 && (
                <motion.div variants={itemVariants} className="glass-card p-8 border-white/5">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <TrendingUp size={18} className="text-secondary-light" /> Top Market Demands
                  </h3>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsOverview.topMissingSkills.slice(0, 6)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="skill" 
                          type="category" 
                          width={90} 
                          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.02)" }}
                          contentStyle={{ 
                            background: "#16161f", 
                            border: "1px solid rgba(255,255,255,0.1)", 
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold"
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="url(#premiumBarGrad)" 
                          radius={[0, 4, 4, 0]} 
                          barSize={12}
                        />
                        <defs>
                          <linearGradient id="premiumBarGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Skills Detail Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Present Skills */}
              <motion.div variants={itemVariants} className="glass-card p-8 border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CheckCircle size={18} className="text-accent-light" /> Verified Assets
                  </h3>
                  <span className="text-[10px] font-bold text-muted bg-white/5 px-2 py-1 rounded">
                    {presentSkills.length} SKILLS
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {presentSkills.map((skill: string, idx: number) => (
                    <motion.span 
                      key={skill} 
                      whileHover={{ scale: 1.05 }}
                      className="skill-chip skill-chip-present"
                    >
                      {skill}
                    </motion.span>
                  ))}
                  {presentSkills.length === 0 && (
                    <div className="w-full py-8 text-center text-muted text-xs italic opacity-50">
                      Discovery in progress...
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Missing Skills */}
              <motion.div variants={itemVariants} className="glass-card p-8 border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <XCircle size={18} className="text-red-400" /> Improvement Vector
                  </h3>
                  <span className="text-[10px] font-bold text-muted bg-white/5 px-2 py-1 rounded">
                    {skillGap.length} MISSING
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skillGap.map((skill: string) => (
                    <motion.span 
                      key={skill} 
                      whileHover={{ scale: 1.05 }}
                      className="skill-chip skill-chip-missing"
                    >
                      {skill}
                    </motion.span>
                  ))}
                  {skillGap.length === 0 && status === "COMPLETED" && (
                    <div className="w-full py-10 flex flex-col items-center justify-center text-accent-light gap-2">
                      <Sparkles size={24} />
                      <p className="text-xs font-bold uppercase tracking-widest">Perfect Match Synergy</p>
                    </div>
                  )}
                   {skillGap.length === 0 && status !== "COMPLETED" && (
                    <div className="w-full py-8 text-center text-muted text-xs italic opacity-50">
                      Calculating gaps...
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Global Context Summary */}
            {analyticsOverview && (
              <motion.div variants={itemVariants} className="glass-card p-1 pb-1 border-white/5 overflow-hidden">
                <div className="bg-white/[0.01] p-8 rounded-[22px]">
                   <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <BarChart2 size={18} className="text-primary-light" /> System Intelligence Overview
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { label: "Total Data Points", value: analyticsOverview.totalResumes, icon: Layers, color: "text-primary-light" },
                      { label: "Aggregate Match", value: `${Math.round(analyticsOverview.avgScore)}%`, icon: Target, color: "text-accent-light" },
                      { label: "Market Volatility", value: "Low", icon: Zap, color: "text-secondary-light" },
                    ].map((s) => (
                      <div key={s.label} className="p-6 rounded-2xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4 mb-3">
                          <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${s.color}`}>
                            <s.icon size={16} />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{s.label}</p>
                        </div>
                        <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
