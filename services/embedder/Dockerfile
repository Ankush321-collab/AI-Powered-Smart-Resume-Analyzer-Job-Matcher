FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json turbo.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages

RUN npm install
RUN npm --workspace @resume-analyser/db run generate
RUN npm run build --workspace @resume-analyser/embedder
RUN npm prune --omit=dev

FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/services/embedder ./services/embedder

CMD ["npm", "run", "start", "--workspace", "@resume-analyser/embedder"]
