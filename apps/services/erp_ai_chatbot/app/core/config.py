import os
from pathlib import Path
from dotenv import load_dotenv

# luôn load đúng .env tại root project: .../erp_ai_chatbot/.env
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

class Settings:
    HRM_DATABASE_URL = os.getenv("HRM_DATABASE_URL")
    SALE_CRM_DATABASE_URL = os.getenv("SALE_CRM_DATABASE_URL")
    FINANCE_DATABASE_URL = os.getenv("FINANCE_DATABASE_URL")
    SUPPLY_CHAIN_DATABASE_URL = os.getenv("SUPPLY_CHAIN_DATABASE_URL")

    # Gemini
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

settings = Settings()
