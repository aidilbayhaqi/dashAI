# syntax=docker/dockerfile:1.8

FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:${PATH}" \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable \
    && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app


FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile


FROM base AS builder

ARG NEXT_PUBLIC_API_URL=http://localhost:8000

ENV NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
    NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build


FROM node:24-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

RUN addgroup --system --gid 10001 app \
    && adduser \
        --system \
        --uid 10001 \
        --ingroup app \
        app

COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static

RUN mkdir -p /app/.next/cache \
    && chown -R app:app /app

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "const p=process.env.PORT||3000; fetch('http://127.0.0.1:'+p).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
