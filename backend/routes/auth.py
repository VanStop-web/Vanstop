"""
routes/auth.py
==============
Endpoints de autenticação do VanStop.

Rotas disponíveis:
    POST /api/register  — Cadastro de novo motorista via Supabase Auth
    POST /api/login     — Login e obtenção de sessão JWT

Rate limiting:
    - POST /api/login é limitado a 5 requisições/minuto por IP (anti força bruta)
    - Configurado via slowapi, herdando o limiter do app principal (main.py)
"""

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.supabase_client import supabase

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter()

# Limiter local — referencia o mesmo estado global do main.py via app.state.limiter
limiter = Limiter(key_func=get_remote_address)


# ── Schemas Pydantic ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """Payload para cadastro de um novo motorista."""
    nome: str
    email: EmailStr
    senha: str

    @field_validator("nome")
    @classmethod
    def nome_nao_vazio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("O nome não pode estar em branco.")
        return v.strip()

    @field_validator("senha")
    @classmethod
    def senha_minima(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("A senha deve ter no mínimo 6 caracteres.")
        return v


class LoginRequest(BaseModel):
    """Payload para login de motorista existente."""
    email: EmailStr
    senha: str


# ── Responses ─────────────────────────────────────────────────────────────────

class RegisterResponse(BaseModel):
    message: str
    user_id: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str
    user: dict


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar novo motorista",
    description=(
        "Registra um novo motorista no Supabase Auth. "
        "O nome é armazenado em `raw_user_meta_data` e propagado "
        "automaticamente para a tabela `public.motoristas` via trigger."
    ),
)
async def register(payload: RegisterRequest):
    """
    POST /api/register

    Fluxo:
        1. Recebe { nome, email, senha }
        2. Chama supabase.auth.sign_up() com o nome no user_metadata
        3. O trigger `on_auth_user_created` cria o perfil em public.motoristas
        4. Retorna HTTP 201 com o user_id gerado
    """
    try:
        response = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.senha,
            "options": {
                "data": {
                    "nome": payload.nome
                }
            }
        })
    except Exception as exc:
        # Erro genérico de comunicação com o Supabase
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Erro ao comunicar com o serviço de autenticação: {str(exc)}"
        )

    # O SDK do supabase-py retorna None em `response.user` quando o e-mail já existe
    # (em vez de lançar uma exceção), então tratamos explicitamente
    if response.user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Não foi possível criar o usuário. Verifique se o e-mail já está cadastrado "
                "ou se a confirmação de e-mail está habilitada no Supabase."
            )
        )

    return RegisterResponse(
        message="Motorista registrado com sucesso. Verifique seu e-mail para confirmar o cadastro.",
        user_id=str(response.user.id)
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Autenticar motorista",
    description=(
        "Autentica o motorista com e-mail e senha. "
        "Retorna o JWT de sessão (`access_token`) para uso nas chamadas autenticadas. "
        "**Limitado a 5 tentativas por minuto por IP.**"
    ),
)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest):
    """
    POST /api/login

    Fluxo:
        1. Recebe { email, senha }
        2. Chama supabase.auth.sign_in_with_password()
        3. Em caso de erro → HTTP 401
        4. Em caso de sucesso → retorna a sessão completa com o JWT
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.senha
        })
    except Exception as exc:
        # O SDK lança exceção para credenciais inválidas
        error_message = str(exc).lower()

        if "invalid" in error_message or "credentials" in error_message or "password" in error_message:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas. Verifique seu e-mail e senha.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Qualquer outro erro (rede, Supabase indisponível, etc.)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Erro ao comunicar com o serviço de autenticação: {str(exc)}"
        )

    if response.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas ou e-mail ainda não confirmado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session = response.session
    user = response.user

    return LoginResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=session.expires_in,
        token_type="bearer",
        user={
            "id": str(user.id),
            "email": user.email,
            "nome": (user.user_metadata or {}).get("nome", ""),
            "created_at": str(user.created_at),
        }
    )
