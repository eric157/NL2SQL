import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "NL2SQL Enterprise Analytics"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data", "processed")
    DB_PATH: str = os.path.join(DATA_DIR, "analytics.duckdb")

    # LLM Settings (Free tier / local friendly)
    GROQ_API_KEY: str = "REDACTED_GROQ_KEY"
    GEMINI_API_KEY: str = ""
    OLLAMA_HOST: str = "http://localhost:11434"
    LLM_MODEL: str = "mixtral-8x7b-32768"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
