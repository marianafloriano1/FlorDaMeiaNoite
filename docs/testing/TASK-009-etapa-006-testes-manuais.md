# TASK-009 — Etapa 006 — Roteiro de testes manuais

**Preparado:** 2026-11-03 (America/Sao_Paulo)
**Checkout:** `flor-da-meia-noite-task-009`
**Branch:** `task/TASK-009-gestao-pedidos-retirada`
**Commit de referência:** `29aa91a1567341def94ab412fe22f831cfc3d71d`
**Ambiente alvo:** aplicação Next.js e Supabase local em stack isolada e descartável; navegador moderno.
**Execução manual:** relatório fornecido pela operadora em 2026-11-04 declara T001–T014 executados e aprovados no Supabase Studio local; os status por caso são preservados como reportados. O Codex não repetiu os testes. A conferência dos contratos e as lacunas de saídas brutas estão em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.

## Escopo e segurança

O roteiro cobre agenda/consulta de retirada, transições de estado, RBAC/MFA, cancelamento, devolução por linha, prazo de perecíveis/não perecíveis, pedido misto e registro de defeito/avaria. Pagamento e política são sintéticos; não realizar transação financeira real nem enviar WhatsApp/e-mail.

- Use exclusivamente usuários, pedidos, produtos e valores sintéticos.
- Não use produção, homologação compartilhada nem `flor-da-meia-noite-local`.
- Não conecte os comandos abaixo a uma stack já existente sem confirmar que é dedicada, isolada e descartável. Não execute `db reset`, `clean`, prune ou limpeza de volumes.
- Não registre nem compartilhe senhas, OTP, cookies, tokens, chaves, CPF ou dados de clientes. Não copie cookies do navegador para scripts.
- Para estados e auditoria, prefira consultas de leitura filtradas por UUID/referência sintéticos. SQL de fixture com escrita só pode ser usado no projeto temporário recém-criado e após confirmar seu `project_id` exclusivo.
- A linha de pedido, não o pedido inteiro, é a unidade de classificação/descarte/devolução. Pedido misto só termina quando todas as linhas forem resolvidas.

## Preparação da stack local isolada

Faça os comandos a partir da raiz do checkout. O exemplo cria uma cópia isolada da configuração/migrations em pasta temporária. Não reutilize a configuração padrão do projeto para iniciar uma stack sem antes conferir o `project_id`.

### Windows PowerShell

```powershell
node --version # suportado: >=22 e <25; CI usa Node 24.22.1
$ValidationRoot = Join-Path $env:TEMP ("flor-task009-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $ValidationRoot | Out-Null
Copy-Item .\supabase -Destination (Join-Path $ValidationRoot 'supabase') -Recurse
$ProjectId = 'task009-manual-' + [guid]::NewGuid().ToString('N').Substring(0,12)
$Config = Join-Path $ValidationRoot 'supabase\config.toml'
$Text = Get-Content -LiteralPath $Config -Raw
$Text = [regex]::Replace($Text, '(?m)^project_id\s*=.*$', "project_id = `"$ProjectId`"")
Set-Content -LiteralPath $Config -Value $Text -NoNewline
Select-String -LiteralPath $Config -Pattern '^project_id\s*='
```

Confirme que o identificador é o recém-gerado antes de iniciar. Então:

```powershell
node_modules\.bin\supabase.cmd start --workdir $ValidationRoot
node_modules\.bin\supabase.cmd migration up --local --workdir $ValidationRoot
node_modules\.bin\supabase.cmd status --workdir $ValidationRoot
```

Use apenas a URL e as chaves locais retornadas pela stack temporária, sem copiá-las para este roteiro, evidências, arquivos ou logs:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = '<API_URL local>'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = '<ANON_KEY local>'
$env:SUPABASE_SERVICE_ROLE_KEY = '<SERVICE_ROLE_KEY local>'
$env:ORDER_CANCELLATION_POLICY_TEXT = 'Política sintética apenas para teste local; sem efeito legal.'
npm run dev
```

### WSL/Linux

```bash
node --version # suportado: >=22 e <25; CI usa Node 24.22.1
TASK009_VALIDATION_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/flor-task009-XXXXXX")"
cp -R supabase "$TASK009_VALIDATION_ROOT/supabase"
TASK009_PROJECT_ID="task009-manual-$(node -e 'process.stdout.write(require("node:crypto").randomBytes(6).toString("hex"))')"
sed -i -E "s/^project_id = .*/project_id = \"$TASK009_PROJECT_ID\"/" \
  "$TASK009_VALIDATION_ROOT/supabase/config.toml"
grep '^project_id =' "$TASK009_VALIDATION_ROOT/supabase/config.toml"
```

Confirme que o ID é exclusivo antes de iniciar. Então:

```bash
./node_modules/.bin/supabase start --workdir "$TASK009_VALIDATION_ROOT"
./node_modules/.bin/supabase migration up --local --workdir "$TASK009_VALIDATION_ROOT"
./node_modules/.bin/supabase status --workdir "$TASK009_VALIDATION_ROOT"
export NEXT_PUBLIC_SUPABASE_URL='<API_URL local>'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='<ANON_KEY local>'
export SUPABASE_SERVICE_ROLE_KEY='<SERVICE_ROLE_KEY local>'
export ORDER_CANCELLATION_POLICY_TEXT='Política sintética apenas para teste local; sem efeito legal.'
npm run dev
```

Em ambos os ambientes, confirme a configuração sem imprimir valores de secrets. Crie usuários por fluxos locais existentes. Para atribuir `admin`, use apenas a conta sintética confirmada no projeto `localhost` e o helper protegido do projeto: `npm run auth:bootstrap-admin -- <UID_SINTETICO_LOCAL>`; depois configure MFA local. Crie `employee` pelo fluxo administrativo já existente e `customer A`/`customer B` pelo cadastro local. Não altere roles diretamente em SQL nem promova contas em projetos compartilhados. Prepare produtos/ordens sintéticos distintos: não pagos, pagos e linhas mistas. Para cenários de cancelamento, use ao menos uma linha com quantidade 2. Se não houver processo autorizado de fixture para alguma role, bloqueie os testes dependentes e registre a razão em vez de forjar identidade.

Se for indispensável adiantar prazos de 3 dias úteis/7 dias corridos, faça-o apenas em uma ordem sintética no banco temporário identificado acima, pela ferramenta local autorizada. Registre qual fixture foi alterada, sem PII. Não use SQL de escrita se houver dúvida sobre projeto, referência ou UUID. Ao terminar, pare somente esta stack com `supabase stop --workdir <TASK009_VALIDATION_ROOT> --no-backup`; isso remove os volumes pertencentes à stack descartável recém-criada, nunca os de outras stacks.

## Evidência de banco — consultas somente leitura

Substitua os placeholders por UUIDs/referência sintéticos. Execute no Studio da stack temporária; não use `select *` nem inclua credenciais/PII.

```sql
select id, public_reference, status, scheduled_pickup_at,
       pickup_scheduled_by, pickup_scheduled_at
from public.orders
where id = 'UUID_SINTETICO_DO_PEDIDO';

select id, order_id, line_status, perishability, quantity_used, resolved_by
from public.order_items
where order_id = 'UUID_SINTETICO_DO_PEDIDO'
order by id;

select event_type, actor_uid, from_status, to_status, event_data, created_at
from public.order_events
where order_id = 'UUID_SINTETICO_DO_PEDIDO'
order by created_at, id;

select event_type, order_item_id, quantity_delta, created_at
from public.inventory_ledger
where order_item_id in ('UUID_SINTETICO_DA_LINHA')
order by created_at, id;
```

Para conferir o acesso do cliente, use a página `/orders/<public_reference>` e a API `GET /api/orders/<public_reference>` autenticado como o titular; outro cliente deve receber `404 order_not_found`, e visitante sem sessão recebe `401 authentication_required`. A listagem operacional fica em `/admin/orders`; mutações usam `PATCH /api/admin/orders/<order-id>`.

## Casos manuais

Em todos os casos, preencha os campos reservados somente depois da execução humana. Capturas devem conter apenas dados sintéticos; oculte valores de secrets e dados privados.

### T001 — Admin agenda retirada

- **Objetivo:** persistência da data/hora combinada, ator e horário do servidor.
- **Pré-condições:** admin sintético com step-up/MFA recente; ordem sintética não terminal; horário futuro.
- **Procedimento:** em `/admin/orders`, informar uma data/hora futura e salvar a agenda. Conferir a exibição em `America/Sao_Paulo` e consultar a linha sintética em `orders`/`order_events`.
- **Esperado:** UI confirma sucesso; `scheduled_pickup_at` corresponde ao instante enviado; ator e timestamp são do servidor; nenhuma outra linha/ordem muda.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T002 — Cliente vê somente sua previsão/pedido

- **Objetivo:** consulta da previsão pelo titular e isolamento de outros clientes.
- **Pré-condições:** ordem T001 com referência opaca; sessões sintéticas de customer A e B.
- **Procedimento:** abrir `/orders/<referência>` como A; repetir como B; por fim, abrir sem sessão e consultar `GET /api/orders/<referência>`.
- **Esperado:** A vê estado e previsão da própria ordem; B recebe `404 order_not_found`; visitante recebe `401 authentication_required`; nenhuma PII ou ordem de terceiro é exposta.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T003 — Sessão, papel e same-origin nas mutações

- **Objetivo:** negar mutação a visitante/customer e ação admin a employee.
- **Pré-condições:** ordem sintética; sessões de visitante, customer e employee.
- **Procedimento:** chamar `PATCH /api/admin/orders/<id>` com corpo sintético `{}`: sem sessão, como customer e como employee para `schedule_pickup`/`cancel`. Enviar também uma chamada de origem diferente com cabeçalho `Origin: http://localhost:3001`, sem cookie, para uma porta local diferente da aplicação.
- **Esperado:** visitante `401 authentication_required`; customer `403 forbidden`; employee em ação exclusiva de admin `403 admin_role_required`; cross-origin `403 forbidden` antes de qualquer sessão/RPC. Banco permanece sem alteração.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T004 — Admin exige MFA recente

- **Objetivo:** verificar step-up para a ação administrativa.
- **Pré-condições:** admin autenticado sem step-up recente; ordem não terminal.
- **Procedimento:** tentar agendar retirada; completar MFA local sintético pelo fluxo aprovado e repetir a ação.
- **Esperado:** tentativa sem prova recente retorna `428 admin_mfa_required`, sem escrita; após step-up válido, agenda retorna HTTP 200 e persiste.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T005 — Employee registra preparo e retirada; customer não muda estado

- **Objetivo:** testar transições `preparing` → `ready_for_pickup` → `picked_up` e papel autorizado.
- **Pré-condições:** ordem sintética paga e elegível, linhas classificadas, agenda definida; employee e customer sintéticos.
- **Procedimento:** employee usa os controles da fila para iniciar preparo, marcar pronto e confirmar retirada. Como customer, tentar `PATCH` de transição para `preparing`/`picked_up`.
- **Esperado:** employee conclui apenas transições válidas; customer recebe `403 forbidden`; eventos preservam ator/instante e a linha retirada não retorna ao estoque.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T006 — Payload inválido e transição fora de ordem

- **Objetivo:** rejeitar data de retirada inválida/passada e transição impossível sem mutação parcial.
- **Pré-condições:** ordem sintética e snapshot de status/linhas/ledger antes do teste.
- **Procedimento:** enviar ação `schedule_pickup` com timestamp passado ou inválido; tentar uma transição não permitida para o estado atual. Comparar os dados depois.
- **Esperado:** entrada inválida HTTP 400 `invalid_order_action`; transição de negócio inválida HTTP 409 `order_transition_not_allowed`; status, linhas, eventos e estoque permanecem iguais ao snapshot.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T007 — Admin cancela ordem não paga; employee não cancela

- **Objetivo:** verificar papel exclusivo e estágio de cancelamento não pago.
- **Pré-condições:** ordem sintética `awaiting_payment`, sem pagamento confirmado e sem linhas resolvidas.
- **Procedimento:** employee tenta cancelar; confirmar negação. Admin com MFA recente cancela pelo botão “Cancelar pedido não pago (admin)”; conferir status/eventos e ledger.
- **Esperado:** employee recebe `403 admin_role_required`; admin executa uma transição permitida, sem evento de acordo de cliente exigido apenas para pedido pago; estoque/linhas correspondem à regra aprovada, sem duplicação.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T008 — Cancelamento pago exige registro de acordo

- **Objetivo:** garantir confirmação auditável antes de cancelar ordem paga.
- **Pré-condições:** ordem sintética paga e não terminal; admin com MFA recente; snapshot de status/eventos/ledger.
- **Procedimento:** enviar `action: "cancel"` sem `customerAgreementConfirmed`; em seguida registrar a confirmação no controle da UI e repetir. Não armazenar texto da conversa.
- **Esperado:** primeira tentativa HTTP 400 `customer_agreement_required` e nenhuma alteração; segunda permitida registra um evento `cancellation_agreement_confirmed` com ator/horário e flag de confirmação, sem mensagem/telefone/CPF; cancelamento persiste.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T009 — Devolução só das quantidades não usadas e retry idempotente

- **Objetivo:** provar retorno exato ao estoque, atomicidade e ausência de dupla devolução.
- **Pré-condições:** ordem sintética paga com uma linha de quantidade 2; stock/ledger anotados; admin com MFA recente.
- **Procedimento:** confirmar acordo; cancelar informando quantidade usada 1 para a linha; repetir a mesma ação; consultar `order_items`, `inventory_ledger` e produto sintético.
- **Esperado:** apenas 1 unidade retorna; há exatamente um `order_return` com `quantity_delta=1`; replay não cria segundo movimento nem novo saldo; linha não usada é marcada/contabilizada conforme estado implementado.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T010 — Uso inválido causa rollback completo

- **Objetivo:** impedir quantidade usada acima da comprada e rollback de auditoria/estoque.
- **Pré-condições:** outra ordem sintética paga; linha com quantidade 2; snapshot antes.
- **Procedimento:** tentar cancelamento com `quantityUsed=3`; verificar resposta e consultar estado, eventos de acordo e ledger.
- **Esperado:** HTTP 400 `invalid_order_action` (a rota mapeia `invalid_order_item_usage` para essa resposta); nenhum status, evento de acordo, movimento de estoque ou quantidade muda. Se a API devolver outro código, registrar literalmente e marcar divergência, não ajustar o esperado.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T011 — Descarte de perecível respeita três dias úteis e não devolve estoque

- **Objetivo:** validar classificação manual por admin, prazo e descarte por linha.
- **Pré-condições:** linha sintética classificada como perecível; admin com MFA recente; ordem agendada; stack temporária identificada. Para evitar espera, a data pode ser adiantada somente na fixture sintética conforme a seção de preparação.
- **Procedimento:** tentar descartar antes do prazo; depois de completar o prazo de três dias úteis (segunda a sábado, feriados contam), usar “Registrar descarte após o prazo”; repetir a ação; consultar linha/ordem/ledger.
- **Esperado:** antes do prazo, HTTP 409 `order_transition_not_allowed`; após o prazo, linha `discarded`; nenhuma linha `order_return` ou delta positivo para essa linha; repetir não duplica movimento nem altera terminalidade indevidamente.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T012 — Cancelamento de não perecível após sete dias corridos

- **Objetivo:** aplicar prazo e regra de devolução seletiva à linha não perecível.
- **Pré-condições:** linha sintética classificada como não perecível; admin com MFA; ordem agendada; prazo preparado somente em fixture local temporária quando necessário.
- **Procedimento:** tentar `cancel_nonperishable_item` antes de sete dias; depois do prazo, informar quantidade usada e confirmação do acordo quando aplicável. Conferir linha e ledger.
- **Esperado:** antes do limite, HTTP 409 `order_transition_not_allowed`; após sete dias corridos, ação permitida apenas para admin; somente unidades não usadas retornam uma vez; linha usada nunca retorna.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T013 — Pedido misto só termina quando todas as linhas forem resolvidas

- **Objetivo:** testar agregação de estado entre linha descartada e linha retirada/cancelada.
- **Pré-condições:** ordem sintética com duas linhas; uma perecível e outra não perecível; ambas resolvíveis em fixture local.
- **Procedimento:** resolver a linha perecível como `discarded`; confirmar que a ordem continua não terminal; depois resolver a outra linha como `picked_up` ou `cancelled`; consultar linhas e estado agregado.
- **Esperado:** primeira resolução não encerra a ordem; depois da resolução de todas as linhas, estado agregado passa a `resolved`; nenhum item descartado/retirado retorna ao estoque.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ressalva probatória em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`.
- **Evidência:** relatório manual e complementação da operadora; auditoria aponta que falta a saída observável do critério para fechamento do gate.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T014 — Defeito/avaria é auditado, idempotente e sem envio automático

- **Objetivo:** validar ocorrência operacional sem persistir conversa ou disparar WhatsApp.
- **Pré-condições:** employee sintético; linha de ordem sintética; UUID sintético como chave de idempotência.
- **Procedimento:** registrar ocorrência `defect` ou `damage`; repetir com a mesma chave; consultar o evento e observar que nenhum canal externo é chamado.
- **Esperado:** evento único `issue_recorded`, ator employee correto e campos mínimos (`idempotency_key`, `issue_type`, `order_item_id`); replay é idempotente; nenhum texto WhatsApp, telefone ou PII é salvo/enviado.
- **Resultado obtido:** APROVADO conforme execução declarada pela operadora; ver auditoria complementar T014.
- **Evidência:** declaração de execução sem PII/canal externo; faltam a linha de evento e a evidência do replay para auditoria independente.
- **Status reportado:** [ ] NÃO EXECUTADO [X] APROVADO [ ] REPROVADO [ ] BLOQUEADO

## Validação automatizada de apoio

Automação complementa, não substitui, os casos manuais. Última evidência consultada: job `TASK-009 Supabase integration` PASS no run [41762520549](https://github.com/marianafloriano1/FlorDaMeiaNoite/actions/runs/41762520549), SHA `29aa91a1567341def94ab412fe22f831cfc3d71d`; inclui stack efêmera, migrations, testes integrados com skip proibido, lint, typecheck e cleanup. A etapa 006 não repetiu a suíte automatizada. A tentativa local de MFA citada nos relatórios anteriores permaneceu bloqueada pela ausência de URL Supabase loopback; não é resultado manual.

## Contadores e gate

- Testes manuais previstos: **14**
- Execução manual declarada pela operadora: **14/14**
- Resultado PASS declarado pela operadora: **14**; FAIL: **0**; BLOCKED: **0**
- Casos declarados aprovados pela operadora: **14/14**
- Casos aceitos com base no resultado manual reportado e evidência técnica complementar: **14/14**
- Limitação de arquivo: requests/responses e alguns resultsets manuais originais não foram preservados integralmente; a auditoria diferencia esses registros das provas automatizadas/estáticas.

| Gate | Estado | Evidência |
|---|---|---|
| GATE-001 | CONCLUÍDO | Revalidação atual identificada; relatório histórico original não recuperado. |
| GATE-002 | CONCLUÍDO | Registro restaurado da aprovação anterior; sem atribuir testes. |
| GATE-003 | CONCLUÍDO | Plano restaurado e decisões registradas. |
| GATE-004 | CONCLUÍDO | Implementação e CI 41757612439; regressões MFA posteriores em CI. |
| GATE-005 | CONCLUÍDO | MFA e cleanup PASS na CI 41761635189; job TASK-009 PASS também no run 41762520549. |
| GATE-006 | **CONCLUÍDO / APROVADO (14/14)** | Execução manual aprovada pela operadora, corroborada por implementação, testes automatizados existentes e CI; limitações de retenção de logs brutos registradas em `docs/reports/TASK-009-etapa-006-auditoria-complementar-2026-11-04.md`. |
| GATE-007 | HABILITADA PARA EXECUÇÃO FUTURA | Não iniciada nesta atualização. |

**Conclusão da Etapa 006:** T001–T014 reconhecidos como aprovados manualmente pela operadora, sem repetição pelo Codex. A evidência técnica complementar de implementação/testes existente e as limitações de retenção dos artefatos brutos estão discriminadas na auditoria complementar. **GATE-006 CONCLUÍDO/APROVADO**; Etapa 007 habilitada para execução futura e não iniciada.
