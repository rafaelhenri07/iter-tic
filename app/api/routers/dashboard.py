"""
ITER TIC - Rota do Painel de Indicadores (Dashboard Geral)

Fornece uma visão consolidada de métricas globais dos módulos:
  - PDTIC: distribuição de status das ações ativas
  - PACC: total de itens e soma de valores estimados
  - Projetos: distribuição por complexidade e gargalos de artefatos
"""

from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import case, func, select, literal_column, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
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
from app.models.enums import StatusAcaoEnum

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


class MetricasPdtic(BaseModel):
    periodo_vigente: str | None = None
    total_acoes_ativas: int
    total_exclusoes: int
    acoes_em_andamento: int = 0
    acoes_contratadas: int = 0
    orcamento_total_estimado: float


class MetricasPacc(BaseModel):
    exercicio_vigente: str | None = None
    total_itens_ativos: int
    itens_em_andamento: int = 0
    itens_contratados: int = 0
    valor_total_estimado: float


class MetricasProjetos(BaseModel):
    total_projetos: int
    por_status: dict[str, int]
    por_prioridade: dict[str, int]
    por_complexidade: dict[str, int]


class MetricasContratos(BaseModel):
    total_contratos: int
    total_vigentes: int
    valor_total_investido: float
    total_a_vencer: int


class TempoMedioFases(BaseModel):
    fase_interna: int
    fase_externa: int


class ComplexidadeCarga(BaseModel):
    alta: int
    media: int
    baixa: int


class CargaServidorResponse(BaseModel):
    nome_completo: str
    total_contratos: int
    complexidade: ComplexidadeCarga
    pontuacao_total: int
    nomes_contratos: list[str]


class StatsDashboardResponse(BaseModel):
    metricas_pdtic: MetricasPdtic
    metricas_pacc: MetricasPacc
    metricas_projetos: MetricasProjetos
    metricas_contratos: MetricasContratos
    tempo_medio: TempoMedioFases | None = None
    carga_equipe: list[CargaServidorResponse] | None = None


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
        Contrato.situacao_atual.in_([
            SituacaoContratoEnum.VIGENTE,
            SituacaoContratoEnum.VIGENTE_SUSPENSO,
            SituacaoContratoEnum.VIGENTE_PRORROGADO
        ])
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


@router.get(
    "/stats",
    response_model=StatsDashboardResponse,
    summary="Estatísticas gerais agregadas para o Painel de Indicadores",
    description="Retorna dados estatísticos consolidados e reais de todos os módulos.",
)
async def stats_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # ── 1. PDTIC METRICS ──
    # Obter período vigente (último ativo)
    stmt_periodo = (
        select(PeriodoPdtic)
        .where(PeriodoPdtic.ativo == True)  # noqa: E712
        .order_by(PeriodoPdtic.ano_inicio.desc())
        .limit(1)
    )
    periodo = (await db.execute(stmt_periodo)).scalar_one_or_none()
    periodo_vigente_label: str | None = None
    periodo_filter = []

    if periodo:
        periodo_vigente_label = f"{periodo.ano_inicio}-{periodo.ano_fim}"
        periodo_filter = [AcaoPdtic.periodo_id == periodo.id]

    # Ações ativas do período vigente
    base_pdtic = [AcaoPdtic.revisao_exclusao_id.is_(None)] + periodo_filter

    stmt_act_pdtic = select(func.count(AcaoPdtic.id)).where(*base_pdtic)
    total_acoes_ativas = (await db.execute(stmt_act_pdtic)).scalar() or 0

    # Ações em andamento
    stmt_andamento = select(func.count(AcaoPdtic.id)).where(
        *base_pdtic, AcaoPdtic.status == StatusAcaoEnum.EM_ANDAMENTO
    )
    acoes_em_andamento = (await db.execute(stmt_andamento)).scalar() or 0

    # Ações contratadas
    stmt_contratadas = select(func.count(AcaoPdtic.id)).where(
        *base_pdtic, AcaoPdtic.status == StatusAcaoEnum.CONTRATADA
    )
    acoes_contratadas = (await db.execute(stmt_contratadas)).scalar() or 0

    # Total excluded actions
    stmt_exc_pdtic = select(func.count(AcaoPdtic.id)).where(
        AcaoPdtic.revisao_exclusao_id.is_not(None),
        *periodo_filter,
    )
    total_exclusoes = (await db.execute(stmt_exc_pdtic)).scalar() or 0

    # Orçamento total estimado (soma investimento + custeio de ações ativas)
    stmt_budget = select(
        AcaoPdtic.valores_investimento, AcaoPdtic.valores_custeio
    ).where(*base_pdtic)
    res_budget = await db.execute(stmt_budget)
    orcamento_total_estimado = 0.0
    for val_inv, val_cust in res_budget.all():
        if val_inv:
            orcamento_total_estimado += sum(float(v) for v in val_inv.values() if v is not None)
        if val_cust:
            orcamento_total_estimado += sum(float(v) for v in val_cust.values() if v is not None)

    metricas_pdtic = MetricasPdtic(
        periodo_vigente=periodo_vigente_label,
        total_acoes_ativas=total_acoes_ativas,
        total_exclusoes=total_exclusoes,
        acoes_em_andamento=acoes_em_andamento,
        acoes_contratadas=acoes_contratadas,
        orcamento_total_estimado=orcamento_total_estimado,
    )

    # ── 2. PACC METRICS ──
    # Obter exercício vigente (último ativo)
    stmt_exercicio = (
        select(ExercicioPacc)
        .where(ExercicioPacc.ativo == True)  # noqa: E712
        .order_by(ExercicioPacc.ano.desc())
        .limit(1)
    )
    exercicio = (await db.execute(stmt_exercicio)).scalar_one_or_none()
    exercicio_vigente_label: str | None = None
    exercicio_filter = []

    if exercicio:
        exercicio_vigente_label = str(exercicio.ano)
        exercicio_filter = [ItemPacc.exercicio_id == exercicio.id]

    base_pacc = [ItemPacc.revisao_exclusao_id.is_(None)] + exercicio_filter

    # Total active PACC items and total estimated value
    stmt_pacc = select(
        func.count(ItemPacc.id).label("total"),
        func.coalesce(func.sum(ItemPacc.valor_estimado), 0).label("valor_total")
    ).where(*base_pacc)
    res_pacc = (await db.execute(stmt_pacc)).one()

    # Itens em andamento: ações vinculadas com status "Em andamento"
    stmt_pacc_andamento = (
        select(func.count(ItemPacc.id))
        .join(AcaoPdtic, AcaoPdtic.id == ItemPacc.acao_pdtic_id)
        .where(*base_pacc, AcaoPdtic.status == StatusAcaoEnum.EM_ANDAMENTO)
    )
    itens_em_andamento = (await db.execute(stmt_pacc_andamento)).scalar() or 0

    # Itens contratados: ações vinculadas com status "Contratada"
    stmt_pacc_contratados = (
        select(func.count(ItemPacc.id))
        .join(AcaoPdtic, AcaoPdtic.id == ItemPacc.acao_pdtic_id)
        .where(*base_pacc, AcaoPdtic.status == StatusAcaoEnum.CONTRATADA)
    )
    itens_contratados = (await db.execute(stmt_pacc_contratados)).scalar() or 0

    metricas_pacc = MetricasPacc(
        exercicio_vigente=exercicio_vigente_label,
        total_itens_ativos=res_pacc.total or 0,
        itens_em_andamento=itens_em_andamento,
        itens_contratados=itens_contratados,
        valor_total_estimado=float(res_pacc.valor_total or 0.0),
    )

    # ── 3. PROJECTS METRICS ──
    # Total projects
    stmt_tot_proj = select(func.count(Projeto.id))
    total_projetos = (await db.execute(stmt_tot_proj)).scalar() or 0

    # Projects by status
    stmt_status = select(Projeto.status, func.count(Projeto.id)).group_by(Projeto.status)
    res_status = (await db.execute(stmt_status)).all()
    por_status = {
        "Fase interna": 0,
        "Fase externa": 0,
        "Contratado": 0
    }
    for status, count in res_status:
        val = status.value if hasattr(status, 'value') else str(status)
        por_status[val] = count

    # Projects by priority
    stmt_prio = select(Projeto.prioridade, func.count(Projeto.id)).group_by(Projeto.prioridade)
    res_prio = (await db.execute(stmt_prio)).all()
    por_prioridade = {
        "alta": 0,
        "media": 0,
        "baixa": 0
    }
    for prio, count in res_prio:
        if prio:
            por_prioridade[prio.lower()] = count
        else:
            por_prioridade["media"] += count

    # Projects by complexity
    stmt_comp = select(Projeto.complexidade, func.count(Projeto.id)).group_by(Projeto.complexidade)
    res_comp = (await db.execute(stmt_comp)).all()
    por_complexidade = {
        "baixa": 0,
        "media": 0,
        "alta": 0
    }
    for comp, count in res_comp:
        if comp:
            comp_lower = comp.lower()
            if comp_lower in ["baixa", "simples"]:
                por_complexidade["baixa"] += count
            elif comp_lower in ["alta", "complexa"]:
                por_complexidade["alta"] += count
            else:
                por_complexidade["media"] += count
        else:
            por_complexidade["media"] += count

    metricas_projetos = MetricasProjetos(
        total_projetos=total_projetos,
        por_status=por_status,
        por_prioridade=por_prioridade,
        por_complexidade=por_complexidade
    )

    # ── 4. CONTRACTS METRICS ──
    # Total contracts
    stmt_tot_contr = select(func.count(Contrato.id))
    total_contratos = (await db.execute(stmt_tot_contr)).scalar() or 0

    # Total vigentes contracts
    stmt_vig_contr = select(func.count(Contrato.id)).where(
        Contrato.situacao_atual.in_([
            SituacaoContratoEnum.VIGENTE,
            SituacaoContratoEnum.VIGENTE_SUSPENSO,
            SituacaoContratoEnum.VIGENTE_PRORROGADO
        ])
    )
    total_vigentes = (await db.execute(stmt_vig_contr)).scalar() or 0

    # Total invested value (sum of total value of all contracts)
    stmt_val_contr = select(func.coalesce(func.sum(ItemContrato.quantidade * ItemContrato.valor_unitario), 0))
    valor_total_investido = (await db.execute(stmt_val_contr)).scalar() or 0

    # Total a vencer contracts (Vigente and ending within 180 days)
    today = date.today()
    limit_date = today + timedelta(days=180)
    stmt_a_vencer = select(func.count(Contrato.id)).where(
        Contrato.data_fim_vigencia >= today,
        Contrato.data_fim_vigencia <= limit_date,
        Contrato.situacao_atual.in_([
            SituacaoContratoEnum.VIGENTE,
            SituacaoContratoEnum.VIGENTE_SUSPENSO,
            SituacaoContratoEnum.VIGENTE_PRORROGADO
        ])
    )
    total_a_vencer = (await db.execute(stmt_a_vencer)).scalar() or 0

    metricas_contratos = MetricasContratos(
        total_contratos=total_contratos,
        total_vigentes=total_vigentes,
        valor_total_investido=float(valor_total_investido),
        total_a_vencer=total_a_vencer
    )

    # ── 5. EFFICIENCY METRICS: TEMPO MÉDIO EM FASES ──
    stmt_projetos_all = select(Projeto.id, Projeto.criado_em, Projeto.data_envio_licitacao, Projeto.status)
    res_projetos_all = await db.execute(stmt_projetos_all)
    projetos_all = res_projetos_all.all()

    interna_days_list = []
    externa_days_list = []

    for p_id, p_criado, p_envio, p_status in projetos_all:
        p_created = p_criado.date() if p_criado else None
        if not p_created:
            continue

        # Get contract signed date if exists
        stmt_c = select(Contrato.data_assinatura).where(Contrato.projeto_id == p_id)
        c_assinatura = (await db.execute(stmt_c)).scalar_one_or_none()

        # Fase Interna
        if p_envio:
            interna_days_list.append(abs((p_envio - p_created).days))
        elif p_status == StatusProjetoEnum.CONTRATADO or c_assinatura is not None:
            if c_assinatura:
                interna_days_list.append(abs((c_assinatura - p_created).days))

        # Fase Externa
        if c_assinatura:
            if p_envio:
                externa_days_list.append(abs((c_assinatura - p_envio).days))
            else:
                externa_days_list.append(abs((c_assinatura - p_created).days))

    avg_fase_interna = round(sum(interna_days_list) / len(interna_days_list)) if interna_days_list else 0
    avg_fase_externa = round(sum(externa_days_list) / len(externa_days_list)) if externa_days_list else 0
    tempo_medio = TempoMedioFases(fase_interna=avg_fase_interna, fase_externa=avg_fase_externa)

    # ── 6. HUMAN RESOURCES METRICS: CARGA DE TRABALHO POR SERVIDOR ──
    stmt_carga = (
        select(ContratoEquipe)
        .join(Contrato, Contrato.id == ContratoEquipe.contrato_id)
        .join(Servidor, Servidor.id == ContratoEquipe.servidor_id)
        .where(
            Contrato.situacao_atual.in_([
                SituacaoContratoEnum.VIGENTE,
                SituacaoContratoEnum.VIGENTE_SUSPENSO,
                SituacaoContratoEnum.VIGENTE_PRORROGADO
            ])
        )
    )
    res_carga = await db.execute(stmt_carga)
    equipe_membros_carga = res_carga.scalars().all()

    carga_por_servidor = {}
    for member in equipe_membros_carga:
        srv = member.servidor
        c_id = member.contrato_id
        
        stmt_contrato_c = select(Contrato).where(Contrato.id == c_id)
        c = (await db.execute(stmt_contrato_c)).scalar_one()

        srv_id = srv.id
        if srv_id not in carga_por_servidor:
            carga_por_servidor[srv_id] = {
                "nome_completo": srv.nome,
                "contrato_ids": set(),
                "nomes_contratos": [],
                "complexidade": {"alta": 0, "media": 0, "baixa": 0}
            }

        if c_id not in carga_por_servidor[srv_id]["contrato_ids"]:
            carga_por_servidor[srv_id]["contrato_ids"].add(c_id)
            
            # Fetch project name associated with this contract
            stmt_proj_nome = select(Projeto.nome).where(Projeto.id == c.projeto_id)
            p_nome = (await db.execute(stmt_proj_nome)).scalar_one_or_none()
            if p_nome:
                carga_por_servidor[srv_id]["nomes_contratos"].append(p_nome)

            comp_value = c.complexidade.value if hasattr(c.complexidade, 'value') else str(c.complexidade)
            if comp_value == "complexa":
                carga_por_servidor[srv_id]["complexidade"]["alta"] += 1
            elif comp_value == "intermediaria":
                carga_por_servidor[srv_id]["complexidade"]["media"] += 1
            else:
                carga_por_servidor[srv_id]["complexidade"]["baixa"] += 1

    carga_equipe = []
    for srv_id, srv_data in carga_por_servidor.items():
        comp_data = ComplexidadeCarga(
            alta=srv_data["complexidade"]["alta"],
            media=srv_data["complexidade"]["media"],
            baixa=srv_data["complexidade"]["baixa"]
        )
        
        # Calculate weighted workload score
        pontuacao_total = (
            (srv_data["complexidade"]["baixa"] * 1) +
            (srv_data["complexidade"]["media"] * 3) +
            (srv_data["complexidade"]["alta"] * 5)
        )
        
        carga_equipe.append(
            CargaServidorResponse(
                nome_completo=srv_data["nome_completo"],
                total_contratos=len(srv_data["contrato_ids"]),
                complexidade=comp_data,
                pontuacao_total=pontuacao_total,
                nomes_contratos=srv_data["nomes_contratos"]
            )
        )

    # Sort workload: 1st by score descending, 2nd by contract count descending, 3rd by name ascending
    carga_equipe.sort(key=lambda x: (-x.pontuacao_total, -x.total_contratos, x.nome_completo))

    return StatsDashboardResponse(
        metricas_pdtic=metricas_pdtic,
        metricas_pacc=metricas_pacc,
        metricas_projetos=metricas_projetos,
        metricas_contratos=metricas_contratos,
        tempo_medio=tempo_medio,
        carga_equipe=carga_equipe
    )
