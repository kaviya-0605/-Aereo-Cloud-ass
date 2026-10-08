from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from . import models
from .routes import router

from sqlalchemy import text

# Create all database tables on startup
models.Base.metadata.create_all(bind=engine)

# Ensure cert_type column exists in jobs table
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cert_type VARCHAR(50) DEFAULT 'Achievement';"))
        conn.commit()
except Exception:
    pass

app = FastAPI(
    title="Bulk Certificate Generator API",
    description="Generate personalized PDF certificates in bulk",
    version="1.0.0",
)

# CORS – allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Bulk Certificate Generator API is running"}
