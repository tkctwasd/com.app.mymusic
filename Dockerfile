# Image chạy cả backend + frontend đã build (dùng cho Render/Koyeb/Fly...)
FROM node:22-slim AS web
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
  && pip3 install --break-system-packages --no-cache-dir --pre -U "yt-dlp[default]" \
  && rm -rf /var/lib/apt/lists/*
# YouTube bắt yt-dlp chạy JS để giải mã player -> cần Deno, thiếu là lỗi "Failed to extract any player response"
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=web /app/web/dist /app/web/dist
ENV PORT=3000
EXPOSE 3000
# YouTube đổi liên tục: cập nhật yt-dlp mỗi lần khởi động (lỗi mạng thì vẫn chạy bản có sẵn)
CMD ["sh", "-c", "timeout 60 pip3 install -q --break-system-packages --no-cache-dir --pre -U \"yt-dlp[default]\" || true; exec node src/index.js"]
