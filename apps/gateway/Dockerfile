# --- Stage 1: Build (Chuyển từ alpine sang bản chuẩn để tương thích Protobuf/gRPC) ---
# Sử dụng bản eclipse-temurin (thay vì alpine) để có sẵn glibc
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# 1. Copy pom.xml và tải dependencies
COPY pom.xml . 
RUN --mount=type=cache,target=/root/.m2 \
    mvn dependency:go-offline -B

# 2. Copy source code và thực hiện build
COPY src ./src
# Build sẽ thành công vì môi trường này chạy được các plugin native của Protobuf
RUN --mount=type=cache,target=/root/.m2 \
    mvn package -DskipTests -B

# --- Stage 2: Final (Tiếp tục dùng Alpine để Image nhẹ) ---
FROM eclipse-temurin:21-jre-alpine AS final
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]