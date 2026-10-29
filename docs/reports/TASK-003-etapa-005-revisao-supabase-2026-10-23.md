# TASK-003 — Etapa 005 — Revisão após migração para Supabase

**Data:** 2026-10-23 (America/Sao_Paulo)  
**Branch observada:** `task/TASK-003-contas-autenticacao`  
**Status:** BLOQUEADA — achado de segurança P1 no step-up administrativo.  
**Mudanças de implementação:** nenhuma. Foram atualizados somente este relatório e `TASKS.md`.

## Pré-condições e fontes

- **GATE-004 — PASS:** aprovado com base na evidência manual da solicitante: `npm run build` após limpeza de `.next`, EXIT 0 em 51,9 s, TypeScript concluído, 10/10 páginas estáticas e rotas TASK-003 presentes; `build-etapa004.log`. Não repeti build nem suíte completa, conforme instrução da solicitante.
- **Fontes lidas:** `AGENTS.md`, `README.md`, `TASKS.md`, prompt da Etapa 005, ADR-007, contrato de segurança TASK-003, relatório da Etapa 004 e código de autenticação/rotas administrativas pertinentes.
- **GATE-001 a GATE-004:** concluídos conforme matriz e relatórios anteriores. GATE-006 e GATE-007 seguem pendentes.

## Escopo e áreas revisadas

Revisão estática das rotas e utilitários de sessão/MFA, tela de autenticação, operações administrativas de funcionários e contratos, além das decisões vigentes de arquitetura e segurança. As remoções da camada Kysely/`pg`, `src/lib/db/*` e teste PostgreSQL legado foram avaliadas na revalidação do GATE-004 e são coerentes com ADR-007, que estabelece Supabase Database como única camada de dados.

A revisão corrente alterou somente `TASKS.md` e este relatório. Não alterou código nem executou comandos de build/teste. `.next` permanece fora do escopo; a sugestão anterior de retirar seus 236 arquivos rastreados do índice Git segue dependendo de autorização própria.

## Achados

### P1 — Bloqueador: renovação de step-up sem prova recente no servidor

`src/app/auth/page.tsx` executa `supabase.auth.mfa.verify` no navegador antes de chamar `/api/auth/step-up`. Porém, `src/app/api/auth/step-up/route.ts` não recebe challenge ID, código ou evidência verificável; exige apenas sessão, mesma origem e papel admin, e chama `recordAdminStepUp`.

Em `src/lib/auth/http.ts`, `recordAdminStepUp` valida que a identidade atual tenha papel admin e `aal2`, e então faz upsert de `admin_auth_sessions` redefinindo `mfa_verified_at` e `last_activity_at` para o horário atual e limpando `revoked_at`. O endpoint de sessão também chama `registerAdminSession`; quando o token está em `aal2`, esse caminho registra `mfa_verified_at=now` e atualiza a atividade.

**Impacto:** qualquer requisição same-origin com token administrativo ainda `aal2` pode renovar a janela sem demonstrar no servidor um challenge/verify feito naquele step-up. Isso enfraquece o requisito de nova confirmação SMS depois de uma hora sem atividade e permite renovar o marcador de MFA por chamada direta. O fluxo visual executado no browser não constitui controle de backend.

**Evidência:** inspeção estática de `src/app/api/auth/step-up/route.ts`, `src/lib/auth/http.ts` (`registerAdminSession`, `recordAdminStepUp`, `hasAdminStepUp`) e `src/app/api/auth/session/route.ts`; o cliente chama verify no browser antes da rota, mas a rota não valida prova vinculada à operação. Sem teste dinâmico nesta revisão.

**Correção necessária:** exigir que a camada de servidor valide um evento/prova de MFA recém-verificado, vinculado à sessão e ao step-up, e impedir que o endpoint genérico de estabelecimento de sessão renove o timestamp MFA sem confirmação fresca. A correção permanece fora desta etapa de revisão; não foi aplicada. Requer autorização de implementação e validação, respeitando Allowed Changes de TASK-003.

### P2 — Mensagem 428 não distingue papel de MFA (não bloqueador isolado)

`src/app/api/admin/employees/route.ts` retorna `428 admin_mfa_required` para POST quando `authorize()` não retorna identidade administrativa com step-up válido. A checagem impede o funcionário de prosseguir, mas mistura ausência de papel com MFA ausente. A evidência integrada anterior de GATE-004 cobre a negação do funcionário; nenhum endpoint foi alterado nesta revisão.

### Pendência separada — arquivos `.next` rastreados

A revisão respeita a instrução prévia de manter `.next` fora do escopo. O status observado lista alterações em `.next` neste momento, e os registros anteriores contam 236 arquivos `.next` rastreados no Git. Não houve limpeza, restauração nem `git rm --cached`; qualquer saneamento depende de autorização específica. Esta pendência não foi incluída no diff deliberado da Etapa 005.

## Gates, verificações e Scope Guard

- **PASS:** pré-condição GATE-004 conforme evidência manual registrada pela solicitante no relatório da Etapa 004.
- **PASS:** revisão estática das áreas listadas e comparação com ADR-007 e o contrato de segurança.
- **FAIL/BLOQUEADO:** critério de reautenticação administrativa após inatividade, pois o servidor não exige prova fresca para registrar nova janela MFA.
- **PASS:** nenhum endpoint permite que funcionário execute operação administrativa; semântica 428 permanece melhoria não bloqueadora.
- **PASS:** escopo deliberado desta revisão — somente `TASKS.md` e este relatório; nenhuma implementação alterada.
- **NOT RUN:** build, lint, typecheck, suíte automatizada, testes HTTP, teste manual MFA/step-up, revisão dinâmica de RLS/Storage e OCI. Não foram repetidos conforme instrução da solicitante; a Etapa 005 foi conduzida como revisão estática.
- **NOT RUN:** `git diff --check`.
- **Scope Guard:** PASS para alterações deliberadas desta revisão. Mudanças preexistentes e artefatos `.next` não foram limpos nem reclassificados.
- **Segredos/PII:** nenhum segredo, OTP ou dado real foi incluído.

## Gates acumulados

| GATE | Estado |
|---|---|
| GATE-001 | CONCLUÍDO — relatório anterior |
| GATE-002 | CONCLUÍDO — relatório anterior |
| GATE-003 | CONCLUÍDO — relatório anterior |
| GATE-004 | CONCLUÍDO — revalidação Supabase e build limpo manual EXIT 0 informado pela solicitante |
| GATE-005 | BLOQUEADO — achado P1 de step-up sem prova fresca validada no servidor |
| GATE-006 | PENDENTE — testes manuais não habilitados |
| GATE-007 | PENDENTE — conclusão não habilitada |

**Totais:** 4 concluídos, 2 pendentes, 1 bloqueado.

==================================================
TASK: TASK-003
ETAPA: 005
STATUS DA ETAPA: BLOQUEADA
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 4
GATES PENDENTES: 2
GATES BLOQUEADOS: 1
PROBLEMAS ENCONTRADOS:
- P1: a rota server-side de step-up aceita token admin AAL2 existente sem validar prova/challenge recente e redefine timestamps MFA/atividade.
- P2 não bloqueador: POST administrativo usa 428 `admin_mfa_required` também para papel não autorizado, sem distinguir role de MFA.
- Pendência separada: arquivos `.next` rastreados; fora do escopo e requer autorização específica para saneamento.
CORREÇÕES REALIZADAS:
- Nenhuma alteração de implementação; registrados os achados e o estado do gate em `TASKS.md` e neste relatório.
PENDÊNCIAS:
- Corrigir o vínculo/verificação server-side de MFA recente e impedir renovação do timestamp por estabelecimento genérico da sessão; obter autorização para a correção e revalidar.
- Manter a distinção da resposta 428 como melhoria não bloqueadora, sem alteração nesta etapa.
- Saneamento `.next` permanece em atividade separada e depende de autorização específica.
TESTES RELACIONADOS:
- PASS: revisão estática das rotas, utilitários, contrato de segurança, ADR-007 e evidência GATE-004 fornecida pela solicitante.
- NOT RUN: build, lint, typecheck, suítes automatizadas, testes HTTP/dinâmicos MFA, OCI e `git diff --check`; build e suíte completa não foram repetidos conforme instrução da solicitante.
PRÓXIMA ETAPA: correção autorizada do achado P1 e nova revisão da Etapa 005.
PRÓXIMA ETAPA HABILITADA: NÃO.
MOTIVO: GATE-005 bloqueado; a Etapa 006 não está habilitada.
==================================================

## Reavaliação limitada da Etapa 005 — diff P1/P2 (2026-10-23)

**Escopo:** somente diff da correção autorizada de step-up P1 e semântica de papel/MFA P2, mais os resultados de validação já executados. Nenhuma leitura ampla ou alteração de `.next`, README, ADR ou outra TASK.

### Resultados confirmados

- **PASS — testes direcionados:** `node --import=tsx --test tests/auth/task003.step-up.test.ts`; 4/4 aprovados (token AAL2 sem prova recente rejeitado; OTP recente aceito; conflito no refresh ignorado; papel sem autorização distinguido de MFA ausente).
- **PASS — typecheck:** `npx tsc --noEmit`, exit 0. Não foi executado `npm run typecheck`, pois o script invoca `next typegen` e a solicitação proíbe tocar `.next`.
- **FAIL — `git diff --check` global:** exit 2. Aponta espaços em branco em `.next/types/validator.ts` (linhas 60, 94, 111, 121, 131, 141, 151, 161, 171, 181, 191) e linha em branco final em `TASKS.md` (247). Esses itens não pertencem ao diff P1/P2 revisado e foram mantidos intactos conforme escopo.
- **PASS — diff P1/P2:** inspeção dos arquivos de código/teste autorizados e verificação de whitespace dos novos arquivos; nenhum defeito bloqueador identificado no escopo limitado.

### Resultado desta reavaliação

O P1 foi corrigido ao validar `aal2` e timestamp recente do método MFA no claim `amr`; o P2 agora distingue role ausente (`403 admin_role_required`) de MFA ausente (`428 admin_mfa_required`). O refresh genérico usa upsert `ignoreDuplicates`, sem atualizar timestamps existentes. Não foi iniciado GATE-006.

GATE-005: **APROVADO para o diff P1/P2**. A falha do `git diff --check` global é explicitamente externa ao diff revisado e não foi corrigida por estar fora da autorização. O estado final da TASK permanece IN_REVIEW, aguardando autorização própria para Etapa 006.

==================================================
TASK: TASK-003
ETAPA: 005 — reavaliação do diff P1/P2
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO para o diff P1/P2
TESTES DIRECIONADOS: PASS — 4/4
TYPECHECK: PASS — `npx tsc --noEmit`, exit 0
GIT DIFF --CHECK: FAIL — exit 2 por whitespace preexistente em `.next/types/validator.ts` e linha final em `TASKS.md`, fora do diff revisado
GATE-005: CONCLUÍDO
GATE-006: PENDENTE DE AUTORIZAÇÃO
==================================================

## Reavaliação restrita — correção `amr=mfa/phone` (2026-10-24)

**Escopo:** somente `src/lib/auth/step-up.ts` e `tests/auth/task003.step-up.test.ts`, mais inspeção dos usos de registro/renovação de sessão para responder aos critérios solicitados. Nenhuma outra implementação alterada.

- **PASS — teste step-up:** `node --import=tsx --test tests/auth/task003.step-up.test.ts`; 4/4. Inclui `aal2` antigo sem prova recente rejeitado e `aal2` com `amr=mfa/phone` dentro da janela aceito.
- **PASS — typecheck:** `npx tsc --noEmit`, exit 0. Usado diretamente para não executar `next typegen` e evitar escrita em `.next`.
- **Uso de `getAdminSessionInsertOptions`:** definido em `src/lib/auth/step-up.ts`; importado e usado somente em `registerAdminSession` de `src/lib/auth/http.ts`. Essa função é chamada pelo POST `/api/auth/session`; `ignoreDuplicates: true` impede que refresh atualize a linha/timestamps existentes. Também coberto pelo teste de conflito.
- **Timestamps fora do step-up:** `registerAdminSession` pode inserir timestamps para uma sessão admin nova, mas não renova registro existente por causa de `ignoreDuplicates`. O step-up em `recordAdminStepUp` grava `mfa_verified_at` e `last_activity_at`. Separadamente, `hasAdminStepUp`, chamado nas rotas administrativas protegidas, atualiza `last_activity_at` após uma ação sensível autorizada; isso é renovação de atividade pela ação administrativa, não pelo refresh genérico. Nenhuma outra rota/função encontrada grava `mfa_verified_at`.
- **Revisão do diff:** a lista de métodos aceitos agora inclui `mfa/phone`, mantendo a validação prévia de `aal2`, timestamp numérico finito, não futuro e dentro de cinco minutos. Sem achado bloqueador no diff limitado.

**GATE-005:** APROVADO para esta correção restrita. Build, suíte completa e harness: NOT RUN conforme solicitado; `.next` não foi tocado.
