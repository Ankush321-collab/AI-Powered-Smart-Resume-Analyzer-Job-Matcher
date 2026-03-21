import { prisma } from "@resume-analyser/db";
import { GraphQLContext } from "./index";

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
      const job = await prisma.job.create({
        data: { title, company, description },
        include: { skills: { include: { skill: true } } },
      });
      return {
        ...job,
        skills: job.skills.map((js) => js.skill.name),
        createdAt: job.createdAt.toISOString(),
      };
    },
  },
};
