from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days (prevents constant worker logouts)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    # ROBAWS API
    ROBAWS_API_KEY: str = ""
    ROBAWS_API_SECRET: str = ""
    
    # Billtobox Email Method
    BILLTOBOX_IMPORT_EMAIL: str = "10277046@out.billtobox.be"
    BILLTOBOX_EMAIL_SUBJECT: str = "fe0fa387-d6bd-4374-8e31-480f760ff52f"
    
    # SMTP Settings
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    
    # Google Maps
    GOOGLE_MAPS_API_KEY: str = ""
    
    # App
    APP_NAME: str = "Pontaj Digital"
    APP_VERSION: str = "1.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
