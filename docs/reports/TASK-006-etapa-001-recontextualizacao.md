# TASK-006 — Etapa 001 — Recontextualização e histórico

**Data:** 2026-10-28
**Checkout:** `C:\Users\Mariana\Documents\Codex\2026-09-22\files-mentioned-by-the-user-prompt-2\outputs\flor-da-meia-noite-task-006`
**Branch:** `task/TASK-006-checkout-pedidos`
**HEAD/base:** `73225c6` — base que contém a TASK-005 publicada e aprovada.

## Resultado e fontes

Foram consultados o contrato `AGENTS.md`, `README.md`, a seção TASK-006 de `TASKS.md`, `docs/adr/ADR-003-pagamento-whatsapp.md`, `docs/architecture/overview.md`, o prompt da Etapa 001 e o código de autorização existente em `src/lib/auth/http.ts`. O histórico confirma que TASK-003 e TASK-005 são dependências concluídas; a TASK-005 tem GATE-001–007 aprovados. A seção anterior da TASK-006 estava BLOCKED por decisões de negócio agora respondidas pela solicitante.

## Decisões registradas

- Número oficial permanece configurável como `WHATSAPP_STORE_NUMBER` em E.164; valor real será fornecido antes da implantação. Testes usam número sintético.
- WhatsApp é link `wa.me` com rascunho pré-preenchido e envio manual. Não usar WhatsApp Business API ou envio automático. Modelo pt-BR: “Olá! Quero acompanhar o pedido {order_reference}. Itens: {items_summary}. Total: R$ {total_brl}. Acompanhe: {tracking_url}”. Referência e link são opacos; sem PII ou credenciais.
- A janela é persistida em `preparation_window_start` e `preparation_window_end`, respectivamente 1h e 2h após `payment_confirmed_at`, como `timestamptz` UTC.
- Papéis já existentes são preservados: `employee` equivale ao privilégio de operador e `admin` ao de gerente. O backend restringe alterações às transições permitidas; confirmação de pagamento/cancelamento ficam com admin/gerente. A inspeção de `src/lib/auth/http.ts` confirmou os nomes atuais `customer`, `employee`, `admin`; não foram criados papéis novos.
- O texto final de cancelamento/reembolso permanece responsabilidade da loja e será fornecido por `ORDER_CANCELLATION_POLICY_TEXT` antes da confirmação de pagamento. Não foi inventada política nem regra de reembolso.
- Fronteira reconciliada: TASK-005 cria, controla e expira reserva; TASK-006 consome somente reserva válida ao criar/vincular pedido. TASK-006 não repete baixa/liberação nem estende `expires_at`; pagamento permanece externo/manual.

## Definition of Ready e gates

Dependências TASK-003 e TASK-005: concluídas conforme documentação e evidências já registradas. Rastreabilidade, escopo e aceite atualizados. Decisões essenciais para iniciar a TASK-006 foram registradas; valores operacionais reais e texto legal foram explicitamente mantidos como configuração pré-implantação, sem bloquear desenvolvimento. A solicitante autorizou a atualização estrutural, a branch dedicada e o início da Etapa 001. Status registrado em sequência BLOCKED → READY → IN_PROGRESS.

- GATE-001: **APROVADO** — contexto, dependências, fonte de papéis, fronteira arquitetural e decisões aprovadas documentados.
- GATE-002 a GATE-007: **PENDENTES** — não executados nesta etapa.
- Gates totais: 7; concluídos: 1; pendentes: 6; bloqueados: 0.

## Alterações e validação

Atualizados somente documentos da TASK-006: `README.md`, `TASKS.md`, `docs/architecture/overview.md`, `docs/adr/ADR-003-pagamento-whatsapp.md` e este relatório. Nenhum código, teste, migration, banco, container, dependência ou workflow foi alterado/executado. Nenhuma validação funcional foi alegada. `git diff --check` e `git status --short` foram executados após a escrita; ver estado final no relatório da execução.

TASK-003 e TASK-004 não foram alteradas. TASK-006 está IN_PROGRESS, somente pela execução autorizada da Etapa 001. Etapa 002 não foi iniciada. TASK-007 e posteriores não iniciadas.

==================================================
TASK: TASK-006
ETAPA: 001
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 1
GATES PENDENTES: 6
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Texto legal definitivo de cancelamento/reembolso e valor oficial do WhatsApp ainda são informações operacionais da loja antes de implantação/pagamento; não foram inventados e estão definidos como configuração.
CORREÇÕES REALIZADAS:
- Decisões aprovadas incorporadas ao README e ADR-003; responsabilidades entre reserva e pedido reconciliadas no overview; TASK-006 atualizada para IN_PROGRESS na branch dedicada.
PENDÊNCIAS:
- Planejar arquitetura, modelo e critérios detalhados na Etapa 003; a Etapa 002 ainda não foi executada.
TESTES RELACIONADOS:
- Nenhum teste executado; esta etapa é documental/contextual.
PRÓXIMA ETAPA: 002 — Pré-condições e decisões
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-001 aprovado; autorização para Etapa 002 permanece sujeita a solicitação própria.
==================================================