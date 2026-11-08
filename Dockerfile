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
# yt-dlp được cài sẵn trong image (không cài lại khi khởi động). Muốn ghim phiên bản: đặt biến YTDLP_VERSION
# (vd 2026.01.01 trên Render > Environment, hoặc --build-arg). Để trống = bản mới nhất lúc build.
ARG YTDLP_VERSION=
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
  && pip3 install --break-system-packages --no-cache-dir --pre "yt-dlp[default]${YTDLP_VERSION:+==$YTDLP_VERSION}" bgutil-ytdlp-pot-provider \
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
# Chạy nền máy chủ PO Token (cổng 4416, plugin yt-dlp tự tìm tới) rồi khởi động app ngay, không chờ cập nhật.
# YouTube đổi liên tục: khi tải lỗi, redeploy (hoặc đổi YTDLP_VERSION) để build lại yt-dlp mới.
CMD ["sh", "-c", "node /opt/pot/build/main.js >/dev/null 2>&1 & exec node src/index.js"]
