# --- Stage 1: Build ---
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Cài đặt các tool cần thiết cho build
RUN apk add --no-cache git

# 1. Copy file định nghĩa module từ thư mục backend vào WORKDIR
# Đường dẫn nguồn là backend/go.mod và backend/go.sum
COPY backend/go.mod backend/go.sum ./

# 2. Tải dependencies
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# 3. Copy toàn bộ mã nguồn của thư mục backend vào WORKDIR
COPY backend/ .

# 4. Build binary
# Vì tệp main.go nằm trong thư mục cmd/server/ nên lệnh build phải trỏ vào đó
RUN --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main ./cmd/server/main.go

# --- Stage 2: Runtime ---
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]