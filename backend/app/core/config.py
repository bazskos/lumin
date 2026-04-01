from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "lumin thesis"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "sqlite:///./learning_app.db"
    GROQ_API_KEY: str | None = None
    ADMIN_SECRET_KEY: str
    ADMIN_USERNAME: str | None = None
    ADMIN_PASSWORD: str | None = None
    BACKEND_CORS_ORIGINS: str | None = None
    BACKEND_MAX_UPLOAD_MB: int = 10

    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True,
        extra="ignore" 
    )

settings = Settings()