"""
ITER TIC - Rotas de Configurações do Sistema
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models.configuracao import ConfiguracaoSistema

router = APIRouter(prefix="/configuracoes", tags=["Configuracoes"])


# --- Schemas ---

class ConfiguracaoResponse(BaseModel):
    id: int
    nome_orgao: str
    cor_primaria: str
    logo_url: str | None

    class Config:
        orm_mode = True
        from_attributes = True


class ConfiguracaoUpdate(BaseModel):
    nome_orgao: str | None = None
    cor_primaria: str | None = None
    logo_url: str | None = None


# --- Dependências ---

async def _obter_config_singleton(db: AsyncSession) -> ConfiguracaoSistema:
    """Busca a configuração do sistema ou a cria com defaults."""
    query = select(ConfiguracaoSistema).where(ConfiguracaoSistema.id == 1)
    result = await db.execute(query)
    config = result.scalar_one_or_none()

    if not config:
        config = ConfiguracaoSistema(
            id=1,
            nome_orgao="Polícia Civil do Distrito Federal",
            cor_primaria="#C4A75C",
            logo_url=None
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return config


# --- Rotas ---

@router.get("", response_model=ConfiguracaoResponse)
async def get_configuracao(db: AsyncSession = Depends(get_db)):
    """
    Retorna as configurações atuais do sistema.
    """
    config = await _obter_config_singleton(db)
    return config


from app.core.security import get_current_user

@router.patch("", response_model=ConfiguracaoResponse)
async def update_configuracao(
    payload: ConfiguracaoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Atualiza as configurações do sistema (White Label).
    """
    config = await _obter_config_singleton(db)
    
    update_data = payload.dict(exclude_unset=True)
    if not update_data:
        return config
        
    for key, value in update_data.items():
        setattr(config, key, value)
        
    await db.commit()
    await db.refresh(config)
    
    return config
