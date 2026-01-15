from fastapi import FastAPI
from app.api.v1.supply_chain_chat import router as supply_chain_router
from app.api.v1.hrm_chat import router as hrm_router
from app.api.v1.sale_crm_chat import router as sale_crm_router
from app.api.v1.health import router as health_router

app = FastAPI(title="ERP AI Chatbot")

app.include_router(health_router, prefix="/api/v1")
app.include_router(hrm_router, prefix="/api/v1")
app.include_router(supply_chain_router, prefix="/api/v1")
app.include_router(sale_crm_router, prefix="/api/v1")
