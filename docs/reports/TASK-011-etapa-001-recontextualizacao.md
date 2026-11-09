# TASK-011 — Etapa 001 — Recontextualização e histórico

**Data:** 2026-11-08
**Branch:** task/TASK-011-relatorios-exportacoes-metricas
**Base:** TASK-008 em c1cb4b8320221f4d411a8f01d9f52fe42c361524
**Integração TASK-009:** fca96ed (merge de e7fb9d81a5c43f0869b489eb4ad47293634eec5e)
**HEAD após integração:** fca96ed

## Estado e dependências confirmados

| Dependência | Estado | Evidência |
|---|---|---|
| TASK-005 | DONE | Commit da tarefa é ancestral da base TASK-008. |
| TASK-007 | DONE | Commit da tarefa é ancestral da base TASK-008. |
| TASK-008 | DONE | Fechamento autorizado no commit c1cb4b8, integrado à base da TASK-011. |
| TASK-009 | DONE | Fechamento no commit e7fb9d8; integração gravada em fca96ed. |

git merge-base --is-ancestor retornou 0 para TASK-008 e TASK-009 após a integração. TASK-005 e TASK-007 também são ancestrais. O branch e checkout isolado foram criados sem usar o checkout principal da TASK-003.

## Rastreabilidade e fontes

TASK-011 implementa RF-018, RN-017, RNF-006 e UC-08. A captura de CartEvent pertence à TASK-008; a TASK-011 agrega seus registros. As fontes consultadas incluem AGENTS.md, README.md, TASKS.md, documentação TASK-011, migrations e código de pedidos/cuponagem, autorização Supabase e suítes TASK-008/009.

## Divergências de integração e resoluções

| Arquivo | Resolução aplicada |
|---|---|
| .github/workflows/ci.yml | Unificados os lint direcionados e a construção/smoke test OCI da TASK-009; jobs de integração TASK-008 e TASK-009 foram preservados. |
| README.md | RF-013/014 e UC-04/05 preservam regras de retirada/cancelamento da TASK-009; RF-015 e a parte de UC-03 preservam as regras aprovadas da TASK-008. Pendências antigas de ambas foram reconciliadas. |
| TASKS.md | Estados e histórico de cada tarefa foram combinados; TASK-008 e TASK-009 permanecem DONE; TASK-011 passa a IN_PROGRESS após DoR. |
| package.json | Scripts de teste e lint das duas tarefas foram unidos; não foram adicionadas dependências nesta integração. |
| src/lib/orders/types.ts | O status resolved e OrderItemLifecycle da TASK-009 foram combinados com os tipos de cotação/cupom existentes. |
| src/lib/orders/validation.ts | Validações de ações de pedido e cancelamento por linha da TASK-009 foram combinadas com o contrato de pedido/cupom da TASK-008. |
| Migration 202610290002_task008_coupons_cart_events.sql | O blob era idêntico nas duas branches; uma única migration permanece. A migration 202611020001_task009_order_lifecycle.sql foi integrada. |

O merge preservou os commits de ambas as linhas de histórico. O arquivo não rastreado supabase/snippets/ da fonte TASK-009 não foi integrado. O arquivo preexistente tests/task006/orders.validation.test.ts, que estava modificado mas fora do commit documental TASK-008, não foi incluído. Nenhum arquivo do checkout TASK-003 foi alterado.

## Escopo da TASK-011

Permitidos: consultas agregadas, filtros, geração de exportações XLSX/PDF e registro/auditoria de exportação. Proibidos: relatórios para equipe, exportações públicas, ocultar cancelamentos, tratar pedidos não pagos como faturamento ou exportar PII sem necessidade. Nenhuma implementação TASK-011 ocorreu nesta etapa.

## Evidências e limites

Integração Git, estado das dependências, inventário de fontes e diff documental foram inspecionados. Testes funcionais, migrations e serviços não foram executados nesta etapa. A origem dos resultados manuais de TASK-008/009 continua atribuída às respectivas operadoras/relatórios; não houve reexecução.

**GATE-001: APROVADO.** A Etapa 002 foi iniciada após confirmar as dependências e fontes.
