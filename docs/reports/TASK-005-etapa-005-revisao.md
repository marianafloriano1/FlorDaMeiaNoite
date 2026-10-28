# TASK-005 — Etapa 005 — Revisão

**Data:** 2026-10-27
**Checkout:** `flor-da-meia-noite-integracao-003-004`
**Branch/HEAD:** `task/TASK-005-carrinho-favoritos-reservas` / `0d1aef9`
**Status da etapa:** BLOQUEADA
**GATE-005:** BLOQUEADO

## Escopo e fontes revisadas

Revisados `AGENTS.md`, `README.md`, seção TASK-005 de `TASKS.md`, ADR-002/ADR-007, overview, planejamento e relatórios das Etapas 001–004, migration TASK-005, APIs de carrinho/favoritos/reservas, UI compartilhada, worker, testes e workflow CI. Antes desta retomada, git status já mostrava alterações locais em TASKS.md e docs/reports/TASK-005-etapa-004-implementacao.md, além deste relatório não rastreado; essas alterações foram preservadas.

O escopo funcional TASK-005 está concentrado na migration `202610250003_task005_cart_favorites_reservations.sql`, APIs e UI de carrinho/favoritos/reserva, worker de expiração e testes em `tests/task005/`. A integração em `src/app/catalog/[slug]/page.tsx` foi previamente autorizada como arquivo compartilhado. O conteúdo integrado preexistente TASK-003/TASK-004 não foi alterado nesta revisão.

## Evidências consideradas

- GATE-001/002/003: aprovados nos respectivos relatórios.
- GATE-004: APROVADO conforme revalidação informada pela usuária em 2026-10-27: job integrado CI PASS; `test:task005` 10/10, 0 SKIP, Supabase isolado com quatro migrations; concorrência, idempotência, rollback, expiração e RLS cobertos; lint, typecheck e Biome PASS. Não repetidos nesta revisão.
- Revisão estática do diff e do fluxo de autorização/RLS; sem alteração funcional nesta etapa.
- Testes, build e execução do worker não repetidos nesta revisão. Evidência de execução do processo worker em container não consta nos resultados informados.

## Achados

1. **P2 — ledger pode ser apagado junto com a reserva.** Em `supabase/migrations/202610250003_task005_cart_favorites_reservations.sql`, `inventory_ledger.reservation_id` referencia `reservations(id) ON DELETE CASCADE` (linha 60). O ADR-002 exige razão imutável/auditável. Uma exclusão privilegiada da reserva remove também os movimentos, contrariando essa garantia. Não há rota de exclusão na aplicação revisada, mas a integridade/auditoria não fica protegida no banco. Correção mínima recomendada: migration posterior que substitua a FK por `ON DELETE RESTRICT`/`NO ACTION` e preserve o ledger; não editar migration já aplicada.
2. **P2 — fontes de produto divergem sobre a fronteira TASK-005/TASK-006.** A decisão aprovada na Etapa 003 e o plano dizem que TASK-005 cria/expira/cancela reserva e TASK-006 trata pedido/checkout. `README.md` RF-007/RF-008 ainda atribui criação/cancelamento de pedido a TASK-005/006. O código segue a decisão explícita e não cria pedido; o README precisa de reconciliação documental antes de ser fonte única de aceite.
3. **P2 — execução operacional do worker sem evidência.** O job periódico e comando `worker:reservation-expiration` existem, e os testes unitários cobrem configuração/RPC mockada. A evidência do GATE-004 informada não confirma o processo worker iniciado contra a stack local/container. O plano da Etapa 003 previa validação operacional do worker; essa evidência não foi encontrada nos resultados revisados.

## Checagens e preservação

- Integração/concorrência/rollback/RLS: PASS conforme evidência CI fornecida pela usuária; não rerodados.
- Lint, typecheck e Biome: PASS conforme evidência CI fornecida; não rerodados.
- Worker em processo/container: NOT RUN / sem evidência documental localizada.
- TASK-003 e implementação TASK-004: nenhum arquivo funcional alterado nesta revisão.
- TASK-006: não iniciada.
- Nenhuma correção de código/migration aplicada; os achados permanecem para decisão/correção autorizada.

## GATE-005

**BLOQUEADO** até preservar o ledger contra exclusão em cascata, reconciliar a fronteira documental aprovada e registrar evidência operacional do worker. A aprovação exige todos os critérios obrigatórios; não se declara TASK-005 concluída.

Gates acumulados: 4 concluídos (001–004), 1 bloqueado (005), 2 pendentes (006–007). Etapa 006 permanece bloqueada.

==================================================
TASK: TASK-005
ETAPA: 005
STATUS DA ETAPA: BLOQUEADA
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 4
GATES PENDENTES: 2
GATES BLOQUEADOS: 1
PROBLEMAS ENCONTRADOS:
- Ledger usa ON DELETE CASCADE, incompatível com auditoria imutável.
- README RF-007/RF-008 diverge da fronteira TASK-005/TASK-006 aprovada.
- Execução operacional do worker em Supabase/OCI não comprovada.
CORREÇÕES REALIZADAS:
- Somente reconciliação documental do estado GATE-004; nenhuma correção funcional ou migration.
PENDÊNCIAS:
- Migration corretiva aditiva para preservar o ledger.
- Reconciliar README com a decisão de fronteira já aprovada.
- Obter evidência da execução do worker periódico contra ambiente isolado/container.
TESTES RELACIONADOS:
- Evidência fornecida pela usuária: CI `test:task005` 10/10 PASS, 0 SKIP; lint, typecheck e Biome PASS. Não repetidos nesta etapa.
PRÓXIMA ETAPA: 006 — Testes manuais
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: GATE-005 bloqueado por achados P2 e evidência operacional ausente.
==================================================
## Retomada autorizada — correções documentais e proteção do ledger (2026-10-27)

- **Ledger:** criada a migration aditiva 202610270001_task005_inventory_ledger_restrict_delete.sql, que substitui a FK de inventory_ledger.reservation_id por ON DELETE RESTRICT. Migrations anteriores não foram editadas. Aplicação/teste da migration NOT RUN: Docker Engine retorna permission denied; a configuração existente aponta para flor-da-meia-noite-local, que foi preservada e não utilizada.
- **Fronteira:** README RF-006/007/008 e RN-005/007 agora deixam explícito que TASK-005 cria/expira/cancela reserva temporária e não cria pedido/checkout/pagamento; a TASK-006 poderá consumir reserva válida.
- **Worker:** validação operacional em Supabase isolado NOT RUN/BLOCKED pelo acesso negado ao Docker Engine e ausência do CLI supabase no PATH. Nenhuma stack foi iniciada, migration aplicada, nem ambiente persistente consultado ou alterado.
- **Teste local:** `node --import=tsx --test tests/task005/worker.test.ts` PASS, 2/2, 0 falhas/ignorados. Confirma apenas validação unitária; não substitui prova de processo contra Supabase.
- **Preservação:** nenhuma alteração em código de TASK-003/TASK-004, migrations anteriores, TASK-006, containers ou dados.
- **Estado:** achados documentais corrigidos; GATE-005 permanece **BLOQUEADO** até aplicação/validação da migration e execução real do worker contra Supabase efêmero/isolado. Etapa 006 continua bloqueada.
## Evidência complementar reportada pela usuária — Supabase e CI (2026-10-27)

- A usuária reporta Supabase local saudável, porta 54321 respondendo HTTP 200, e execução de npx supabase migration up --local concluída com “Local database is up to date”, incluindo 202610270001_task005_inventory_ledger_restrict_delete.sql. A migration corretiva é considerada VALIDADA com base nessa evidência reportada; não foi executada novamente pelo Codex.
- A usuária reporta npm run test:task005 com 10 testes, 10 PASS, 0 FAIL e 0 SKIP, incluindo integração Supabase: concorrência da última unidade com um vencedor, cancelamento repetido sem dupla liberação, expiração repetida idempotente, rollback atômico e RLS anônimo negado.
- O job de integração da CI no GitHub foi reportado verde. Esses resultados são evidência fornecida pela usuária, não execução independente nesta retomada.
- O achado do ledger está corrigido e a migration foi validada; a divergência da fronteira no README foi reconciliada na retomada anterior.
- **Única pendência obrigatória:** execução real do processo periódico do worker contra Supabase isolado. O plano aprovado da Etapa 003, passo 5, exige validação operacional e prova de início/parada controlados. Os testes unitários 2/2 e a suíte de RPC não comprovam a execução do processo worker. Docker continua inacessível neste ambiente e, conforme instrução, não foi tentado.
- **Reavaliação:** GATE-005 permanece **BLOQUEADO somente pela evidência operacional do worker**. Etapa 006 continua não habilitada; TASK-006 não iniciada.
## Evidência operacional do worker reportada pela usuária (2026-10-27)

- A usuária informa que, em Supabase local saudável em 127.0.0.1:54321 e com cinco migrations aplicadas, iniciou node src/workers/reservation-expiration.mjs em segundo plano com NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e RESERVATION_EXPIRY_POLL_INTERVAL_MS=5000.
- Após 12 segundos, o processo continuava vivo (HasExited=False), sem emitir reservation_expiration_cycle_failed nem reservation_expiration_worker_stopped; a usuária interpreta isso como pelo menos dois ciclos sem erro. O teste de integração de expiração repetida valida a mesma RPC e o retorno de saldo uma única vez; não é um teste da execução do worker.
- A verificação da trava isDirectExecution confirmou, segundo a usuária, que caminho digitado e caminho real coincidem no Windows.
- **Ressalva:** o processo foi encerrado por Stop-Process (forçado). Esse encerramento não exercita o handler de SIGINT/SIGTERM e não comprova parada controlada.
- Migration 202610270001: VALIDADA conforme evidência reportada anteriormente. npm run test:task005: 10/10 PASS, 0 FAIL, 0 SKIP; CI verde, também conforme relato da usuária.
- **Reavaliação atual:** inicialização e ciclos do worker são PASS reportado; continua pendente somente demonstrar encerramento controlado por SIGINT ou SIGTERM. O plano aprovado da Etapa 003 exige início e parada controlados. Portanto, GATE-005 segue **BLOQUEADO somente por essa evidência de parada**, sem outros bloqueios obrigatórios. Nenhum Docker/container foi iniciado pelo Codex; Etapa 006 e TASK-006 não iniciadas.

==================================================
TASK: TASK-005
ETAPA: 005
STATUS DA ETAPA: BLOQUEADA
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 4
GATES PENDENTES: 2
GATES BLOQUEADOS: 1
PROBLEMAS ENCONTRADOS:
- Falta comprovação de parada controlada do processo worker por SIGINT ou SIGTERM.
CORREÇÕES REALIZADAS:
- Migration aditiva de proteção do ledger VALIDADA conforme evidência reportada pela usuária.
- README reconciliado com a fronteira TASK-005/TASK-006.
- Evidência reportada de worker ativo por 12 s sem mensagens de erro.
PENDÊNCIAS:
- Executar worker em Supabase isolado e confirmar encerramento controlado por sinal.
TESTES RELACIONADOS:
- Reportados pela usuária: 10/10 PASS, 0 FAIL, 0 SKIP; cinco migrations aplicadas; CI verde.
- Reportado pela usuária: worker permaneceu vivo por 12 s, sem logs de falha; Stop-Process forçado não valida handler.
- Executado pelo Codex: teste unitário do worker 2/2 PASS.
PRÓXIMA ETAPA: 006 — Testes manuais
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: o plano aprovado requer prova de início e parada controlados do worker; a parada por sinal ainda não foi comprovada.
==================================================
## Evidência de encerramento SIGINT reportada pela usuária (2026-10-27)

- A usuária reporta execução em primeiro plano de node src/workers/reservation-expiration.mjs contra Supabase local em http://127.0.0.1:54321, com chave service_role local e intervalo de 5000 ms.
- Após cerca de 12 segundos, encerrou com Ctrl+C (SIGINT). O prompt retornou sem segundo Ctrl+C nem mensagens de erro do worker e LASTEXITCODE foi 0; isso comprova a parada controlada pelo handler SIGINT, conforme evidência reportada.
- Essa execução complementa a evidência anterior de processo vivo após 12 s sem reservation_expiration_cycle_failed. A verificação isDirectExecution no Windows também foi reportada como correta.
- Ressalvas preservadas: a evidência é da usuária, não foi reproduzida pelo Codex; o handler SIGTERM não foi exercitado. O plano exige parada controlada, atendida pela evidência SIGINT; não exige teste de ambos os sinais.
- **Reavaliação final:** com migration, integração e CI previamente reportadas como PASS e worker iniciado, executando ciclos sem erro e encerrado controladamente por SIGINT, não resta bloqueio obrigatório. GATE-005 = APROVADO. Etapa 006 fica habilitada para execução futura, mas não foi iniciada; TASK-006 não foi iniciada.

==================================================
TASK: TASK-005
ETAPA: 005
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 5
GATES PENDENTES: 2
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Nenhum bloqueio obrigatório restante.
CORREÇÕES REALIZADAS:
- Migration aditiva do ledger validada conforme evidência reportada pela usuária.
- README reconciliado com a fronteira TASK-005/TASK-006.
- Evidência reportada do worker em execução, ciclos sem erro e encerramento controlado por SIGINT.
PENDÊNCIAS:
- Nenhuma pendência obrigatória da Etapa 005.
TESTES RELACIONADOS:
- Reportados pela usuária: migration aplicada, test:task005 10/10 PASS, 0 FAIL, 0 SKIP, CI verde.
- Reportado pela usuária: worker ativo após cerca de 12 s; Ctrl+C/SIGINT encerrou com LASTEXITCODE 0.
- Executado pelo Codex nesta retomada: nenhum teste; evidências acima são da usuária. Teste unitário anterior do worker: 2/2 PASS.
PRÓXIMA ETAPA: 006 — Testes manuais
PRÓXIMA ETAPA HABILITADA: SIM — para execução futura
MOTIVO: GATE-005 aprovado; a Etapa 006 não foi iniciada nesta execução, conforme solicitado.
==================================================