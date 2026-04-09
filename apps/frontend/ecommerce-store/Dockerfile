# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app

# 1. Cài đặt pnpm
RUN npm install -g pnpm

# 2. ÉP pnpm tạo cấu trúc node_modules phẳng (Giải quyết lỗi MODULE_NOT_FOUND)
RUN pnpm config set shamefully-hoist true

# 3. Copy file định nghĩa package
COPY package.json ./

# 4. Cài đặt dependencies
RUN pnpm install --no-frozen-lockfile

# 5. Copy toàn bộ mã nguồn (Lưu ý: .dockerignore sẽ chặn copy node_modules rác)
COPY . .

# 6. Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm run build

# --- Stage 2: Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy kết quả build từ stage builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Chạy bằng npm start hoặc node trực tiếp
CMD ["npm", "start"]