# TASK-005 — Etapa 006 — Preparação dos testes manuais

**Data:** 2026-10-27
**Status da etapa:** APROVADA — evidências T001–T011 reportadas pela usuária.
**GATE-005:** APROVADO, conforme relatório da Etapa 005
**GATE-006:** APROVADO — T001–T011 PASS segundo evidências reportadas pela usuária.

## Kit preparado

- Roteiro T001–T011 em docs/testing/TASK-005-etapa-006-testes-manuais.md.
- Casos cobrem carrinho/favoritos, seleção parcial, duração de três horas, limite de uma reserva ativa, rollback, concorrência da última unidade, cancelamento idempotente, expiração pelo worker, autorização de visitante, estoque zero, payload inválido e FK restritiva do ledger.
- Inclui pré-condições de isolamento Supabase, preparação sintética e procedimentos Windows PowerShell/WSL/Linux. Não inclui nem registra credenciais reais.
- Resultado obtido e evidência de cada teste permanecem [PREENCHER MANUALMENTE].

## Execução nesta preparação

- Leitura de prompt/estado da Etapa 006, roteiro da TASK-004 para convenção, rotas de cart/favorites/reservations e textos reais da UI.
- Testes manuais executados: 0. Testes automatizados executados: 0. Nenhuma aplicação, Docker, container, migration ou banco foi iniciado/alterado.
- Não foram inventadas evidências humanas. A evidência anterior do GATE-005 permanece separada e reportada pela usuária.

## Estado do gate

- GATE-001–005: CONCLUÍDOS (5).
- GATE-006: BLOQUEADO / AGUARDANDO execução e evidências humanas de T001–T011.
- GATE-007: PENDENTE.
- Contadores T001–T011: 11 previstos; 0 executados; 0 aprovados; 0 reprovados; 0 bloqueados; 11 pendentes.
- A Etapa 006 permanece em andamento; TASK-005 continua IN_REVIEW. Etapa 007 não iniciada.
- TASK-006 não iniciada.

## Preservação

Nenhum código funcional, migration, configuração, stack ou dado foi alterado nesta etapa. Nenhuma operação Git destrutiva, commit, push ou deploy foi executada.
## Reconciliação final — 2026-10-28

A usuária forneceu evidências complementares para T001–T011. O roteiro foi atualizado com os resultados e a origem das evidências. O Codex não executou nem observou os testes. T007 foi esclarecido como active → expired, com liberação única no ledger, complementando o relato prévio do processo e encerramento SIGINT.

- T001–T011: PASS (reportados pela usuária).
- GATE-006: APROVADO.
- Etapa 007 iniciada para consolidação; TASK-006 não iniciada.