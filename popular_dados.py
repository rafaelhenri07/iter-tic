"""
ITER TIC - Script de populacao do banco de dados com dados ficticios realistas.
Simula um cenario de TI da Policia Civil do Distrito Federal (PCDF).
"""
import asyncio
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import text
from app.database import engine

# ============================================================================
#  DADOS FICTICIOS
# ============================================================================

SERVIDORES = [
    ("100001", "Carlos Eduardo Mendes",    "Agente de Policia",          "Chefe da DITEC",         "DITEC"),
    ("100002", "Fernanda Cristina Rocha",  "Escriva de Policia",        "Coord. de Projetos",     "DITEC"),
    ("100003", "Roberto Silva Neto",       "Agente de Policia",          "Chefe da GUT",           "DITEC/GUT"),
    ("100004", "Ana Beatriz Lima",         "Analista de Sistemas",       None,                     "DITEC/GUT"),
    ("100005", "Paulo Henrique Souza",     "Analista de Sistemas",       None,                     "DITEC/GUT"),
    ("100006", "Juliana Martins Costa",    "Escriva de Policia",        "Chefe da GCO",           "DITEC/GCO"),
    ("100007", "Marcos Vinicius Almeida",  "Agente de Policia",          None,                     "DITEC/GCO"),
    ("100008", "Tatiana Ferreira Gomes",   "Analista de Sistemas",       None,                     "DITEC/GCO"),
    ("100009", "Ricardo Oliveira",         "Agente de Policia",          "Chefe da GRS",           "DITEC/GRS"),
    ("100010", "Luciana Batista Pereira",  "Escriva de Policia",        None,                     "DITEC/GRS"),
    ("100011", "Eduardo Santos Barbosa",   "Analista de Sistemas",       None,                     "DITEC/GRS"),
    ("100012", "Camila Rodrigues",         "Agente de Policia",          None,                     "DITEC/GUT"),
    ("100013", "Gustavo Araujo Pinto",     "Agente de Policia",          None,                     "DITEC/GCO"),
    ("100014", "Mariana Lopes",            "Escriva de Policia",        None,                     "DITEC/GRS"),
    ("100015", "Felipe Cardoso",           "Analista de Sistemas",       None,                     "DITEC/GUT"),
    ("100016", "Bruna Nascimento",         "Agente de Policia",          None,                     "DITEC/GCO"),
    ("100017", "Thiago Ribeiro",           "Analista de Sistemas",       None,                     "DITEC/GRS"),
    ("100018", "Patricia Mendonca",        "Escriva de Policia",        "Assessora DITEC",        "DITEC"),
    ("100019", "Andre Luiz Teixeira",      "Agente de Policia",          None,                     "DITEC/GUT"),
    ("100020", "Vanessa Cunha",            "Analista de Sistemas",       None,                     "DITEC/GCO"),
]

PDTIC_ACOES = [
    # (cod, descricao, depto, unid_dem, unid_resp, necess, tipo_nec, status, meta, indicador, qtd, gut, prev_cont, prev_ren, inv_json, cust_json)
    ("A1", "Aquisicao de equipamentos de rede (switches, roteadores e access points)", "DITEC", "GUT", "GUT", "N001", "hardware", "Não iniciada", "Substituir 100% do parque de rede", "Qtd switches instalados", "60", 100, "06/2025", "06/2028", '{"2025": 250000, "2026": 100000}', '{}'),
    ("A2", "Contratacao de solucao de backup e recuperacao de desastres", "DITEC", "GRS", "GRS", "N002", "servico", "Em andamento", "Implantar backup integrado", "% Servidores cobertos", "1", 120, "03/2025", "03/2028", '{"2025": 890000}', '{}'),
    ("A3", "Aquisicao de estacoes de trabalho e notebooks para delegacias", "DITEC", "GUT", "GUT", "N003", "hardware", "Contratada", "Renovar 500 estacoes de trabalho", "Qtd equipamentos entregues", "500", 95, "01/2025", None, '{"2025": 1500000, "2026": 1200000}', '{}'),
    ("A4", "Contratacao de servico de suporte de infraestrutura de TI", "DITEC", "GCO", "GCO", "N004", "servico", "Em andamento", "Manter uptime 99.5%", "% Uptime mensal", "diversos", 115, "06/2025", "06/2028", '{}', '{"2025": 800000, "2026": 800000, "2027": 800000}'),
    ("A5", "Implantacao de sistema de videomonitoramento IP", "DITEC", "GRS", "GRS", "N005", "hardware", "Não iniciada", "Instalar 500 cameras em delegacias", "Qtd cameras ativas", "500", 125, "01/2026", "01/2029", '{"2026": 2500000}', '{}'),
    ("A6", "Aquisicao de licencas de software de escritorio (Microsoft 365)", "DITEC", "GCO", "GCO", "N006", "software", "Contrato vigente", "Licenciar 2000 usuarios", "Qtd licencas ativas", "2000", 110, "01/2025", "01/2028", '{}', '{"2025": 1200000, "2026": 1200000, "2027": 1200000}'),
    ("A7", "Contratacao de link de dados dedicado para unidades policiais", "DITEC", "GRS", "GRS", "N007", "comunicacao", "Em andamento", "Conectar 30 delegacias com 1Gbps", "Qtd links ativos", "30", 120, "03/2025", "03/2028", '{}', '{"2025": 1440000, "2026": 1440000, "2027": 1440000}'),
    ("A8", "Aquisicao de servidores para o data center institucional", "DITEC", "GUT", "GUT", "N008", "hardware", "Não iniciada", "Expandir capacidade computacional", "Qtd servidores novos", "20", 105, "06/2025", None, '{"2025": 960000}', '{}'),
    ("A9", "Contratacao de servico de conectividade movel (chips M2M e dados)", "DITEC", "GCO", "GCO", "N009", "comunicacao", "Contrato vigente", "Prover conectividade a 1500 dispositivos", "Qtd chips ativos", "1500", 85, "01/2025", "01/2028", '{}', '{"2025": 180000, "2026": 180000, "2027": 180000}'),
    ("A10", "Implantacao de solucao de seguranca de endpoint (EDR/XDR)", "DITEC", "GRS", "GRS", "N010", "software", "Não iniciada", "Proteger 2500 endpoints", "Qtd agentes instalados", "2500", 125, "01/2026", "01/2029", '{}', '{"2026": 625000, "2027": 625000, "2028": 625000}'),
    ("A11", "Aquisicao de scanners e impressoras de alto volume para pericia", "DITEC", "GUT", "GUT", "N011", "hardware", "Contratada", "Equipar 50 peritos", "Qtd scanners entregues", "50", 75, "06/2025", None, '{"2025": 225000}', '{}'),
    ("A12", "Contratacao de cloud publica (IaaS/PaaS) para sistemas auxiliares", "DITEC", "GRS", "GRS", "N012", "servico", "Não iniciada", "Migrar 10 sistemas para nuvem", "Qtd sistemas em cloud", "1", 110, "01/2026", "01/2029", '{}', '{"2026": 360000, "2027": 360000, "2028": 360000}'),
    ("A13", "Aquisicao de nobreaks e infraestrutura eletrica para salas-cofre", "DITEC", "GUT", "GUT", "N013", "hardware", "Não iniciada", "Garantir redundancia eletrica", "% Salas com redundancia", "4", 90, "03/2025", None, '{"2025": 320000}', '{}'),
    ("A14", "Contratacao de consultoria para adequacao a LGPD", "DITEC", "GCO", "GCO", "N014", "servico", "Contratada", "Adequar 100% dos processos", "% Adequacao LGPD", "1", 100, "06/2025", None, '{}', '{"2025": 480000}'),
    ("A15", "Implantacao de SIEM (Security Information and Event Management)", "DITEC", "GRS", "GRS", "N015", "software", "Não iniciada", "Monitorar todos os ativos criticos", "Qtd fontes de log integradas", "1", 115, "01/2026", "01/2029", '{}', '{"2026": 240000, "2027": 240000, "2028": 240000}'),
    ("A16", "Aquisicao de equipamentos de radio comunicacao digital", "DITEC", "GUT", "GUT", "N016", "comunicacao", "Em andamento", "Digitalizar 200 radios", "Qtd radios entregues", "200", 80, "01/2025", None, '{"2025": 600000}', '{}'),
    ("A17", "Contratacao de servico de impressao corporativa (outsourcing)", "DITEC", "GCO", "GCO", "N017", "servico", "Não iniciada", "Gerenciar 500 impressoras", "Qtd equipamentos gerenciados", "500", 65, "03/2025", "03/2028", '{}', '{"2025": 320000, "2026": 320000, "2027": 320000}'),
    ("A18", "Modernizacao do sistema de telefonia IP (PABX virtual)", "DITEC", "GRS", "GRS", "N018", "comunicacao", "Não iniciada", "Migrar 400 ramais para VoIP", "Qtd ramais VoIP ativos", "400", 70, "06/2025", None, '{"2025": 280000}', '{}'),
    ("A19", "Aquisicao de storage NAS/SAN para o data center", "DITEC", "GUT", "GUT", "N019", "hardware", "Não iniciada", "Expandir armazenamento em 200TB", "TB adicionais", "1", 105, "01/2026", None, '{"2026": 720000}', '{}'),
    ("A20", "Contratacao de fabrica de software para sistemas internos", "DITEC", "GCO", "GCO", "N020", "servico", "Não iniciada", "Desenvolver 5 sistemas", "Qtd sistemas entregues", "1", 120, "01/2025", "01/2028", '{}', '{"2025": 600000, "2026": 600000, "2027": 600000}'),
]

PACC_ITENS = [
    ("1",  "Switches gerenciaveis 48 portas PoE+",                     "50",       350000.00,  "A1",  "00052-00010001/2025-01"),
    ("2",  "Roteadores de borda com suporte BGP",                      "10",       180000.00,  "A1",  "00052-00010001/2025-01"),
    ("3",  "Solucao de backup em disco e fita LTO-9",                  "1",        890000.00,  "A2",  "00052-00010002/2025-02"),
    ("4",  "Notebooks Dell Latitude 5540",                              "200",     1200000.00,  "A3",  "00052-00010003/2025-03"),
    ("5",  "Desktops Dell OptiPlex 7010",                               "300",     1500000.00,  "A3",  "00052-00010003/2025-03"),
    ("6",  "Contrato de suporte N2/N3 infraestrutura",                 "diversos", 2400000.00,  "A4",  "00052-00010004/2025-04"),
    ("7",  "Cameras IP 4K com analitico embarcado",                     "500",     2500000.00,  "A5",  "00052-00010005/2026-01"),
    ("8",  "Licencas Microsoft 365 E5",                                 "2000",    3600000.00,  "A6",  "00052-00010006/2025-05\n00052-00010006/2025-06"),
    ("9",  "Links MPLS 1Gbps para 30 delegacias",                       "30",      4320000.00,  "A7",  "00052-00010007/2025-07"),
    ("10", "Servidores Dell PowerEdge R760",                            "20",       960000.00,  "A8",  "00052-00010008/2025-08"),
    ("11", "Chips M2M e pacotes de dados moveis",                       "1500",     540000.00,  "A9",  "00052-00010009/2025-09"),
    ("12", "Solucao CrowdStrike Falcon (EDR/XDR)",                     "2500",    1875000.00,  "A10", "00052-00010010/2026-02"),
    ("13", "Scanners Fujitsu fi-8170 de mesa",                          "50",       225000.00,  "A11", "00052-00010011/2025-10"),
    ("14", "Servicos Azure (IaaS/PaaS) 36 meses",                      "1",       1080000.00,  "A12", None),
    ("15", "Nobreaks 80kVA trifasico para sala-cofre",                  "4",        320000.00,  "A13", "00052-00010013/2025-11"),
    ("16", "Consultoria LGPD - 12 meses",                               "1",        480000.00,  "A14", "00052-00010014/2025-12"),
    ("17", "Plataforma SIEM Elastic Security",                          "1",        720000.00,  "A15", None),
    ("18", "Radios digitais Motorola DGP 8550",                         "200",      600000.00,  "A16", "00052-00010016/2025-13"),
    ("19", "Outsourcing de impressao - 500 equipamentos",               "500",      960000.00,  "A17", "00052-00010017/2025-14"),
    ("20", "Aparelhos telefone IP Grandstream GRP2614",                 "400",      280000.00,  "A18", "00052-00010018/2025-15"),
]

PROJETOS = [
    # (nome, processo_sei, complexidade, status, catmat, catser, int_req, int_tec, int_adm)
    ("Aquisicao de Switches e Roteadores de Rede",         "00052-00020001/2025-01", "media", "Em elaboracao",             "150792", None,    1, 3, 6),
    ("Backup Corporativo e Disaster Recovery",             "00052-00020002/2025-02", "alta",  "Em elaboracao",             None,     "27014", 2, 4, 6),
    ("Renovacao de Estacoes de Trabalho",                  "00052-00020003/2025-03", "baixa", "Pronto para contratacao",   "234460", None,    1, 5, 6),
    ("Suporte de Infraestrutura N2/N3",                    "00052-00020004/2025-04", "alta",  "Em licitacao",              None,     "27260", 2, 3, 7),
    ("Videomonitoramento IP Institucional",                "00052-00020005/2025-05", "alta",  "Em elaboracao",             "337560", None,    1, 4, 7),
    ("Licenciamento Microsoft 365",                        "00052-00020006/2025-06", "media", "Licitacao concluida",       None,     "27502", 2, 5, 8),
    ("Links de Dados MPLS para Delegacias",                "00052-00020007/2025-07", "alta",  "Em licitacao",              None,     "21881", 1, 3, 8),
    ("Servidores para Data Center",                        "00052-00020008/2025-08", "alta",  "Pronto para contratacao",   "486158", None,    2, 4, 7),
    ("Conectividade Movel M2M",                            "00052-00020009/2025-09", "media", "Licitacao concluida",       None,     "21890", 1, 5, 6),
    ("Seguranca de Endpoint EDR/XDR",                      "00052-00020010/2025-10", "alta",  "Em elaboracao",             None,     "27260", 2, 3, 8),
    ("Scanners para Pericia Criminal",                     "00052-00020011/2025-11", "baixa", "Licitacao concluida",       "320617", None,    1, 4, 6),
    ("Cloud Publica Azure (IaaS/PaaS)",                    "00052-00020012/2025-12", "alta",  "Em elaboracao",             None,     "27502", 2, 5, 7),
    ("Infraestrutura Eletrica Sala-Cofre",                 "00052-00020013/2025-13", "media", "Pronto para contratacao",   "347220", None,    1, 3, 7),
    ("Consultoria para Adequacao LGPD",                    "00052-00020014/2025-14", "media", "Licitacao concluida",       None,     "25291", 2, 4, 8),
    ("SIEM - Monitoramento de Seguranca",                  "00052-00020015/2025-15", "alta",  "Em elaboracao",             None,     "27260", 1, 5, 6),
    ("Radios Digitais para Comunicacao Tatica",            "00052-00020016/2025-16", "media", "Em licitacao",              "446016", None,    2, 3, 7),
    ("Outsourcing de Impressao Corporativa",               "00052-00020017/2025-17", "baixa", "Pronto para contratacao",   None,     "12700", 1, 4, 8),
    ("Telefonia IP - Modernizacao PABX",                   "00052-00020018/2025-18", "media", "Em elaboracao",             "403721", None,    2, 5, 6),
    ("Storage NAS/SAN para Data Center",                   "00052-00020019/2025-19", "alta",  "Em elaboracao",             "401369", None,    1, 3, 7),
    ("Fabrica de Software - Sistemas Internos",            "00052-00020020/2025-20", "alta",  "Suspenso",                  None,     "27502", 2, 4, 8),
]

CONTRATOS = [
    # projetos com status "Licitacao concluida": indices 5(id6),8(id9),10(id11),13(id14)
    # (num_contrato, projeto_idx, empresa, fabricante, tipo, qtd, tech, val_inv, val_cust, prazo, dt_ass, dt_fim, sit, gestor, f_req, f_tec, f_adm)
    ("01/2025", 6,  "Microsoft Informatica Ltda",             "Microsoft",    "Subscricao",        2000, "Microsoft 365 E5 + Azure AD P2",      0,         3600000.00, "12 meses renovavel por ate 48 meses", "2025-03-15", "2026-03-14", "Vigente",  1, 2, 5,  6),
    ("02/2025", 9,  "Vivo Telecomunicacoes S/A",              "Vivo",         "Servico continuado", 1500, "Chips M2M 4G/5G + planos de dados",   0,          540000.00, "24 meses renovavel",                  "2025-04-01", "2027-03-31", "Vigente",  1, 2, 3,  7),
    ("03/2025", 11, "Canon do Brasil Ind. e Com. Ltda",       "Fujitsu",      "Aquisicao",           50,  "Scanners fi-8170 de mesa",       225000.00,           0,    "Entrega unica + garantia 36 meses",   "2025-05-10", "2028-05-09", "Vigente",  2, 1, 4,  8),
    ("04/2025", 14, "KPMG Consultores Associados",            None,           "Servico continuado",   1,  "Consultoria LGPD e DPO as a Service", 0,       480000.00, "12 meses",                            "2025-06-01", "2026-05-31", "Vigente",  2, 1, 5,  6),
    ("05/2025", 6,  "Brasoftware Informatica S/A",            "Microsoft",    "Subscricao",         500, "Power BI Pro + Projeto Online",        0,        450000.00, "12 meses",                            "2025-07-01", "2026-06-30", "Vigente",  1, 2, 4,  7),
    ("06/2025", 9,  "Tim S/A",                                 "Tim",          "Servico continuado",  300, "Links 4G backup para viaturas",       0,        180000.00, "24 meses",                            "2025-08-15", "2027-08-14", "Vigente",  2, 1, 3,  8),
    ("07/2024", 6,  "Positivo Tecnologia S/A",                 "Positivo",     "Aquisicao",          100, "Tablets para boletim de ocorrencia", 350000.00,        0,    "Entrega unica + garantia 12 meses",   "2024-11-20", "2025-11-19", "Extinto, mas suporte vigente",  1, 2, 5,  6),
    ("08/2024", 11, "HP Brasil Ltda",                          "HP Inc",       "Aquisicao",          200, "Impressoras Multifuncionais A4",    180000.00,        0,    "Entrega unica + garantia 24 meses",   "2024-09-01", "2026-08-31", "Vigente",  2, 1, 4,  7),
    ("09/2025", 14, "Ernst & Young Auditores",                 None,           "Servico continuado",   1, "Auditoria de Seguranca da Informacao", 0,       320000.00, "6 meses",                             "2025-09-01", "2026-02-28", "Vigente",  1, 2, 3,  8),
    ("10/2025", 6,  "Dell Computadores do Brasil Ltda",        "Dell",         "Aquisicao",           50, "Notebooks Latitude 5550 reposicao", 250000.00,       0,    "Entrega unica + garantia 36 meses",   "2025-10-01", "2028-09-30", "Vigente",  2, 1, 5,  6),
    ("11/2024", 9,  "Claro S/A",                               "Claro",        "Servico continuado",  500, "Linhas moveis corporativas",         0,        360000.00, "24 meses",                            "2024-06-01", "2026-05-31", "Vigente",  1, 2, 4,  7),
    ("12/2025", 11, "Toshiba TEC Brasil S/A",                  "Canon",        "Aquisicao",           30,  "Scanners A3 para digitalizacao",   135000.00,        0,    "Entrega unica + garantia 24 meses",   "2025-11-01", "2027-10-31", "Vigente",  2, 1, 3,  8),
    ("13/2024", 14, "PwC Brasil Servicos Contabeis",           None,           "Servico continuado",   1,  "Assessment de maturidade LGPD",       0,       150000.00, "4 meses",                             "2024-07-01", "2024-10-31", "Extinto", 1, 2, 5,  6),
    ("14/2025", 6,  "Ingram Micro Brasil Ltda",                "VMware",       "Subscricao",          20, "VMware vSphere Enterprise Plus",      0,        380000.00, "36 meses",                            "2025-04-15", "2028-04-14", "Vigente",  2, 1, 4,  7),
    ("15/2025", 9,  "Oi S/A",                                  "Oi",           "Servico continuado",  10, "Links MPLS 100Mbps delegacias rurais", 0,       240000.00, "24 meses",                            "2025-06-01", "2027-05-31", "Vigente",  1, 2, 3,  8),
    ("16/2025", 11, "Lexmark International do Brasil Ltda",    "Lexmark",      "Aquisicao",           80, "Impressoras laser monocromaticas", 120000.00,        0,    "Entrega unica + garantia 12 meses",   "2025-08-01", "2026-07-31", "Vigente",  2, 1, 5,  6),
    ("17/2024", 14, "Deloitte Consultores Ltda",               None,           "Servico continuado",   1, "Plano de Continuidade de Negocios",   0,       280000.00, "8 meses",                             "2024-10-01", "2025-05-31", "Extinto", 1, 2, 4,  7),
    ("18/2025", 6,  "Lenovo Tecnologia Brasil Ltda",           "Lenovo",       "Aquisicao",          150, "ThinkPad T14s para investigadores", 900000.00,       0,    "Entrega unica + garantia 36 meses",   "2025-12-01", "2028-11-30", "Vigente",  2, 1, 3,  8),
    ("19/2025", 9,  "Embratel S/A",                            "Embratel",     "Servico continuado",   5, "Links dedicados 10Gbps backbone",     0,       720000.00, "36 meses",                            "2025-03-01", "2028-02-29", "Vigente",  1, 2, 5,  6),
    ("20/2025", 11, "Bematech S/A",                            "Elgin",        "Aquisicao",           20, "Leitores biometricos e crachas",    60000.00,        0,    "Entrega unica + garantia 12 meses",   "2025-09-15", "2026-09-14", "Vigente",  2, 1, 4,  7),
]


# Map status strings to Python-safe versions
TIPO_CONTRATO_MAP = {
    "Aquisicao": "Aquisição",
    "Servico continuado": "Serviço continuado",
    "Subscricao": "Subscrição",
}
SITUACAO_MAP = {
    "Vigente": "Vigente",
    "Extinto": "Extinto",
    "Extinto, mas suporte vigente": "Extinto, mas suporte vigente",
}
STATUS_PROJETO_MAP = {
    "Em elaboracao":           "Em elaboração",
    "Pronto para contratacao": "Pronto para contratação",
    "Em licitacao":            "Em licitação",
    "Licitacao concluida":     "Licitação concluída",
    "Suspenso":                "Suspenso",
    "Cancelado":               "Cancelado",
}


async def popular():
    print("=" * 70)
    print("  POPULANDO BANCO DE DADOS COM DADOS FICTICIOS")
    print("=" * 70)

    async with engine.begin() as conn:
        # ================================================================
        # 1. SERVIDORES (20)
        # ================================================================
        print("\n  [1/7] Inserindo Servidores...")
        for mat, nome, cargo, funcao, lotacao in SERVIDORES:
            await conn.execute(text("""
                INSERT INTO servidores (matricula, nome, cargo, funcao, lotacao)
                VALUES (:mat, :nome, :cargo, :funcao, :lotacao)
            """), {"mat": mat, "nome": nome, "cargo": cargo, "funcao": funcao, "lotacao": lotacao})
        print(f"         {len(SERVIDORES)} servidores inseridos.")

        # ================================================================
        # 2. PDTIC: Periodo + Revisoes + Acoes (20)
        # ================================================================
        print("\n  [2/7] Inserindo PDTIC (periodo, revisoes, acoes)...")
        
        # Periodo 2025-2028
        result = await conn.execute(text("""
            INSERT INTO pdtic_periodos (ano_inicio, ano_fim, ativo)
            VALUES (2025, 2028, true) RETURNING id
        """))
        periodo_id = result.scalar_one()

        # Revisoes: Aprovacao Inicial + Revisao 1 + Revisao 2
        rev_ids = []
        for num, desc, dt in [(0, "Aprovacao Inicial do PDTIC 2025-2028", date(2025, 1, 15)),
                               (1, "Revisao 1 - Ajustes orcamentarios",   date(2025, 6, 30)),
                               (2, "Revisao 2 - Novas demandas 2026",     date(2026, 1, 10))]:
            result = await conn.execute(text("""
                INSERT INTO pdtic_revisoes (periodo_id, numero_revisao, data_aprovacao, descricao)
                VALUES (:pid, :num, :dt, :desc) RETURNING id
            """), {"pid": periodo_id, "num": num, "dt": dt, "desc": desc})
            rev_ids.append(result.scalar_one())

        # Acoes
        import json
        acao_id_map = {}
        for i, (cod, desc, depto, unid_dem, unid_resp, necess, tipo_nec, status_a, meta, indicador, qtd, gut, prev_cont, prev_ren, inv_json, cust_json) in enumerate(PDTIC_ACOES):
            rev_inc = rev_ids[0] if i < 14 else rev_ids[1] if i < 18 else rev_ids[2]
            result = await conn.execute(text("""
                INSERT INTO pdtic_acoes 
                    (periodo_id, codigo_acao, descricao, departamento, unidade_demandante,
                     unidade_responsavel, necessidade, tipo_necessidade, status, meta,
                     indicador, quantidade, total_gut, previsao_contratacao, previsao_renovacao,
                     valores_investimento, valores_custeio, revisao_inclusao_id)
                VALUES (:pid, :cod, :desc, :depto, :unid_dem, :unid_resp, :necess, :tipo_nec,
                        :status_a, :meta, :indicador, :qtd, :gut, :prev_cont, :prev_ren,
                        CAST(:inv AS JSONB), CAST(:cust AS JSONB), :rev_inc)
                RETURNING id
            """), {"pid": periodo_id, "cod": cod, "desc": desc, "depto": depto,
                   "unid_dem": unid_dem, "unid_resp": unid_resp, "necess": necess,
                   "tipo_nec": tipo_nec, "status_a": status_a, "meta": meta,
                   "indicador": indicador, "qtd": qtd, "gut": gut,
                   "prev_cont": prev_cont, "prev_ren": prev_ren,
                   "inv": inv_json, "cust": cust_json, "rev_inc": rev_inc})
            acao_id_map[cod] = result.scalar_one()
        print(f"         1 periodo, 3 revisoes, {len(PDTIC_ACOES)} acoes inseridas.")

        # ================================================================
        # 3. PACC: Exercicio + Revisoes + Itens (20)
        # ================================================================
        print("\n  [3/7] Inserindo PACC (exercicio, revisoes, itens)...")
        
        result = await conn.execute(text("""
            INSERT INTO pacc_exercicios (ano, ativo) VALUES (2025, true) RETURNING id
        """))
        exercicio_id = result.scalar_one()

        pacc_rev_ids = []
        for num, desc, dt in [(0, "Aprovacao Inicial PACC 2025", date(2025, 1, 20)),
                               (1, "Revisao 1 - Inclusao de novos itens", date(2025, 7, 15)),
                               (2, "Revisao 2 - Ajustes quantitativos",   date(2026, 1, 20))]:
            result = await conn.execute(text("""
                INSERT INTO pacc_revisoes (exercicio_id, numero_revisao, data_aprovacao, descricao)
                VALUES (:eid, :num, :dt, :desc) RETURNING id
            """), {"eid": exercicio_id, "num": num, "dt": dt, "desc": desc})
            pacc_rev_ids.append(result.scalar_one())

        for i, (num_item, desc, qtd, valor, acao_cod, sei) in enumerate(PACC_ITENS):
            acao_id = acao_id_map[acao_cod]
            rev_inc = pacc_rev_ids[0] if i < 13 else pacc_rev_ids[1] if i < 17 else pacc_rev_ids[2]
            await conn.execute(text("""
                INSERT INTO pacc_itens 
                    (exercicio_id, numero_item, descricao_demanda, quantidade, 
                     valor_estimado, processo_sei, acao_pdtic_id, revisao_inclusao_id)
                VALUES (:eid, :num, :desc, :qtd, :val, :sei, :acao, :rev)
            """), {"eid": exercicio_id, "num": num_item, "desc": desc, "qtd": qtd,
                   "val": valor, "sei": sei, "acao": acao_id, "rev": rev_inc})
        print(f"         1 exercicio, 3 revisoes, {len(PACC_ITENS)} itens inseridos.")

        # ================================================================
        # 4. PROJETOS (20)
        # ================================================================
        print("\n  [4/7] Inserindo Projetos...")
        projeto_ids = []
        for nome, sei, compl, status, catmat, catser, req, tec, adm in PROJETOS:
            status_db = STATUS_PROJETO_MAP[status]
            result = await conn.execute(text("""
                INSERT INTO projetos 
                    (nome, processo_sei, complexidade, status, catmat, catser,
                     integrante_requisitante_id, integrante_tecnico_id, integrante_administrativo_id)
                VALUES (:nome, :sei, :compl, :status, :catmat, :catser, :req, :tec, :adm)
                RETURNING id
            """), {"nome": nome, "sei": sei, "compl": compl, "status": status_db,
                   "catmat": catmat, "catser": catser, "req": req, "tec": tec, "adm": adm})
            projeto_ids.append(result.scalar_one())
        print(f"         {len(PROJETOS)} projetos inseridos.")

        # ================================================================
        # 5. ARTEFATOS (5 por projeto = 100 artefatos)
        # ================================================================
        print("\n  [5/7] Inserindo Artefatos...")
        artefato_count = 0
        tipos_artefato = ["DFD", "ETP", "Mapa de Riscos", "Estimativa de Custos e Orçamento", "TR"]
        status_artefato_pool = ["Não iniciado", "Iniciado", "Concluído"]

        for idx, pid in enumerate(projeto_ids):
            # Determine artefact statuses based on project status
            proj_status = PROJETOS[idx][3]
            for j, tipo in enumerate(tipos_artefato):
                if proj_status in ("Licitacao concluida", "Pronto para contratacao"):
                    st = "Concluído"
                    dt_ini = date(2025, 1 + j, 5)
                    dt_conc = date(2025, 2 + j, 15)
                elif proj_status == "Em licitacao":
                    st = "Concluído"
                    dt_ini = date(2025, 1 + j, 5) 
                    dt_conc = date(2025, 2 + j, 15)
                elif proj_status == "Suspenso":
                    st = "Iniciado" if j < 2 else "Não iniciado"
                    dt_ini = date(2025, 3, 10) if st == "Iniciado" else None
                    dt_conc = None
                else:  # Em elaboracao
                    if j == 0:
                        st = "Concluído"
                        dt_ini = date(2025, 2, 1)
                        dt_conc = date(2025, 3, 15)
                    elif j <= 2:
                        st = "Iniciado"
                        dt_ini = date(2025, 4, 1)
                        dt_conc = None
                    else:
                        st = "Não iniciado"
                        dt_ini = None
                        dt_conc = None

                await conn.execute(text("""
                    INSERT INTO artefatos (projeto_id, tipo, status, data_inicio, data_conclusao)
                    VALUES (:pid, :tipo, :st, :di, :dc)
                """), {"pid": pid, "tipo": tipo, "st": st, "di": dt_ini, "dc": dt_conc})
                artefato_count += 1
        print(f"         {artefato_count} artefatos inseridos (5 por projeto).")

        # ================================================================
        # 6. CONTRATOS (20)
        # ================================================================
        print("\n  [6/7] Inserindo Contratos...")
        for (num, proj_idx, empresa, fab, tipo, qtd, tech, 
             val_inv, val_cust, prazo, dt_ass, dt_fim, sit,
             gestor, f_req, f_tec, f_adm) in CONTRATOS:
            tipo_db = TIPO_CONTRATO_MAP[tipo]
            sit_db = SITUACAO_MAP[sit]
            proj_id = projeto_ids[proj_idx - 1]  # 1-indexed in data
            await conn.execute(text("""
                INSERT INTO contratos 
                    (numero_contrato, projeto_id, empresa_contratada, fabricante,
                     tipo_contrato, quantidade, tecnologia_utilizada,
                     valor_investimento, valor_custeio, prazo,
                     data_assinatura, data_fim_vigencia, situacao_atual,
                     gestor_id, fiscal_requisitante_id, fiscal_tecnico_id, fiscal_administrativo_id)
                VALUES (:num, :pid, :emp, :fab, :tipo, :qtd, :tech,
                        :vi, :vc, :prazo, :da, :df, :sit,
                        :ges, :freq, :ftec, :fadm)
            """), {"num": num, "pid": proj_id, "emp": empresa, "fab": fab,
                   "tipo": tipo_db, "qtd": qtd, "tech": tech,
                   "vi": val_inv, "vc": val_cust, "prazo": prazo,
                   "da": date.fromisoformat(dt_ass), "df": date.fromisoformat(dt_fim), "sit": sit_db,
                   "ges": gestor, "freq": f_req, "ftec": f_tec, "fadm": f_adm})
        print(f"         {len(CONTRATOS)} contratos inseridos.")

        # ================================================================
        # 7. HISTORICO DE CONTRATOS (alguns registros)
        # ================================================================
        print("\n  [7/7] Inserindo historico de contratos...")
        hist_count = 0
        # Query contract IDs
        result = await conn.execute(text("SELECT id, numero_contrato FROM contratos ORDER BY id"))
        contratos_db = result.fetchall()
        
        historicos = [
            "Contrato assinado e publicado no DOU.",
            "Ordem de servico inicial emitida.",
            "Primeira medicao de desempenho realizada.",
            "Aditivo de prazo solicitado pela contratada.",
            "Reuniao de acompanhamento mensal realizada.",
        ]
        for c_id, c_num in contratos_db[:15]:
            for h_idx, obs in enumerate(historicos[:3]):
                await conn.execute(text("""
                    INSERT INTO contrato_historico (contrato_id, autor, tipo_registro, conteudo)
                    VALUES (:cid, :autor, :tipo, :cont)
                """), {"cid": c_id, "autor": "Usuario do Sistema", 
                       "tipo": "Observação Manual", "cont": f"{obs}"})
                hist_count += 1
        print(f"         {hist_count} registros de historico inseridos.")

    print("\n" + "=" * 70)
    print("  CONCLUIDO! Banco populado com sucesso.")
    print("  Resumo:")
    print(f"    - Servidores:   {len(SERVIDORES)}")
    print(f"    - PDTIC Acoes:  {len(PDTIC_ACOES)}")
    print(f"    - PACC Itens:   {len(PACC_ITENS)}")
    print(f"    - Projetos:     {len(PROJETOS)}")
    print(f"    - Artefatos:    {artefato_count}")
    print(f"    - Contratos:    {len(CONTRATOS)}")
    print(f"    - Historico:    {hist_count}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(popular())
