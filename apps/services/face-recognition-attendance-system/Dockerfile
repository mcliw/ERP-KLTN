FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Cài đặt thư viện hệ thống cho OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -r requirements.txt

# --- THÊM PHẦN NÀY ---
# Copy script chạy song song
COPY run.sh .
# Cấp quyền thực thi cho script
RUN chmod +x run.sh
# ---------------------

COPY . .

# Expose cả 2 port: 8000 (API) và 8501 (Streamlit UI)
EXPOSE 8000 8501

# Thay đổi CMD để chạy script thay vì chỉ chạy uvicorn
CMD ["./run.sh"]