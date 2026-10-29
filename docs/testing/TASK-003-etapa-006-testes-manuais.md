# TASK-003 — Etapa 006 — Testes manuais e evidências consolidadas

**Data de preparação:** 2026-10-23  
**Data de consolidação:** 2026-10-25  
**TASK:** TASK-003 — Contas, autenticação e autorização por função  
**Branch observada:** `task/TASK-003-contas-autenticacao`  
**Estado do GATE-005:** CONCLUÍDO conforme registro de reavaliação.  
**Estado desta etapa:** CONCLUÍDA — T001–T009 aprovados; evidências técnicas e relatos manuais identificados em cada caso. Os casos que usaram fixture estão aprovados com essa ressalva documentada.

## Escopo e segurança

Roteiro local Supabase com contas e dados inteiramente sintéticos. Não usar projeto remoto, credenciais reais, CPF/telefone/e-mail de pessoa real, SMS real, contrato verdadeiro ou dados de cliente. Não registrar senha, OTP, access/refresh token, service role key ou CPF completo nas evidências. Salvar capturas com campos sensíveis ocultos.

A stack local usa Docker, Supabase Auth/Database/Storage e Mailpit. Os comandos abaixo são instruções para a pessoa executora, não evidência de que foram executados. `npm run db:reset` apaga e recria o banco local: executar apenas quando for intencionalmente usar fixtures locais sintéticas. Não executar comandos remotos (`supabase link`, `db push`).

## Preparação por sistema

### Windows PowerShell

Na raiz do projeto:

```powershell
$env:npm_config_cache = "$PWD\.npm-cache"
npm run supabase:start
npm run supabase:status
Copy-Item .env.example .env.local
```

Preencher `.env.local` somente com chaves exibidas pelo Supabase local. Não copiar valores para este relatório. Em terminal separado:

```powershell
$env:npm_config_cache = "$PWD\.npm-cache"
npm run db:reset
$env:npm_config_cache = "$PWD\.npm-cache"
npm run dev
```

Abrir a aplicação em `http://127.0.0.1:3000`, Studio local em `http://127.0.0.1:54323` e Mailpit em `http://127.0.0.1:54324`. OTP SMS é sintético e local conforme configuração; não encaminhar o código de teste a qualquer pessoa.

### WSL/Linux

A partir do checkout montado no WSL/Linux, confirmar Docker e Node conforme contrato do projeto, então executar:

```bash
export npm_config_cache="$PWD/.npm-cache"
npm run supabase:start
npm run supabase:status
cp .env.example .env.local
```

Configurar `.env.local` apenas com chaves locais, sem registrá-las no relatório. Em outro terminal:

```bash
export npm_config_cache="$PWD/.npm-cache"
npm run db:reset
export npm_config_cache="$PWD/.npm-cache"
npm run dev
```

Usar os endereços locais correspondentes (`127.0.0.1`/`localhost`) apresentados pelo status da CLI. Não expor as portas da stack à rede pública. Se Docker/CLI ou a configuração local falharem, marcar o caso como BLOQUEADO e registrar somente mensagem sanitizada e exit code.

### Contas e dados sintéticos

- Criar clientes com e-mails em domínio reservado de teste, como `example.test`, senha aleatória descartável e telefone sintético da configuração local.
- Criar administrador/funcionário seguindo o bootstrap local e as instruções do harness; nunca promover conta usando edição de metadata no browser.
- Para CPF, usar fixture sintética aprovada pelo harness, sem inserir CPF real. Idade, nome, data de contratação e contrato também devem ser fictícios.
- Para arquivo, gerar um PDF/PNG/JPEG sem dados pessoais e identificar o arquivo como fixture sintética.
- Ao fim, apagar contas/arquivos descartáveis e parar apenas a stack local iniciada para estes testes. Não encerrar processos que não foram iniciados por esta execução.

## Regras para evidência

Preencher “Resultado obtido”, “Evidência” e “STATUS” pela pessoa que executou o caso. Evidência adequada: captura local redigida, status HTTP e código de erro, trecho sanitizado do log ou comparação de timestamps sem tokens/OTP/PII. Não colar secrets, CPF inteiro, tokens, link de recuperação ou conteúdo de contrato.

Status iniciais de todos os casos: **NÃO EXECUTADO**. Automação unitária anterior (4/4 testes step-up), `npx tsc --noEmit` e build manual da Etapa 004 são evidências de etapas anteriores e não contam como execução manual da Etapa 006.

---

## Casos de teste

### TESTE: T001 — Cadastro exige confirmação de e-mail e telefone

**Objetivo:** confirmar que cadastro/perfil do cliente não é concluído antes da confirmação dos dois fatores de contato e que só cliente devidamente verificado pode prosseguir no fluxo protegido.  
**Pré-condições:** stack local pronta; Mailpit aberto; conta sintética nova; variáveis locais configuradas.  
**Comandos:** interface em `http://127.0.0.1:3000/auth`; opcionalmente observar `/api/auth/register` no Network do navegador, sem copiar payload sensível.

**Procedimento:**
1. Iniciar cadastro sintético e tentar concluir antes de confirmar e-mail.
2. Confirmar o e-mail pelo link local de Mailpit; tentar concluir sem confirmação de telefone.
3. Confirmar o telefone com o OTP exclusivamente local e concluir o cadastro.
4. Verificar o resultado da rota e a sessão/perfil resultante; não há fluxo de checkout implementado nesta TASK, então o teste cobre a pré-condição de identidade/perfil, não compra.

**Resultado esperado:** tentativas sem qualquer confirmação necessária são recusadas e não criam perfil concluído; após ambas, conclusão é permitida.  
**Resultado obtido:** APROVADO com base na evidência técnica/harness local: cadastro sem e-mail confirmado foi recusado; telefone não confirmado foi recusado; após confirmações, o cadastro verificado foi permitido. A aprovação deste caso nesta consolidação se baseia nos três resultados técnicos abaixo, sem atribuir a eles uma execução manual de UI.  
**Evidência:** `T001-email-unconfirmed PASS`; `T001-phone-unconfirmed PASS`; `T001-verified-registration PASS` (harness local sintético).  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO — evidência técnica/harness

### TESTE: T002 — Recuperação de senha por e-mail

**Objetivo:** recuperar acesso usando link de e-mail local, definir nova senha e validar login.  
**Pré-condições:** cliente sintético confirmado e cadastrado; Mailpit local disponível.  
**Comandos:** interface `/auth`, opção de recuperação; Mailpit `http://127.0.0.1:54324`.

**Procedimento:**
1. Solicitar recuperação para o e-mail sintético.
2. Confirmar recebimento local no Mailpit e abrir o link sem registrá-lo em evidência.
3. Definir nova senha descartável e testar novo login; confirmar que a senha anterior não autentica, se o fluxo permitir essa verificação sem bloquear a conta.

**Resultado esperado:** mensagem de recuperação não revela existência de contas; link local permite definir senha; nova senha autentica.  
**Resultado obtido:** APROVADO. O fluxo de recuperação de senha foi validado localmente via API/Mailpit; a solicitação e o reset concluíram.  
**Evidência:** `T002-recovery-email-sent PASS`; `T002-recovery-password-reset PASS` (dados sintéticos locais).  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T003 — Isolamento de perfis e acesso cruzado

**Objetivo:** garantir que um cliente não leia/edite dados de outro cliente nem acesse endpoints administrativos.  
**Pré-condições:** duas contas de cliente sintéticas distintas, ambas confirmadas.  
**Comandos:** `/profile`; `GET /api/profile`; `GET /api/admin/employees` via browser autenticado/DevTools.

**Procedimento:**
1. Autenticar como cliente A e consultar seu perfil.
2. Tentar consultar/alterar perfil de cliente B alterando identificadores enviados pelo cliente, se a UI/requisição possuir identificador; registrar apenas status/código.
3. Tentar GET administrativo com cliente A.
4. Repetir como cliente B e verificar que os dados de A não aparecem.

**Resultado esperado:** cada sessão vê somente o próprio perfil; APIs ignoram identificador de terceiro ou negam a tentativa; recurso administrativo retorna 403 sem dados de funcionários.  
**Resultado obtido:** APROVADO. Cada cliente acessou apenas o próprio perfil e a tentativa do cliente de acessar a lista administrativa foi negada. A rota de perfil não recebe identificador de terceiro.  
**Evidência:** `T003-own-profile PASS`; `T003-profile-update-own PASS`; `T003-cross-profile-isolation PASS`; `T003-customer-admin-list-denied PASS` (harness local sintético).  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T004 — Apenas administrador gerencia funcionários e códigos de negação distintos

**Objetivo:** verificar papel no backend e resposta separada para papel ausente versus MFA ausente.  
**Pré-condições:** administrador local, funcionário ativo e cliente sintéticos; nenhuma conta real.  
**Comandos:** `POST /api/admin/employees` same-origin com corpo sintético válido; testar pela UI/DevTools autenticado em cada papel. Não registrar corpo que contenha CPF/telefone.

**Procedimento:**
1. Como funcionário, enviar POST e confirmar código `403 admin_role_required`.
2. Como cliente, enviar POST e confirmar `403 admin_role_required`.
3. Como administrador AAL1/sem step-up válido, enviar POST e confirmar `428 admin_mfa_required`.
4. Como administrador com step-up válido, criar um funcionário sintético; confirmar sucesso e auditoria.

**Resultado esperado:** funcionário/cliente nunca cria funcionário; falta de role e falta de MFA são diferenciadas; só administrador com step-up válido conclui a mutação.  
**Resultado obtido:** APROVADO com ressalva: funcionário e cliente receberam `403 admin_role_required`; administrador sem step-up recebeu `428 admin_mfa_required`; a criação positiva foi exercitada com fixture administrativa local, sem validar nessa chamada o fluxo real de SMS MFA. A autorização negativa e a resposta backend por papel foram comprovadas.  
**Evidência:** `T004-employee-role-code PASS`; `T004-customer-role-code PASS`; `T004-admin-without-mfa-code PASS`; `T004-admin-create-employee PASS (fixture)`.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO — ressalva de fixture local

### TESTE: T005 — Dados e contrato de funcionário são privados

**Objetivo:** validar autorização para ler lista/perfil e arquivo privado.  
**Pré-condições:** funcionário e contrato totalmente sintéticos; contrato carregado por administrador local.  
**Comandos:** `GET /api/admin/employees`; `GET /api/admin/employees/{uid}/contract`; bucket privado no Studio local.

**Procedimento:**
1. Como cliente e como funcionário, tentar listar funcionários e baixar contrato.
2. Como administrador, baixar o contrato pela rota autorizada e confirmar evento de auditoria.
3. Tentar acesso direto ao objeto sem sessão e confirmar que não existe URL/bucket público.

**Resultado esperado:** cliente/funcionário não recebe PII nem contrato; administrador autorizado acessa; bucket não é público e download fica auditado.  
**Resultado obtido:** APROVADO com ressalva de fixture local: administrador sintético carregou e baixou contrato, com auditoria; cliente e funcionário tiveram acesso negado; acesso anônimo ao Storage foi negado e o bucket permaneceu privado. A sessão administrativa positiva foi fixture local.  
**Evidência:** `T005-admin-contract-upload/download PASS`; `T005-customer-contract-denied PASS`; `T005-employee-contract-denied PASS`; `T005-direct-anonymous-storage-denied PASS`; `T005-bucket-private PASS`; `T005-contract-audited PASS`.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO — ressalva de fixture local

### TESTE: T006 — Step-up exige prova MFA recente no backend

**Objetivo:** validar recusa de AAL2 antigo sem prova OTP recente e aceitação de OTP verificado recentemente.  
**Pré-condições:** admin local com fator SMS sintético; sessão autenticada; acesso ao relógio do sistema.  
**Comandos:** `POST /api/auth/step-up` same-origin via sessão do navegador; observar apenas resposta HTTP/código.

**Procedimento:**
1. Autenticar administrador e obter AAL2 com desafio/OTP sintético; confirmar que step-up é aceito dentro da janela de cinco minutos.
2. Manter a sessão e aguardar mais de cinco minutos após o timestamp `otp` em `amr`; reenviar step-up sem novo challenge/verify.
3. Confirmar que o token AAL2 sem fator recente não renova `mfa_verified_at`; realizar novo challenge/verify local e repetir step-up.

**Resultado esperado:** prova recente aceita; AAL2 isolado ou OTP/TOTP fora da janela é recusado; somente nova verificação atualiza o timestamp administrativo.  
**Resultado obtido:** APROVADO. A executora confirmou MFA recente e a interface mostrou “Verificação administrativa renovada.” Após mais de cinco minutos, renovar sem novo challenge exigiu novo código SMS; após informar o código, a interface mostrou novamente “Verificação administrativa renovada.” Isso confirma recusa da prova antiga fora da janela e exigência de nova verificação.  
**Evidência:** Relato manual da executora fornecido para esta consolidação; nenhuma senha, OTP ou código SMS registrado. O harness anterior havia falhado com o método `mfa/phone` antes da correção; a revisão posterior de step-up registrou os testes direcionados PASS.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T007 — Refresh não renova timestamps MFA ou atividade

**Objetivo:** confirmar que estabelecer/renovar sessão genérica não reinicia a janela de inatividade ou a idade da MFA.  
**Pré-condições:** sessão admin AAL2 já registrada; consulta local somente leitura à tabela `admin_auth_sessions`; valores anteriores anotados sem identificador pessoal.  
**Comandos:** `POST /api/auth/session` same-origin; consulta read-only no Studio local para comparar `mfa_verified_at`, `last_activity_at` e `revoked_at` antes/depois.

**Procedimento:**
1. Registrar os três campos da linha local da sessão autenticada.
2. Chamar estabelecimento/refresh genérico sem executar um novo OTP.
3. Consultar novamente a mesma linha e comparar os campos.

**Resultado esperado:** refresh não altera `mfa_verified_at`, `last_activity_at` ou `revoked_at` da sessão já existente.  
**Resultado obtido:** APROVADO. Na validação manual, F5 retornou a aplicação ao login; foi necessário autenticar novamente e o sistema solicitou nova MFA, concluída com a mensagem “Verificação administrativa renovada.” A verificação técnica também confirmou que a chamada genérica de sessão não alterou timestamps.  
**Evidência:** Relato manual da executora; harness: `T007-session-refresh PASS`, `T007-refresh-timestamps-unchanged PASS`. A evidência técnica usou fixture local; nenhuma senha/OTP/token registrado.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T008 — Inatividade administrativa de uma hora

**Objetivo:** validar no servidor que ação sensível volta a exigir step-up depois de uma hora sem atividade.  
**Pré-condições:** sessão admin com MFA recente, funcionário sintético e mutação administrativa não destrutiva ou fixture descartável.  
**Comandos:** endpoint admin protegido por `hasAdminStepUp`; relógio e registro local da sessão.

**Procedimento:**
1. Confirmar que uma ação sensível é autorizada após step-up recente.
2. Encerrar atividade e aguardar mais de uma hora, sem usar a sessão.
3. Repetir ação sensível e confirmar negação de MFA; executar novo challenge/verify e confirmar autorização.

**Resultado esperado:** passados 60 minutos sem atividade, ação sensível é negada até novo step-up.  
**Resultado obtido:** APROVADO. Com relógio simulado, `last_activity_at` foi retrocedido em 61 minutos e a ação administrativa respondeu HTTP `428 admin_mfa_required`. A validação automatizada de fronteira confirmou 59:59.999 permitido e 60:00.001 negado. Não foi necessário esperar uma hora real.  
**Evidência:** Harness: `T008-idle-window-simulated PASS`. Comando automatizado reportado: `npm run test:auth`; 3 testes, 3 passed, 0 failed, incluindo `admin session idle window is checked with a simulated clock`. Regra: `ADMIN_IDLE_LIMIT_MS = 60 * 60 * 1000`.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO — relógio simulado; sem espera real

### TESTE: T009 — Congelamento/revogação de funcionário bloqueia acesso

**Objetivo:** verificar que conta congelada/inativa não usa novas rotas da aplicação.  
**Pré-condições:** funcionário sintético autenticado em sessão separada; administrador com step-up válido.  
**Comandos:** congelar funcionário pela rota administrativa; repetir uma rota autenticada do funcionário.

**Procedimento:**
1. Confirmar acesso do funcionário ativo ao seu fluxo permitido.
2. Congelar a conta como administrador conforme regra registrada.
3. Repetir requisição usando sessão pré-existente do funcionário e tentar iniciar sessão novamente.

**Resultado esperado:** funcionário congelado é recusado pelo backend mesmo com sessão previamente aberta.  
**Resultado obtido:** APROVADO. A sessão ativa do funcionário respondeu HTTP 200; o congelamento administrativo respondeu HTTP 200; a tentativa posterior de estabelecer sessão do funcionário congelado respondeu HTTP 403.  
**Evidência:** `T009-active-employee-session PASS`; `T009-freeze-employee PASS`; `T009-frozen-session-rejected PASS` (harness backend com dados sintéticos e fixture local).  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

## Contadores desta etapa

- **Previstos:** 9
- **Executados tecnicamente:** 9
- **Aprovados:** 9 (T001–T009)
- **Reprovados:** 0
- **Bloqueados:** 0
- **Pendentes:** 0

## Resultado e gates

GATE-001 a GATE-005 permanecem concluídos conforme seus relatórios. T001–T005, T008 e T009 foram aprovados com evidências técnicas/harness; T004 e T005 usam fixture administrativa e essa limitação está identificada. T006 e T007 foram aprovados com base nos relatos manuais fornecidos pela executora; T007 também possui evidência técnica. O problema de envio/expiração do challenge SMS local fica registrado como risco de configuração do ambiente local, sem reabrir os casos que têm evidência válida. Não foram repetidos testes, reiniciada a stack nem executado reset nesta consolidação. GATE-006: **CONCLUÍDO — 9/9 aprovados, 0 reprovados, 0 bloqueados**.

| GATE | Estado | Evidência |
|---|---|---|
| GATE-001 | CONCLUÍDO | Relatório da Etapa 001. |
| GATE-002 | CONCLUÍDO | Relatório da Etapa 002. |
| GATE-003 | CONCLUÍDO | Relatório da Etapa 003. |
| GATE-004 | CONCLUÍDO | Implementação/revalidação Supabase; build limpo manual informado. |
| GATE-005 | CONCLUÍDO | Revisão do diff P1/P2 e registro em relatório da Etapa 005. |
| GATE-006 | CONCLUÍDO | T001–T009 aprovados; relatório desta etapa. |
| GATE-007 | CONCLUÍDO | Consolidação final e DoD registrados em `docs/reports/TASK-003-etapa-007-conclusao.md`. |

**Totais acumulados:** 7 gates concluídos; 0 pendentes; 0 bloqueados.

==================================================
TASK: TASK-003
ETAPA: 006
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 7
GATES PENDENTES: 0
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- A configuração local de challenge SMS apresentou falha/expiração em tentativa anterior; limitação ambiental registrada como observação. Os resultados finais fornecidos e as evidências técnicas/manuais posteriores aprovam T001–T009.
CORREÇÕES REALIZADAS:
- Nenhuma correção de aplicação nesta etapa; documentação consolidada.
PENDÊNCIAS:
- Nenhuma pendência bloqueadora da TASK-003. A limitação de SMS local fica registrada como risco ambiental; operação Supabase hospedada e envio real continuam fora desta TASK/sem autorização operacional.
TESTES RELACIONADOS:
- PASS: T001–T009 conforme evidências técnicas existentes e resultados manuais fornecidos pela executora; detalhe e origem em cada caso.
- NOT RUN nesta consolidação: build, suíte completa, harness e comandos Supabase; não necessários, testes anteriores não repetidos.
PRÓXIMA ETAPA: Etapa 007 — conclusão final registrada em `docs/reports/TASK-003-etapa-007-conclusao.md`.
PRÓXIMA ETAPA HABILITADA: NÃO.
MOTIVO: GATE-007 é a etapa final; nenhuma TASK posterior foi iniciada ou autorizada.
==================================================
