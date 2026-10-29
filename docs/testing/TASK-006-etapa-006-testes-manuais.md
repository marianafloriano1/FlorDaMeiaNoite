# TASK-006 — Etapa 006 — Testes manuais

**Data/hora da reconciliação documental:** 2026-10-28 23:26:44 America/Sao_Paulo (2026-10-29 02:26:44 UTC)
**Branch/HEAD de referência:** `task/TASK-006-checkout-pedidos` / `73225c6a5df44245f6d6b059b95cf11df39800c1`
**Status:** APROVADA conforme relatório/evidências manuais fornecidos pela usuária; não reexecutada pelo Codex. O checkout estava sujo na reconciliação, portanto o vínculo da execução manual ao estado local completo não é verificável independentemente.

## Segurança e preparação

- Use apenas clientes/produtos/pedidos sintéticos em Supabase local efêmero isolado; não use produção, `flor-da-meia-noite-local`, credenciais reais nem PII.
- Antes de iniciar app/worker, confirme o `project_id`, URL e portas da stack descartável. Não execute `supabase db reset`; não remova volumes ou dados.
- Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_STORE_NUMBER` sintético e `ORDER_CANCELLATION_POLICY_TEXT` sintético no processo local. Nunca copie chaves para evidências.
- Use usuário cliente, employee e admin sintéticos distintos. Admin precisa de TOTP local recente para mutation sensível.
- Nenhuma mensagem WhatsApp deve ser enviada e nenhum pagamento real deve ocorrer. Os casos de confirmação simulam somente estado em ambiente isolado.
- Evidência aceitável: captura sanitizada da UI/Network, código HTTP e consulta sanitizada do banco contendo IDs sintéticos; remover cookies, chaves, tokens e dados pessoais.
- Para T009, só antecipe `expires_at` com UUID de reserva sintética em banco comprovadamente descartável. Se isolamento não estiver provado, marque NOT RUN/BLOQUEADO e não execute.

### Inicialização local (somente stack efêmera)

Use uma cópia de `supabase/` fora do checkout, com `project_id` e portas exclusivos. Com o diretório isolado configurado:

```powershell
npx supabase start --workdir $env:TASK006_SUPABASE_WORKDIR
npx supabase migration up --local --workdir $env:TASK006_SUPABASE_WORKDIR
npx supabase status --workdir $env:TASK006_SUPABASE_WORKDIR
npm run dev
```

Confirme que a stack, migrations e URL são da cópia efêmera antes de qualquer fixture ou execução. Não use o `.env.local` real; defina credenciais sintéticas/localmente no processo. Para Linux/WSL, use os equivalentes do shell e mantenha o mesmo `workdir` descartável.

## Rastreabilidade e evidências automatizadas anteriores

- Critérios: funcionário registra conferência; admin com MFA recente aprova/confirma pagamento manual; estados e histórico são auditáveis; link wa.me é manual e sem PII; janela estimada de preparo é +1 h/+2 h após pagamento integral.
- GATE-004: relatório anterior registra integração Supabase local 10/10, 0 skips, migrations da TASK-006 e lint/typecheck/build PASS.
- GATE-005: relatório anterior registra suíte integrada após correções 12/12, 0 falhas/0 skips, lint, typecheck, build e diff-check PASS.
- Esses resultados automatizados são referência e não aprovam testes manuais desta etapa.

## Roteiro T001–T011

### T001 — Criar pedido com consentimento e sem segunda baixa de estoque

**Objetivo:** Confirmar a criação de pedido a partir de reserva válida e que a associação não movimenta o estoque uma segunda vez.
**Pré-condições:** Supabase local efêmero isolado; cliente e produto sintéticos; reserva ativa; variáveis locais da aplicação configuradas.
**Comandos/procedimento:**

1. Entre como cliente sintético e reserve um produto.
2. Anote o saldo antes/depois da reserva no Supabase Studio.
3. Gere a cotação e confira total e política de cancelamento.
4. Marque o consentimento explícito e crie o pedido.
5. Confira o saldo e o pedido na UI/Network.

**Resultado obtido (relatado pela usuária):** criação transacional vinculou `reservation_id`, deixou o pedido em `awaiting_payment` e não realizou uma segunda baixa de estoque.
**Evidência:** relatório de auditoria manual fornecido pela usuária no chat. Resultado registrado como PASS reportado; nenhuma transação foi repetida pelo Codex.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária [ ] REPROVADO [ ] BLOQUEADO.

### T002 — Preço alterado antes da nova cotação e consentimento

**Objetivo:** Verificar que a cotação recalcula o preço vigente no servidor e exige aceite do total atualizado.
**Pré-condições:** Cliente sintético com reserva ativa de um produto de teste cujo preço possa ser alterado na stack isolada.
**Comandos/procedimento:**

1. Reserve o produto e anote o preço exibido na seleção.
2. No Studio local, altere o preço apenas desse produto sintético.
3. Atualize a cotação na página do carrinho.
4. Confira preço anterior, preço atual e novo total.
5. Confirme explicitamente o novo total e crie o pedido.

**Resultado obtido (relatado pela usuária):** a cotação usa snapshot de preço e a alteração após a seleção exige nova cotação/consentimento explícito antes da criação do pedido.
**Evidência:** relatório de auditoria manual fornecido pela usuária no chat. Os campos persistidos correspondentes são `order_quotes.items/total_brl`, `orders.total_brl` e `order_items.unit_price_brl`; o Codex não repetiu o cenário.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária [ ] REPROVADO [ ] BLOQUEADO.

### T003 — Divergência entre cotação e commit

**Objetivo:** Confirmar o bloqueio transacional se o preço mudar depois de emitir a cotação.
**Pré-condições:** Cliente, reserva e cotação sintéticos; somente banco Supabase efêmero local.
**Comandos/procedimento:**

1. Gere uma cotação e guarde `quote_id`.
2. Antes do POST de criação, altere o preço do produto no Studio local.
3. Reenvie a criação com consentimento e chave de idempotência sintéticos.
4. Consulte pedido, reserva e `order_quotes.used_at`.
5. Gere nova cotação, revise e consinta antes de tentar novamente.

**Resultado obtido (relatado pela usuária):** divergência entre a cotação e o preço corrente bloqueou a confirmação do pedido; a rotina de commit aplica validação de `total_brl` e retorna `order_quote_changed`/HTTP 409 para mudança detectada.
**Evidência:** relatório de auditoria manual fornecido pela usuária no chat e contrato da rota/RPC inspecionado; a execução não foi repetida pelo Codex.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária [ ] REPROVADO [ ] BLOQUEADO.

### T004 — Retry da criação com a mesma chave de idempotência

**Objetivo:** Confirmar replay da mesma ordem sem duplicar pedido ou itens.
**Pré-condições:** Cliente/reserva/cotação sintéticos ainda válidos; DevTools do navegador na origem local.
**Comandos/procedimento:**

1. No Network, envie a criação uma vez e guarde a requisição POST completa, incluindo `idempotencyKey`.
2. Repita a mesma requisição, sem alterar quote, chave, consentimento ou sessão.
3. Compare IDs/referências e consulte a contagem correspondente no banco isolado.

**Comportamento esperado da API:** a primeira criação retorna HTTP 201; repetição do mesmo POST com a mesma `idempotency_key` retorna sucesso HTTP 200 e o pedido já criado, com o mesmo ID/referência e sem duplicar linhas. O endpoint/RPC intercepta o retry idempotente; não se espera que o cliente receba `23505`.
**Resultado obtido (relatado pela usuária):** repetição da criação com a mesma `idempotency_key` devolveu o pedido existente com sucesso, sem erro de chave duplicada não tratado nem criação duplicada.
**Evidência:** relatório de auditoria manual fornecido pela usuária registra o replay transacional. O nome real do campo de retorno é `idempotent_replay` (não `is_replay`); a RPC retorna o pedido original no replay e `POST /api/orders` mapeia replay para HTTP 200 e criação inicial para HTTP 201. O relatório não contém captura HTTP bruta; o comportamento de rota foi confirmado por inspeção do código, não por nova chamada do Codex.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária e contrato da rota [ ] REPROVADO [ ] BLOQUEADO.

### T005 — Permissões do employee/operador

**Objetivo:** Confirmar conferência permitida e ações exclusivas de admin negadas ao employee.
**Pré-condições:** Pedido sintético em `awaiting_payment`; sessão local com role `employee`.
**Comandos/procedimento:**

1. Abra `/admin/orders` como employee.
2. Registre a conferência dos itens.
3. Tente aprovar conferência, confirmar pagamento e cancelar por chamadas PATCH com dados sintéticos.
4. Confira o histórico do pedido.

**Resultado obtido (relatado pela usuária):** employee realizou a conferência e ações além da conferência foram restringidas a papéis privilegiados.
**Evidência:** relatório de auditoria manual fornecido pela usuária no chat. Alinhamento de esquema: não existe `conference_status`; a conferência é persistida em `order_inspections.items_confirmed`, com aprovação representada por `approved_by`/`approved_at`. Resultado PASS atribuído ao relato da usuária; sem nova chamada do Codex.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária [ ] REPROVADO [ ] BLOQUEADO.

### T006 — Admin exige MFA recente para ações sensíveis

**Objetivo:** Validar negação sem step-up e autorização depois de MFA recente.
**Pré-condições:** Admin sintético com TOTP habilitado apenas na stack isolada; pedido elegível; texto sintético de política configurado.
**Comandos/procedimento:**

1. Sem step-up recente, tente aprovar conferência ou confirmar pagamento.
2. Confirme HTTP 428 `admin_mfa_required`.
3. Conclua o challenge TOTP no ambiente local.
4. Repita aprovação e confirmação manual no pedido sintético. Não envie nem registre pagamento real.

**Resultado obtido (relatado pela usuária):** confirmação manual de pagamento para admin foi condicionada à verificação MFA recente.
**Evidência:** relatório de auditoria manual fornecido pela usuária no chat. Alinhamento de esquema: não existem `payment_status` nem `admin_mfa_verified`; o pagamento é representado por `orders.payment_confirmed_at` e a prova MFA da sessão por `admin_auth_sessions.mfa_verified_at`. O Codex não repetiu o fluxo.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária [ ] REPROVADO [ ] BLOQUEADO.

### T007 — Estados, histórico e janela de preparo

**Objetivo:** Conferir transições válidas e a previsão de início entre uma e duas horas após pagamento.
**Pré-condições:** Pedido sintético com conferência aprovada e pagamento de teste confirmado pelo admin.
**Comandos/procedimento:**

1. Abra `/orders/<reference>` como o cliente proprietário.
2. Confira estado, total, histórico e janela exibida em America/Sao_Paulo.
3. Como papel autorizado, avance o estado por `preparing`, `ready_for_pickup` e `picked_up`.
4. Recarregue a página e confira a ordem dos eventos.

**Resultado obtido (relatado pela usuária):** `payment_confirmed_at` foi `2026-10-29 01:46:22.266467+00`; `preparation_window_start` foi `02:46:22.266467+00` e `preparation_window_end` foi `03:46:22.266467+00` (+1h/+2h). Também foi reportada a transição `awaiting_payment` → `preparing`.
**Evidência:** relatório e complemento manual fornecidos pela usuária. No esquema, o histórico usa `order_events.event_type`, `from_status`, `to_status`, `actor_uid` e `created_at`; a transição é representada por `event_type='status_changed'`. Nenhuma consulta foi repetida pelo Codex; a linha bruta de histórico não foi anexada.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária [ ] REPROVADO [ ] BLOQUEADO.

### T008 — Link WhatsApp manual sem PII

**Objetivo:** Verificar o conteúdo e a privacidade do link de acompanhamento/WhatsApp.
**Pré-condições:** Pedido e dados de cliente totalmente sintéticos; `WHATSAPP_STORE_NUMBER` sintético em E.164.
**Comandos/procedimento:**

1. Na confirmação do pedido, abra o link wa.me sem enviar a mensagem.
2. Inspecione destinatário e texto pré-preenchido.
3. Confira a referência, resumo, total BRL e link de acompanhamento.
4. Procure CPF, e-mail, telefone do cliente, token ou segredo no link/texto.

**Resultado obtido (relatado pela usuária):** payload transacional continha referência opaca, resumo dos itens, total e link de acompanhamento; não continha CPF, e-mail ou telefone do cliente.
**Evidência:** relatório de auditoria manual fornecido pela usuária no chat. O formato é compatível com a construção atual do link, que usa `reference`, `items` (nome/quantidade), `total_brl` e URL de acompanhamento. Nenhuma mensagem foi enviada pelo Codex.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária [ ] REPROVADO [ ] BLOQUEADO.

### T009 — Expiração cancela pedido e libera estoque uma vez

**Objetivo:** Validar integração do worker/RPC com pedido não pago após expiração original da reserva.
**Pré-condições:** Stack Supabase local descartável isolada, worker apontado apenas para ela e reserva/pedido sintéticos. Nunca usar stack persistente ou produção.
**Comandos/procedimento:**

1. Crie reserva e pedido sintéticos.
2. Na stack isolada, antecipe `expires_at` somente da reserva de teste para o passado usando o UUID exato.
3. Execute o worker local por um ciclo (intervalo curto de teste) e encerre-o com Ctrl+C.
4. Consulte reserva, pedido, estoque e ledger; rode novo ciclo e confira idempotência.
5. Tente confirmar pagamento do pedido expirado.

**Resultado obtido (relatado pela usuária):** a expiração cancelou o pedido não pago e liberou disponibilidade uma única vez, com evento `expired_release` e delta positivo.
**Evidência:** relatório de auditoria manual fornecido pela usuária no chat. Alinhamento de esquema: os campos reais de `inventory_ledger` são `event_type` e `quantity_delta`; a constraint exige delta positivo para `expired_release`. A migration também define a liberação idempotente. O Codex não iniciou worker nem repetiu a execução.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária [ ] REPROVADO [ ] BLOQUEADO.

### T010 — Isolamento de linhas por cliente via RLS

**Objetivo:** Confirmar o isolamento de pedidos, itens e eventos por `customer_id` via RLS (`customer_id = auth.uid()`).
**Pré-condições:** Dois clientes sintéticos isolados e um pedido criado pelo Cliente A.
**Comandos/procedimento:**

1. Confira, no projeto Supabase isolado, que RLS está habilitada em `orders`, `order_items` e `order_events`.
2. Verifique a policy de `orders` com `customer_id = auth.uid()` e as policies de itens/eventos vinculadas ao pedido do mesmo cliente.
3. Use sessões sintéticas distintas de Cliente A e Cliente B; como A, leia seu pedido; como B, tente ler a mesma referência pela rota/API.
4. Registre a resposta e confirme que B não recebe linhas nem dados de A.

**Resultado obtido (relatado pela usuária):** leitura de pedidos foi isolada por cliente; políticas filtram `customer_id = auth.uid()` e protegem os dados associados.
**Evidência:** relatório de auditoria manual fornecido pela usuária no chat. O esquema TASK-006 aplica RLS a `orders`, `order_items` e `order_events`; as policies dos itens/eventos verificam a propriedade do pedido. O resultado de runtime é atribuído ao relatório da usuária; o Codex não repetiu as sessões de Cliente A/B.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária [ ] REPROVADO [ ] BLOQUEADO.

### T011 — Integridade referencial `ON DELETE RESTRICT` do ledger

**Objetivo:** Confirmar que uma reserva referenciada pelo `inventory_ledger` não pode ser removida e deixar movimentos órfãos.
**Pré-condições:** Supabase efêmero isolado; reserva sintética com linha correspondente em `inventory_ledger`; acesso SQL somente nesse banco.
**Comandos/procedimento:**

1. Confirme o `project_id` da stack e selecione o UUID sintético da reserva referenciada pelo ledger.
2. Tente excluir somente essa reserva no SQL Editor local isolado.
3. Registre o código/constraint do erro e confirme que a linha pai e o movimento do ledger continuam presentes.
4. Não execute o cenário em produção ou banco compartilhado.

**Resultado obtido (relatado pela usuária):** PostgreSQL negou a exclusão da reserva referenciada, com violação de FK `inventory_ledger_reservation_id_fkey` (SQLSTATE `23503`).
**Evidência:** relatório de auditoria manual fornecido pela usuária; a migration `202610270001_task005_inventory_ledger_restrict_delete.sql` confirma `inventory_ledger.reservation_id REFERENCES reservations(id) ON DELETE RESTRICT`. O Codex não repetiu a exclusão.
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO — conforme evidência reportada pela usuária e migration [ ] REPROVADO [ ] BLOQUEADO.

## Reconciliação, ambiente e rastreabilidade

- Fonte: relatório de auditoria manual fornecido pela usuária no chat; resultados T001–T011 foram executados e declarados aprovados pela usuária, não reexecutados pelo Codex.
- Ambiente reportado: Supabase PostgreSQL / SQL Editor. `project_id`, URL/identificador da stack e horário exato da execução não constam na evidência recebida.
- Data declarada no relatório de origem: 29/10/2026. Data/hora desta reconciliação documental: 2026-10-28 23:26:44 America/Sao_Paulo (2026-10-29 02:26:44 UTC).
- Commit de referência: `73225c6a5df44245f6d6b059b95cf11df39800c1`, igual ao `HEAD` consultado; branch `task/TASK-006-checkout-pedidos`. A working tree está suja e o relatório de origem não comprova se os testes foram executados sobre este estado local completo.
- Correções terminológicas: `is_replay` → `idempotent_replay`; `conference_status` → `order_inspections.items_confirmed`/`approved_at`; `payment_status` → `orders.payment_confirmed_at`; `admin_mfa_verified` → `admin_auth_sessions.mfa_verified_at`; ledger → `event_type`/`quantity_delta`; histórico → `order_events` (`event_type`, `from_status`, `to_status`, `actor_uid`, `created_at`). Os nomes antigos não são colunas do esquema atual.
- A inspeção de código/migrations confirmou compatibilidade dos contratos descritos. Ela não substitui as execuções manuais informadas pela usuária; nenhum teste, SQL, worker ou migration foi executado nesta reconciliação.

## Contadores e GATE-006

- T001–T011: **11/11 APROVADOS conforme relatório/evidências manuais fornecidos pela usuária**; 0 reprovados; 0 pendentes segundo o relato. Evidências não foram reexecutadas pelo Codex.
- GATE-001 a GATE-005: concluídos conforme os relatórios anteriores.
- **GATE-006: APROVADO**, com base nos resultados manuais T001–T011 declarados pela usuária e na reconciliação dos nomes de esquema acima.
- **GATE-007 / Etapa 007: HABILITADA para execução futura, ainda não iniciada.**
