import asyncio
from datetime import date, datetime
from decimal import Decimal
import random
from sqlalchemy.future import select
from app.database import engine, async_session_factory
from app.models.pdtic import PeriodoPdtic, RevisaoPdtic, AcaoPdtic
from app.models.pacc import ExercicioPacc, RevisaoPacc, ItemPacc
from app.models.projeto import (
    Servidor, Projeto, Artefato, ProjetoEquipe,
    TipoArtefatoEnum, StatusArtefatoEnum, PapelProjetoEnum, StatusProjetoEnum
)
from app.models.fornecedor import Fornecedor, NaturezaFornecedorEnum
from app.models.catalogo import CatalogoProduto
from app.models.contrato import (
    Contrato, ContratoEquipe, ItemContrato,
    ModalidadeContratoEnum, TipoContratoEnum, SituacaoContratoEnum, PapelEquipeEnum
)
from app.models.estrutura_organizacional import UnidadeOrganizacional
from app.models.enums import StatusAcaoEnum

async def seed():
    async_session = async_session_factory()
    async with async_session as session:
        async with session.begin():
            # 1. Fetch existing servers and organizational units
            res_org = await session.execute(select(UnidadeOrganizacional).limit(20))
            org_units = res_org.scalars().all()
            if not org_units:
                print("Error: No organizational units found in the database. Please make sure they are populated first.")
                return
            
            res_srv = await session.execute(select(Servidor).limit(20))
            servers = res_srv.scalars().all()
            if not servers:
                print("Error: No servers (servidores) found in the database. Please make sure they are populated first.")
                return

            print(f"Loaded {len(org_units)} organizational units and {len(servers)} servers.")

            # 2. Get or Create PeriodoPdtic and RevisaoPdtic
            res_period = await session.execute(select(PeriodoPdtic).limit(1))
            period = res_period.scalar_one_or_none()
            if not period:
                print("Creating default PeriodoPdtic 2024-2027...")
                period = PeriodoPdtic(ano_inicio=2024, ano_fim=2027, ativo=True)
                session.add(period)
                await session.flush()
            
            res_rev = await session.execute(select(RevisaoPdtic).filter_by(periodo_id=period.id).limit(1))
            revision = res_rev.scalar_one_or_none()
            if not revision:
                print("Creating default RevisaoPdtic...")
                revision = RevisaoPdtic(periodo_id=period.id, numero_revisao=0, descricao="Revisão Inicial")
                session.add(revision)
                await session.flush()

            # 3. Get or Create ExercicioPacc and RevisaoPacc
            res_exerc = await session.execute(select(ExercicioPacc).limit(1))
            exercicio = res_exerc.scalar_one_or_none()
            if not exercicio:
                print("Creating default ExercicioPacc 2026...")
                exercicio = ExercicioPacc(ano=2026, ativo=True)
                session.add(exercicio)
                await session.flush()
            
            res_rev_pacc = await session.execute(select(RevisaoPacc).filter_by(exercicio_id=exercicio.id).limit(1))
            rev_pacc = res_rev_pacc.scalar_one_or_none()
            if not rev_pacc:
                print("Creating default RevisaoPacc...")
                rev_pacc = RevisaoPacc(exercicio_id=exercicio.id, numero_revisao=0, descricao="Plano Inicial")
                session.add(rev_pacc)
                await session.flush()

            # 4. Create 10 CatalogoProduto
            catalog_data = [
                {"nome": "Servidor Rack Dell PowerEdge R760", "tipo": "PRODUTO"},
                {"nome": "Licença Microsoft 365 E5 Enterprise", "tipo": "PRODUTO"},
                {"nome": "Assinatura Red Hat Enterprise Linux Virtual Datacenter", "tipo": "PRODUTO"},
                {"nome": "Suporte Técnico de Banco de Dados Oracle", "tipo": "SERVICO"},
                {"nome": "Desenvolvimento de Software sob Medida (Fábrica de Software)", "tipo": "SERVICO"},
                {"nome": "Serviços de Nuvem AWS (Amazon Web Services)", "tipo": "SERVICO"},
                {"nome": "Firewall Fortinet FortiGate 200F", "tipo": "PRODUTO"},
                {"nome": "Licença de Antivírus Kaspersky Endpoint Security", "tipo": "PRODUTO"},
                {"nome": "Treinamento Oficial Cisco CCNP", "tipo": "SERVICO"},
                {"nome": "Link de Internet Dedicado 1Gbps", "tipo": "SERVICO"}
            ]
            catalog_products = []
            for item in catalog_data:
                res_exist = await session.execute(select(CatalogoProduto).filter_by(nome=item["nome"]).limit(1))
                prod = res_exist.scalar_one_or_none()
                if not prod:
                    prod = CatalogoProduto(nome=item["nome"], tipo=item["tipo"])
                    session.add(prod)
                    await session.flush()
                catalog_products.append(prod)
            print(f"Created/Verified {len(catalog_products)} catalog products.")

            # 5. Create 10 Fornecedores
            suppliers_data = [
                {"nome": "Tecnologia e Sistemas do Brasil Ltda", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "12.345.678/0001-90", "site": "www.tecbrasil.com.br", "email": "contato@tecbrasil.com.br", "telefone": "(61) 3222-1111"},
                {"nome": "SoftDistribuidora de Softwares S.A.", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "23.456.789/0001-01", "site": "www.softdist.com.br", "email": "vendas@softdist.com.br", "telefone": "(61) 3333-2222"},
                {"nome": "Redes e Telecomunicações Globais", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "34.567.890/0001-12", "site": "www.retglobais.com.br", "email": "comercial@retglobais.com.br", "telefone": "(11) 4004-3333"},
                {"nome": "Oracle do Brasil Sistemas Ltda", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "45.678.901/0001-23", "site": "www.oracle.com/br", "email": "gov_br@oracle.com", "telefone": "(11) 5189-1000"},
                {"nome": "Fábrica de Código & Inovação S/A", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "56.789.012/0001-34", "site": "www.fabricacodigo.com.br", "email": "projetos@fabricacodigo.com.br", "telefone": "(21) 2555-4444"},
                {"nome": "Nuvem Segura Soluções em Nuvem Ltda", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "67.890.123/0001-45", "site": "www.nuvemsegura.com.br", "email": "cloud@nuvemsegura.com.br", "telefone": "(61) 3444-5555"},
                {"nome": "CyberDef Segurança da Informação S/A", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "78.901.234/0001-56", "site": "www.cyberdef.com.br", "email": "seguranca@cyberdef.com.br", "telefone": "(11) 3888-6666"},
                {"nome": "Antivírus Distribuição Nacional Ltda", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "89.012.345/0001-67", "site": "www.avdistribuidora.com.br", "email": "licencas@avdistribuidora.com.br", "telefone": "(51) 3211-7777"},
                {"nome": "Instituto Federal de Capacitação de TI", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "90.123.456/0001-78", "site": "www.ifcti.org.br", "email": "treinamento@ifcti.org.br", "telefone": "(61) 3999-8888"},
                {"nome": "Telecomunicações do Planalto S.A.", "natureza": NaturezaFornecedorEnum.PESSOA_JURIDICA, "documento": "01.234.567/0001-89", "site": "www.teleplan.com.br", "email": "link@teleplan.com.br", "telefone": "(61) 3003-9999"}
            ]
            suppliers = []
            for idx, item in enumerate(suppliers_data):
                res_exist = await session.execute(select(Fornecedor).filter_by(nome=item["nome"]).limit(1))
                supp = res_exist.scalar_one_or_none()
                if not supp:
                    supp = Fornecedor(
                        nome=item["nome"],
                        natureza=item["natureza"],
                        documento=item["documento"],
                        site=item["site"],
                        email=item["email"],
                        telefone=item["telefone"],
                        contatos=[{
                            "nome": f"Contato {idx+1}",
                            "telefone": item["telefone"],
                            "email": item["email"],
                            "cargo": "Gerente de Contas"
                        }]
                    )
                    # Associate product to supplier portfolio
                    supp.portfolio.append(catalog_products[idx])
                    session.add(supp)
                    await session.flush()
                suppliers.append(supp)
            print(f"Created/Verified {len(suppliers)} suppliers.")

            # 6. Create 10 PDTIC Actions
            actions_data = [
                {
                    "codigo_acao": "AC-MOCK-01", "necessidade": "NEC-MOCK-01",
                    "descricao": "Migração dos sistemas legados para infraestrutura de Nuvem Pública/Híbrida.",
                    "tipo_necessidade": ["servico"], "status": StatusAcaoEnum.EM_ANDAMENTO,
                    "meta": "Migrar 100% dos sistemas web homologados.", "indicador": "Percentual de sistemas em nuvem",
                    "quantidade": "15 sistemas", "total_gut": 100,
                    "valores_investimento": {"2024": 500000.0, "2025": 300000.0},
                    "valores_custeio": {"2024": 100000.0, "2025": 120000.0}
                },
                {
                    "codigo_acao": "AC-MOCK-02", "necessidade": "NEC-MOCK-02",
                    "descricao": "Renovação do parque tecnológico de computadores corporativos das delegacias.",
                    "tipo_necessidade": ["hardware"], "status": StatusAcaoEnum.EM_ANDAMENTO,
                    "meta": "Distribuir 1500 novos computadores.", "indicador": "Computadores novos instalados",
                    "quantidade": "1500 unidades", "total_gut": 110,
                    "valores_investimento": {"2024": 7500000.0},
                    "valores_custeio": {"2024": 50000.0, "2025": 50000.0}
                },
                {
                    "codigo_acao": "AC-MOCK-03", "necessidade": "NEC-MOCK-03",
                    "descricao": "Aquisição de licenças corporativas de e-mail e produtividade em nuvem.",
                    "tipo_necessidade": ["software"], "status": StatusAcaoEnum.EM_ANDAMENTO,
                    "meta": "Atender a todos os servidores ativos.", "indicador": "Contas ativas de e-mail",
                    "quantidade": "5000 contas", "total_gut": 95,
                    "valores_investimento": {"2024": 0.0},
                    "valores_custeio": {"2024": 1200000.0, "2025": 1200000.0}
                },
                {
                    "codigo_acao": "AC-MOCK-04", "necessidade": "NEC-MOCK-04",
                    "descricao": "Contratação de suporte especializado e patches para o SGBD de investigação.",
                    "tipo_necessidade": ["software", "servico"], "status": StatusAcaoEnum.NAO_INICIADA,
                    "meta": "Garantir 99.9% de disponibilidade do banco de dados.", "indicador": "Tempo de atividade do SGBD",
                    "quantidade": "1 suporte", "total_gut": 80,
                    "valores_investimento": {"2025": 150000.0},
                    "valores_custeio": {"2024": 200000.0, "2025": 220000.0}
                },
                {
                    "codigo_acao": "AC-MOCK-05", "necessidade": "NEC-MOCK-05",
                    "descricao": "Contratação de fábrica de software para desenvolvimento dos sistemas policiais.",
                    "tipo_necessidade": ["servico"], "status": StatusAcaoEnum.EM_ANDAMENTO,
                    "meta": "Sustentação e evolução dos sistemas em produção.", "indicador": "Pontos de função entregues",
                    "quantidade": "3000 PF/ano", "total_gut": 105,
                    "valores_investimento": {"2024": 800000.0, "2025": 1000000.0},
                    "valores_custeio": {"2024": 300000.0, "2025": 300000.0}
                },
                {
                    "codigo_acao": "AC-MOCK-06", "necessidade": "NEC-MOCK-06",
                    "descricao": "Implantação de Firewall de próxima geração e serviços de SOC.",
                    "tipo_necessidade": ["hardware", "software", "servico"], "status": StatusAcaoEnum.EM_ANDAMENTO,
                    "meta": "Monitoramento de segurança cibernética 24x7.", "indicador": "SOC ativo",
                    "quantidade": "1 implantação", "total_gut": 120,
                    "valores_investimento": {"2024": 1500000.0},
                    "valores_custeio": {"2024": 400000.0, "2025": 450000.0}
                },
                {
                    "codigo_acao": "AC-MOCK-07", "necessidade": "NEC-MOCK-07",
                    "descricao": "Renovação e ampliação de licenças de antivírus corporativo.",
                    "tipo_necessidade": ["software"], "status": StatusAcaoEnum.CONTRATADA,
                    "meta": "Proteger todas as estações de trabalho.", "indicador": "Percentual de desktops protegidos",
                    "quantidade": "6000 licenças", "total_gut": 115,
                    "valores_investimento": {"2024": 250000.0},
                    "valores_custeio": {"2024": 50000.0}
                },
                {
                    "codigo_acao": "AC-MOCK-08", "necessidade": "NEC-MOCK-08",
                    "descricao": "Contratação de links dedicados de internet para redundância e estabilidade.",
                    "tipo_necessidade": ["servico"], "status": StatusAcaoEnum.CONTRATADA,
                    "meta": "Manter conectividade ativa ininterrupta.", "indicador": "Disponibilidade de internet",
                    "quantidade": "2 links dedicados", "total_gut": 90,
                    "valores_investimento": {"2024": 50000.0},
                    "valores_custeio": {"2024": 180000.0, "2025": 180000.0}
                },
                {
                    "codigo_acao": "AC-MOCK-09", "necessidade": "NEC-MOCK-09",
                    "descricao": "Programa de capacitação oficial em redes e segurança cibernética.",
                    "tipo_necessidade": ["servico"], "status": StatusAcaoEnum.NAO_INICIADA,
                    "meta": "Treinar corpo técnico especializado.", "indicador": "Total de servidores qualificados",
                    "quantidade": "30 treinamentos", "total_gut": 75,
                    "valores_investimento": {"2025": 80000.0},
                    "valores_custeio": {"2024": 0.0}
                },
                {
                    "codigo_acao": "AC-MOCK-10", "necessidade": "NEC-MOCK-10",
                    "descricao": "Assinaturas corporativas de SO Linux para servidores de infraestrutura.",
                    "tipo_necessidade": ["software"], "status": StatusAcaoEnum.CONTRATADA,
                    "meta": "Manter servidores em conformidade de licenciamento.", "indicador": "Percentual de servidores cobertos",
                    "quantidade": "80 assinaturas", "total_gut": 85,
                    "valores_investimento": {"2024": 180000.0},
                    "valores_custeio": {"2024": 20000.0}
                }
            ]
            actions = []
            for idx, item in enumerate(actions_data):
                res_exist = await session.execute(select(AcaoPdtic).filter_by(codigo_acao=item["codigo_acao"]).limit(1))
                act = res_exist.scalar_one_or_none()
                if not act:
                    act = AcaoPdtic(
                        codigo_acao=item["codigo_acao"],
                        necessidade=item["necessidade"],
                        descricao=item["descricao"],
                        tipo_necessidade=item["tipo_necessidade"],
                        status=item["status"],
                        meta=item["meta"],
                        indicador=item["indicador"],
                        quantidade=item["quantidade"],
                        total_gut=item["total_gut"],
                        valores_investimento=item["valores_investimento"],
                        valores_custeio=item["valores_custeio"],
                        periodo_id=period.id,
                        revisao_inclusao_id=revision.id
                    )
                    act.departamentos_rel.append(org_units[idx % len(org_units)])
                    act.unidades_demandantes_rel.append(org_units[(idx + 1) % len(org_units)])
                    act.unidades_responsaveis_rel.append(org_units[(idx + 2) % len(org_units)])
                    session.add(act)
                    await session.flush()
                actions.append(act)
            print(f"Created/Verified {len(actions)} PDTIC actions.")

            # 7. Create 10 PACC Items
            pacc_data = [
                {"numero_item": "M1", "descricao_demanda": "Serviços de Nuvem para Sistemas Web", "quantidade": "12 meses", "valor_estimado": 420000.00, "processo_sei": "00052-00003001/2026-10"},
                {"numero_item": "M2", "descricao_demanda": "Aquisição de computadores padrão desktop", "quantidade": "1500 unidades", "valor_estimado": 7500000.00, "processo_sei": "00052-00003002/2026-20"},
                {"numero_item": "M3", "descricao_demanda": "Renovação e aquisição de licenças Microsoft", "quantidade": "5000 usuários", "valor_estimado": 1200000.00, "processo_sei": "00052-00003003/2026-30"},
                {"numero_item": "M4", "descricao_demanda": "Licenciamento e suporte Oracle", "quantidade": "1 contrato", "valor_estimado": 350000.00, "processo_sei": "00052-00003004/2026-40"},
                {"numero_item": "M5", "descricao_demanda": "Serviços de Fábrica de Software", "quantidade": "3000 PF", "valor_estimado": 1100000.00, "processo_sei": "00052-00003005/2026-50"},
                {"numero_item": "M6", "descricao_demanda": "Aquisição de Firewall Fortinet", "quantidade": "2 unidades", "valor_estimado": 1500000.00, "processo_sei": "00052-00003006/2026-60"},
                {"numero_item": "M7", "descricao_demanda": "Proteção antivírus endpoint corporativo", "quantidade": "6000 licenças", "valor_estimado": 250000.00, "processo_sei": "00052-00003007/2026-70"},
                {"numero_item": "M8", "descricao_demanda": "Links Dedicados de Internet de Alta Velocidade", "quantidade": "24 meses", "valor_estimado": 230000.00, "processo_sei": "00052-00003008/2026-80"},
                {"numero_item": "M9", "descricao_demanda": "Capacitação oficial em redes e segurança", "quantidade": "30 vagas", "valor_estimado": 80000.00, "processo_sei": "00052-00003009/2026-90"},
                {"numero_item": "M10", "descricao_demanda": "Assinaturas do SO Red Hat Linux", "quantidade": "80 licenças", "valor_estimado": 200000.00, "processo_sei": "00052-00003010/2026-00"}
            ]
            pacc_items = []
            for idx, item in enumerate(pacc_data):
                res_exist = await session.execute(select(ItemPacc).filter_by(numero_item=item["numero_item"]).limit(1))
                pacc_item = res_exist.scalar_one_or_none()
                if not pacc_item:
                    pacc_item = ItemPacc(
                        numero_item=item["numero_item"],
                        descricao_demanda=item["descricao_demanda"],
                        quantidade=item["quantidade"],
                        valor_estimado=Decimal(item["valor_estimado"]),
                        processo_sei=item["processo_sei"],
                        exercicio_id=exercicio.id,
                        revisao_inclusao_id=rev_pacc.id,
                        acao_pdtic_id=actions[idx].id
                    )
                    session.add(pacc_item)
                    await session.flush()
                pacc_items.append(pacc_item)
            print(f"Created/Verified {len(pacc_items)} PACC items.")

            # 8. Create 10 Projects
            projects_data = [
                {"nome": "Projeto de Migração e Hospedagem em Nuvem Híbrida", "processo_sei": "00052-00004001/2026-15", "prioridade": "alta", "complexidade": "Complexa", "status": StatusProjetoEnum.CONTRATADO},
                {"nome": "Modernização das Estações de Trabalho (Desktops)", "processo_sei": "00052-00004002/2026-25", "prioridade": "alta", "complexidade": "Simples", "status": StatusProjetoEnum.CONTRATADO},
                {"nome": "Licenciamento Corporativo Microsoft 365", "processo_sei": "00052-00004003/2026-35", "prioridade": "media", "complexidade": "Intermediária", "status": StatusProjetoEnum.CONTRATADO},
                {"nome": "Suporte Técnico Oracle Database", "processo_sei": "00052-00004004/2026-45", "prioridade": "media", "complexidade": "Intermediária", "status": StatusProjetoEnum.CONTRATADO},
                {"nome": "Sustentação de Sistemas - Fábrica de Software", "processo_sei": "00052-00004005/2026-55", "prioridade": "alta", "complexidade": "Complexa", "status": StatusProjetoEnum.CONTRATADO},
                {"nome": "Segurança Perimetral e SOC (Firewall Fortinet)", "processo_sei": "00052-00004006/2026-65", "prioridade": "alta", "complexidade": "Complexa", "status": StatusProjetoEnum.CONTRATADO},
                {"nome": "Renovação da Licença de Endpoint Kaspersky", "processo_sei": "00052-00004007/2026-75", "prioridade": "alta", "complexidade": "Simples", "status": StatusProjetoEnum.CONTRATADO},
                {"nome": "Contratação de Links Dedicados de Internet", "processo_sei": "00052-00004008/2026-85", "prioridade": "media", "complexidade": "Simples", "status": StatusProjetoEnum.CONTRATADO},
                {"nome": "Programa de Capacitação da Diretoria de TI", "processo_sei": "00052-00004009/2026-95", "prioridade": "baixa", "complexidade": "Simples", "status": StatusProjetoEnum.CONTRATADO},
                {"nome": "Aquisição de Licenças Red Hat Linux", "processo_sei": "00052-00004010/2026-05", "prioridade": "media", "complexidade": "Simples", "status": StatusProjetoEnum.CONTRATADO}
            ]
            projects = []
            for idx, item in enumerate(projects_data):
                res_exist = await session.execute(select(Projeto).filter_by(processo_sei=item["processo_sei"]).limit(1))
                proj = res_exist.scalar_one_or_none()
                if not proj:
                    proj = Projeto(
                        nome=item["nome"],
                        processo_sei=item["processo_sei"],
                        prioridade=item["prioridade"],
                        complexidade=item["complexidade"],
                        status=item["status"]
                    )
                    proj.acoes_pdtic.append(actions[idx])
                    proj.itens_pacc.append(pacc_items[idx])
                    session.add(proj)
                    await session.flush()

                    req_member = ProjetoEquipe(
                        projeto_id=proj.id,
                        servidor_id=servers[idx % len(servers)].id,
                        papel=PapelProjetoEnum.REQUISITANTE,
                        is_titular=True
                    )
                    tec_member = ProjetoEquipe(
                        projeto_id=proj.id,
                        servidor_id=servers[(idx + 1) % len(servers)].id,
                        papel=PapelProjetoEnum.TECNICO,
                        is_titular=True
                    )
                    session.add_all([req_member, tec_member])
                    await session.flush()

                    for art_type in TipoArtefatoEnum:
                        artifact = Artefato(
                            projeto_id=proj.id,
                            tipo=art_type,
                            status=StatusArtefatoEnum.CONCLUIDO,
                            data_inicio=date(2025, 10, 1),
                            data_fim_prevista=date(2025, 10, 15),
                            data_conclusao=date(2025, 10, 14),
                            observacoes="Artefato de teste gerado pelo script."
                        )
                        session.add(artifact)
                    await session.flush()

                projects.append(proj)
            print(f"Created/Verified {len(projects)} projects.")

            # 9. Create 10 Contracts
            contracts_data = [
                {"numero": 201, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.CONTRATO, "tipo_contrato": TipoContratoEnum.SERVICO_CONTINUADO, "tipo_instrumento": "CONTRATO"},
                {"numero": 202, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.CONTRATO, "tipo_contrato": TipoContratoEnum.AQUISICAO, "tipo_instrumento": "CONTRATO"},
                {"numero": 203, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.ARP, "tipo_contrato": TipoContratoEnum.SUBSCRICAO, "orgao_gerenciador": "SEPLAN-DF"},
                {"numero": 204, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.CONTRATO, "tipo_contrato": TipoContratoEnum.SERVICO_CONTINUADO, "tipo_instrumento": "CONTRATO"},
                {"numero": 205, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.CONTRATO, "tipo_contrato": TipoContratoEnum.SERVICO_CONTINUADO, "tipo_instrumento": "CONTRATO"},
                {"numero": 206, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.CONTRATO, "tipo_contrato": TipoContratoEnum.AQUISICAO, "tipo_instrumento": "CONTRATO"},
                {"numero": 207, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.CONTRATO, "tipo_contrato": TipoContratoEnum.SUBSCRICAO, "tipo_instrumento": "NOTA_EMPENHO"},
                {"numero": 208, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.CONTRATO, "tipo_contrato": TipoContratoEnum.SERVICO_CONTINUADO, "tipo_instrumento": "CONTRATO"},
                {"numero": 209, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.CONTRATO, "tipo_contrato": TipoContratoEnum.SERVICO_CONTINUADO, "tipo_instrumento": "CONTRATO"},
                {"numero": 210, "ano": 2026, "modalidade_contrato": ModalidadeContratoEnum.CONTRATO, "tipo_contrato": TipoContratoEnum.SUBSCRICAO, "tipo_instrumento": "CONTRATO"}
            ]
            contracts = []
            for idx, item in enumerate(contracts_data):
                res_exist = await session.execute(select(Contrato).filter_by(numero=item["numero"], ano=item["ano"]).limit(1))
                contr = res_exist.scalar_one_or_none()
                if not contr:
                    contr = Contrato(
                        numero=item["numero"],
                        ano=item["ano"],
                        modalidade_contrato=item["modalidade_contrato"],
                        orgao_gerenciador=item.get("orgao_gerenciador"),
                        tipo_instrumento=item.get("tipo_instrumento"),
                        tipo_contratacao="Pregão Eletrônico",
                        projeto_id=projects[idx].id,
                        fornecedor_id=suppliers[idx].id,
                        tipo_fornecedor_contrato="REVENDEDOR",
                        tipo_contrato=item["tipo_contrato"],
                        data_assinatura=date(2026, 1, 15),
                        data_inicio_vigencia=date(2026, 1, 20),
                        data_fim_vigencia=date(2027, 1, 19),
                        vigencia_meses=12,
                        prorrogacao_meses=0,
                        situacao_atual=SituacaoContratoEnum.VIGENTE,
                        complexidade=["simples", "intermediaria", "complexa"][idx % 3]
                    )
                    session.add(contr)
                    await session.flush()

                    c_item = ItemContrato(
                        contrato_id=contr.id,
                        catalogo_produto_id=catalog_products[idx].id,
                        quantidade=random.randint(1, 10),
                        valor_unitario=Decimal(random.randint(10000, 150000)),
                        tipo_catalogo="CATMAT" if catalog_products[idx].tipo == "PRODUTO" else "CATSER",
                        codigo_catalogo=f"CAT-{random.randint(100000, 999999)}",
                        data_inicio_vigencia=contr.data_inicio_vigencia,
                        data_fim_vigencia=contr.data_fim_vigencia
                    )
                    session.add(c_item)
                    await session.flush()

                    roles = [
                        (PapelEquipeEnum.GESTOR, servers[idx % len(servers)].id),
                        (PapelEquipeEnum.FISCAL_REQUISITANTE, servers[(idx + 1) % len(servers)].id),
                        (PapelEquipeEnum.FISCAL_TECNICO, servers[(idx + 2) % len(servers)].id),
                        (PapelEquipeEnum.FISCAL_ADMINISTRATIVO, servers[(idx + 3) % len(servers)].id)
                    ]
                    for papel, srv_id in roles:
                        member = ContratoEquipe(
                            contrato_id=contr.id,
                            servidor_id=srv_id,
                            papel=papel,
                            is_titular=True
                        )
                        session.add(member)
                    await session.flush()
                contracts.append(contr)
            print(f"Created/Verified {len(contracts)} contracts.")

    print("\nSUCCESS: All 10 examples seeded in all modules!")

if __name__ == "__main__":
    asyncio.run(seed())
