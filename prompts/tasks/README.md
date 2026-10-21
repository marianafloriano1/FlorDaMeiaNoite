# Índice global — prompts operacionais das TASKs

Prompts para execução futura. Geração não executa TASKs, altera estado ou constitui autorização. Fontes: `../../TASKS.md`, `../../AGENTS.md`, `../../README.md`, `../../docs/adr/` e arquitetura.

| TASK | Descrição | Etapas | Dependências e estado de origem | Pasta | Primeiro prompt |
|---|---|---:|---|---|---|
| TASK-001 | Base do repositório e ambientes: estruturar aplicação e automação de desenvolvimento/implantação com ambientes separados de teste e produção. | 7 | nenhuma; READY | `task-001/` | [`prompt-task-001-etapa-001-recontextualizacao.md`](task-001/prompt-task-001-etapa-001-recontextualizacao.md) |
| TASK-002 | Persistência PostgreSQL e migrations base: definir conexão segura, migrations e convenções transacionais sem criar todas as entidades funcionais. | 7 | TASK-001; BLOCKED | `task-002/` | [`prompt-task-002-etapa-001-recontextualizacao.md`](task-002/prompt-task-002-etapa-001-recontextualizacao.md) |
| TASK-003 | Contas, autenticação e autorização por função: implementar cadastro/verificação, recuperação de senha, perfil e papéis Cliente/Funcionário/Administrador. | 7 | TASK-002; BLOCKED | `task-003/` | [`prompt-task-003-etapa-001-recontextualizacao.md`](task-003/prompt-task-003-etapa-001-recontextualizacao.md) |
| TASK-004 | Catálogo, mídia, busca e traduções: criar catálogo com categorias fixas, conteúdo completo, pesquisa/filtros e tradução automática em quatro idiomas. | 7 | TASK-002; BLOCKED | `task-004/` | [`prompt-task-004-etapa-001-recontextualizacao.md`](task-004/prompt-task-004-etapa-001-recontextualizacao.md) |
| TASK-005 | Carrinho, favoritos e reserva concorrente: persistir carrinho/favoritos e reservar unidades escolhidas por três horas sem saldo negativo. | 7 | TASK-002, TASK-003, TASK-004; BLOCKED | `task-005/` | [`prompt-task-005-etapa-001-recontextualizacao.md`](task-005/prompt-task-005-etapa-001-recontextualizacao.md) |
| TASK-006 | Pedido e transição para WhatsApp: vincular pedido ao cliente, criar resumo para WhatsApp e suportar conferência por funcionário e aprovação/confirmação pelo administrador. | 7 | TASK-003, TASK-005; BLOCKED | `task-006/` | [`prompt-task-006-etapa-001-recontextualizacao.md`](task-006/prompt-task-006-etapa-001-recontextualizacao.md) |
| TASK-007 | Painel de produtos, estoque e auditoria: permitir cadastro/edição de produtos e estoque com histórico justificável. | 7 | TASK-003, TASK-004, TASK-005; BLOCKED | `task-007/` | [`prompt-task-007-etapa-001-recontextualizacao.md`](task-007/prompt-task-007-etapa-001-recontextualizacao.md) |
| TASK-008 | Cupons e indicadores de carrinho/favoritos: administrar cupons e aplicar descontos válidos; registrar eventos de carrinho/favoritos para relatório. | 7 | TASK-003, TASK-005; BLOCKED | `task-008/` | [`prompt-task-008-etapa-001-recontextualizacao.md`](task-008/prompt-task-008-etapa-001-recontextualizacao.md) |
| TASK-009 | Gestão de pedido, retirada e cancelamentos: concluir preparação/retirada, agenda, cancelamento e retorno seletivo de estoque. | 7 | TASK-006, TASK-007; BLOCKED | `task-009/` | [`prompt-task-009-etapa-001-recontextualizacao.md`](task-009/prompt-task-009-etapa-001-recontextualizacao.md) |
| TASK-010 | Verificação e notificações agendadas: envio confiável de mensagens de verificação, status, retirada e alertas de prazo. | 7 | TASK-003, TASK-006, TASK-009; BLOCKED | `task-010/` | [`prompt-task-010-etapa-001-recontextualizacao.md`](task-010/prompt-task-010-etapa-001-recontextualizacao.md) |
| TASK-011 | Relatórios, exportações e métricas: relatórios semanais/mensais e exportações Excel/PDF disponíveis apenas ao administrador. | 7 | TASK-005, TASK-007, TASK-008, TASK-009; BLOCKED | `task-011/` | [`prompt-task-011-etapa-001-recontextualizacao.md`](task-011/prompt-task-011-etapa-001-recontextualizacao.md) |
| TASK-012 | Direção visual, idiomas e acessibilidade: aplicar identidade visual gótica/industrial e experiência não convencional sem comprometer compra acessível. | 7 | TASK-001, TASK-004; BLOCKED | `task-012/` | [`prompt-task-012-etapa-001-recontextualizacao.md`](task-012/prompt-task-012-etapa-001-recontextualizacao.md) |
| TASK-013 | Segurança, backup, observabilidade e recuperação: preparar proteção e operação para produção confiável e permitir recuperação em RTO ≤24h. | 7 | TASK-001, TASK-002, TASK-003, TASK-005; BLOCKED | `task-013/` | [`prompt-task-013-etapa-001-recontextualizacao.md`](task-013/prompt-task-013-etapa-001-recontextualizacao.md) |
| TASK-014 | Migração operacional de catálogo: preparar processo seguro para funcionários cadastrar produtos, fotos, descrições e saldo manualmente. | 7 | TASK-004, TASK-007, TASK-012; BLOCKED | `task-014/` | [`prompt-task-014-etapa-001-recontextualizacao.md`](task-014/prompt-task-014-etapa-001-recontextualizacao.md) |
| TASK-015 | Capacidade, aceitação ponta a ponta e prontidão de lançamento: validar requisitos integrados e preparar lançamento controlado. | 7 | TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013, TASK-014; BLOCKED | `task-015/` | [`prompt-task-015-etapa-001-recontextualizacao.md`](task-015/prompt-task-015-etapa-001-recontextualizacao.md) |

## Workflow e gates

Cada TASK segue 7 etapas: recontextualização/histórico → pré-condições/decisões → planejamento → implementação → revisão → testes manuais → conclusão. Cada etapa tem gate, diagnóstico/correção/reexecução, Scope Escalation e bloco de resultado. Não se avança sem evidência.

A etapa de testes prepara roteiro/scripts adequados à tecnologia encontrada para execução manual em Windows→WSL→Linux. Testes não executados bloqueiam o gate. Nenhuma TASK seguinte inicia automaticamente.

## Limitações e pendências

- O checkout inspecionado não possui `.git`; branch, working tree, commits e diffs não puderam ser verificados. Prompts requerem checagem no checkout futuro.
- Pendências de negócio/infraestrutura no README/TASKS permanecem sem decisão e bloqueiam apenas as tarefas correspondentes.
- Na captura consultada, TASK-001 está READY e TASK-002..015 estão BLOCKED; estados devem ser relidos antes de execução.
