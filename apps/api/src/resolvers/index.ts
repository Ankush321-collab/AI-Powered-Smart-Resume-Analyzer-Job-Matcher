import { AuthUser } from "../middleware/auth";
import { authResolvers } from "./auth.resolver";
import { resumeResolvers } from "./resume.resolver";
import { jobResolvers } from "./job.resolver";
import { analyticsResolvers } from "./analytics.resolver";

export interface GraphQLContext {
  user: AuthUser | null;
}

export const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...resumeResolvers.Query,
    ...jobResolvers.Query,
    ...analyticsResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...resumeResolvers.Mutation,
    ...jobResolvers.Mutation,
  },
};
