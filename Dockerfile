# Image chạy cả backend + frontend đã build (dùng cho Render/Koyeb/Fly...)
FROM node:22-slim AS web
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Máy chủ tạo PO Token (giả lập trình duyệt) để YouTube không chặn IP máy chủ là "bot"
FROM node:22-slim AS pot
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider /pot
WORKDIR /pot/server
RUN npm ci && npx tsc

FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
  && pip3 install --break-system-packages --no-cache-dir --pre -U "yt-dlp[default]" bgutil-ytdlp-pot-provider \
  && rm -rf /var/lib/apt/lists/*
# YouTube bắt yt-dlp chạy JS để giải mã player -> cần Deno, thiếu là lỗi "Failed to extract any player response"
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno
COPY --from=pot /pot/server /opt/pot
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=web /app/web/dist /app/web/dist
ENV PORT=3000
EXPOSE 3000
# Chạy nền máy chủ PO Token (cổng 4416, plugin yt-dlp tự tìm tới). YouTube đổi liên tục: cập nhật yt-dlp mỗi lần khởi động (lỗi mạng thì vẫn chạy bản có sẵn)
CMD ["sh", "-c", "node /opt/pot/build/main.js >/dev/null 2>&1 & timeout 60 pip3 install -q --break-system-packages --no-cache-dir --pre -U \"yt-dlp[default]\" || true; exec node src/index.js"]
