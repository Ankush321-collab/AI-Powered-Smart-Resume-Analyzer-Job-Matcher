import { prisma } from "@resume-analyser/db";
import { GraphQLContext } from "./index";

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

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of SKILL_KEYWORDS) {
    if (lower.includes(skill)) found.add(skill);
  }
  return Array.from(found);
}

export const jobResolvers = {
  Query: {
    listJobs: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const jobs = await prisma.job.findMany({
        include: { skills: { include: { skill: true } } },
        orderBy: { createdAt: "desc" },
      });
      return jobs.map((j) => ({
        ...j,
        skills: j.skills.map((js) => js.skill.name),
        createdAt: j.createdAt.toISOString(),
      }));
    },

    getResumeScore: async (
      _: unknown,
      { resumeId }: { resumeId: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const result = await prisma.matchResult.findFirst({
        where: { resumeId },
        orderBy: { createdAt: "desc" },
      });
      if (!result) throw new Error("No match result found yet");
      return { ...result, createdAt: result.createdAt.toISOString() };
    },

    getSkillGap: async (
      _: unknown,
      { resumeId, jobId }: { resumeId: string; jobId: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const matchResult = await prisma.matchResult.findUnique({
        where: { resumeId_jobId: { resumeId, jobId } },
      });
      if (!matchResult) throw new Error("Analysis not complete yet");

      const resumeSkills = await prisma.resumeSkill.findMany({
        where: { resumeId },
        include: { skill: true },
      });
      const jobSkills = await prisma.jobSkill.findMany({
        where: { jobId },
        include: { skill: true },
      });

      const present = resumeSkills.map((rs) => rs.skill.name);
      const missing = jobSkills
        .map((js) => js.skill.name)
        .filter((s) => !present.includes(s));

      return {
        present,
        missing,
        matchPercentage: matchResult.matchPercentage,
      };
    },

    matchJob: async (
      _: unknown,
      { resumeId, jobId }: { resumeId: string; jobId: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const result = await prisma.matchResult.findUnique({
        where: { resumeId_jobId: { resumeId, jobId } },
      });
      if (!result) throw new Error("Analysis not complete yet");
      return { ...result, createdAt: result.createdAt.toISOString() };
    },
  },

  Mutation: {
    createJob: async (
      _: unknown,
      { title, company, description }: { title: string; company?: string; description: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const extractedSkills = extractSkillsFromText(description);
      const job = await prisma.job.create({ data: { title, company, description } });

      for (const name of extractedSkills) {
        const skill = await prisma.skill.upsert({
          where: { name },
          create: { name },
          update: {},
        });

        await prisma.jobSkill.upsert({
          where: { jobId_skillId: { jobId: job.id, skillId: skill.id } },
          create: { jobId: job.id, skillId: skill.id },
          update: {},
        });
      }

      const hydratedJob = await prisma.job.findUnique({
        where: { id: job.id },
        include: { skills: { include: { skill: true } } },
      });

      if (!hydratedJob) throw new Error("Failed to create job");

      return {
        ...hydratedJob,
        skills: hydratedJob.skills.map((js) => js.skill.name),
        createdAt: hydratedJob.createdAt.toISOString(),
      };
    },
  },
};
