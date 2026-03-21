import dotenv from "dotenv";
import path from "path";
import axios from "axios";
import Redis from "ioredis";
import { createConsumer, publishEvent, TOPICS } from "@resume-analyser/kafka";
import { prisma } from "@resume-analyser/db";
import type { SkillExtractedEvent, MatchCompletedEvent, NebiusEmbeddingResponse } from "@resume-analyser/types";

dotenv.config({ path: path.join(__dirname, "../.env") });

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

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
    }
  );

  const vector = response.data.data[0].embedding;
  await redis.setex(cacheKey, 86400, JSON.stringify(vector));
  return vector;
}

async function writeToClickHouse(payload: MatchCompletedEvent): Promise<void> {
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
      { headers }
    );
  } catch (err) {
    console.warn("[Matcher] ClickHouse write failed (non-fatal):", (err as Error).message);
  }
}

async function matchResumes(payload: SkillExtractedEvent): Promise<void> {
  if (!payload || !Array.isArray((payload as { skills?: unknown }).skills)) {
    return;
  }

  const { resumeId, userId, skills: resumeSkills } = payload;
  console.log(`[Matcher] Running match for resume ${resumeId}`);

  try {
    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume?.parsedText) throw new Error("No parsedText for resume");

    // Get all jobs to match against
    const jobs = await prisma.job.findMany({
      include: { skills: { include: { skill: true } } },
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
      const jobVector = job.jobVector.length > 0
        ? job.jobVector
        : await generateEmbedding(job.description);

      const similarity = cosineSimilarity(resumeVector, jobVector);
      const score = Math.round(similarity * 100 * 100) / 100;
      const matchPercentage = Math.min(score, 100);

      const jobSkillNames = job.skills.map((js) => js.skill.name);
      const skillGap = jobSkillNames.filter((s) => !resumeSkills.includes(s));
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
      await writeToClickHouse(event);
      await publishEvent(TOPICS.MATCH_COMPLETED, event as unknown as Record<string, unknown>);
    }

    await prisma.resume.update({ where: { id: resumeId }, data: { status: "COMPLETED" } });
    console.log(`[Matcher] ✅ Matched resume ${resumeId} against ${jobs.length} jobs`);
  } catch (err) {
    console.error(`[Matcher] ❌ Error:`, err);
    await prisma.resume.update({ where: { id: resumeId }, data: { status: "FAILED" } });
  }
}

async function main() {
  console.log("[Matcher Service] Starting...");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}matcher`,
    TOPICS.SKILL_EXTRACTED,
    (payload) => matchResumes(payload as unknown as SkillExtractedEvent)
  );
  console.log("[Matcher Service] ✅ Listening for skill_extracted events");
}

main().catch(console.error);
