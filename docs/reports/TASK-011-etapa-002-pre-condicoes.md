# TASK-011 — Etapa 002 — Pré-condições e Definition of Ready

**Data:** 2026-11-08
**Branch:** task/TASK-011-relatorios-exportacoes-metricas
**GATE-002:** APROVADO

## Checklist do DoR

| Critério | Resultado | Evidência |
|---|---|---|
| Autorização da tarefa e branch dedicada | PASS | Solicitação explícita para executar TASK-011 até o início dos testes manuais; branch própria task/TASK-011-relatorios-exportacoes-metricas. |
| Dependências | PASS | TASK-005, TASK-007, TASK-008 e TASK-009 constam DONE; commits das TASK-008/009 integrados e ancestrais da branch. |
| Rastreabilidade | PASS | RF-018, RN-017, RNF-006 e UC-08 existem e descrevem painel administrativo, métricas e exportações. |
| Regras de negócio | PASS | As três decisões abaixo foram aprovadas previamente pela solicitante e estão registradas em README.md e TASKS.md; não há decisão essencial pendente para esta implementação. |
| Escopo | PASS | Consultas agregadas, filtros, exportação XLSX/PDF e registro de exportação são permitidos. Acesso somente admin, cancelamentos visíveis e minimização de PII mantidos como critérios obrigatórios. |
| Dados e privacidade | PASS | Desenvolvimento e testes usam dados sintéticos. Relatórios/exportações excluem nome, contato, CPF e endereço; referência opaca somente quando necessária. |
| Ambiente e validação | PASS | Repositório dispõe de Supabase local e jobs efêmeros de CI para integração; suítes dependentes estão presentes na base integrada. Credenciais de produção e serviços pagos não são necessários. |
| Dependências de biblioteca/provedor | PASS | Escolha de bibliotecas de geração fica na implementação, conforme dependências disponíveis e lockfile. Não há provedor externo, envio, cobrança ou serviço pago obrigatório. |

## Decisões de negócio aprovadas

1. Semana: segunda a domingo; fuso America/Sao_Paulo. Mês: mês civil no mesmo fuso.
2. Faturamento: pedidos com pagamento confirmado, valor líquido do cupom; pedido não pago ou cancelado antes do pagamento é excluído. Data de criação e data de confirmação do pagamento são dimensões distintas. Cancelamento pós-pagamento fica separado e não presume reembolso.
3. Privacidade: exportações agregadas, com referência opaca somente quando necessária; sem nome, contato, CPF ou endereço.

## Critérios de aceite e limites

Relatórios semanais/mensais por datas de criação e pagamento, indicadores de produtos vendidos, eventos CartEvent de carrinho/favoritos, filtros consistentes, exportação Excel/PDF e autorização exclusiva de admin. Exports devem ser temporários e protegidos, com registro de auditoria. A implementação não poderá alterar TASK-003/006/008/009 fora da integração já concluída nem enfraquecer seus contratos.

## Validação desta etapa

Somente documentação, dependências, histórico Git, scripts e configuração foram inspecionados. Nenhum teste, migration, worker, serviço ou operação de dados foi executado. Isso é intencional para o DoR; tais verificações serão realizadas conforme o plano e gates das etapas posteriores.

**GATE-002: APROVADO.** DoR completo; TASK-011 permanece IN_PROGRESS. Etapa 003 habilitada.
