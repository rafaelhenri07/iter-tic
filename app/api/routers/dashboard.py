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
from sqlalchemy import case, func, select, literal_column, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.pdtic import AcaoPdtic, PeriodoPdtic
from app.models.pacc import ExercicioPacc, ItemPacc
from app.models.projeto import (
    Artefato,
    Projeto,
    Servidor,
    StatusArtefatoEnum,
    StatusProjetoEnum,
    projeto_item_pacc,
)
from app.models.contrato import Contrato, ContratoEquipe, ItemContrato, SituacaoContratoEnum, TipoContratoEnum

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


# ── Schemas para Gráficos ────────────────────────────────────────────────

class DistribuicaoTipoItem(BaseModel):
    name: str
    value: int

class DistribuicaoSituacaoItem(BaseModel):
    label: str
    qtd: int

class DistribuicaoContratosData(BaseModel):
    por_tipo: list[DistribuicaoTipoItem]
    por_situacao: list[DistribuicaoSituacaoItem]

class EfetividadeFinanceiraItem(BaseModel):
    acao: str
    estimativa: float
    efetivo: float


class TempoArtefatoItem(BaseModel):
    """Tempo médio (em dias) de conclusão de um tipo de artefato."""
    artefato: str
    dias: float


class CargaEquipeItem(BaseModel):
    """Carga de trabalho de um servidor por área de atuação."""
    nome: str
    planejamento: int   # participações em equipes de Fase Interna
    fiscalizacao: int   # participações em equipes de Contratos


class GraficosDashboard(BaseModel):
    """Payload para os gráficos do Painel de Indicadores."""
    distribuicao_contratos: DistribuicaoContratosData
    efetividade_financeira: list[EfetividadeFinanceiraItem]
    tempo_artefatos: list[TempoArtefatoItem]
    carga_equipe: list[CargaEquipeItem]


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
    "/graficos",
    response_model=GraficosDashboard,
    summary="Dados para os gráficos do Painel de Indicadores",
    description="Retorna distribuição de contratos (por tipo e situação) e efetividade financeira.",
)
async def graficos_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Executa queries agregadas para alimentar os gráficos Recharts
    de Distribuição de Contratos e Efetividade Financeira.
    """

    # ── 1. Distribuição de Contratos por Tipo (GROUP BY) ──────────────────
    stmt_tipo = (
        select(
            Contrato.tipo_contrato,
            func.count(Contrato.id).label("qtd"),
        )
        .group_by(Contrato.tipo_contrato)
        .order_by(func.count(Contrato.id).desc())
    )
    tipo_rows = (await db.execute(stmt_tipo)).all()
    por_tipo = [
        DistribuicaoTipoItem(name=tipo_enum.value, value=qtd)
        for tipo_enum, qtd in tipo_rows
    ]

    # ── 2. Distribuição de Contratos por Situação (GROUP BY) ─────────────
    stmt_situacao = (
        select(
            Contrato.situacao_atual,
            func.count(Contrato.id).label("qtd"),
        )
        .group_by(Contrato.situacao_atual)
        .order_by(func.count(Contrato.id).desc())
    )
    situacao_rows = (await db.execute(stmt_situacao)).all()
    por_situacao = [
        DistribuicaoSituacaoItem(label=sit_enum.value, qtd=qtd)
        for sit_enum, qtd in situacao_rows
    ]

    # ── 3. Efetividade Financeira (Projeto → Contrato) ──────────────────
    # Para cada projeto que possui contrato, compara ItemPacc.valor_estimado
    # com o custo efetivo do contrato (ItemContrato.quantidade * valor_unitario).
    subq_pacc = (
        select(
            projeto_item_pacc.c.projeto_id,
            func.sum(ItemPacc.valor_estimado).label("total_estimativa")
        )
        .join(ItemPacc, ItemPacc.id == projeto_item_pacc.c.item_pacc_id)
        .group_by(projeto_item_pacc.c.projeto_id)
        .subquery()
    )

    subq_contrato = (
        select(
            Contrato.projeto_id,
            func.sum(ItemContrato.quantidade * ItemContrato.valor_unitario).label("total_efetivo")
        )
        .join(ItemContrato, ItemContrato.contrato_id == Contrato.id)
        .group_by(Contrato.projeto_id)
        .subquery()
    )

    stmt_efetividade = (
        select(
            Projeto.nome,
            func.coalesce(subq_pacc.c.total_estimativa, 0).label("estimativa"),
            func.coalesce(subq_contrato.c.total_efetivo, 0).label("efetivo"),
        )
        .join(subq_contrato, subq_contrato.c.projeto_id == Projeto.id)
        .outerjoin(subq_pacc, subq_pacc.c.projeto_id == Projeto.id)
        .order_by(Projeto.nome)
        .limit(10)
    )
    efet_rows = (await db.execute(stmt_efetividade)).all()

    efetividade = []
    for nome, est, efe in efet_rows:
        # Trunca o nome para caber no eixo X do gráfico
        sigla = nome[:20] + ("…" if len(nome) > 20 else "")
        efetividade.append(
            EfetividadeFinanceiraItem(
                acao=sigla,
                estimativa=float(est),
                efetivo=float(efe),
            )
        )

    # ── 4. Tempo Médio de Artefatos (CONCLUÍDO, com data_inicio e data_conclusao) ──
    # Calcula AVG(data_conclusao - data_inicio) por tipo de artefato.
    # Artefatos sem ambas as datas são ignorados (COALESCE seguro).
    stmt_tempo = (
        select(
            Artefato.tipo,
            func.avg(
                func.julianday(Artefato.data_conclusao)
                - func.julianday(Artefato.data_inicio)
            ).label("media_dias"),
        )
        .join(Projeto, Artefato.projeto_id == Projeto.id)
        .where(
            Artefato.status == StatusArtefatoEnum.CONCLUIDO,
            Artefato.data_inicio.is_not(None),
            Artefato.data_conclusao.is_not(None),
            Projeto.is_legado == False,  # noqa: E712 — exclui legados do cálculo
        )
        .group_by(Artefato.tipo)
        .order_by(Artefato.tipo)
    )
    tempo_rows = (await db.execute(stmt_tempo)).all()

    # Fallback: se não houver artefatos concluídos com datas, retorna zeros
    # para que o front-end não quebre.
    ARTEFATO_LABELS = ["DFD", "ETP", "Mapa de Riscos", "Estimativa de Custos e Orçamento", "TR"]
    tempo_map: dict[str, float] = {}
    for tipo_enum, media in tempo_rows:
        if media is not None:
            tempo_map[tipo_enum.value] = round(float(media), 1)

    tempo_artefatos = [
        TempoArtefatoItem(artefato=label, dias=tempo_map.get(label, 0.0))
        for label in ARTEFATO_LABELS
    ]

    # ── 5. Carga de Trabalho da Equipe ────────────────────────────────────
    # Parte A: contagem de participações em equipes de Fase Interna (Projeto)
    # Um servidor pode aparecer em até 3 papéis por projeto (req, tec, adm),
    # mas contamos uma participação por projeto (DISTINCT projeto_id).
    stmt_fase_interna = (
        select(
            Servidor.id.label("servidor_id"),
            Servidor.nome.label("nome"),
            func.count(Projeto.id).label("planejamento"),
        )
        .select_from(Servidor)
        .outerjoin(
            Projeto,
            (
                (Projeto.integrante_requisitante_id == Servidor.id)
                | (Projeto.integrante_tecnico_id == Servidor.id)
                | (Projeto.integrante_administrativo_id == Servidor.id)
            ),
        )
        .group_by(Servidor.id, Servidor.nome)
    )
    fi_rows = (await db.execute(stmt_fase_interna)).all()
    fi_map: dict[int, tuple[str, int]] = {
        row.servidor_id: (row.nome, row.planejamento) for row in fi_rows
    }

    # Parte B: contagem de participações em equipes de Contratos
    stmt_contratos_equipe = (
        select(
            Servidor.id.label("servidor_id"),
            func.count(ContratoEquipe.id).label("fiscalizacao"),
        )
        .select_from(Servidor)
        .outerjoin(ContratoEquipe, ContratoEquipe.servidor_id == Servidor.id)
        .group_by(Servidor.id)
    )
    ce_rows = (await db.execute(stmt_contratos_equipe)).all()
    ce_map: dict[int, int] = {
        row.servidor_id: row.fiscalizacao for row in ce_rows
    }

    # Mescla e filtra somente quem tem pelo menos 1 participação
    carga_equipe_lista: list[CargaEquipeItem] = []
    for srv_id, (nome, planejamento) in fi_map.items():
        fiscalizacao = ce_map.get(srv_id, 0)
        if planejamento > 0 or fiscalizacao > 0:
            carga_equipe_lista.append(
                CargaEquipeItem(
                    nome=nome,
                    planejamento=planejamento,
                    fiscalizacao=fiscalizacao,
                )
            )

    # Ordena por carga total decrescente
    carga_equipe_lista.sort(
        key=lambda x: x.planejamento + x.fiscalizacao, reverse=True
    )

    return GraficosDashboard(
        distribuicao_contratos=DistribuicaoContratosData(
            por_tipo=por_tipo,
            por_situacao=por_situacao,
        ),
        efetividade_financeira=efetividade,
        tempo_artefatos=tempo_artefatos,
        carga_equipe=carga_equipe_lista,
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
    ).where(
        Projeto.status.in_(statuses_ativos),
        Projeto.is_legado == False,  # noqa: E712 — exclui legados da distribuição
    )

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
