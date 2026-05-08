"""
ITER TIC - Schemas Pydantic para Gestão de Usuários (Admin)
"""

from typing import Optional
from pydantic import BaseModel, EmailStr


class UsuarioCreate(BaseModel):
    """Payload para criação de novo usuário/acesso pelo Admin."""
    nome: str
    email: EmailStr
    senha: str
    role: str = "COMUM"
    servidor_id: Optional[int] = None


class UsuarioUpdate(BaseModel):
    """Payload para atualização parcial de usuário (role, status, vínculo)."""
    nome: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    servidor_id: Optional[int] = None


class ServidorVinculoResumo(BaseModel):
    id: int
    nome: str
    matricula: str
    cargo: str
    lotacao: str

    model_config = {"from_attributes": True}


class UsuarioAdminResponse(BaseModel):
    """Dados completos do usuário para a visão do Admin."""
    id: int
    nome: str
    email: str
    role: str
    is_active: bool
    servidor_id: Optional[int] = None
    servidor: Optional[ServidorVinculoResumo] = None

    model_config = {"from_attributes": True}
