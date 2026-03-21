import { prisma } from "@resume-analyser/db";
import { GraphQLContext } from "./index";

export const analyticsResolvers = {
  Query: {
    getAnalyticsOverview: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const [totalResumes, matchResults] = await Promise.all([
        prisma.resume.count({ where: { userId: ctx.user.id } }),
        prisma.matchResult.findMany({
          where: { resume: { userId: ctx.user.id } },
          select: { score: true, skillGap: true },
        }),
      ]);

      const avgScore =
        matchResults.length > 0
          ? matchResults.reduce((sum, m) => sum + m.score, 0) / matchResults.length
          : 0;

      // Aggregate skill gaps
      const skillMap: Record<string, number> = {};
      for (const m of matchResults) {
        for (const skill of m.skillGap) {
          skillMap[skill] = (skillMap[skill] ?? 0) + 1;
        }
      }
      const topMissingSkills = Object.entries(skillMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      return { totalResumes, avgScore, topMissingSkills };
    },
  },
};
