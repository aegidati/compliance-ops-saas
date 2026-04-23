"""
Application configuration loaded exclusively from environment variables.

WHY: All secrets and runtime settings must come from the environment,
never from hardcoded values. This keeps the codebase safe for version
control and supports 12-factor app principles required for compliance-grade
SaaS deployments.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central application settings.

    All fields with sensitive data use placeholder defaults so the app
    can start in development without a real secret, but fail clearly
    if a placeholder is used in production (see security.py validation).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application environment – controls log verbosity and safety checks
    app_env: str = "development"

    # JWT signing secret – MUST be overridden in production via env var
    # WHY placeholder: prevents accidental use of a weak default in prod
    secret_key: str = "CHANGE_ME_IN_PRODUCTION"

    # JWT algorithm – HS256 is standard; upgrade to RS256 when adding IdP
    algorithm: str = "HS256"

    # CORS allowed origins – comma-separated list, empty by default.
    # WHY empty default: wildcard origins are never acceptable in a
    # compliance-grade app.  Explicitly set this in production, e.g.:
    #   CORS_ORIGINS=https://app.example.com,https://admin.example.com
    cors_origins: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins as a list, filtering out empty strings."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # Token expiry in minutes
    access_token_expire_minutes: int = 60

    # ------------------------------------------------------------------
    # Bootstrap SUPERADMIN credentials (Control Plane only)
    # WHY: A single, globally-known admin is required to bootstrap the
    # tenant registry.  Credentials come from env, never from code.
    # In production these vars MUST be set via secrets manager / CI/CD.
    # ------------------------------------------------------------------
    superadmin_username: str = "superadmin"

    # Store a bcrypt hash of the password here, never the plaintext.
    # Generate with: python -c "from passlib.hash import bcrypt; print(bcrypt.hash('yourpassword'))"
    # Placeholder hash corresponds to NO valid password – forces override.
    superadmin_password_hash: str = "REPLACE_WITH_BCRYPT_HASH"


# Module-level singleton – importable throughout the application
settings = Settings()
