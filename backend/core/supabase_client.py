"""
core/supabase_client.py
=======================
Singleton do cliente Supabase.

Centraliza a criação do client em um único ponto, garantindo que todas
as rotas compartilhem a mesma instância configurada com a service_role key.

IMPORTANTE: Este client usa a service_role key — nunca exponha-o ao front-end.
"""

from supabase import create_client, Client
from core.config import settings


def _create_client() -> Client:
    """Factory interno — cria o client Supabase com as credenciais do servidor."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise RuntimeError(
            "SUPABASE_URL e SUPABASE_KEY são obrigatórias. "
            "Verifique seu arquivo .env ou as variáveis de ambiente do servidor."
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


# Instância única compartilhada por toda a aplicação
# Importar como: from core.supabase_client import supabase
supabase: Client = _create_client()
