"""
ITER TIC - Rotas do Módulo 3: Execução e Fiscalização (Contratos)

Regra de Ouro: Um contrato SÓ PODE ser criado se o projeto_id referenciado
estiver com status 'Licitação concluída'.

Equipe de Fiscalização: cada papel (gestor, fiscal_requisitante,
fiscal_tecnico, fiscal_administrativo) pode ter 1 Titular + N Substitutos,
gerenciados via tabela contrato_equipe.
"""

from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.contrato import (
    Contrato,
    ContratoEquipe,
    ContratoHistorico,
    PapelEquipeEnum,
    SituacaoContratoEnum,
    TipoRegistroHistoricoEnum,
)
from app.models.projeto import Projeto, StatusProjetoEnum
from app.schemas.contrato import (
    ContratoCreate,
    ContratoListagemResponse,
    ContratoResponse,
    ContratoUpdate,
    EquipeFiscalizacaoResponse,
    EquipeMembroResponse,
    EquipePapelResponse,
    HistoricoContratoResponse,
    ObservacaoContratoCreate,
)

router = APIRouter(prefix="/contratos", tags=["Contratos e Fiscalização"])


# ── Labels legíveis para o log de auditoria ────────────────────────────────
_FIELD_LABELS: dict[str, str] = {
    "numero_contrato": "Número do Contrato",
    "empresa_contratada": "Empresa Contratada",
    "fabricante_id": "Fabricante",
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
}

# ── Labels dos papéis para auditoria ───────────────────────────────────────
_PAPEL_LABELS: dict[str, str] = {
    "gestor": "Gestor",
    "fiscal_requisitante": "Fiscal Requisitante",
    "fiscal_tecnico": "Fiscal Técnico",
    "fiscal_administrativo": "Fiscal Administrativo",
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
# ║  HELPERS DE EQUIPE                                                      ║
# ╚══════════════════════════════════════════════════════════════════════════╝


async def _salvar_equipe(
    db: AsyncSession,
    contrato_id: int,
    equipe_input,
) -> None:
    """Cria registros ContratoEquipe a partir do EquipeInput."""
    if equipe_input is None:
        return

    papel_map = {
        "gestor": PapelEquipeEnum.GESTOR,
        "fiscal_requisitante": PapelEquipeEnum.FISCAL_REQUISITANTE,
        "fiscal_tecnico": PapelEquipeEnum.FISCAL_TECNICO,
        "fiscal_administrativo": PapelEquipeEnum.FISCAL_ADMINISTRATIVO,
    }

    for campo, papel_enum in papel_map.items():
        papel_input = getattr(equipe_input, campo, None)
        if papel_input is None:
            continue

        # Titular
        if papel_input.titular_id:
            db.add(ContratoEquipe(
                contrato_id=contrato_id,
                servidor_id=papel_input.titular_id,
                papel=papel_enum,
                is_titular=True,
            ))

        # Substitutos
        for sub_id in (papel_input.substitutos_ids or []):
            db.add(ContratoEquipe(
                contrato_id=contrato_id,
                servidor_id=sub_id,
                papel=papel_enum,
                is_titular=False,
            ))

    await db.flush()


async def _substituir_equipe(
    db: AsyncSession,
    contrato_id: int,
    equipe_input,
) -> None:
    """Remove equipe existente e insere a nova."""
    await db.execute(
        delete(ContratoEquipe).where(ContratoEquipe.contrato_id == contrato_id)
    )
    await db.flush()
    await _salvar_equipe(db, contrato_id, equipe_input)


def _montar_equipe_response(membros: list[ContratoEquipe]) -> EquipeFiscalizacaoResponse:
    """Agrupa membros por papel e monta o response estruturado."""
    from collections import defaultdict
    agrupado: dict[str, dict] = {}

    for papel_enum in PapelEquipeEnum:
        agrupado[papel_enum.value] = {"titular": None, "substitutos": []}

    for m in membros:
        srv = {
            "id": m.servidor.id,
            "nome": m.servidor.nome,
            "cargo": m.servidor.cargo,
            "matricula": m.servidor.matricula,
        }
        if m.is_titular:
            agrupado[m.papel.value]["titular"] = srv
        else:
            agrupado[m.papel.value]["substitutos"].append(srv)

    return EquipeFiscalizacaoResponse(
        gestor=EquipePapelResponse(**agrupado["gestor"]),
        fiscal_requisitante=EquipePapelResponse(**agrupado["fiscal_requisitante"]),
        fiscal_tecnico=EquipePapelResponse(**agrupado["fiscal_tecnico"]),
        fiscal_administrativo=EquipePapelResponse(**agrupado["fiscal_administrativo"]),
    )


# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  LISTAGEM (GET /contratos)                                             ║
# ╚══════════════════════════════════════════════════════════════════════════╝


@router.get(
    "",
    response_model=list[ContratoListagemResponse],
    summary="Listar todos os contratos",
)
async def listar_contratos(
    situacao: str | None = Query(
        None,
        description=(
            "Filtrar por situação. Valores aceitos: Vigente, Extinto, "
            "'Extinto, mas suporte vigente', ou 'a_vencer' (vigentes com "
            "data_fim_vigencia nos próximos 180 dias)."
        ),
    ),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Contrato)
        .options(
            selectinload(Contrato.projeto),
            selectinload(Contrato.fabricante_rel),
            selectinload(Contrato.equipe_membros).selectinload(ContratoEquipe.servidor),
        )
        .order_by(Contrato.criado_em.desc())
    )

    # ── Filtro por situação ─────────────────────────────────────────────
    if situacao == "a_vencer":
        hoje = date.today()
        limite = hoje + timedelta(days=180)
        stmt = stmt.where(
            Contrato.situacao_atual == SituacaoContratoEnum.VIGENTE,
            Contrato.data_fim_vigencia > hoje,
            Contrato.data_fim_vigencia <= limite,
        )
    elif situacao and situacao != "todos":
        stmt = stmt.where(Contrato.situacao_atual == situacao)

    contratos = (await db.execute(stmt)).scalars().all()

    result = []
    for c in contratos:
        # Buscar nome do gestor titular na equipe
        nome_gestor = None
        for m in (c.equipe_membros or []):
            if m.papel == PapelEquipeEnum.GESTOR and m.is_titular:
                nome_gestor = m.servidor.nome
                break

        result.append(ContratoListagemResponse(
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
            nome_gestor=nome_gestor,
        ))

    return result


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

    # ── Separar equipe do payload principal ───────────────────────────────
    contrato_data = payload.model_dump(exclude={"equipe"})
    equipe_input = payload.equipe

    # ── Criar contrato ───────────────────────────────────────────────────
    contrato = Contrato(**contrato_data)
    db.add(contrato)
    await db.flush()

    # ── Criar membros da equipe ──────────────────────────────────────────
    await _salvar_equipe(db, contrato.id, equipe_input)

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

    # ── Separar equipe dos demais campos ─────────────────────────────────
    equipe_input = update_data.pop("equipe", None)

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

    # ── Aplicar mudanças dos campos escalares ────────────────────────────
    for campo, valor in update_data.items():
        setattr(contrato, campo, valor)

    await db.flush()

    # ── Atualizar equipe (se enviada) ────────────────────────────────────
    if equipe_input is not None:
        mudancas.append("Equipe de Fiscalização atualizada")
        # Reconstruir o objeto EquipeInput do dict
        from app.schemas.contrato import EquipeInput
        equipe_obj = EquipeInput(**equipe_input)
        await _substituir_equipe(db, contrato_id, equipe_obj)

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
            selectinload(Contrato.equipe_membros).selectinload(ContratoEquipe.servidor),
            selectinload(Contrato.historico),
            selectinload(Contrato.fabricante_rel),
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

    # ── Equipe de Fiscalização (agrupada por papel) ──────────────────────
    equipe = _montar_equipe_response(contrato.equipe_membros or [])

    historico = [
        HistoricoContratoResponse.model_validate(h)
        for h in (contrato.historico or [])
    ]

    return ContratoResponse(
        id=contrato.id,
        numero_contrato=contrato.numero_contrato,
        projeto_id=contrato.projeto_id,
        empresa_contratada=contrato.empresa_contratada,
        fabricante_id=contrato.fabricante_id,
        fabricante_nome=contrato.fabricante_rel.nome if contrato.fabricante_rel else None,
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
        projeto_origem=projeto_origem,
        acoes_pdtic_vinculadas=acoes_pdtic,
        equipe=equipe,
        historico=historico,
    )
