import dotenv from "dotenv";
import { join } from "path";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { readFileSync } from "fs";
import rateLimit from "express-rate-limit";
import { resolvers } from "./resolvers";
import { authMiddleware } from "./middleware/auth";

dotenv.config({ path: join(__dirname, "../.env") });

const typeDefs = readFileSync(join(__dirname, "schema.graphql"), "utf-8");

async function main() {
  const app = express();

  app.use(
    cors({
      origin: ["http://localhost:3000", "http://localhost:3001"],
      credentials: true,
    }),
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/graphql", limiter);

  app.use(express.json({ limit: "10mb" }));

  // Build schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const server = new ApolloServer({
    schema,
    introspection: true,
  });

  await server.start();

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => {
        const user = await authMiddleware(req);
        return { user };
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const PORT = process.env.API_PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 API Gateway running at http://localhost:${PORT}/graphql`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
