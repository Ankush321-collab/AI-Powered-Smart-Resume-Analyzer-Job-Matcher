import { prisma } from "@resume-analyser/db";
import { publishEvent } from "@resume-analyser/kafka";
import { TOPICS } from "@resume-analyser/kafka";
import { cacheGet, cacheSet } from "../lib/redis";
import { GraphQLContext } from "./index";

export const resumeResolvers = {
  Query: {
    listResumes: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const resumes = await prisma.resume.findMany({
        where: { userId: ctx.user.id },
        include: { skills: { include: { skill: true } }, matchResults: true },
        orderBy: { createdAt: "desc" },
      });
      return resumes.map((r) => ({
        ...r,
        skills: r.skills.map((rs) => rs.skill.name),
        matchResults: r.matchResults,
        createdAt: r.createdAt.toISOString(),
      }));
    },

    getResume: async (_: unknown, { resumeId }: { resumeId: string }, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId },
        include: { skills: { include: { skill: true } }, matchResults: true },
      });
      if (!resume || resume.userId !== ctx.user.id) throw new Error("Resume not found");
      return {
        ...resume,
        skills: resume.skills.map((rs) => rs.skill.name),
        createdAt: resume.createdAt.toISOString(),
      };
    },
  },

  Mutation: {
    uploadResume: async (
      _: unknown,
      { fileUrl, fileName }: { fileUrl: string; fileName: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const resume = await prisma.resume.create({
        data: {
          userId: ctx.user.id,
          fileUrl,
          fileName,
          status: "UPLOADED",
        },
      });

      return {
        ...resume,
        skills: [],
        matchResults: [],
        createdAt: resume.createdAt.toISOString(),
      };
    },

    analyzeResume: async (
      _: unknown,
      { resumeId, jobId }: { resumeId: string; jobId: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
      if (!resume || resume.userId !== ctx.user.id) throw new Error("Resume not found");

      // Check cache first
      const cacheKey = `match:${resumeId}:${jobId}`;
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return { resumeId, jobId, status: "COMPLETED", message: "Retrieved from cache" };
      }

      // Emit event to trigger full pipeline
      await publishEvent(TOPICS.RESUME_UPLOADED, {
        resumeId,
        userId: ctx.user.id,
        fileUrl: resume.fileUrl,
        fileName: resume.fileName,
        jobId,
      });

      return { resumeId, jobId, status: "PROCESSING", message: "Analysis started" };
    },

    deleteResume: async (_: unknown, { resumeId }: { resumeId: string }, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
      if (!resume || resume.userId !== ctx.user.id) throw new Error("Not found");
      await prisma.resume.delete({ where: { id: resumeId } });
      return true;
    },
  },
};
