# ITER TIC - Models
from app.models.pdtic import PeriodoPdtic, RevisaoPdtic, AcaoPdtic  # noqa: F401
from app.models.pacc import ExercicioPacc, RevisaoPacc, ItemPacc  # noqa: F401
from app.models.projeto import (  # noqa: F401
    Servidor,
    Projeto,
    Artefato,
    HistoricoDataArtefato,
    projeto_acao_pdtic,
    projeto_item_pacc,
)
from app.models.fornecedor import Fornecedor  # noqa: F401
from app.models.catalogo import CatalogoProduto  # noqa: F401
from app.models.contrato import Contrato, ContratoEquipe  # noqa: F401
from app.models.configuracao import ConfiguracaoSistema  # noqa: F401
from app.models.usuario import Usuario  # noqa: F401
from app.models.auditoria import AuditoriaLog  # noqa: F401
from app.models.estrutura_organizacional import UnidadeOrganizacional  # noqa: F401

