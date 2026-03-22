import dotenv from "dotenv";
import path from "path";
import nlp from "compromise";
import { createConsumer, publishEvent, TOPICS } from "@resume-analyser/kafka";
import { prisma } from "@resume-analyser/db";
import type { EmbeddingsGeneratedEvent, SkillExtractedEvent } from "@resume-analyser/types";

dotenv.config({ path: path.join(__dirname, "../.env") });

// Comprehensive tech skill keyword dictionary
const SKILL_KEYWORDS = [
  // Languages
  "javascript", "typescript", "python", "java", "go", "rust", "c++", "c#", "ruby", "php",
  "swift", "kotlin", "scala", "r", "matlab",
  // Frontend
  "react", "next.js", "vue", "angular", "svelte", "html", "css", "tailwind",
  "redux", "graphql", "apollo",
  // Backend
  "node.js", "express", "fastapi", "django", "flask", "spring boot", "nestjs",
  "rest api", "grpc", "websocket",
  // Databases
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "clickhouse",
  "cassandra", "dynamodb", "sqlite",
  // Cloud & DevOps
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
  "ci/cd", "github actions", "jenkins",
  // AI/ML
  "machine learning", "deep learning", "nlp", "pytorch", "tensorflow", "scikit-learn",
  "llm", "transformers", "langchain",
  // Other
  "kafka", "rabbitmq", "microservices", "system design", "agile", "scrum",
  "git", "linux", "bash", "sql", "nosql",
];

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found = new Set<string>();

  for (const skill of SKILL_KEYWORDS) {
    if (lowerText.includes(skill.toLowerCase())) {
      found.add(skill);
    }
  }

  // NER via compromise
  const doc = nlp(text);
  const nouns = doc.nouns().out("array") as string[];
  for (const noun of nouns) {
    const lower = noun.toLowerCase().trim();
    if (SKILL_KEYWORDS.includes(lower) && lower.length > 1) {
      found.add(lower);
    }
  }

  return Array.from(found);
}

async function extractAndStoreSkills(payload: EmbeddingsGeneratedEvent): Promise<void> {
  const candidate = payload as unknown as { resumeVector?: unknown; skills?: unknown };
  if (!Array.isArray(candidate.resumeVector) || Array.isArray(candidate.skills)) {
    return;
  }

  const { resumeId, userId, jobId } = payload;
  console.log(`[SkillExtractor] Extracting skills for resume ${resumeId}`);

  try {
    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume?.parsedText) throw new Error("No parsed text found");

    const skillNames = extractSkills(resume.parsedText);

    for (const name of skillNames) {
      const skill = await prisma.skill.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await prisma.resumeSkill.upsert({
        where: { resumeId_skillId: { resumeId, skillId: skill.id } },
        create: { resumeId, skillId: skill.id },
        update: {},
      });
    }

    await prisma.resume.update({ where: { id: resumeId }, data: { status: "SKILL_EXTRACTED" } });

    const event: SkillExtractedEvent = { resumeId, userId, skills: skillNames, jobId };
    await publishEvent(TOPICS.SKILL_EXTRACTED, event as unknown as Record<string, unknown>);
    console.log(`[SkillExtractor] ✅ Found ${skillNames.length} skills for ${resumeId}`);
  } catch (err) {
    console.error(`[SkillExtractor] ❌ Error:`, err);
    await prisma.resume.update({ where: { id: resumeId }, data: { status: "FAILED" } });
  }
}

async function main() {
  console.log("[SkillExtractor Service] Starting...");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}skill-extractor`,
    TOPICS.EMBEDDINGS_GENERATED,
    (payload) => extractAndStoreSkills(payload as unknown as EmbeddingsGeneratedEvent)
  );
  console.log("[SkillExtractor Service] ✅ Listening for embeddings_generated events");
}

main().catch(console.error);
