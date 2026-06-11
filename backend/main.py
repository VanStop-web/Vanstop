"""
main.py
=======
Ponto de entrada da VanStop API.

Para rodar em desenvolvimento:
    uvicorn main:app --reload --port 8000

Para rodar em produção (Render/Railway):
    gunicorn main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT

Documentação interativa disponível em:
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from core.config import settings
from routes import auth

# ── Rate Limiter Global ───────────────────────────────────────────────────────
# O limiter é instanciado aqui e adicionado ao app.state para que os decorators
# @limiter.limit() nas rotas possam referenciar a mesma instância.

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ── Aplicação FastAPI ─────────────────────────────────────────────────────────

app = FastAPI(
    title="VanStop API",
    description=(
        "Backend do micro-SaaS **VanStop** para motoristas de van escolar. "
        "Gerencia autenticação via Supabase Auth e expõe endpoints de negócio."
    ),
    version="0.1.0",
    contact={
        "name": "VanStop Dev Team",
    },
    # Em produção, desabilite a documentação pública se necessário
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# ── Middlewares ───────────────────────────────────────────────────────────────

# 1. Rate Limiting — deve ser adicionado ANTES do CORS
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# 2. CORS — carregado dinamicamente da variável de ambiente ALLOW_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ── Roteadores ────────────────────────────────────────────────────────────────

app.include_router(
    auth.router,
    prefix="/api",
    tags=["Autenticação"],
)

# ── Endpoints Utilitários ─────────────────────────────────────────────────────

@app.get(
    "/health",
    tags=["Status"],
    summary="Health check",
    description="Verifica se a API está em funcionamento. Usado por Render/Railway para monitoramento.",
)
def health_check():
    """Retorna status OK — utilizado pelo load balancer e pelo painel de monitoramento."""
    return {
        "status": "ok",
        "service": "VanStop API",
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", include_in_schema=False)
def root():
    """Redireciona visitantes da raiz para a documentação."""
    return {"message": "VanStop API está no ar. Acesse /docs para a documentação."}
