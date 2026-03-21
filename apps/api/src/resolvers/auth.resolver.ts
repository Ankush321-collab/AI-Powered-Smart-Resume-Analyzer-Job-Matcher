import { prisma } from "@resume-analyser/db";
import { createClient } from "@supabase/supabase-js";
import { GraphQLContext } from "./index";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase env is missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  }

  return createClient(url, serviceKey);
}

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        include: { resumes: true },
      });
      if (!user) throw new Error("User not found");
      return {
        ...user,
        resumes: user.resumes.map((r) => ({ ...r, skills: [], matchResults: [], createdAt: r.createdAt.toISOString() })),
        createdAt: user.createdAt.toISOString(),
      };
    },
  },

  Mutation: {
    signUp: async (
      _: unknown,
      { email, password, name }: { email: string; password: string; name?: string }
    ) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);

      // Also store in our Postgres
      const user = await prisma.user.upsert({
        where: { email },
        create: { id: data.user.id, email, name },
        update: { name },
        include: { resumes: true },
      });

      // Sign in to get token
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError || !signInData.session) throw new Error("Could not sign in after registration");

      return {
        token: signInData.session.access_token,
        user: {
          ...user,
          resumes: [],
          createdAt: user.createdAt.toISOString(),
        },
      };
    },

    signIn: async (
      _: unknown,
      { email, password }: { email: string; password: string }
    ) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw new Error("Invalid credentials");

      const user = await prisma.user.upsert({
        where: { email },
        create: { id: data.user.id, email },
        update: {},
        include: { resumes: true },
      });

      return {
        token: data.session.access_token,
        user: {
          ...user,
          resumes: [],
          createdAt: user.createdAt.toISOString(),
        },
      };
    },
  },
};
