import dotenv from "dotenv";
import path from "path";
import axios from "axios";
import Redis from "ioredis";
import { createConsumer, publishEvent, TOPICS } from "@resume-analyser/kafka";
import { prisma } from "@resume-analyser/db";
import type {
  ResumeParsedEvent,
  EmbeddingsGeneratedEvent,
  NebiusEmbeddingResponse,
} from "@resume-analyser/types";

dotenv.config({ path: path.join(__dirname, "../.env") });

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 20000);

async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = `embed:${Buffer.from(text.slice(0, 200)).toString("base64")}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as number[];

  const response = await axios.post<NebiusEmbeddingResponse>(
    `${process.env.NEBIUS_BASE_URL}/embeddings`,
    {
      model: process.env.NEBIUS_EMBED_MODEL || "BAAI/bge-en-icl",
      input: text.slice(0, 8000), // Token limit guard
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: HTTP_TIMEOUT_MS,
    }
  );

  const vector = response.data.data[0].embedding;
  await redis.setex(cacheKey, 86400, JSON.stringify(vector)); // Cache 24h
  return vector;
}

async function embedResume(payload: ResumeParsedEvent): Promise<void> {
  if (!payload || typeof (payload as { parsedText?: unknown }).parsedText !== "string") {
    return;
  }

  const { resumeId, userId, parsedText, jobId } = payload;
  console.log(`[Embedder] Generating embedding for resume ${resumeId}`);

  try {
    await prisma.resume.update({ where: { id: resumeId }, data: { status: "EMBEDDING" } });

    const resumeVector = await generateEmbedding(parsedText);

    await prisma.resume.update({
      where: { id: resumeId },
      data: { resumeVector, status: "EMBEDDED" },
    });

    const event: EmbeddingsGeneratedEvent = { resumeId, userId, resumeVector, jobId };
    await publishEvent(TOPICS.EMBEDDINGS_GENERATED, event as unknown as Record<string, unknown>);
    console.log(`[Embedder] ✅ Embedding for resume ${resumeId} stored`);
  } catch (err) {
    console.error(`[Embedder] ❌ Error embedding ${resumeId}:`, err);
    await prisma.resume.update({ where: { id: resumeId }, data: { status: "FAILED" } });
  }
}

async function main() {
  console.log("[Embedder Service] Starting...");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}embedder`,
    TOPICS.RESUME_PARSED,
    (payload) => embedResume(payload as unknown as ResumeParsedEvent)
  );
  console.log("[Embedder Service] ✅ Listening for resume_parsed events");
}

main().catch(console.error);
