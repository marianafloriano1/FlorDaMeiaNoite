# TASK-007 — Etapa 006 — Roteiro de testes manuais

**Projeto:** Flor da Meia-Noite
**Data de preparação:** 2026-10-29
**Branch:** `task/TASK-007-painel-produtos-estoque`
**Commit de referência:** `73225c6a5df44245f6d6b059b95cf11df39800c1`
**Ambiente previsto:** Windows PowerShell, WSL ou Linux; navegador moderno; aplicação e Supabase local isolado.
**Execução manual:** NÃO EXECUTADA nesta preparação. Todos os resultados e evidências continuam reservados para preenchimento manual.

## Regras de segurança e preparação

- Usar somente usuários, produtos, imagens e mensagens sintéticos. Não usar CPF, telefone, e-mail, contratos, dados ou credenciais reais.
- Usar uma stack Supabase local descartável e isolada. Nunca usar produção, homologação compartilhada ou `flor-da-meia-noite-local`; não executar `db reset`, apagar volumes ou limpar dados existentes.
- A stack isolada conhecida `task007-validation-20261028-2eed9cd5` teve as sete migrations aplicadas, inclusive `202610290001_task007_outbox_lease_recovery.sql`, na validação da Etapa 005; o último API_URL observado foi `http://127.0.0.1:57221`. A disponibilidade não foi revalidada nesta preparação. Confirmar com `supabase status` antes de usar. A stack pode conter fixtures sintéticas das integrações anteriores. Identifique eventos pelo `product_id`/ID; para testar o worker sem eventos de outras fixtures, prefira nova stack descartável.
- Se a stack acima não estiver disponível, interrompa e prepare uma nova stack isolada com as migrations em ordem. Não redirecione os comandos para a stack padrão do projeto.
- `npm run dev` deve receber `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` da stack local. Obtenha os valores por `supabase status --workdir <pasta-isolada>` e mantenha-os apenas no ambiente do terminal; não os salve no repositório, capturas ou evidências.
- Criar previamente um usuário sintético `employee` com perfil ativo, um `admin` sintético com MFA local disponível e um `customer` sintético. Não registrar senhas, OTP, cookies ou tokens neste documento. Se não houver usuários adequados, bloquear o teste até preparar fixtures locais.
- A imagem de teste deve ser sintética e sem metadados/PII. O gateway auxiliar abaixo aceita somente destinatário no domínio reservado `.invalid`; ele não envia e-mail.

### Inicialização local

PowerShell, na raiz do checkout:

```powershell
node --version # projeto requer Node >=22 e <25
$ValidationWorkdir = '<pasta da stack Supabase isolada>'
node_modules/.bin/supabase.cmd status --workdir $ValidationWorkdir
$env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:57221' # substituir pelo API_URL informado pela stack
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = '<ANON_KEY local da stack>'
$env:SUPABASE_SERVICE_ROLE_KEY = '<SERVICE_ROLE_KEY local da stack>'
npm run dev
```

WSL/Linux, na raiz do checkout:

```bash
node --version # projeto requer Node >=22 e <25
export TASK007_SUPABASE_WORKDIR='<diretório da stack Supabase isolada>'
./node_modules/.bin/supabase status --workdir "$TASK007_SUPABASE_WORKDIR"
export NEXT_PUBLIC_SUPABASE_URL='<API_URL local da stack>'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='<ANON_KEY local da stack>'
export SUPABASE_SERVICE_ROLE_KEY='<SERVICE_ROLE_KEY local da stack>'
npm run dev
```

Depois, autenticar-se no navegador com um dos usuários sintéticos e abrir `http://localhost:3000/admin/catalog`. Não compartilhar a saída do `supabase status` nem valores de variáveis de ambiente.

### Consultas somente leitura para evidência

Executar no SQL Editor da stack isolada, filtrando pelo UUID/slug sintético criado no caso:

```sql
select id, slug, status, stock_quantity
from public.catalog_products
where slug = 'SLUG_SINTETICO_DO_TESTE';

select event_type, actor_uid, created_at, quantity_before, quantity_after,
       quantity_delta, reason
from public.inventory_ledger
where product_id = 'UUID_SINTETICO_DO_PRODUTO'
order by created_at, id;

select id, product_id, quantity_before, quantity_after, status, attempts,
       locked_until, last_error_code, idempotency_key
from public.catalog_stock_alert_outbox
where product_id = 'UUID_SINTETICO_DO_PRODUTO'
order by created_at, id;
```

Não executar `select *` em tabelas com dados pessoais nem incluir chaves/cookies em evidências.

### Gateway local sintético do worker

Terminal 1 — PowerShell:

```powershell
$env:TASK007_SINK_TOKEN = 'task007-local-synthetic-token'
$env:TASK007_SINK_FAIL_FIRST = '1' # opcional: primeiro envio retorna 503 para validar retry
node tests/task007/fixtures/mock-email-gateway.mjs
```

Terminal 2 — mesma configuração local do Supabase e destinatário reservado:

```powershell
$env:LOW_STOCK_ALERT_EMAIL_WEBHOOK_URL = 'http://127.0.0.1:8787/send'
$env:LOW_STOCK_ALERT_EMAIL_WEBHOOK_TOKEN = 'task007-local-synthetic-token'
$env:LOW_STOCK_ALERT_RECIPIENT = 'estoque@example.invalid'
$env:CATALOG_STOCK_ALERT_POLL_INTERVAL_MS = '1000'
npm run worker:catalog-stock-alerts
```

O sink escuta somente em `127.0.0.1`, valida token/chave idempotente, recusa destinatários fora de `.invalid`, não envia e-mail e não imprime payload/token. Com `TASK007_SINK_FAIL_FIRST=1`, aguardar pelo menos 35 segundos após a falha inicial para a nova tentativa com backoff de 30 segundos. Encerrar cada processo com Ctrl+C uma vez. Esta preparação do sink não é evidência de teste manual.

## Roteiro

Em cada caso, preencher “Resultado obtido” e “Evidência” somente depois da execução humana. Capturas devem mostrar apenas dados sintéticos e não podem conter credenciais, OTP, cookies ou tokens.

### TESTE: T001 — Employee cria e edita produto

- **Objetivo:** confirmar o acesso de funcionário ativo ao painel e as operações básicas de catálogo.
- **Pré-condições:** sessão do usuário sintético `employee`; stack isolada; slug exclusivo `task007-manual-<ID>`.
- **Comandos/procedimento:** abrir `/admin/catalog`; cadastrar produto sintético com campos válidos, categoria permitida e estado rascunho; editar nome/descrição e salvar; conferir a listagem.
- **Resultado esperado:** painel acessível; criação retorna sucesso e produto começa com estoque zero; edição persiste; funcionário não define autor/data do histórico de estoque.
- **Resultado obtido:** PASS reportado pela operadora — employee criou e editou produto; estoque inicial zero.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T002 — Admin precisa de MFA recente para mutar

- **Objetivo:** verificar que leitura é permitida ao admin autenticado, mas mutações exigem step-up recente.
- **Pré-condições:** usuário sintético `admin`; MFA local configurado; produto sintético.
- **Comandos/procedimento:** sem step-up recente, tentar salvar/alterar produto ou estoque e capturar a resposta da API; completar o fluxo MFA local aprovado; repetir a mutação.
- **Resultado esperado:** sem MFA recente, HTTP 428 `admin_mfa_required`; após step-up válido, a operação autorizada retorna sucesso. Nenhuma chave de service role deve aparecer no navegador.
- **Resultado obtido:** PASS reportado pela operadora — mutação sem MFA recente retornou HTTP 428; após TOTP, mutação permitida.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T003 — Visitante e customer não administram catálogo

- **Objetivo:** confirmar negação server-side para sessão ausente e papel não autorizado.
- **Pré-condições:** um contexto de navegador sem sessão e um usuário sintético `customer`.
- **Comandos/procedimento:** para visitante, abrir `/admin/catalog` e chamar `GET /api/admin/catalog/products`; repetir a chamada autenticado como customer.
- **Resultado esperado:** visitante recebe acesso restrito e API HTTP 401; customer recebe HTTP 403 `catalog_operator_required`; nenhuma escrita ocorre.
- **Resultado obtido:** PASS reportado pela operadora — visitante recebeu HTTP 401 e customer HTTP 403; restrição aplicada no servidor.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T004 — Ajuste de estoque gera trilha auditável

- **Objetivo:** validar saldo anterior/novo, delta, ator, timestamp de servidor e justificativa.
- **Pré-condições:** employee ativo; produto sintético publicado com estoque 8.
- **Comandos/procedimento:** no painel, alterar o saldo para 7 com justificativa curta; guardar UUID do produto e consultar a linha `stock_adjustment` conforme a consulta somente leitura acima.
- **Resultado esperado:** HTTP sucesso; saldo 7; uma linha com `quantity_before=8`, `quantity_after=7`, `quantity_delta=-1`, `reason` igual à enviada, `actor_uid` do usuário autenticado e `created_at` preenchido pelo servidor.
- **Resultado obtido:** PASS reportado pela operadora — ajuste registrou saldo anterior/novo, delta, ator e timestamp gerado pelo servidor.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T005 — Payload inválido ou tentativa de forjar auditoria é recusado

- **Objetivo:** confirmar validação de estoque/motivo e que cliente não escolhe ator ou data.
- **Pré-condições:** employee autenticado; produto sintético; estoque e contagem atual do ledger registrados.
- **Comandos/procedimento:** pelo console do navegador na própria origem, enviar `POST /api/admin/catalog/products/<UUID>/stock` com, separadamente, saldo negativo, saldo fracionário, motivo vazio, motivo com 401 caracteres e payload válido acrescido de `actorUid`/`createdAt` arbitrários.
- **Resultado esperado:** cada payload inválido/forjado retorna HTTP 400 `invalid_stock_adjustment`; estoque e ledger permanecem inalterados. Entrada válida com motivo entre 1 e 400 caracteres não permite ao cliente escolher ator/data.
- **Resultado obtido:** PASS reportado pela operadora — payload inválido e tentativa de falsificar ator/data foram recusados com HTTP 400.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T006 — Mensagem pública respeita limites 1–2 e oculta saldo

- **Objetivo:** conferir a regra pública exata e a ausência da quantidade numérica.
- **Pré-condições:** produto sintético publicado; employee/admin autorizado para ajustar saldo.
- **Comandos/procedimento:** ajustar sucessivamente o mesmo produto para 3, 2, 1 e 0; após cada ajuste abrir `/catalog` e consultar `GET /api/catalog` sem token/service role.
- **Resultado esperado:** em 3 não há alerta; em 2 e 1 aparece exatamente “Últimas unidades disponíveis.”; em 0 o produto não aparece como disponível; nenhuma resposta pública contém `stock_quantity` ou o saldo numérico interno.
- **Resultado obtido:** PASS reportado pela operadora — aviso público exato nos saldos 1–2; removido em zero; saldo numérico não exposto.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T007 — Outbox deduplica e rearma após recomposição

- **Objetivo:** validar cruzamentos internos 8→7→6→8→7 sem repetição indevida.
- **Pré-condições:** produto sintético exclusivo com estoque 8; anotar UUID e quantidade de eventos existentes para esse produto.
- **Comandos/procedimento:** usar o painel para ajustar para 7, 6, 8 e 7; consultar apenas as linhas do produto no outbox.
- **Resultado esperado:** exatamente dois eventos para os cruzamentos 8→7; nenhum evento em 7→6 ou 6→8; o segundo cruzamento após recompor para 8 rearma o alerta.
- **Resultado obtido:** PASS reportado pela operadora — outbox deduplicou eventos e rearmou o alerta nos cruzamentos de estoque testados.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T008 — Worker entrega/retry pelo gateway sintético

- **Objetivo:** verificar entrega local, retry idempotente e ausência de envio real.
- **Pré-condições:** eventos sintéticos do T007; gateway local iniciado; `LOW_STOCK_ALERT_RECIPIENT` termina em `.invalid`; worker apontado somente para `127.0.0.1`.
- **Comandos/procedimento:** com `TASK007_SINK_FAIL_FIRST=1`, iniciar o worker; observar a falha transitória e aguardar ao menos 35 segundos pelo retry; conferir logs sanitizados do sink e estados dos eventos no outbox. Repetir a verificação sem criar novos cruzamentos.
- **Resultado esperado:** primeira tentativa retorna 503 sintético; retry usa a mesma `idempotency_key`, é aceito e marca o evento como `sent`; não há segunda aceitação do mesmo evento, destinatário real, billing ou e-mail enviado. Nenhum conteúdo pessoal é impresso.
- **Resultado obtido:** PASS reportado pela operadora — worker processou o outbox e realizou retry idempotente pelo gateway sintético.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T009 — Upload usa imagem de catálogo e rejeita arquivo inválido

- **Objetivo:** verificar validação e acesso público apenas da imagem de produto.
- **Pré-condições:** employee/admin autenticado; produto sintético; imagem sem PII e menor que 10 MiB.
- **Comandos/procedimento:** enviar imagem válida com texto alternativo; abrir a URL pública resultante em janela sem sessão; tentar enviar arquivo `.txt` renomeado para `.png`; conferir que nenhum arquivo foi colocado no bucket de contratos.
- **Resultado esperado:** imagem válida recebe sucesso e URL acessível no bucket `catalog`; arquivo com assinatura inválida é recusado com HTTP 400; bucket privado de contratos permanece inalterado.
- **Resultado obtido:** PASS reportado pela operadora — imagem de catálogo recebeu URL pública; assinatura inválida retornou HTTP 400; contratos preservados.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T010 — Mutação cross-origin é bloqueada

- **Objetivo:** conferir a proteção same-origin do endpoint de mutação.
- **Pré-condições:** admin/employee sintético autenticado; origem de teste também local, em porta diferente; produto sintético.
- **Comandos/procedimento:** enviar uma mutação de estoque a partir da origem local de teste diferente da origem do app; observar a chamada no painel Network do navegador. Não copiar cookies para scripts, logs ou evidência.
- **Resultado esperado:** HTTP 403 `forbidden` antes de qualquer alteração; saldo e ledger permanecem inalterados.
- **Resultado obtido:** PASS reportado pela operadora — mutação cross-origin não autorizada foi bloqueada com HTTP 403.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T011 — Ajustes concorrentes preservam saldo e sequência de auditoria

- **Objetivo:** observar serialização de duas alterações simultâneas no mesmo produto.
- **Pré-condições:** duas sessões sintéticas autorizadas; produto com saldo conhecido (por exemplo, 8); anotar o último movimento de auditoria.
- **Comandos/procedimento:** submeter quase simultaneamente ajustes válidos para 7 e 6 a partir de duas sessões; consultar o saldo final e movimentos `stock_adjustment` criados durante a janela.
- **Resultado esperado:** saldo final corresponde a uma das operações confirmadas; valores anterior/novo/delta formam transições consistentes na ordem do banco; saldo nunca é negativo e não há movimento parcialmente gravado.
- **Resultado obtido:** PASS reportado pela operadora — ajustes concorrentes preservaram saldo e trilha de auditoria serializada.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T012 — Lease expirada após limite de tentativas termina em failed

- **Objetivo:** confirmar manualmente a recuperação do P1 já coberto por teste de integração.
- **Pré-condições:** somente banco isolado descartável; evento de outbox sintético pendente e identificado por UUID; acesso ao SQL Editor local.
- **Comandos/procedimento:** em um evento sintético específico, simular crash após a quinta reivindicação apenas na stack isolada, com UUIDs do próprio teste:
  ```sql
  update public.catalog_stock_alert_outbox
  set status = 'processing', attempts = 5, locked_until = now() - interval '1 second'
  where id = 'UUID_SINTETICO_DO_EVENTO'
    and product_id = 'UUID_SINTETICO_DO_PRODUTO'
    and status = 'pending';
  select * from public.claim_catalog_stock_alerts(1);
  select status, attempts, locked_until, last_error_code
  from public.catalog_stock_alert_outbox where id = 'UUID_SINTETICO_DO_EVENTO';
  ```
  Confirmar que a atualização afetou uma linha. Nunca executar fora da stack isolada.
- **Resultado esperado:** evento não é reivindicado para envio; passa a `failed`, `locked_until` fica `NULL` e `last_error_code='worker_lease_expired_after_max_attempts'`.
- **Resultado obtido:** PASS reportado pela operadora — lease recuperada; após o limite de tentativas, evento terminou em estado failed.
- **Evidência:** Declaração de execução e resultado fornecida pela operadora em 2026-10-29 nesta conversa; não reexecutada nem verificada independentemente pelo Codex.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

## Reconciliação do relatório fornecido pela usuária

Documento analisado: `supabase_database_constraints_and_business_logic_validation_report.md` (relatório fornecido pela usuária; não executado nem verificado independentemente nesta sessão).

O documento relata três verificações de banco, mas os IDs T008–T010 não correspondem aos IDs deste roteiro:

| Evidência relatada | Correspondência com este roteiro | Avaliação |
|---|---|---|
| `reserved` com delta negativo em `inventory_ledger` | Nenhum caso T001–T012 comprova essa operação como critério TASK-007; trata de reserva. | Não mapeada para aprovação da Etapa 006. |
| `cancelled_release` com delta positivo | Trata de cancelamento/liberação de reserva, fora do aceite TASK-007. | Não mapeada para aprovação da Etapa 006. |
| Produto `published` retornado por `public_catalog_products` | Relaciona-se parcialmente ao catálogo público, mas não registra estoque 1/2/3/0, texto do alerta, payload completo ou ocultação do saldo. | Evidência parcial; não aprova T006. |

O relatório não identifica data/hora, commit, URL/ID da stack isolada, comandos usados, operador/role da sessão, status HTTP da API pública ou capturas que permitam mapear os resultados a T001–T012. Seus IDs T008–T010 têm semântica diferente da numeração deste roteiro; não foram usados para alterar status dos testes.

**Resultado da reconciliação:** 0 dos 12 casos deste roteiro têm evidência suficiente para serem marcados APROVADOS com base nesse documento. Os 12 casos permanecem pendentes de execução/evidência compatível; GATE-006 continua BLOQUEADO / AGUARDANDO TESTES. Esta conclusão não afirma que os testes descritos pela usuária não ocorreram; registra apenas que o relatório apresentado não comprova os critérios desta etapa.

### Reanálise de relatório completo fornecido pela usuária — 2026-10-29

O documento `relat_rio_completo_de_testes_task_007.md` foi analisado como evidência reportada pela usuária; a execução não foi reproduzida nesta sessão. Embora apresente 12 itens aprovados, a numeração e os critérios não correspondem aos T001–T012 deste roteiro: o relatório cobre inserção e constraints de catálogo/reservas, movimentos `reserved`/`cancelled_release` no ledger e consulta à view pública. Não demonstra os fluxos manuais desta Etapa 006 (RBAC/MFA, auditoria por API, limites públicos 1–2/estoque zero, outbox e worker de alerta, upload de imagem, same-origin, ajustes concorrentes ou recuperação de lease).

O relatório comprova, segundo o que foi informado, algumas operações e constraints de banco, mas não fornece evidência mapeável aos critérios dos testes manuais definidos para TASK-007. Assim, nenhum T001–T012 foi promovido a PASS com base neste documento; todos permanecem pendentes. **GATE-006 continua BLOQUEADO / AGUARDANDO EVIDÊNCIAS compatíveis; Etapa 007 não habilitada.** Esta avaliação não afirma que os testes relatados não ocorreram; registra somente a incompatibilidade de escopo e de critérios.

### Reanálise do relatório oficial de aprovação fornecido pela usuária — 2026-10-29

O documento `relat_rio_oficial_de_valida_o_e_aprova_o_gate_006_task_007.md` declara os 12 cenários como aprovados. Foi tratado como evidência reportada pela usuária; nenhuma execução foi reproduzida nesta sessão. O mapeamento ao roteiro vigente é:

| Caso do roteiro TASK-007 | Conteúdo relacionado no novo relatório | Avaliação frente ao critério de aceite |
|---|---|---|
| T001 | T01 verifica customer/admin em endpoint administrativo. | Parcial: não demonstra employee criando e editando produto nem estoque inicial zero. |
| T002 | T02 relata 428 sem cabeçalho MFA e sucesso com TOTP. | Parcial: não comprova step-up recente no fluxo/endpoint deste projeto nem a leitura permitida. |
| T003 | T01 relata customer com 403. | Parcial: não comprova visitante com 401, código esperado e ausência de escrita. |
| T004 | T03 registra `PRODUCT_PUBLISH` em `audit_logs`. | Não comprova ajuste de estoque nem os campos antes/depois, delta, ator, justificativa e timestamp exigidos. |
| T005 | T11 relata payload XSS rejeitado com 422. | Parcial: não testa os valores de estoque/motivo inválidos, falsificação de ator/data ou ausência de mutação exigidos. |
| T006 | T04 relata webhook interno quando estoque chega a 1. | Critério diferente: o roteiro exige mensagem pública exata para 1–2, ausência acima de 2, exclusão de zero e ocultação do saldo; o relatório não os demonstra. |
| T007 | T05 relata um evento genérico de reserva como `COMPLETED`. | Não comprova cruzamentos 8→7→6→8→7, deduplicação e rearme do alerta de estoque. |
| T008 | T04/T05 relatam envio de webhook e processamento de outbox. | Não comprova entrega e retry pelo gateway sintético local, mesma chave idempotente ou ausência de envio real. |
| T009 | T06 relata rejeição de `.exe` e upload de `.webp`. | Parcial: não demonstra URL pública anônima, assinatura inválida `.txt` renomeada, bucket `catalog` nem preservação do bucket privado de contratos. |
| T010 | T07 relata resposta a `OPTIONS` cross-origin. | Não comprova bloqueio de uma mutação cross-origin nem que saldo e ledger ficaram inalterados. |
| T011 | T08 testa concorrência para a última unidade em reserva. | Não comprova duas alterações administrativas concorrentes nem a sequência consistente do histórico `stock_adjustment`. |
| T012 | T10 trata expiração de reserva; T12 trata timeout de conexão. | Não comprova lease expirada após cinco tentativas no outbox de alerta e estado terminal `failed`. |

**Resultado da reanálise:** o relatório apresenta cenários relacionados, mas não demonstra integralmente os critérios específicos de nenhum dos 12 casos atuais. T001–T012 permanecem pendentes de evidência compatível; não se altera o contador de aprovações. **GATE-006 permanece BLOQUEADO / AGUARDANDO TESTES; Etapa 007 não habilitada.** A conclusão avalia suficiência documental e não afirma que os cenários relatados não tenham sido executados.

### Atualização final com declaração da operadora — 2026-10-29

A operadora informou nesta conversa que executou os 12 testes manuais reais e confirmou os resultados correspondentes aos critérios deste roteiro. Essa declaração posterior complementa e prevalece sobre as avaliações anteriores dos relatórios anexados, cujos cenários não correspondiam ao roteiro. Os resultados T001–T012 foram registrados individualmente acima como **PASS reportado pela operadora**; o Codex não repetiu os testes nem verificou os registros brutos de execução. Com base nessa evidência manual reportada, **GATE-006 = CONCLUÍDO / APROVADO** e **Etapa 007 = HABILITADA para execução futura, não iniciada nesta atualização**.
## Contadores

- Testes previstos: **12**
- Casos deste roteiro com evidência reportada suficiente: **12**
- Aprovados: **12**
- Reprovados: **0**
- Bloqueados individualmente: **0**
- Pendentes de execução/evidência compatível: **0**

Os resultados manuais acima foram reportados pela operadora; o Codex não os reexecutou. Testes automatizados das Etapas 004/005 não substituem estes registros.

## Gates acumulados

| Gate | Estado | Evidência |
|---|---|---|
| GATE-001 | CONCLUÍDO | Relatório da Etapa 001. |
| GATE-002 | CONCLUÍDO | Relatório da Etapa 002 e DoR. |
| GATE-003 | CONCLUÍDO | Planejamento e decisão aprovada dos limiares. |
| GATE-004 | CONCLUÍDO | Implementação, testes integrados e OCI no relatório da Etapa 004. |
| GATE-005 | CONCLUÍDO | P1/P2 resolvidos; 21/21 TASK-007, 19/19 catálogo, lint, typecheck e diff check PASS no relatório de revisão. |
| GATE-006 | CONCLUÍDO / APROVADO | T001–T012 PASS conforme execução reportada pela operadora nesta conversa; sem reexecução independente pelo Codex. |
| GATE-007 | CONCLUÍDO / APROVADO | Conclusão registrada em `docs/reports/TASK-007-etapa-007-conclusao.md`. |

**Totais:** 7 concluídos; 0 pendentes; 0 bloqueados.
**GATE-006:** CONCLUÍDO / APROVADO conforme resultados reportados pela operadora. **Etapa 007:** CONCLUÍDA / APROVADA conforme relatório final.
**TASK-003/TASK-004:** preservadas. Nenhum teste foi reexecutado pelo Codex.
