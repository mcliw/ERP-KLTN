# --- Stage 1: Build ---
FROM node:22-alpine AS build-stage
WORKDIR /app

# 1. Cài đặt pnpm
RUN npm install -g pnpm

# 2. Cấu hình pnpm để tạo node_modules phẳng (Khắc phục lỗi MODULE_NOT_FOUND)
RUN pnpm config set shamefully-hoist true

# 3. Copy file định nghĩa package
COPY package.json ./

# 4. Cài đặt dependencies
# Sử dụng --no-frozen-lockfile vì file lock nằm ở root monorepo
RUN pnpm install --no-frozen-lockfile

# 5. Copy toàn bộ mã nguồn (Lúc này .dockerignore sẽ giúp không copy node_modules rác)
COPY . .

# 6. Build production
RUN pnpm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine
COPY --from=build-stage /app/dist /usr/share/nginx/html
# (Tùy chọn) Nếu bạn có file config riêng cho Nginx
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]