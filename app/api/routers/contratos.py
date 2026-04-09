"""
ITER TIC - Rotas do Módulo 3: Execução e Fiscalização (Contratos)

Regra de Ouro: Um contrato SÓ PODE ser criado se o projeto_id referenciado
estiver com status 'Licitação concluída'.
"""

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.contrato import (
    Contrato,
    ContratoHistorico,
    TipoRegistroHistoricoEnum,
)
from app.models.projeto import Projeto, StatusProjetoEnum
from app.schemas.contrato import (
    ContratoCreate,
    ContratoListagemResponse,
    ContratoResponse,
    ContratoUpdate,
    HistoricoContratoResponse,
    ObservacaoContratoCreate,
)

router = APIRouter(prefix="/contratos", tags=["Contratos e Fiscalização"])


# ── Labels legíveis para o log de auditoria ────────────────────────────────
_FIELD_LABELS: dict[str, str] = {
    "numero_contrato": "Número do Contrato",
    "empresa_contratada": "Empresa Contratada",
    "fabricante": "Fabricante",
    "tipo_contrato": "Tipo de Contrato",
    "quantidade": "Quantidade",
    "tecnologia_utilizada": "Tecnologia Utilizada",
    "valor_investimento": "Valor de Investimento",
    "valor_custeio": "Valor de Custeio",
    "prazo": "Prazo",
    "data_assinatura": "Data de Assinatura",
    "data_fim_vigencia": "Data Fim de Vigência",
    "situacao_atual": "Situação",
    "observacoes": "Observações",
    "gestor_id": "Gestor",
    "fiscal_requisitante_id": "Fiscal Requisitante",
    "fiscal_tecnico_id": "Fiscal Técnico",
    "fiscal_administrativo_id": "Fiscal Administrativo",
}


def _format_value(v) -> str:
    """Converte um valor para string legível no log de auditoria."""
    if v is None:
        return "(vazio)"
    if isinstance(v, date):
        return v.strftime("%d/%m/%Y")
    if isinstance(v, Decimal):
        return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if hasattr(v, "value"):  # Enums
        return v.value
    return str(v)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  LISTAGEM (GET /contratos)                                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "",
    response_model=list[ContratoListagemResponse],
    summary="Listar todos os contratos",
)
async def listar_contratos(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Contrato)
        .options(
            selectinload(Contrato.projeto),
            selectinload(Contrato.gestor),
        )
        .order_by(Contrato.criado_em.desc())
    )
    contratos = (await db.execute(stmt)).scalars().all()

    return [
        ContratoListagemResponse(
            id=c.id,
            numero_contrato=c.numero_contrato,
            empresa_contratada=c.empresa_contratada,
            tipo_contrato=c.tipo_contrato,
            situacao_atual=c.situacao_atual,
            valor_investimento=c.valor_investimento,
            valor_custeio=c.valor_custeio,
            valor_total=c.valor_total,
            data_assinatura=c.data_assinatura,
            data_fim_vigencia=c.data_fim_vigencia,
            quantidade=c.quantidade,
            projeto_nome=c.projeto.nome if c.projeto else None,
            projeto_processo_sei=c.projeto.processo_sei if c.projeto else None,
            nome_gestor=c.gestor.nome if c.gestor else None,
        )
        for c in contratos
    ]


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  DETALHES (GET /contratos/{id})                                        ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "/{contrato_id}",
    response_model=ContratoResponse,
    summary="Obter detalhes de um contrato",
)
async def obter_contrato(
    contrato_id: int,
    db: AsyncSession = Depends(get_db),
):
    contrato = await _carregar_contrato_completo(contrato_id, db)
    return _montar_response(contrato)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  CRIAÇÃO (POST /contratos)                                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "",
    response_model=ContratoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar um novo contrato",
    description=(
        "Cria um contrato vinculado a um Projeto. O projeto referenciado "
        "DEVE ter status 'Licitação concluída' — caso contrário, a criação "
        "será rejeitada com erro 400."
    ),
)
async def criar_contrato(
    payload: ContratoCreate,
    db: AsyncSession = Depends(get_db),
):
    # ── Regra de Ouro: validar status do projeto ─────────────────────────
    projeto = await db.get(Projeto, payload.projeto_id)
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Projeto {payload.projeto_id} não encontrado.",
        )

    if projeto.status != StatusProjetoEnum.LICITACAO_CONCLUIDA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Contratos só podem ser criados para projetos com status "
                f"'Licitação concluída'. O projeto '{projeto.nome}' está "
                f"com status '{projeto.status.value}'."
            ),
        )

    # ── Criar contrato ───────────────────────────────────────────────────
    contrato = Contrato(
        **payload.model_dump(),
    )
    db.add(contrato)
    await db.flush()

    # ── Registro de criação no histórico ─────────────────────────────────
    historico = ContratoHistorico(
        contrato_id=contrato.id,
        autor="Usuário do Sistema",
        tipo_registro=TipoRegistroHistoricoEnum.EDICAO_SISTEMA,
        conteudo=f"Contrato {contrato.numero_contrato} criado no sistema.",
    )
    db.add(historico)
    await db.flush()

    # Recarregar com relacionamentos
    contrato = await _carregar_contrato_completo(contrato.id, db)
    return _montar_response(contrato)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  ATUALIZAÇÃO COM AUDITORIA (PATCH /contratos/{id})                     ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.patch(
    "/{contrato_id}",
    response_model=ContratoResponse,
    summary="Atualizar parcialmente um contrato (com log de auditoria)",
)
async def atualizar_contrato(
    contrato_id: int,
    payload: ContratoUpdate,
    db: AsyncSession = Depends(get_db),
):
    contrato = await _garantir_contrato_existe(contrato_id, db)

    update_data = payload.model_dump(exclude_unset=True)

    # ── Detectar mudanças e gerar log ────────────────────────────────────
    mudancas: list[str] = []
    for campo, novo_valor in update_data.items():
        valor_atual = getattr(contrato, campo, None)
        # Normalizar para comparação
        if isinstance(valor_atual, Decimal) and isinstance(novo_valor, (int, float)):
            novo_valor_cmp = Decimal(str(novo_valor))
        else:
            novo_valor_cmp = novo_valor

        if valor_atual != novo_valor_cmp:
            label = _FIELD_LABELS.get(campo, campo)
            mudancas.append(
                f"{label}: {_format_value(valor_atual)} → {_format_value(novo_valor)}"
            )

    # ── Aplicar mudanças ─────────────────────────────────────────────────
    for campo, valor in update_data.items():
        setattr(contrato, campo, valor)

    await db.flush()

    # ── Registrar no histórico (se houve mudança real) ───────────────────
    if mudancas:
        historico = ContratoHistorico(
            contrato_id=contrato_id,
            autor="Usuário do Sistema",
            tipo_registro=TipoRegistroHistoricoEnum.EDICAO_SISTEMA,
            conteudo="; ".join(mudancas),
        )
        db.add(historico)
        await db.flush()

    contrato = await _carregar_contrato_completo(contrato_id, db)
    return _montar_response(contrato)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  OBSERVAÇÕES MANUAIS (POST /contratos/{id}/observacoes)                ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.post(
    "/{contrato_id}/observacoes",
    response_model=HistoricoContratoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Adicionar observação manual ao contrato",
)
async def adicionar_observacao(
    contrato_id: int,
    payload: ObservacaoContratoCreate,
    db: AsyncSession = Depends(get_db),
):
    await _garantir_contrato_existe(contrato_id, db)

    historico = ContratoHistorico(
        contrato_id=contrato_id,
        autor=payload.autor,
        tipo_registro=TipoRegistroHistoricoEnum.OBSERVACAO_MANUAL,
        conteudo=payload.conteudo,
    )
    db.add(historico)
    await db.flush()
    await db.refresh(historico)

    return HistoricoContratoResponse.model_validate(historico)


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  HELPERS INTERNOS                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════╝


async def _garantir_contrato_existe(
    contrato_id: int, db: AsyncSession
) -> Contrato:
    """Retorna o contrato ou levanta 404."""
    contrato = await db.get(Contrato, contrato_id)
    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contrato {contrato_id} não encontrado.",
        )
    return contrato


async def _carregar_contrato_completo(
    contrato_id: int, db: AsyncSession
) -> Contrato:
    """Carrega o contrato com todos os relacionamentos eager-loaded."""
    stmt = (
        select(Contrato)
        .options(
            selectinload(Contrato.projeto).selectinload(Projeto.acoes_pdtic),
            selectinload(Contrato.gestor),
            selectinload(Contrato.fiscal_requisitante),
            selectinload(Contrato.fiscal_tecnico),
            selectinload(Contrato.fiscal_administrativo),
            selectinload(Contrato.historico),
        )
        .where(Contrato.id == contrato_id)
    )
    contrato = (await db.execute(stmt)).scalar_one_or_none()
    if not contrato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contrato {contrato_id} não encontrado.",
        )
    return contrato


def _servidor_resumo(servidor) -> dict | None:
    """Converte um Servidor ORM em dict resumido, ou None."""
    if not servidor:
        return None
    return {
        "id": servidor.id,
        "nome": servidor.nome,
        "cargo": servidor.cargo,
        "matricula": servidor.matricula,
    }


def _montar_response(contrato: Contrato) -> ContratoResponse:
    """Monta o ContratoResponse com campos computados e aninhados."""
    projeto = contrato.projeto

    projeto_origem = None
    acoes_pdtic = []
    if projeto:
        projeto_origem = {
            "id": projeto.id,
            "nome": projeto.nome,
            "processo_sei": projeto.processo_sei,
        }
        acoes_pdtic = [
            {
                "id": a.id,
                "codigo_acao": a.codigo_acao,
                "descricao": a.descricao,
            }
            for a in (projeto.acoes_pdtic or [])
        ]

    equipe = {
        "gestor": _servidor_resumo(contrato.gestor),
        "fiscal_requisitante": _servidor_resumo(contrato.fiscal_requisitante),
        "fiscal_tecnico": _servidor_resumo(contrato.fiscal_tecnico),
        "fiscal_administrativo": _servidor_resumo(contrato.fiscal_administrativo),
    }

    historico = [
        HistoricoContratoResponse.model_validate(h)
        for h in (contrato.historico or [])
    ]

    return ContratoResponse(
        id=contrato.id,
        numero_contrato=contrato.numero_contrato,
        projeto_id=contrato.projeto_id,
        empresa_contratada=contrato.empresa_contratada,
        fabricante=contrato.fabricante,
        tipo_contrato=contrato.tipo_contrato,
        quantidade=contrato.quantidade,
        tecnologia_utilizada=contrato.tecnologia_utilizada,
        valor_investimento=contrato.valor_investimento,
        valor_custeio=contrato.valor_custeio,
        valor_total=contrato.valor_total,
        prazo=contrato.prazo,
        data_assinatura=contrato.data_assinatura,
        data_fim_vigencia=contrato.data_fim_vigencia,
        situacao_atual=contrato.situacao_atual,
        observacoes=contrato.observacoes,
        criado_em=contrato.criado_em,
        atualizado_em=contrato.atualizado_em,
        gestor_id=contrato.gestor_id,
        fiscal_requisitante_id=contrato.fiscal_requisitante_id,
        fiscal_tecnico_id=contrato.fiscal_tecnico_id,
        fiscal_administrativo_id=contrato.fiscal_administrativo_id,
        projeto_origem=projeto_origem,
        acoes_pdtic_vinculadas=acoes_pdtic,
        equipe=equipe,
        historico=historico,
    )
