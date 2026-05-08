"""
ITER TIC - Schemas Pydantic para Autenticação e RBAC

Validação de entrada e saída das rotas de autenticação.
"""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Payload de entrada para login (email + senha)."""
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    """Resposta de sucesso do login com token JWT."""
    access_token: str
    token_type: str = "bearer"
    usuario: "UsuarioResponse"


class UsuarioResponse(BaseModel):
    """Dados públicos do usuário retornados junto ao token e na rota /me."""
    id: int
    nome: str
    email: str
    role: str
    is_active: bool
    servidor_id: int | None = None

    model_config = {"from_attributes": True}


class UsuarioMeResponse(BaseModel):
    """Resposta detalhada da rota /auth/me com dados do servidor vinculado."""
    id: int
    nome: str
    email: str
    role: str
    is_active: bool
    servidor: "ServidorResumo | None" = None

    model_config = {"from_attributes": True}


class ServidorResumo(BaseModel):
    """Resumo do servidor vinculado ao usuário."""
    id: int
    nome: str
    matricula: str
    cargo: str
    lotacao: str

    model_config = {"from_attributes": True}
