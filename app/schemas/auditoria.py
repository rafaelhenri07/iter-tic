"""
ITER TIC - Schemas Pydantic para Auditoria (Admin)
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AuditoriaLogResponse(BaseModel):
    """Resposta de um registro de auditoria."""
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    acao: str
    entidade: str
    entidade_id: Optional[int] = None
    detalhes: Optional[str] = None
    ip_address: Optional[str] = None
    rota: Optional[str] = None
    metodo_http: Optional[str] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class PaginatedAuditoriaResponse(BaseModel):
    """Resposta paginada dos logs de auditoria."""
    total: int
    skip: int
    limit: int
    items: List[AuditoriaLogResponse]
