from fastapi import FastAPI
from app.database import engine, Base
from app.api import routes
import uvicorn

# Tạo bảng trong DB nếu chưa có
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Face Attendance System Thesis")

app.include_router(routes.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Hệ thống chấm công đã sẵn sàng!"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)