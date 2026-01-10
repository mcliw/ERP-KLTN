import os
from urllib.parse import urlparse
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_KEYS = [
    "SALE_CRM_DATABASE_URL",
    "HRM_DATABASE_URL",
    "FINANCE_DATABASE_URL",
    "SUPPLY_CHAIN_DATABASE_URL",
]

def parse_db(url: str):
    u = urlparse(url.replace("postgresql+psycopg2", "postgresql"))
    return {
        "user": u.username,
        "password": u.password,
        "host": u.hostname,
        "port": u.port or 5432,
        "db": u.path.lstrip("/"),
    }

def ensure_db(conn, dbname: str):
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (dbname,))
    exists = cur.fetchone() is not None
    if not exists:
        cur.execute(f'CREATE DATABASE "{dbname}"')
        print(f"Created database: {dbname}")
    else:
        print(f"Database exists: {dbname}")
    cur.close()

def main():
    urls = [os.getenv(k) for k in DB_KEYS]
    if any(u is None for u in urls):
        raise RuntimeError("Thiếu DB URL trong .env")

    dbs = [parse_db(u) for u in urls]
    # connect to default postgres database to create other dbs
    first = dbs[0]
    conn = psycopg2.connect(
        host=first["host"],
        port=first["port"],
        user=first["user"],
        password=first["password"],
        dbname="postgres",
    )
    try:
        for d in dbs:
            ensure_db(conn, d["db"])
    finally:
        conn.close()

if __name__ == "__main__":
    main()
