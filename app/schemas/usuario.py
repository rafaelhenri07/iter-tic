"""
ITER TIC - Schemas Pydantic para Gestão de Usuários (Admin)
"""

from typing import Optional, Any
from pydantic import BaseModel, EmailStr, model_validator


class UsuarioCreate(BaseModel):
    """Payload para criação de novo usuário/acesso pelo Admin."""
    nome: str
    email: EmailStr
    senha: str = ""  # Vazio = conta pendente de ativação via e-mail
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
    lotacao: str = ""

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extrair_lotacao_nome(cls, data: Any) -> Any:
        """
        O campo 'lotacao' no modelo SQLAlchemy é um relationship (UnidadeOrganizacional),
        não uma string. Extraímos o nome da unidade para serialização.
        """
        # Se for um ORM object (SQLAlchemy model)
        if hasattr(data, "lotacao") and data.lotacao is not None:
            lotacao_obj = data.lotacao
            if hasattr(lotacao_obj, "nome"):
                # Criar um dict com os campos resolvidos
                return {
                    "id": data.id,
                    "nome": data.nome,
                    "matricula": data.matricula,
                    "cargo": data.cargo,
                    "lotacao": lotacao_obj.sigla if hasattr(lotacao_obj, "sigla") and lotacao_obj.sigla else lotacao_obj.nome,
                }
        elif hasattr(data, "lotacao") and data.lotacao is None:
            return {
                "id": data.id,
                "nome": data.nome,
                "matricula": data.matricula,
                "cargo": data.cargo,
                "lotacao": "",
            }
        return data


class UsuarioAdminResponse(BaseModel):
    """Dados completos do usuário para a visão do Admin."""
    id: int
    nome: str
    email: str
    matricula: str | None = None
    role: str
    is_active: bool
    servidor_id: Optional[int] = None
    servidor: Optional[ServidorVinculoResumo] = None

    model_config = {"from_attributes": True}
