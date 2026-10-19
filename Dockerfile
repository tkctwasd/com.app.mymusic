# Image chạy cả backend + frontend đã build (dùng cho Render/Koyeb/Fly...)
FROM node:22-slim AS web
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
  && pip3 install --break-system-packages --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=web /app/web/dist /app/web/dist
ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/index.js"]
