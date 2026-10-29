# TASK-006 — Etapa 006 — Relatório de validação manual

**Data/hora da reconciliação documental:** 2026-10-28 23:26:44 America/Sao_Paulo (2026-10-29 02:26:44 UTC)
**Data de execução declarada pela usuária:** 29/10/2026; horário exato não informado.
**Ambiente declarado:** Supabase PostgreSQL / SQL Editor; `project_id` e identificação da stack não fornecidos.
**Branch/HEAD de referência:** `task/TASK-006-checkout-pedidos` / `73225c6a5df44245f6d6b059b95cf11df39800c1` (HEAD consultado).
**Estado do checkout:** working tree suja; a fonte manual não permite vincular a execução ao estado local completo.
**Fonte dos resultados manuais:** relatório de auditoria e complementos fornecidos pela usuária; não reexecutados pelo Codex.
**Status da Etapa/GATE-006:** APROVADA conforme evidência reportada pela usuária.

## Escopo e método

A revisão documental comparou o relatório fornecido com o roteiro, a rota de criação de pedido e as migrations do checkout atual. Não foram executados testes, chamadas de negócio, consultas SQL, migrations, worker, build ou serviços nesta auditoria. Os resultados manuais são atribuídos à usuária. A inspeção de código confirma o contrato e a nomenclatura atual, mas não é apresentada como execução manual.

## Resultados T001–T011

| ID | Status | Evidência reportada e reconciliação com o esquema |
|---|---|---|
| T001 | PASS — reportado | Pedido criado a partir de reserva válida, estado inicial `awaiting_payment`, sem segunda baixa de estoque. |
| T002 | PASS — reportado | Preço recalculado/snapshot e novo consentimento após mudança; valores do pedido são `orders.total_brl` e `order_items.unit_price_brl`. |
| T003 | PASS — reportado | Divergência de cotação bloqueada. A rota/RPC usa `order_quote_changed` e HTTP 409; relatório declara a validação aprovada. |
| T004 | PASS — reportado | Retry da mesma `idempotency_key` retorna o pedido original sem duplicação. Campo real da RPC: `idempotent_replay` (não `is_replay`); `POST /api/orders` responde HTTP 200 no replay e HTTP 201 na criação inicial. Sem captura HTTP bruta no material recebido; status é atribuído ao relato manual e o mapeamento foi conferido no código. |
| T005 | PASS — reportado | Employee realizou conferência. O esquema usa `order_inspections.items_confirmed`, `approved_by` e `approved_at`; não há coluna `conference_status`. |
| T006 | PASS — reportado | Ação sensível de admin condicionada a MFA recente. Esquema real: `admin_auth_sessions.mfa_verified_at` e `orders.payment_confirmed_at`; não existem `admin_mfa_verified` ou `payment_status`. |
| T007 | PASS — reportado | Pagamento `2026-10-29 01:46:22.266467+00`; janela `02:46:22.266467+00` a `03:46:22.266467+00`; transição reportada `awaiting_payment` → `preparing`. Histórico usa `order_events.event_type/from_status/to_status/actor_uid/created_at`; linha bruta não foi anexada. |
| T008 | PASS — reportado | Payload com referência opaca, resumo, total e link de acompanhamento, sem CPF, e-mail ou telefone do cliente, conforme relatório. Nenhuma mensagem foi enviada pelo Codex. |
| T009 | PASS — reportado | Expiração reportada com liberação única. Ledger usa `event_type='expired_release'` e `quantity_delta > 0`; não existem colunas genéricas `event`/`delta`. Worker não foi executado novamente. |
| T010 | PASS — reportado | Isolamento RLS de pedidos por `customer_id = auth.uid()`. Esquema TASK-006 protege `orders`, `order_items` e `order_events`; evidência de runtime atribuída ao relatório, sem repetição das sessões A/B pelo Codex. |
| T011 | PASS — reportado e compatível | Exclusão de reserva referenciada negada por `inventory_ledger_reservation_id_fkey`/SQLSTATE `23503`; migration confirma `inventory_ledger.reservation_id REFERENCES reservations(id) ON DELETE RESTRICT`. |

## Ajustes de nomenclatura realizados

- `is_replay` foi normalizado para `idempotent_replay`, nome usado pela RPC `create_order_from_quote`. O retry idempotente devolve o mesmo pedido; a rota mapeia replay para HTTP 200 sem expor a violação SQL `23505` como resposta normal.
- A conferência é `order_inspections.items_confirmed`, com aprovação registrada por `approved_by`/`approved_at`.
- O pagamento é representado por `orders.payment_confirmed_at`; MFA recente por `admin_auth_sessions.mfa_verified_at`.
- O ledger usa `event_type` e `quantity_delta`, incluindo `expired_release` com delta positivo; a FK `inventory_ledger_reservation_id_fkey` é `ON DELETE RESTRICT`.
- O histórico operacional é persistido em `order_events`, com `event_type`, `from_status`, `to_status`, `actor_uid` e `created_at`.

Os rótulos divergentes do relatório de origem foram corrigidos para não sugerir colunas inexistentes. As afirmações de execução permanecem atribuídas à usuária; esta reconciliação não adiciona resultados não fornecidos.

## Avaliação do gate

- T001–T011: **11/11 PASS conforme relatório manual fornecido pela usuária**; nenhum foi repetido pelo Codex.
- **GATE-006: APROVADO** com base nas evidências reportadas e na reconciliação de esquema. O ambiente foi identificado em nível de serviço (Supabase PostgreSQL / SQL Editor), mas `project_id`/stack e artefatos brutos não foram fornecidos.
- **Etapa 007: HABILITADA para execução futura; não iniciada nesta auditoria.**
- Nenhum código, migration, banco ou configuração foi alterado.

## Arquivos documentais relacionados

- Roteiro e estados por teste: `docs/testing/TASK-006-etapa-006-testes-manuais.md`.
- Este relatório é o registro canônico da reconciliação documental.
