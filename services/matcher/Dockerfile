FROM node:18-bookworm-slim AS build

WORKDIR /app

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json turbo.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY certs/postgresql.pem /app/certs/postgresql.pem

RUN npm install
RUN npm --workspace @resume-analyser/db run generate
RUN npm run build --workspace @resume-analyser/types
RUN npm run build --workspace @resume-analyser/kafka
RUN npm run build --workspace @resume-analyser/db
RUN npm run build --workspace @resume-analyser/matcher
RUN npm prune --omit=dev

FROM node:18-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/services/matcher ./services/matcher
COPY --from=build /app/certs/postgresql.pem /app/certs/postgresql.pem

CMD ["npm", "run", "start", "--workspace", "@resume-analyser/matcher"]
