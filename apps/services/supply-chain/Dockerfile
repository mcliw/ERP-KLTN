# Sử dụng tag đơn giản và chắc chắn tồn tại
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy file cấu hình module trước
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy mã nguồn và build
COPY backend/ . 
RUN go build -o main .

# Stage chạy (Runtime) cực nhẹ
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .

# Các biến môi trường nên để ở docker-compose.yml, 
# nhưng nếu cần ở đây thì khai báo đúng:
ENV MINIO_SERVER_ACCESS_KEY=minioadmin

EXPOSE 8080
CMD ["./main"]