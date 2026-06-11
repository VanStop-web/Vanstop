"""
core/config.py
==============
Carrega e valida as variáveis de ambiente usando pydantic-settings.

A aplicação falhará imediatamente na inicialização se qualquer variável
obrigatória estiver ausente — prevenindo erros silenciosos em runtime.
"""

from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator
from typing import List


class Settings(BaseSettings):
    # ── Supabase ──────────────────────────────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Recebe uma string separada por vírgulas e converte para lista de origens
    ALLOW_ORIGINS: str = "http://localhost:5500,http://localhost:3000"

    # ── Ambiente ──────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"

    @property
    def parsed_origins(self) -> List[str]:
        """Converte a string ALLOW_ORIGINS em uma lista limpa de URLs."""
        return [origin.strip() for origin in self.ALLOW_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Permite que variáveis de ambiente do sistema sobrescrevam o .env
        # (comportamento correto para Render/Railway onde vars são injetadas pelo painel)
        case_sensitive = True


# Instância singleton — importada pelos demais módulos
settings = Settings()
