"""
ITER TIC - Rota do Painel de Indicadores (Dashboard Geral)

Fornece uma visão consolidada de métricas globais dos módulos:
  - PDTIC: distribuição de status das ações ativas
  - PACC: total de itens e soma de valores estimados
  - Projetos: distribuição por complexidade e gargalos de artefatos
"""

from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.pdtic import AcaoPdtic, PeriodoPdtic
from app.models.pacc import ExercicioPacc, ItemPacc
from app.models.projeto import (
    Artefato,
    Projeto,
    StatusArtefatoEnum,
    StatusProjetoEnum,
)
from app.models.contrato import Contrato, SituacaoContratoEnum

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SCHEMAS PYDANTIC                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


class PdticMetricas(BaseModel):
    """Métricas consolidadas das ações PDTIC ativas no período vigente."""

    periodo_vigente: str | None
    total_acoes_ativas: int
    distribuicao_status: dict[str, int]


class PaccMetricas(BaseModel):
    """Métricas consolidadas dos itens PACC ativos no exercício vigente."""

    exercicio_vigente: int | None
    total_itens_ativos: int
    valor_total_estimado: float


class ProjetosDistribuicaoComplexidade(BaseModel):
    """Distribuição de projetos por nível de complexidade."""

    baixa: int
    media: int
    alta: int


class GargaloArtefato(BaseModel):
    """Contagem de artefatos 'Iniciado' (em andamento) por tipo."""

    tipo: str
    quantidade: int


class ProjetosMetricas(BaseModel):
    """Métricas consolidadas dos projetos ativos."""

    total_projetos_ativos: int
    total_artefatos: int
    artefatos_concluidos: int
    distribuicao_complexidade: ProjetosDistribuicaoComplexidade
    gargalos_artefatos: list[GargaloArtefato]


class DashboardResponse(BaseModel):
    """Resposta consolidada do Painel de Indicadores."""

    pdtic: PdticMetricas
    pacc: PaccMetricas
    projetos: ProjetosMetricas


class KpisDashboard(BaseModel):
    """KPIs rápidos para os 4 cartões superiores do Painel de Indicadores."""

    total_pdtic: int
    projetos_fase_interna: int
    projetos_fase_externa: int
    contratos_ativos: int


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ROTA PRINCIPAL                                                         ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/kpis",
    response_model=KpisDashboard,
    summary="KPIs dos cartões superiores do Painel de Indicadores",
    description="Retorna os 4 indicadores dos cartões do dashboard via queries agregadas otimizadas.",
)
async def kpis_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Executa queries agregadas em paralelo para retornar os 4 KPIs
    dos cartões superiores do Painel de Indicadores.
    """
    from sqlalchemy import func, select

    # 1. Total de ações PDTIC ativas no período vigente
    stmt_periodo = (
        select(PeriodoPdtic.id)
        .where(PeriodoPdtic.ativo == True)  # noqa: E712
        .order_by(PeriodoPdtic.ano_inicio.desc())
        .limit(1)
    )
    periodo_id = (await db.execute(stmt_periodo)).scalar_one_or_none()

    if periodo_id:
        stmt_pdtic = select(func.count(AcaoPdtic.id)).where(
            AcaoPdtic.periodo_id == periodo_id,
            AcaoPdtic.revisao_exclusao_id.is_(None),
        )
        total_pdtic = (await db.execute(stmt_pdtic)).scalar() or 0
    else:
        total_pdtic = 0

    # 2. Projetos por fase (single query com CASE)
    from sqlalchemy import case
    stmt_proj = select(
        func.count(case((Projeto.status == StatusProjetoEnum.FASE_INTERNA, Projeto.id))).label("interna"),
        func.count(case((Projeto.status == StatusProjetoEnum.FASE_EXTERNA, Projeto.id))).label("externa"),
    )
    proj_row = (await db.execute(stmt_proj)).one()

    # 3. Contratos ativas (status Vigente)
    stmt_contratos = select(func.count(Contrato.id)).where(
        Contrato.situacao_atual == SituacaoContratoEnum.VIGENTE
    )
    contratos_ativos = (await db.execute(stmt_contratos)).scalar() or 0

    return KpisDashboard(
        total_pdtic=total_pdtic,
        projetos_fase_interna=proj_row.interna,
        projetos_fase_externa=proj_row.externa,
        contratos_ativos=contratos_ativos,
    )


@router.get(
    "/painel-indicadores",
    response_model=DashboardResponse,
    summary="Painel de Indicadores",
    description=(
        "Retorna um JSON consolidado com métricas globais dos três módulos "
        "(PDTIC, PACC e Projetos). Todas as consultas são otimizadas via "
        "func.count/func.sum do SQLAlchemy, sem carregar entidades inteiras."
    ),
)
async def painel_indicadores(db: AsyncSession = Depends(get_db)):

    pdtic = await _metricas_pdtic(db)
    pacc = await _metricas_pacc(db)
    projetos = await _metricas_projetos(db)

    return DashboardResponse(pdtic=pdtic, pacc=pacc, projetos=projetos)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  HELPERS INTERNOS (queries otimizadas)                                  ║
# ╚══════════════════════════════════════════════════════════════════════════╝


async def _metricas_pdtic(db: AsyncSession) -> PdticMetricas:
    """
    Filtra ações ATIVAS (revisao_exclusao_id IS NULL) do período vigente
    (ativo=True) e retorna total + distribuição por status.
    """

    # Obter período vigente
    stmt_periodo = (
        select(PeriodoPdtic)
        .where(PeriodoPdtic.ativo == True)  # noqa: E712
        .order_by(PeriodoPdtic.ano_inicio.desc())
        .limit(1)
    )
    periodo = (await db.execute(stmt_periodo)).scalar_one_or_none()

    if not periodo:
        return PdticMetricas(
            periodo_vigente=None,
            total_acoes_ativas=0,
            distribuicao_status={},
        )

    nome_periodo = f"{periodo.ano_inicio}-{periodo.ano_fim}"

    # Distribuição de ações ativas por status (single query)
    stmt = (
        select(
            AcaoPdtic.status,
            func.count(AcaoPdtic.id).label("qtd"),
        )
        .where(
            AcaoPdtic.periodo_id == periodo.id,
            AcaoPdtic.revisao_exclusao_id.is_(None),  # somente ativas
        )
        .group_by(AcaoPdtic.status)
    )
    rows = (await db.execute(stmt)).all()

    distribuicao: dict[str, int] = {}
    total = 0
    for status_enum, qtd in rows:
        distribuicao[status_enum.value] = qtd
        total += qtd

    return PdticMetricas(
        periodo_vigente=nome_periodo,
        total_acoes_ativas=total,
        distribuicao_status=distribuicao,
    )


async def _metricas_pacc(db: AsyncSession) -> PaccMetricas:
    """
    Filtra itens ATIVOS (revisao_exclusao_id IS NULL) do exercício vigente
    (ativo=True) e retorna total de itens + soma do valor estimado.
    """

    # Obter exercício vigente
    stmt_exercicio = (
        select(ExercicioPacc)
        .where(ExercicioPacc.ativo == True)  # noqa: E712
        .order_by(ExercicioPacc.ano.desc())
        .limit(1)
    )
    exercicio = (await db.execute(stmt_exercicio)).scalar_one_or_none()

    if not exercicio:
        return PaccMetricas(
            exercicio_vigente=None,
            total_itens_ativos=0,
            valor_total_estimado=0.0,
        )

    # Totais em single query
    stmt = select(
        func.count(ItemPacc.id).label("total"),
        func.coalesce(func.sum(ItemPacc.valor_estimado), 0).label("valor"),
    ).where(
        ItemPacc.exercicio_id == exercicio.id,
        ItemPacc.revisao_exclusao_id.is_(None),  # somente ativos
    )
    row = (await db.execute(stmt)).one()

    return PaccMetricas(
        exercicio_vigente=exercicio.ano,
        total_itens_ativos=row.total,
        valor_total_estimado=float(row.valor),
    )


async def _metricas_projetos(db: AsyncSession) -> ProjetosMetricas:
    """
    Conta projetos ativos (≠ Suspenso e ≠ Cancelado), distribui por
    complexidade e identifica gargalos de artefatos 'Iniciado' por tipo.
    """

    statuses_ativos = [
        StatusProjetoEnum.FASE_INTERNA,
        StatusProjetoEnum.FASE_EXTERNA,
        StatusProjetoEnum.CONTRATADO,
    ]

    # ── Distribuição por complexidade (single query) ─────────────────────────
    stmt_complexidade = select(
        func.count(
            case((Projeto.complexidade == "baixa", Projeto.id))
        ).label("baixa"),
        func.count(
            case((Projeto.complexidade == "media", Projeto.id))
        ).label("media"),
        func.count(
            case((Projeto.complexidade == "alta", Projeto.id))
        ).label("alta"),
        func.count(Projeto.id).label("total"),
    ).where(Projeto.status.in_(statuses_ativos))

    row = (await db.execute(stmt_complexidade)).one()

    # ── Contagem total de artefatos e concluídos ─────────────────────────────
    stmt_artefatos_total = select(
        func.count(Artefato.id).label("total"),
        func.count(
            case((Artefato.status == StatusArtefatoEnum.CONCLUIDO, Artefato.id))
        ).label("concluidos"),
    ).join(Projeto, Artefato.projeto_id == Projeto.id).where(
        Projeto.status.in_(statuses_ativos)
    )
    art_row = (await db.execute(stmt_artefatos_total)).one()

    # ── Gargalos: artefatos 'Iniciado' por tipo ──────────────────────────────
    stmt_gargalos = (
        select(
            Artefato.tipo,
            func.count(Artefato.id).label("qtd"),
        )
        .join(Projeto, Artefato.projeto_id == Projeto.id)
        .where(
            Projeto.status.in_(statuses_ativos),
            Artefato.status == StatusArtefatoEnum.INICIADO,
        )
        .group_by(Artefato.tipo)
        .order_by(func.count(Artefato.id).desc())
    )
    gargalo_rows = (await db.execute(stmt_gargalos)).all()

    gargalos = [
        GargaloArtefato(tipo=tipo.value, quantidade=qtd)
        for tipo, qtd in gargalo_rows
    ]

    return ProjetosMetricas(
        total_projetos_ativos=row.total,
        total_artefatos=art_row.total,
        artefatos_concluidos=art_row.concluidos,
        distribuicao_complexidade=ProjetosDistribuicaoComplexidade(
            baixa=row.baixa,
            media=row.media,
            alta=row.alta,
        ),
        gargalos_artefatos=gargalos,
    )
