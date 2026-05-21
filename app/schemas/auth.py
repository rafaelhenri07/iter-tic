"""
ITER TIC - Schemas Pydantic para Autenticação e RBAC

Validação de entrada e saída das rotas de autenticação.
Login via matrícula institucional com fluxos de ativação e recuperação.
"""

from pydantic import BaseModel, EmailStr, field_validator
import re


class LoginRequest(BaseModel):
    """Payload de entrada para login (matrícula + senha)."""
    matricula: str
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
    matricula: str | None = None
    role: str
    is_active: bool
    servidor_id: int | None = None

    model_config = {"from_attributes": True}


class UsuarioMeResponse(BaseModel):
    """Resposta detalhada da rota /auth/me com dados do servidor vinculado."""
    id: int
    nome: str
    email: str
    matricula: str | None = None
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


class DefinirSenhaRequest(BaseModel):
    """Payload para definição de senha (ativação ou reset)."""
    token: str
    nova_senha: str

    @field_validator("nova_senha")
    @classmethod
    def validar_senha_forte(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("A senha deve ter no mínimo 8 caracteres.")
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("A senha deve conter pelo menos 1 letra.")
        if not re.search(r"[0-9]", v):
            raise ValueError("A senha deve conter pelo menos 1 número.")
        if not re.search(r"[^a-zA-Z0-9]", v):
            raise ValueError("A senha deve conter pelo menos 1 caractere especial (ex: @, #, $, !).")
        return v


class EsqueciSenhaRequest(BaseModel):
    """Payload para solicitação de recuperação de senha."""
    matricula: str


class MensagemResponse(BaseModel):
    """Resposta genérica sem dados sensíveis (anti-enumeração)."""
    mensagem: str
