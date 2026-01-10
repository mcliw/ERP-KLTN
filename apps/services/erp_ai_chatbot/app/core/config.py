import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    HRM_DATABASE_URL = os.getenv("HRM_DATABASE_URL")
    SALE_CRM_DATABASE_URL = os.getenv("SALE_CRM_DATABASE_URL")
    FINANCE_DATABASE_URL = os.getenv("FINANCE_DATABASE_URL")
    SUPPLY_CHAIN_DATABASE_URL = os.getenv("SUPPLY_CHAIN_DATABASE_URL")

    # Gemini
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

settings = Settings()
