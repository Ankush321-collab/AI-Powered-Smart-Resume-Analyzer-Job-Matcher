import dotenv from "dotenv";
import http from "http";
import path from "path";
import axios from "axios";
import Redis from "ioredis";
import { createConsumer, publishEvent, TOPICS } from "@resume-analyser/kafka";
import { prisma } from "@resume-analyser/db";
import type { SkillExtractedEvent, MatchCompletedEvent, NebiusEmbeddingResponse } from "@resume-analyser/types";

dotenv.config({ path: path.join(__dirname, "../.env") });

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 20000);
const CLICKHOUSE_TIMEOUT_MS = Number(process.env.CLICKHOUSE_TIMEOUT_MS || 3000);
const CLICKHOUSE_ENABLED = process.env.CLICKHOUSE_ENABLED !== "false";

function startHealthServer(serviceName: string): void {
  const port = Number(process.env.PORT || 0);
  if (!port) return;

  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: serviceName }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[${serviceName}] Health server listening on port ${port}`);
  });
}

const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "go", "rust", "c++", "c#", "ruby", "php",
  "swift", "kotlin", "scala", "r", "matlab",
  "react", "next.js", "vue", "angular", "svelte", "html", "css", "tailwind",
  "redux", "graphql", "apollo",
  "node.js", "express", "fastapi", "django", "flask", "spring boot", "nestjs",
  "rest api", "grpc", "websocket",
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "clickhouse",
  "cassandra", "dynamodb", "sqlite",
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
  "ci/cd", "github actions", "jenkins",
  "machine learning", "deep learning", "nlp", "pytorch", "tensorflow", "scikit-learn",
  "llm", "transformers", "langchain",
  "kafka", "rabbitmq", "microservices", "system design", "agile", "scrum",
  "git", "linux", "bash", "sql", "nosql",
];

function normalizeSkill(s: string): string {
  return s.trim().toLowerCase();
}

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of SKILL_KEYWORDS) {
    if (lower.includes(skill)) found.add(skill);
  }
  return Array.from(found);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = `embed:${Buffer.from(text.slice(0, 200)).toString("base64")}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as number[];

  const response = await axios.post<NebiusEmbeddingResponse>(
    `${process.env.NEBIUS_BASE_URL}/embeddings`,
    {
      model: process.env.NEBIUS_EMBED_MODEL || "BAAI/bge-en-icl",
      input: text.slice(0, 8000),
    },
    {
      headers: { Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`, "Content-Type": "application/json" },
      timeout: HTTP_TIMEOUT_MS,
    }
  );

  const vector = response.data.data[0].embedding;
  await redis.setex(cacheKey, 86400, JSON.stringify(vector));
  return vector;
}

async function writeToClickHouse(payload: MatchCompletedEvent): Promise<void> {
  if (!CLICKHOUSE_ENABLED || !process.env.CLICKHOUSE_HOST) return;

  try {
    const body = `${payload.resumeId}\t${payload.jobId}\t${payload.userId}\t${payload.score}\t${payload.matchPercentage}\t${payload.confidence}\t${new Date().toISOString().replace("T", " ").split(".")[0]}\n`;
    
    const headers: Record<string, string> = { "Content-Type": "text/plain" };
    
    // Add Basic Auth if provided (Aiven requires this)
    if (process.env.CLICKHOUSE_USER && process.env.CLICKHOUSE_PASSWORD) {
      const auth = Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    await axios.post(
      `${process.env.CLICKHOUSE_HOST}/?query=INSERT+INTO+resume_analytics.resume_scores+(id,resume_id,job_id,user_id,score,match_pct,confidence,created_at)+FORMAT+TabSeparated`,
      `${Date.now()}\t${body}`,
      { headers, timeout: CLICKHOUSE_TIMEOUT_MS }
    );
  } catch (err) {
    console.warn("[Matcher] ClickHouse write failed (non-fatal):", (err as Error).message);
  }
}

async function matchResumes(payload: SkillExtractedEvent): Promise<void> {
  if (!payload || !Array.isArray((payload as { skills?: unknown }).skills)) {
    return;
  }

  const { resumeId, userId, skills: resumeSkills, jobId: targetJobId } = payload;
  console.log(`[Matcher] Running match for resume ${resumeId}`);

  try {
    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) {
      console.warn(`[Matcher] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }
    if (!resume.parsedText) throw new Error("No parsedText for resume");

    const maxJobs = Number(process.env.MATCHER_MAX_JOBS || "0");
    const jobs = targetJobId
      ? await prisma.job.findMany({
          where: { id: targetJobId },
          include: { skills: { include: { skill: true } } },
        })
      : await prisma.job.findMany({
          include: { skills: { include: { skill: true } } },
          ...(Number.isFinite(maxJobs) && maxJobs > 0 ? { take: maxJobs } : {}),
        });

    if (jobs.length === 0) {
      console.log(`[Matcher] No jobs found, skipping match for ${resumeId}`);
      await prisma.resume.update({ where: { id: resumeId }, data: { status: "COMPLETED" } });
      return;
    }

    const resumeVector = resume.resumeVector.length > 0
      ? resume.resumeVector
      : await generateEmbedding(resume.parsedText);

    for (const job of jobs) {
      let jobVector = job.jobVector;
      if (!jobVector || jobVector.length === 0) {
        jobVector = await generateEmbedding(job.description);
        // Persist once so future resume matches do not regenerate this embedding.
        await prisma.job.update({ where: { id: job.id }, data: { jobVector } });
      }

      const similarity = cosineSimilarity(resumeVector, jobVector);
      const score = Math.round(similarity * 100 * 100) / 100;
      const matchPercentage = Math.min(score, 100);

      const jobSkillNames = job.skills.length > 0
        ? job.skills.map((js) => js.skill.name)
        : extractSkillsFromText(job.description);

      const resumeSkillSet = new Set(resumeSkills.map(normalizeSkill));
      const skillGap = jobSkillNames
        .map(normalizeSkill)
        .filter((s, idx, arr) => arr.indexOf(s) === idx)
        .filter((s) => !resumeSkillSet.has(s));

      const confidence = jobSkillNames.length > 0
        ? 1 - skillGap.length / jobSkillNames.length
        : similarity;

      const cacheKey = `match:${resumeId}:${job.id}`;
      const matchData = { score, matchPercentage, skillGap, confidence };
      await redis.setex(cacheKey, 3600, JSON.stringify(matchData));

      await prisma.matchResult.upsert({
        where: { resumeId_jobId: { resumeId, jobId: job.id } },
        create: { resumeId, jobId: job.id, score, matchPercentage, skillGap, confidence },
        update: { score, matchPercentage, skillGap, confidence },
      });

      const event: MatchCompletedEvent = {
        resumeId, jobId: job.id, userId, score, matchPercentage, skillGap, confidence,
      };
      // Do not block core matching pipeline on analytics sink failures.
      void writeToClickHouse(event);
      await publishEvent(TOPICS.MATCH_COMPLETED, event as unknown as Record<string, unknown>);
    }

    await prisma.resume.update({ where: { id: resumeId }, data: { status: "COMPLETED" } });
    console.log(`[Matcher] ✅ Matched resume ${resumeId} against ${jobs.length} jobs`);
  } catch (err) {
    console.error(`[Matcher] ❌ Error:`, err);
    await prisma.resume
      .update({ where: { id: resumeId }, data: { status: "FAILED" } })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("[Matcher Service] Starting...");
  startHealthServer("Matcher Service");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}matcher`,
    TOPICS.SKILL_EXTRACTED,
    (payload) => matchResumes(payload as unknown as SkillExtractedEvent)
  );
  console.log("[Matcher Service] ✅ Listening for skill_extracted events");
}

main().catch(console.error);
