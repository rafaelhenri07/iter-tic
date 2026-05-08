"""
ITER TIC - Rotas de Auditoria (exclusivo ADMIN)

Retorna os logs registrados pelo AuditoriaMiddleware,
paginados e ordenados pelos mais recentes primeiro.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.usuario import Usuario
from app.models.auditoria import AuditoriaLog
from app.core.security import require_admin
from app.schemas.auditoria import AuditoriaLogResponse, PaginatedAuditoriaResponse

router = APIRouter(prefix="/auditoria", tags=["Admin — Auditoria"])


@router.get("", response_model=PaginatedAuditoriaResponse)
async def listar_logs(
    skip: int = Query(0, ge=0, description="Número de registros a pular"),
    limit: int = Query(50, ge=1, le=200, description="Quantidade de registros por página"),
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_admin),
):
    """
    Lista os logs de auditoria, ordenados do mais recente para o mais antigo.
    Somente ADMIN pode acessar.
    """
    # Total de registros
    count_result = await db.execute(select(func.count()).select_from(AuditoriaLog))
    total = count_result.scalar_one()

    # Página de registros
    result = await db.execute(
        select(AuditoriaLog)
        .order_by(AuditoriaLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
    )
    items = result.scalars().all()

    return PaginatedAuditoriaResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=items,
    )
