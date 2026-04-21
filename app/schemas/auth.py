"""
ITER TIC - Schemas Pydantic para Autenticação

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
    """Dados públicos do usuário retornados junto ao token."""
    id: int
    nome: str
    email: str
    is_active: bool

    model_config = {"from_attributes": True}
