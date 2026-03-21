"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, gql } from "@apollo/client";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, Upload, FileText, Briefcase, Loader2, CheckCircle, AlertCircle, CloudUpload } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CREATE_JOB = gql`
  mutation CreateJob($title: String!, $company: String, $description: String!) {
    createJob(title: $title, company: $company, description: $description) { id }
  }
`;

const UPLOAD_RESUME = gql`
  mutation UploadResume($fileUrl: String!, $fileName: String!) {
    uploadResume(fileUrl: $fileUrl, fileName: $fileName) { id }
  }
`;

const ANALYZE_RESUME = gql`
  mutation AnalyzeResume($resumeId: ID!, $jobId: ID!) {
    analyzeResume(resumeId: $resumeId, jobId: $jobId) { resumeId status }
  }
`;

type Step = "idle" | "uploading" | "parsing" | "analyzing" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [resumeId, setResumeId] = useState("");

  const [createJob] = useMutation(CREATE_JOB);
  const [uploadResumeMutation] = useMutation(UPLOAD_RESUME);
  const [analyzeResume] = useMutation(ANALYZE_RESUME);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleSubmit = async () => {
    if (!file || !jobDescription) return;
    setError("");
    setStep("uploading");

    try {
      // 1. Upload to Supabase
      const token = localStorage.getItem("auth_token");
      let fileUrl = "";
      
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "resumes")
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(data.path);
        fileUrl = urlData.publicUrl;
      } else {
        // Mock URL for dev without Supabase
        fileUrl = `mock://resume/${file.name}`;
      }

      setStep("parsing");

      // 2. Create resume record + job
      const [uploadResult, jobResult] = await Promise.all([
        uploadResumeMutation({ variables: { fileUrl, fileName: file.name } }),
        createJob({ variables: { title: jobTitle || "Target Job", company: jobCompany, description: jobDescription } }),
      ]);

      const rId = uploadResult.data?.uploadResume?.id;
      const jId = jobResult.data?.createJob?.id;
      setResumeId(rId);

      setStep("analyzing");

      // 3. Trigger analysis pipeline
      await analyzeResume({ variables: { resumeId: rId, jobId: jId } });

      setStep("done");
      setTimeout(() => router.push(`/dashboard/${rId}`), 1500);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const stepLabels: Record<Step, string> = {
    idle: "",
    uploading: "Uploading resume to secure storage...",
    parsing: "Extracting and parsing resume text...",
    analyzing: "Running AI analysis pipeline...",
    done: "Analysis started! Redirecting to dashboard...",
    error: error,
  };

  const isProcessing = ["uploading", "parsing", "analyzing"].includes(step);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Nav */}
      <nav className="navbar">
        <div className="container flex items-center justify-between" style={{ padding: "18px 24px" }}>
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, background: "var(--gradient-primary)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={20} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              Resume<span className="text-gradient">AI</span>
            </span>
          </Link>
          <Link href="/auth" className="btn-secondary" style={{ padding: "8px 20px", fontSize: 14 }}>Sign In</Link>
        </div>
      </nav>

      <div className="container" style={{ padding: "48px 24px", maxWidth: 760 }}>
        <div className="text-center" style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>
            Analyze Your <span className="text-gradient">Resume</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
            Upload your PDF resume and paste a job description to get AI-powered insights
          </p>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          {/* File Upload */}
          <div className="glass-card">
            <h3 className="flex items-center gap-2" style={{ marginBottom: 20 }}>
              <FileText size={18} color="var(--purple-light)" /> Step 1: Upload Resume
            </h3>
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? "active" : ""}`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div>
                  <CheckCircle size={40} color="var(--teal)" style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>{file.name}</p>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
                    {(file.size / 1024).toFixed(0)} KB · Click to replace
                  </p>
                </div>
              ) : (
                <div>
                  <CloudUpload size={48} color="var(--purple)" style={{ margin: "0 auto 16px", opacity: 0.7 }} />
                  <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
                    {isDragActive ? "Drop your PDF here" : "Drag & drop your PDF resume"}
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                    or click to browse · PDF only · max 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="glass-card">
            <h3 className="flex items-center gap-2" style={{ marginBottom: 20 }}>
              <Briefcase size={18} color="var(--blue-light)" /> Step 2: Job Description
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                  Job Title
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                  Company (optional)
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Acme Corp"
                  value={jobCompany}
                  onChange={(e) => setJobCompany(e.target.value)}
                />
              </div>
            </div>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
              Job Description *
            </label>
            <textarea
              className="input-field"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              style={{ minHeight: 200 }}
            />
          </div>

          {/* Status / Error */}
          {step !== "idle" && (
            <div
              className="glass-card"
              style={{
                padding: "20px 24px",
                borderColor: step === "error" ? "rgba(239,68,68,0.3)" : step === "done" ? "rgba(20,184,166,0.3)" : "var(--border-hover)",
              }}
            >
              <div className="flex items-center gap-3">
                {step === "error" ? (
                  <AlertCircle size={20} color="#f87171" />
                ) : step === "done" ? (
                  <CheckCircle size={20} color="#5eead4" />
                ) : (
                  <div className="spinner" />
                )}
                <p style={{
                  fontSize: 14,
                  color: step === "error" ? "#fca5a5" : step === "done" ? "#5eead4" : "var(--text-secondary)"
                }}>
                  {stepLabels[step]}
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", fontSize: 16, padding: "16px" }}
            onClick={handleSubmit}
            disabled={!file || !jobDescription || isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Processing...
              </>
            ) : (
              <>
                <Upload size={18} />
                Start AI Analysis
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
