# TASK-005 — Etapa 003 — Planejamento

**Data:** 2026-10-25
**Checkout:** `flor-da-meia-noite-integracao-003-004`
**Status da etapa:** APROVADA
**GATE-003:** CONCLUÍDO

## Fontes verificadas

- Instruções `AGENTS.md` fornecidas pela solicitante; prompt `prompts/tasks/task-005/prompt-task-005-etapa-003-planejamento.md`.
- `README.md`: RF-005–008, RNF-001/010/011, UC-03 e modelo conceitual.
- Seção TASK-005 de `TASKS.md` e relatórios das Etapas 001 e 002.
- `docs/adr/ADR-002-postgresql-e-estoque.md` (semântica transacional mantida) e `docs/adr/ADR-007-supabase-como-plataforma-de-dados.md` (Supabase vigente).
- `docs/architecture/overview.md`, `docs/diagrams/domain-model.mmd`, `docs/diagrams/checkout-sequence.mmd`.
- Migrations existentes de identidade e catálogo; `src/app/catalog/[slug]/page.tsx`, `src/app/catalog/page.tsx`, cliente Supabase de servidor e rotas atuais.

## Estado verificado

- GATE-001 e GATE-002 constam aprovados nos relatórios das Etapas 001 e 002. TASK-004 consta DONE, com código, testes e migrations presentes.
- A validação integrada das migrations TASK-003+004 continua PENDENTE por indisponibilidade anterior do Docker; não foi tentada nesta etapa e não bloqueia este planejamento.
- `catalog_products.stock_quantity` é inteiro não negativo e a view pública exclui estoque zero. `customer_profiles.id` referencia `auth.users(id)`. O cliente Supabase de servidor existente é reutilizável.
- A página de detalhe é Server Component sem ações de carrinho/favorito; a listagem já navega para o detalhe. Não foram encontrados arquivos/rotas, migrations ou testes da TASK-005.
- A arquitetura descreve workers como componentes OCI e inclui expiração de reservas entre suas funções. Não há implementação de worker periódico no checkout. A decisão recebida autoriza planejar o worker compatível como processo periódico da aplicação containerizada, sem selecionar provedor externo ou adicionar infraestrutura paralela.
- Não foram executados testes, build, typecheck, lint, migration ou Docker nesta etapa documental.

## Decisões de produto e arquitetura registradas

### Reserva e concorrência

- TASK-005 implementa **reserva temporária**, não pedido ou checkout.
- Somente cliente autenticado pode usar carrinho, favoritos ou criar reserva; RLS e validação backend restringem cada registro ao proprietário.
- No máximo uma reserva ativa por cliente/carrinho. A persistência deve impedir duplicidade no banco, além da validação na API.
- Reserva possui estado e `expires_at`; criação define `expires_at` usando relógio do banco em UTC, exatamente três horas após a confirmação atômica.
- Na última unidade, a primeira reserva atomicamente confirmada vence; as concorrentes seguintes falham por indisponibilidade. Sem saldo negativo, reserva parcial ou dupla liberação.
- A disponibilidade é atualizada na mesma transação que cria reserva, itens e ledger. A expiração/cancelamento libera a disponibilidade uma única vez.
- O banco/RPC é a autoridade de estoque; cache e frontend não autorizam reserva.

### Ciclo de vida e expiração

- Estados planejados: `active`, `expired`, `cancelled` e `completed`. A transição terminal só ocorre a partir de `active`; não se reabre reserva expirada/cancelada.
- Worker periódico consulta reservas `active` com `expires_at <= now()` no relógio do banco e chama rotina transacional para expirar e devolver disponibilidade.
- A rotina registra o movimento correspondente no ledger e muda o estado na mesma transação. Atualização condicional de `active` e chave idempotente por reserva/transição tornam retries e execuções repetidas seguros; apenas uma execução libera saldo.
- Falha de consulta ou processamento não libera parcialmente a reserva; a execução seguinte pode tentar novamente. Logs/telemetria devem omitir tokens e dados pessoais.
- O worker será um processo OCI reutilizando a aplicação/ambiente containerizado existente, com intervalo configurável e sem provedor de fila/scheduler adicional. Configurar e iniciar esse processo no runtime faz parte da implementação desta Task; definir o provedor de hospedagem global continua fora do escopo.
- Cancelamento é uma transição de reserva, sem criar pedido nem pagamento. A interface/ator de cancelamento não será ampliada além do fluxo permitido; o backend valida proprietário/autorização e a transição libera estoque uma única vez.

### Fronteira TASK-005/TASK-006

- **TASK-005:** carrinho, favoritos, reserva temporária, validação de disponibilidade, concorrência, manutenção da reserva ativa, expiração/liberação idempotente e cancelamento da própria reserva conforme fluxo autorizado.
- **TASK-005 não cria pedido, não inicia checkout e não processa pagamento.** A confirmação da reserva retorna um identificador de reserva e `expires_at`.
- **TASK-006:** Order/OrderItem, checkout, vínculo do pedido à reserva válida, WhatsApp, conferência e transições de pagamento. TASK-006 poderá consumir uma reserva ainda `active` e não vencida; essa integração deverá confirmar a transição de forma atômica para impedir corrida com o worker.
- Não cancelar pedido pago nem executar lógica de pedido/pagamento pelo worker TASK-005.

## Critérios de aceite e matriz de escopo

| Critério | Arquivos/componentes previstos (não criados nesta etapa) | Evidência planejada | Escopo/limite |
|---|---|---|---|
| Persistência de carrinho e linhas positivas por conta | `supabase/migrations/202610250003_task005_cart_favorites_reservations.sql`; `src/lib/cart/*`; `src/app/api/cart/route.ts` e rotas de item | CRUD, unicidade por produto, RLS contra acesso cruzado, visitante negado | Sem carrinho anônimo; sem cupom (TASK-008) |
| Favoritos persistidos por conta | Mesma migration; `src/lib/favorites/*`; `src/app/api/favorites/route.ts` | Adicionar/remover/listar idempotentes; testes RLS entre duas contas sintéticas | Sem analytics/painel (TASK-011) |
| Ações mínimas no produto | Novo `src/app/catalog/[slug]/product-actions.tsx`, importado por `src/app/catalog/[slug]/page.tsx` | Teste de ações e regressão de locale, preço, estoque, tradução/fallback | Página compartilhada **TASK-004/TASK-005** autorizada; alteração aditiva mínima. Listagem não será alterada |
| Carrinho e seleção de subconjunto | Nova `src/app/cart/page.tsx`; serviço/API de carrinho | Só itens selecionados entram na solicitação; os demais permanecem; autorização de proprietário | Sem Order, checkout, pagamento, WhatsApp ou cupom |
| Reserva temporária e `expires_at` | Mesma migration: Cart/CartItem/Favorite/Reservation/ReservationItem/InventoryLedger, constraints/RLS e RPC SQL; `src/lib/reservations/*`; `src/app/api/reservations/route.ts` | Reserva inicia somente na ação final; relógio DB UTC; prazo de 3h; validação de quantidade e proprietário | Estado inicial `active`; `expires_at` obrigatório; nenhuma ordem/pagamento |
| Limite de uma reserva ativa | Constraint/índice parcial na migration e validação transacional no RPC | Duas tentativas pelo mesmo cliente/carrinho: somente uma reserva ativa; nova tentativa só após estado terminal | Enforcement no banco, não só frontend |
| Última unidade e rollback total | RPC reserva com lock/atualização condicional das linhas de produto em ordem estável; serviço de reservas | Duas chamadas concorrentes com estoque 1: uma PASS e uma indisponível; cenário multi-item falho deixa saldo, reserva e ledger integralmente inalterados | Sem reserva parcial nem saldo negativo |
| Expiração automática e liberação | Função SQL `expire_due_reservations()`; processo `src/workers/reservation-expiration.ts`; comando de execução containerizado no `package.json`/imagem OCI existente | Relógio controlado: antes/no/depois; execução repetida; erro/retry; concorrência worker vs. consumo pela TASK-006 | Worker periódico, intervalo configurável, mesmo runtime OCI; sem provedor externo paralelo |
| Cancelamento de reserva | Transição condicional no serviço/RPC de reservas | Repetição não duplica movimento nem libera saldo duas vezes; reserva terminal não reabre | Não cancela pedidos nem mexe em pagamento |
| Catálogo continua correto | Nova migration pode ajustar de forma aditiva a view somente se necessária para saldo disponível; evitar alteração funcional da TASK-004 | Estoque zero indisponível; sem exposição pública da quantidade real; preservação de regras de low-stock/preço/locale | Somente integração mínima autorizada no detalhe; preservar busca, filtros, mídia e fallback pt-BR |
| Integração posterior de pedido | Contrato de saída da reserva: reservation id + validade; consumo previsto em TASK-006 | Teste de contrato na TASK-006 verificará reserva ativa/não vencida e transição concorrente | TASK-006 fora desta implementação e não iniciada |

**Allowed Changes:** Cart, CartItem, Favorite, Reservation, InventoryLedger, transação/RPC de reserva, worker periódico de expiração e integração mínima no detalhe de catálogo previamente autorizada.
**Incidental Changes:** retry idempotente e diagnóstico técnico mínimo necessário ao suporte.
**Forbidden Changes:** visitantes; criar Order/OrderItem; checkout/pagamento/WhatsApp; reserva antes da ação final; reserva parcial; liberação duplicada; cancelar pagamento/pedido pago; saldo por cache; refatoração ou alteração de busca, filtros, mídia, preço, tradução ou fallback da TASK-004; qualquer alteração TASK-003.

## Sequência de implementação proposta

1. Criar migration aditiva após migrations existentes: tabelas, FKs, constraints, índices, RLS/policies, ledger e RPC transacional; preservar as migrations TASK-003/004 sem edição.
2. Implementar serviços Supabase de carrinho/favoritos/reserva e endpoints server-side autenticados, com erros de domínio sem dados internos e chave idempotente para retry.
3. Implementar reserva: validar usuário/carrinho/seleção, rejeitar se já houver reserva ativa, bloquear produtos em ordem estável, confirmar saldo, criar cabeçalho/linhas/ledger e `expires_at = clock_timestamp() + interval '3 hours'` na mesma transação; qualquer falha reverte tudo.
4. Implementar estados e rotinas idempotentes de expiração/cancelamento. Expiração seleciona `active` vencida, marca `expired`, devolve saldo e registra ledger atomicamente; repetição não altera novamente.
5. Implementar worker periódico em entrypoint próprio dentro do runtime/container OCI existente, usando intervalo configurável. Não criar queue service, cron cloud ou infraestrutura paralela; registrar comando/runtime e comportamento de falhas. Validar operação real do worker em ambiente local/container permitido.
6. Adicionar a ação mínima de carrinho/favorito na página compartilhada de detalhe e a página do carrinho; preservar locale e comportamento atual do catálogo.
7. Executar testes TASK-005 unitários e integração Supabase isolado: autenticação/RLS, carrinho/favoritos, limite de uma reserva ativa, última unidade concorrente, rollback multi-item, `expires_at`, expiração repetida, cancelamento repetido e corrida worker/consumo. Depois lint direcionado, typecheck, build e OCI conforme gates; lint global reporta falhas preexistentes sem corrigir TASK-003.
8. Revisar diff completo, Scope Guard, `git diff --check` e `git status --short`. Registrar qualquer cenário não executado como NOT RUN/PENDENTE; nunca declarar validação de migration sem banco isolado.

## Dependências e pendências de validação

- TASK-002, TASK-003 e TASK-004 DONE; GATE-001/GATE-002 aprovados.
- TASK-004 está presente e concluída; a autorização de integração compartilhada cobre somente ação mínima na página de detalhe.
- Ambiente local Node/npm está disponível conforme Etapa 002; execução futura de RPC/RLS exige Supabase local isolado. Docker e validação integrada das migrations TASK-003+004 continuam PENDENTES. Não tentar Docker agora nem usar ambientes existentes/remotos.
- O worker usa o padrão de componentes OCI da arquitetura. A escolha futura do runtime/hospedagem do produto permanece uma decisão operacional global; a Task não depende de um provedor específico, mas a validação local deve provar que o processo pode ser iniciado e parar de forma controlada.
- TASK-006 consumirá reserva válida posteriormente; nenhuma implementação da TASK-006 é dependência para criar/expirar reserva.

## Riscos e rollback

- **Concorrência/última unidade:** RPC transacional, atualização condicional/locks e constraint não negativa; teste concorrente com uma unidade.
- **Reserva parcial:** cabeçalho, itens, saldo e ledger em uma transação; rollback integral verificado.
- **Retry/dupla liberação:** transição condicional de estado e chave única de ledger por reserva/evento; repetir worker não muda saldo após a primeira execução.
- **Corrida com TASK-006:** consumo futuro de reserva e expiração devem disputar a mesma transição/lock; nunca permitir consumir reserva vencida.
- **Acesso cruzado:** RLS com `auth.uid()` e testes sintéticos entre contas; nenhuma informação pessoal em logs.
- **Regressão TASK-004:** alteração compartilhada aditiva mínima; testes de locale, filtro, estoque, tradução e acessibilidade pertinente.
- **Rollback de código:** retirar seletivamente apenas mudanças comprovadamente introduzidas pela TASK-005, sem reset/restore/clean ou descarte de trabalho preexistente.
- **Rollback de banco:** migration aditiva; correção posterior por migration compensatória. Não dropar dados de ambiente compartilhado; remoção de schema só em banco descartável e autorizado.
- **Rollback do worker:** parar o processo containerizado sem apagar reservas/ledger; retomada segura por idempotência e varredura de `active` vencidas.

## GATE-003 e gates acumulados

| GATE | Etapa | Estado | Evidência |
|---|---|---|---|
| GATE-001 | Recontextualização | CONCLUÍDO | `docs/reports/TASK-005-etapa-001-recontextualizacao.md` |
| GATE-002 | Pré-condições | CONCLUÍDO | `docs/reports/TASK-005-etapa-002-pre-condicoes.md` |
| GATE-003 | Planejamento | CONCLUÍDO | Este plano; decisões de expiração e fronteira TASK-005/TASK-006 registradas nesta autorização |
| GATE-004 | Implementação | PENDENTE | Não iniciada |
| GATE-005 | Revisão | PENDENTE | Não iniciada |
| GATE-006 | Testes manuais | PENDENTE | Não iniciada |
| GATE-007 | Conclusão | PENDENTE | Não iniciada |

**Totais:** 3 concluídos, 4 pendentes, 0 bloqueados.
**Testes relacionados nesta etapa:** não executados; planejamento documental.
**Alterações funcionais/migrations:** nenhuma.
**TASK-003/TASK-004:** preservadas nesta etapa.
**TASK-006:** não iniciada.

==================================================
TASK: TASK-005
ETAPA: 003
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: CONCLUÍDO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 4
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- A validação integrada das migrations TASK-003+004 e a disponibilidade Docker continuam pendentes, sem impedir o planejamento.
CORREÇÕES REALIZADAS:
- Nenhuma alteração funcional; planejamento e documentação atualizados conforme as duas decisões explícitas.
PENDÊNCIAS:
- Validação integrada TASK-003+004 continua PENDENTE por Docker; validar TASK-005 somente em Supabase local isolado quando a implementação for autorizada.
TESTES RELACIONADOS:
- NOT RUN: etapa de planejamento; nenhum teste, build, lint, typecheck, migration ou Docker foi executado.
PRÓXIMA ETAPA: 004 — Implementação
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-003 concluído; a Etapa 004 está habilitada para execução futura, mas não foi iniciada nesta execução.
==================================================
