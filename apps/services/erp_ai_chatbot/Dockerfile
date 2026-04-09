# Sử dụng Python Slim để image nhẹ và bảo mật
FROM python:3.11-slim

# Ngăn Python tạo ra các file .pyc và cho phép log hiển thị ngay lập tức
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Cài đặt các thư viện hệ thống cần thiết (nếu có dùng thư viện toán học/ML)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 1. Copy file requirements trước để tận dụng Docker cache
COPY requirements.txt .

# 2. Cài đặt dependencies (Dùng cache mount để nhanh hơn nếu build nhiều lần)
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -r requirements.txt

# 3. Copy toàn bộ mã nguồn
COPY . .

# Expose port mặc định của FastAPI/Uvicorn
EXPOSE 8000

# Chạy ứng dụng bằng uvicorn
# --host 0.0.0.0 để lắng nghe từ bên ngoài container
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]