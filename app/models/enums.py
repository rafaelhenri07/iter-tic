"""
ITER TIC - Enumerações do módulo PDTIC (Planejamento Estratégico)
"""

import enum


class TipoNecessidadeEnum(str, enum.Enum):
    """Classificação do tipo de necessidade da ação PDTIC."""
    HARDWARE = "hardware"
    SOFTWARE = "software"
    SERVICO = "servico"
    COMUNICACAO = "comunicacao"
    CAPACITACAO = "capacitacao"
    OUTROS = "outros"


class StatusAcaoEnum(str, enum.Enum):
    """Status do ciclo de vida da ação PDTIC."""
    NAO_INICIADA = "Não iniciada"
    EM_ANDAMENTO = "Em andamento"
    CONTRATADA = "Contratada"
    CONTRATO_VIGENTE = "Contrato vigente"
    CONTRATO_A_SER_RENOVADO = "Contrato a ser renovado"
