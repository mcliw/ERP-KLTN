#!/bin/bash

# 1. Chạy Backend API (FastAPI) ở chế độ nền (&)
# Log sẽ được đẩy ra console chung
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# 2. Chờ 5 giây để API khởi động xong (tùy chọn, cho chắc chắn)
sleep 5

# 3. Chạy Frontend (Streamlit)
# --server.address 0.0.0.0 để có thể truy cập từ bên ngoài container
streamlit run frontend_app.py --server.port 8501 --server.address 0.0.0.0