# TASK-003 — Etapa 004 — Implementação

> **Situação vigente:** consulte o adendo final “Reavaliação do GATE-004 com evidência manual limpa”. Ele atualiza os blocos históricos abaixo, que registram os bloqueios encontrados antes do build limpo informado pela solicitante.

**Data:** 2026-10-22
**Branch:** `task/TASK-003-contas-autenticacao`
**Status da etapa:** BLOQUEADA; implementação e validações integradas executadas, com OTP/MFA positivo ainda pendente.
**Commit:** nenhum nesta etapa; somente o checkpoint TASK-002 `304eb32` já autorizado foi consolidado localmente, sem push.

## 1. Histórico, fontes e limites

A primeira tentativa da Etapa 004 parou antes de editar código porque o checkout estava na branch TASK-002 com mudanças locais. A solicitante autorizou checkpoint local das mudanças TASK-002 separadas; foi criado o commit `304eb32` e a branch TASK-003 foi criada a partir dele. A implementação descrita aqui ocorreu somente na branch TASK-003. Arquivos e histórico TASK-002 foram preservados.

Fontes lidas: `AGENTS.md`, `README.md`, `TASKS.md`, ADR-005, arquitetura/diagramas, relatório revalidado GATE-003, prompts e relatórios das Etapas 001–003, código, testes e estado Git. O snapshot de backlog dentro do prompt foi reconciliado com `TASKS.md` atual e com as decisões posteriores da solicitante.

O escopo implementado cobre autenticação/perfis, sessão/RBAC, OTP administrativo, CPF, cadastro/congelamento/exclusão de funcionários e anexos privados. Não foram implementados pedidos, pagamentos, estoque de produto, cupons, relatórios nem tarefas seguintes. Nenhum projeto Firebase real, Identity Platform faturável, SMS/e-mail real, bucket real ou deploy foi configurado. Nenhum contrato, CPF ou conta real foi usado.

## 2. Mudanças e rastreabilidade

| Critério | Implementação | Evidência/estado |
|---|---|---|
| Identidade Firebase, sessão e papel resolvido no backend | Adaptadores Firebase cliente/Admin; validação de token/cookie, verificação atual de conta/claims, cookie `HttpOnly`, origem em mutações, rotas de sessão e logout. Papel nunca vem do corpo. | Typecheck, lint e build passaram; fluxo Firebase Emulator não executado por falha de instalação transitória da CLI. |
| Cadastro exige e-mail e telefone verificados; CPF local | API valida estado de e-mail/telefone no Firebase, valida CPF com onze dígitos e verificadores; perfil não permite alterar CPF. Recuperação de senha genérica por e-mail. | Teste CPF 2/2 passou. Fluxo end-to-end/emulador NOT RUN. |
| Perfil cliente editável conforme decisão | Página de perfil permite nome, email, telefone e senha; email/telefone usam operações de verificação/reautenticação no Firebase e sincronização backend. | Typecheck/build passaram; interação manual NOT RUN. |
| Administrador protegido por MFA e inatividade | MFA de telefone no login, cadastro inicial de fator e renovação administrativa; servidor valida `sign_in_second_factor`, `auth_time`, sessão registrada e janela de inatividade de 1h em endpoints protegidos. | Código compilou; integração com MFA Emulator NOT RUN. |
| Funcionários e função | Administração de contas protegida no backend por role admin e step-up; criação/edição, congelamento/desativação, revogação de tokens e exclusão manual elegível após três meses. Funcionário não obtém endpoints de admin. | Typecheck/build passaram; testes negativos de API NOT RUN. |
| Dados e contrato privados | Migration cria perfis, sessões admin e auditoria; contrato PDF/PNG/JPEG é objeto privado, upload limita tamanho via env obrigatória, leitura exige administrador e não cria URL pública. | Migration `202610220001_identity_profiles` aplicou e reverteu manualmente; teste GCS NOT RUN por ausência de bucket de teste. |
| Configuração documental/local | Auth Emulator demo-only, scripts sintéticos e contrato de segurança documentados. Dependências Firebase/GCS versionadas em versões fixas. | `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades. CLI/emulador não iniciou. |

Principais arquivos novos: `src/lib/auth/*`, `src/lib/storage/employee-contracts.ts`, `src/lib/db/migrations/202610220001_identity_profiles.ts`, rotas `src/app/api/auth/*`, `src/app/api/profile`, `src/app/api/admin/employees/*`, telas `/auth` e `/profile`, `tests/auth/task003.test.ts`, `firebase.json`, `.firebaserc`, `scripts/bootstrap-admin-emulator.ts` e `docs/security/TASK-003-autenticacao-e-autorizacao.md`.

## 3. Validações executadas

| Comando/operação | Resultado |
|---|---|
| `npm run typecheck` | PASS, código 0. |
| `npm run lint` | PASS, código 0; Biome verificou 26 arquivos, sem avisos após formatação. |
| `npm run test:auth` | PASS, 2/2: CPF pontuado/válido, dígitos inválidos, sequência repetida e entrada malformada. |
| `npm audit --omit=dev --audit-level=high` | PASS, 0 vulnerabilidades. |
| `npm run build` | PASS, fora do sandbox: compilação, verificação TypeScript e rotas concluídas. No sandbox, primeira tentativa falhou porque Turbopack Windows não pôde criar junctions (erro de acesso); a build final elevada passou. Artefatos gerados sob `.next` foram restaurados para não incluir saída de build. |
| Migration PostgreSQL `npm run db:migrate` | PASS para `202610220001_identity_profiles` no PostgreSQL temporário sintético. |
| Rollback PostgreSQL `npm run db:rollback` | PASS: migração de identidade e migration base revertidas em duas chamadas separadas; container foi parado/removido (`--rm`). |
| `npm run test:db` | PASS 5/5 em PostgreSQL descartável; migration-stack round-trip passou após autorização para correção mínima do teste legado TASK-002. |
| `npm run test:auth:emulator` | PASS 3/3 com Auth Emulator já iniciado pela solicitante, PostgreSQL descartável, servidor Next local e fake-gcs-server em Docker. Cobriu conta sintética/email marcado verificado, login e recuperação; negação RBAC via chamadas HTTP; ação sensível sem MFA (428); upload/leitura de contrato privado e negação ao funcionário. |
| `npm run lint`, `npm run typecheck`, `npm run test:auth` | PASS; lint sem fixes, typecheck código 0 e testes locais CPF/idle-window 3/3. |
| OTP/MFA positivo via SMS e cadastro/verificação interativa de telefone | NOT RUN. A fixture administrativa sem fator foi usada para provar bloqueio de ação sem step-up; a fixture Auth cria email verificado e telefone associado pelo Admin Emulator, não simula entrega/validação OTP. |
| CI, revisão formal (GATE-005), testes manuais (GATE-006), OCI | NOT RUN; etapas/gates posteriores. |
| `git diff --check` | PASS, código 0. Avisos Git de normalização LF/CRLF não são erros de whitespace. |

## 4. Problema de escopo que impede aprovação do GATE-004

O teste legado TASK-002 inicialmente falhou porque assumia uma única migration. Após autorização da solicitante, `tests/db/task002.test.ts` foi ajustado minimamente para reverter a pilha; a regressão foi reexecutada e passou 5/5. O Auth Emulator e fake-gcs-server foram usados somente localmente, sem recursos reais.

O teste integrado provou negação de ação administrativa sem MFA e janela de sessão simulada, mas não completou um fluxo OTP positivo por SMS. O teste de conta usa Admin SDK para provisionar a fixture com email verificado e telefone associado; isso não comprova a verificação interativa do telefone. Essa validação permanece pendente e impede aprovação do GATE-004.

## 5. Scope Guard, gates e estado

- **Scope Guard:** PASS para as mudanças previstas e ajustes autorizados de teste/configuração; código produtivo TASK-002 intacto.
- **DoD da TASK inteira:** não avaliado nesta etapa; gates 005–007 continuam necessários.
- **TASK-003:** `BLOCKED` enquanto a incompatibilidade do teste existente não tiver decisão. Alterações permanecem locais, não commitadas e sem push.

| GATE | Etapa | Status | Evidência |
|---|---|---|---|
| GATE-001 | Recontextualização | CONCLUÍDO | Relatório Etapa 001. |
| GATE-002 | Pré-condições | CONCLUÍDO | Relatório Etapa 002; provedor/CPF e DoR aprovados. |
| GATE-003 | Planejamento | CONCLUÍDO | Relatório Etapa 003 revalidado após decisões de perfil/ciclo de equipe. |
| GATE-004 | Implementação | BLOQUEADO | Lint/typecheck/auth unit 3/3/3, DB 5/5 e harness integrado 3/3 passaram; fluxo OTP/MFA positivo ainda sem evidência. |
| GATE-005 | Revisão | PENDENTE | Não iniciada. |
| GATE-006 | Testes manuais | PENDENTE | Não iniciados. |
| GATE-007 | Conclusão | PENDENTE | Não iniciada. |

**GATES CONCLUÍDOS:** 3/7
**GATES PENDENTES:** 3/7
**GATES BLOQUEADOS:** 1/7

==================================================
TASK: TASK-003
ETAPA: 004
STATUS DA ETAPA: BLOQUEADA
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 3
GATES BLOQUEADOS: 1
PROBLEMAS ENCONTRADOS:
- OTP/MFA positivo por SMS e verificação interativa do celular continuam sem teste; fixture Admin Emulator não equivale ao fluxo OTP.
CORREÇÕES REALIZADAS:
- Harness integrado com fixtures sintéticas, chamadas HTTP diretas e cenários de contrato em fake-gcs-server; cliente de download usa rota JSON do fake GCS somente quando `STORAGE_EMULATOR_HOST` está configurado.
- Teste compatível com pilha de migrations foi ajustado com autorização; containers e servidor locais foram encerrados.
PENDÊNCIAS:
- Implementar/validar fluxo OTP/MFA positivo por SMS e verificação interativa de telefone no Auth Emulator.
TESTES RELACIONADOS:
- PASS: lint, typecheck, `test:auth` 3/3, `test:db` 5/5, `test:auth:emulator` 3/3, migration up, teste de contrato no fake GCS.
- NOT RUN: OTP/MFA positivo, teste manual, CI e OCI.
PRÓXIMA ETAPA: Etapa 005 — Revisão (após desbloquear GATE-004)
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: GATE-004 permanece bloqueado pela ausência de evidência de OTP/MFA positivo e verificação interativa de telefone; demais validações integradas executadas passaram.
==================================================

## Revalidação após migração para Supabase (2026-10-23)

Esta seção complementa o histórico Firebase acima; os resultados históricos não substituem as evidências abaixo. A Etapa 004 continua bloqueada, e a Etapa 005 não foi iniciada.

### Escopo e correções autorizadas

- Stack Supabase local em Docker e `db reset` executados apenas com dados sintéticos, após autorização; nenhum projeto remoto ou provedor real foi usado.
- `supabase/seed.sql`: o hook sintético `capture_local_sms_otp` passou a retornar JSON vazio no formato esperado pelo hook local. Após reset, o teste positivo de MFA SMS local passou e atingiu AAL2 (1/1).
- `src/app/api/auth/register/route.ts`: telefone confirmado retornado pelo Supabase Auth é normalizado para E.164 antes da comparação com o corpo e da persistência. A integração HTTP sintética passou nos casos sem telefone verificado (409), telefone divergente (409), cadastro com telefone E.164 verificado (201), sessão (200) e leitura de perfil sem CPF.
- Os dois registros abaixo foram atualizados com a autorização expressa da solicitante: este relatório e `TASKS.md`. Nenhum outro arquivo foi alterado deliberadamente para corrigir comportamento nesta revalidação.

### Evidências

| Gate/caso | Resultado | Evidência observada |
|---|---|---|
| `npm run lint` | PASS | Biome verificou 24 arquivos; sem correções automáticas. |
| `npm run typecheck` | PASS | `next typegen` e `tsc --noEmit` concluíram sem erros após as alterações autorizadas. |
| `npm run test:auth` | PASS | 3/3, incluindo CPF e janela de inatividade administrativa simulada. |
| `npm run test:auth:supabase-mfa` | PASS 1/1 | Reexecutado após reset local: conta sintética, SMS local capturado, fator verificado e AAL2. |
| HTTP de cadastro/sessão/perfil | PASS | Fluxos e rejeições listados acima; conta sintética removida ao final. |
| Confirmação de e-mail | PASS | Sign-up sintético exigiu confirmação; link capturado pela Mailpit, verificado e `email_confirmed_at` confirmado no Auth. Usuário removido. |
| Recuperação de senha | PASS | Link de recovery capturado pela Mailpit, verificado, senha alterada e novo login confirmado. Usuário removido. |
| Rate limit de recuperação | PASS | Oito pedidos sintéticos rápidos ao Auth local produziram respostas 200 e 429 `over_email_send_rate_limit`; conta removida. Isso valida o limite do provedor Supabase Auth. |
| RLS | PASS | Dois clientes sintéticos: cliente leu somente o próprio perfil; alteração indevida não retornou linhas; tabelas de funcionário/sessão admin/auditoria não foram acessíveis; acesso anônimo negado. Fixtures removidas. |
| Storage privado | PASS | Acesso administrativo de serviço funcionou; acesso direto do cliente foi negado e URL pública retornou HTTP 400; objeto e usuário sintéticos removidos. |
| RBAC de funcionário | PASS com observação | `GET /api/admin/employees` negado com 403; `POST` negado com 428 antes de processar corpo, sem ação administrativa. A resposta 428 usa a mensagem `admin_mfa_required` também para não-admin, o que não libera acesso, mas confunde o motivo. Nenhuma correção nessa rota foi autorizada ou feita. |
| `npm run build` | FAIL (quatro tentativas) | Compilação, TypeScript e geração de páginas concluíram; todas as finalizações falharam com erro Windows `UNKNOWN` ao abrir/gravar artefatos `.next` (incluindo `pages-manifest.json`, `trace` e `route-bundle-stats.json`). A tentativa diagnóstica `npm exec -- next build --webpack` continuou usando Turbopack; não foi demonstrado build completo PASS. |
| CI, teste manual, OCI e arquivo privado via fluxo HTTP administrativo | NOT RUN | Gates posteriores ou validação não concluída nesta etapa. |
| `git diff --check` | PASS | Checagem final dos arquivos autorizados e busca por whitespace final passaram. |

### Resultado e bloqueios

Os testes positivos de MFA, confirmação de e-mail, recuperação, throttling, RLS, Storage e cadastro confirmam as integrações exercitadas. GATE-004 permanece BLOQUEADO porque quatro tentativas de build falharam ao finalizar a escrita de artefatos `.next` no Windows. GATE-005 continua bloqueado pela dependência. A stack Supabase local foi encerrada; `npm run supabase:stop` confirmou a parada.

**Scope Guard:** as alterações deliberadas ficaram nos dois arquivos-fonte autorizados e nos dois registros autorizados. As tentativas de build geraram/atualizaram artefatos `.next`; essa pasta já estava modificada antes desta rodada e seu estado imediatamente anterior aos builds não pode ser separado com segurança. Não restaurei nem descartei esses artefatos. Assim, a validação do escopo deliberado passou, mas o Scope Guard geral fica inconclusivo quanto a `.next`.

Correção eventualmente necessária para o build deve ser delimitada após análise da causa; não houve autorização para alterar outros arquivos além de `supabase/seed.sql`, `src/app/api/auth/register/route.ts` e dos dois registros documentais nomeados.

==================================================
TASK: TASK-003
ETAPA: 004
STATUS DA ETAPA: BLOQUEADA
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 2
GATES BLOQUEADOS: 2
PROBLEMAS ENCONTRADOS:
- Quatro execuções de build falharam ao finalizar a gravação/leitura de artefatos `.next` no Windows.
- A resposta 428 do POST administrativo também representa funcionário sem papel admin; a operação é negada, mas a mensagem de erro não distingue autorização de MFA.
CORREÇÕES REALIZADAS:
- `supabase/seed.sql`: hook SMS local retorna JSON vazio esperado; MFA sintético verificado e AAL2 atingido.
- `src/app/api/auth/register/route.ts`: número do Auth Supabase normalizado em E.164; cadastro HTTP sintético validado.
- `TASKS.md` e este relatório atualizados para refletir evidência e bloqueios.
PENDÊNCIAS:
- Obter uma execução de build integral bem-sucedida em ambiente compatível e avaliar a mensagem 428 somente se a solicitante quiser alteração na rota administrativa.
TESTES RELACIONADOS:
- PASS: lint (24 arquivos), typecheck, `test:auth` 3/3, MFA Supabase 1/1, confirmação de e-mail, recuperação com novo login, throttling Auth 8 pedidos (incluindo 429), RLS, Storage privado e registro/sessão/perfil HTTP sintéticos.
- FAIL: quatro execuções de build (compilaram e tiparam, mas falharam na finalização Windows ao abrir/gravar `.next`).
- NOT RUN: CI, testes manuais e validação OCI nesta etapa.
PRÓXIMA ETAPA: Etapa 005 — Revisão
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: GATE-004 bloqueado pelo build integral que não finaliza no Windows. A Etapa 005 depende de GATE-004 aprovado.
==================================================

## Reavaliação do GATE-004 com evidência manual limpa (2026-10-23)

Esta reavaliação incorpora a evidência de build executada manualmente pela solicitante fora do Codex. Nenhum build, teste automatizado ou suíte foi executado nesta atualização; nenhuma alteração de código foi feita.

### Evidência de build informada pela solicitante

- Ambiente: Windows; Node.js v22.15.0; npm 11.6.1; Next.js 16.4.2 com Turbopack.
- Preparação reportada: processos `supabase status` encerrados, nenhum `next dev` ativo e diretório `.next` removido (`Test-Path .next` retornou `False`).
- Comando `npm run build`: **EXIT 0**, duração 51,9 s. Build de produção, TypeScript concluído e páginas estáticas 10/10 geradas.
- `build-etapa004.log` lista as rotas `/api/admin/employees`, `/api/admin/employees/[uid]`, `/api/admin/employees/[uid]/contract`, `/api/admin/employees/[uid]/contract/upload`, `/api/auth/register`, `/api/auth/session`, `/api/auth/step-up`, `/api/profile`, `/auth` e `/profile`.
- A solicitante reporta ausência de `error`, `EPERM`, `EBUSY`, `ENOENT` e `warn` no log. O arquivo foi lido nesta revisão; não foi alterado.
- O build limpo manual supersede as quatro falhas de finalização `.next` observadas nas tentativas anteriores sobre o diretório previamente alterado. Portanto, essas falhas anteriores não mantêm GATE-004 bloqueado.

### Scope Guard fora de `.next`

- Inventário reportado e conferido com `git status --porcelain`: 50 entradas fora de `.next`, mais `build-etapa004.log` como artefato desta validação. O diretório `.next` tem 236 arquivos rastreados (contagem `git ls-files .next`).
- As remoções de `src/lib/db/client.ts`, `migrate.ts`, `migrator.ts`, `types.ts`, `migrations/202610220000_create_app_schema.ts` e `tests/db/task002.test.ts` são coerentes com ADR-007: a aplicação deixa de usar Kysely/`pg` e o migrador PostgreSQL direto; migrations e consultas da arquitetura atual ficam em Supabase. O health check passou a usar RPC Supabase, e o SQL da migration atual fornece `health_check`. O teste removido era específico à camada PostgreSQL/Kysely substituída; evidência histórica de TASK-002 permanece nos relatórios daquela tarefa.
- Configuração, dependências, Auth, RLS, Storage, migrations, harness local, telas mínimas de autenticação e documentação listados no inventário correspondem à migração Supabase e aos critérios de TASK-003/ADR-007. Artefatos já existentes de outras tarefas permanecem fora do escopo desta etapa.
- **Resultado do Scope Guard para esta etapa, excluindo `.next`: PASS.** Os 236 arquivos `.next` rastreados apesar de `.gitignore` são uma pendência separada de higiene do repositório. A sugestão `git rm -r --cached .next` não foi executada e depende de autorização específica da solicitante.

### Reavaliação do achado HTTP 428

O teste integrado anterior confirmou que `GET /api/admin/employees` retorna 403 para funcionário e que o `POST` é recusado com 428 antes do processamento do corpo. A operação não é autorizada nem executada. O 428 responde `admin_mfa_required` também para identidade sem papel admin, confundindo falha de autorização com pré-condição de MFA. O critério de segurança (“apenas administrador administra funcionários”) passa porque o funcionário é efetivamente impedido; a distinção de status/mensagem fica registrada como **melhoria não bloqueante pendente**, sem alteração na rota conforme instrução da solicitante.

### Resultado vigente

GATE-004 está **APROVADO**: evidência de build limpo EXIT 0 fornecida pela solicitante, validações Supabase integradas sintéticas registradas acima, e Scope Guard aprovado excluindo `.next`. O build manual é atribuído à solicitante; não foi executado pelo Codex nesta atualização. GATE-001 a GATE-004 ficam concluídos; GATE-005, GATE-006 e GATE-007 permanecem pendentes, sem bloqueios acumulados. TASK-003 fica READY para a Etapa 005, mas essa etapa não foi iniciada e requer autorização explícita.

Pontos ainda registrados, sem impedir a aprovação do GATE-004:

- Corrigir futuramente a resposta 428 para distinguir papel ausente de MFA ausente, somente com autorização para alterar essa rota.
- Tratar os 236 arquivos `.next` rastreados em atividade separada; remoção do index Git somente após autorização específica.
- Executar as etapas 005–007 com suas respectivas autorizações.

## Resultado vigente — bloco da Etapa 004

==================================================
TASK: TASK-003
ETAPA: 004
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 4
GATES PENDENTES: 3
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- POST administrativo nega o funcionário com 428, mas a mensagem `admin_mfa_required` não distingue papel ausente de MFA ausente; a operação é negada, então o achado não bloqueia o critério de autorização.
- Há 236 arquivos `.next` rastreados apesar de `.gitignore`; saneamento é pendência separada e requer autorização específica.
CORREÇÕES REALIZADAS:
- Nenhuma alteração de código nesta reavaliação; relatório e `TASKS.md` atualizados somente com a evidência fornecida e revisão de escopo.
PENDÊNCIAS:
- Melhoria não bloqueante da semântica HTTP 428, mediante autorização para alterar a rota administrativa.
- Remoção futura de `.next` do índice Git, mediante autorização específica.
- GATE-005 (Etapa 005), GATE-006 (Etapa 006) e GATE-007 (Etapa 007) ainda não executados.
TESTES RELACIONADOS:
- PASS (evidência manual da solicitante): `npm run build`, EXIT 0 em 51,9 s após remover `.next`; TypeScript e 10/10 páginas; rotas TASK-003 presentes em `build-etapa004.log`.
- PASS (execuções integradas anteriores com dados sintéticos): lint, typecheck, `test:auth` 3/3, MFA Supabase 1/1, confirmação de e-mail, recuperação e novo login, rate limit (oito pedidos; incluindo HTTP 429), RLS, Storage e fluxos HTTP de registro/sessão/perfil/RBAC.
- NOT RUN nesta atualização: build ou suíte completa; a avaliação usou a evidência manual fornecida e inspeção estática do log/diff.
PRÓXIMA ETAPA: Etapa 005 — Revisão
PRÓXIMA ETAPA HABILITADA: SIM, mediante autorização explícita; não iniciada.
MOTIVO: GATE-004 foi aprovado. A autorização para esta reavaliação não inicia a Etapa 005.
==================================================
