import dotenv from "dotenv";
import path from "path";
import axios from "axios";
import Redis from "ioredis";
import { createConsumer } from "@resume-analyser/kafka";
import { prisma } from "@resume-analyser/db";
import { TOPICS } from "@resume-analyser/kafka";
import type { MatchCompletedEvent, NebiusChatResponse } from "@resume-analyser/types";

dotenv.config({ path: path.join(__dirname, "../.env") });

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function generateFeedback(
  parsedText: string,
  jobDescription: string,
  skillGap: string[]
): Promise<string> {
  const systemPrompt = `You are an expert resume coach and ATS optimization specialist. 
Analyze the resume and job description, then provide:
1. 3-5 specific resume bullet improvements
2. Missing keywords to add for ATS
3. Structural tips
Keep responses concise and actionable.`;

  const userPrompt = `
RESUME TEXT:
${parsedText.slice(0, 3000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 1500)}

SKILL GAPS DETECTED:
${skillGap.join(", ")}

Provide targeted, personalized feedback to improve this resume for the job.`;

  const response = await axios.post<NebiusChatResponse>(
    `${process.env.NEBIUS_BASE_URL}/chat/completions`,
    {
      model: process.env.NEBIUS_LLM_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content;
}

async function processFeedback(payload: MatchCompletedEvent): Promise<void> {
  const { resumeId, jobId, skillGap } = payload;
  console.log(`[Feedback] Generating AI feedback for resume ${resumeId}`);

  // Check cache
  const cacheKey = `feedback:${resumeId}:${jobId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log(`[Feedback] Using cached feedback for ${resumeId}`);
    return;
  }

  try {
    const [resume, job] = await Promise.all([
      prisma.resume.findUnique({ where: { id: resumeId } }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ]);

    if (!resume?.parsedText || !job?.description) {
      throw new Error("Missing resume text or job description");
    }

    const feedback = await generateFeedback(resume.parsedText, job.description, skillGap);

    await prisma.resume.update({
      where: { id: resumeId },
      data: { feedback },
    });

    // Cache for 12 hours
    await redis.setex(cacheKey, 43200, feedback);
    console.log(`[Feedback] ✅ AI feedback generated and saved for resume ${resumeId}`);
  } catch (err) {
    console.error(`[Feedback] ❌ Error generating feedback:`, err);
  }
}

async function main() {
  console.log("[Feedback Service] Starting...");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}feedback`,
    TOPICS.MATCH_COMPLETED,
    (payload) => processFeedback(payload as unknown as MatchCompletedEvent)
  );
  console.log("[Feedback Service] ✅ Listening for match_completed events");
}

main().catch(console.error);
