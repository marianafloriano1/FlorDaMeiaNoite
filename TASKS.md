# Backlog executável — Flor da Meia-Noite

Estados: `BLOCKED`, `READY`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED`. Estado inicial é BLOCKED até dependências e Definition of Ready estarem satisfeitas. Executar somente uma TASK READY após autorização explícita do solicitante. Concluir uma TASK não autoriza a próxima.

## Regras globais para toda TASK

- Cada tarefa abaixo indica rastreabilidade, dependências, Allowed Changes, mudanças incidentais, Forbidden Changes, critérios de aceite, validação e Definition of Done.
- Mudanças incidentais permitidas apenas para corrigir formatação, pequenos defeitos indispensáveis ou documentação diretamente afetada dentro dos arquivos permitidos; descrevê-las no relatório.
- Não fazer scope creep. Alteração fora do permitido exige parar, registrar o bloqueio e solicitar decisão.
- Executar somente gates aplicáveis à TASK, registrar comando/evidência/resultado e não afirmar sucesso sem execução.
- `IN_REVIEW` exige revisão do diff e validação do Scope Guard. Marcar DONE somente depois dos gates e DoD.

## Migração arquitetural pré-tarefas — 2026-10-23

- **Decisão da solicitante:** Supabase substitui permanentemente Firebase, banco PostgreSQL acessado diretamente e Google Cloud Storage para os serviços de identidade, dados e arquivos.
- **Preparação aplicada:** README/ADR-007/overview/diagramas atualizados; implementação de identidade, perfil, sessão/RBAC, MFA, auditoria e contratos convertida para Supabase Auth/Database/Storage; migrations SQL e stack local Supabase adicionadas; dependências Firebase/Kysely/pg/GCS e harness Firebase removidos; scripts e `.env.example` convertidos.
- **Validação executada (registro inicial da preparação, antes da revalidação Supabase em 2026-10-23):** `npm run typecheck` PASS e `npm run lint` PASS. Naquele momento, a stack local Supabase e os fluxos integrados de Auth, confirmação por e-mail/SMS, recuperação, RLS, MFA e Storage ainda não haviam sido executados.
- **Limites:** nenhum projeto remoto, billing, provedor SMS/SMTP real, bucket remoto ou migração de dados reais foi criado/executado. Nenhuma conta real foi migrada.
- **Efeito nos gates (estado naquele momento):** evidências TASK-003 vinculadas a Firebase/PostgreSQL direto/GCS estão supersedidas. GATE-004 ainda não estava aprovado para a arquitetura nova e GATE-005 aguardava validação Supabase. A revalidação e o estado atual constam na seção TASK-003 abaixo; tarefas dependentes não foram iniciadas por este registro.

## TASK-001 — Base do repositório e ambientes

- **Status:** DONE | **Branch:** `task/TASK-001-base-repositorio-ambientes` | **Commit da implementação:** `a260d08a7488639dbb1053919da55be7907d64f5` | **DEPENDS_ON:** nenhuma | **RF/RN/RNF/UC/ADR:** RNF-005, RNF-009, RNF-011; transversal; ADR-001.
- **Objetivo:** estruturar aplicação e automação de desenvolvimento/implantação com ambientes separados de teste e produção.
- **Allowed Changes:** estrutura do app TypeScript/Next.js; container; lint/format/build; configuração de ambiente; pipeline CI; documentação inicial de execução e deploy.
- **Incidental:** arquivos de ignore e scripts mínimos de desenvolvimento diretamente necessários.
- **Forbidden:** recursos de produção provisionados sem autorização de infraestrutura; chaves/secrets reais; lógica funcional de catálogo/pedido; dados pessoais reais.
- **Aceite:** app inicia localmente dentro de um container Docker ou runtime OCI compatível; a imagem é reproduzível e executa sem dependências instaladas diretamente no host, além dos requisitos do runtime; CI valida instalação/lint/build e construção da imagem; configuração de teste não aponta para produção; segredos não versionados; deploy de teste documentado.
- **Validação:** lint, typecheck, build e verificação do pipeline.
- **DoD:** diff dentro do escopo, CI verde, instruções de ambiente e rollback documentadas.
- **Etapa 005 — Revisão (2026-10-21):** GATE-005 aprovado. Revisado o diff de 15 arquivos entre `origin/master` e `a260d08` contra o escopo, RNF-005/009/011, ADR-001 e `docs/architecture/overview.md`; sem achados de escopo, segredo ou dado pessoal. A configuração local não contém endpoints de produção nem credenciais; não há recursos de nuvem provisionados. CI passou no commit revisado ([execução 39713899317](https://github.com/marianafloriano1/FlorDaMeiaNoite/actions/runs/39713899317)). Revisão estática aprovada; validações de build/container constam no resultado da Etapa 004. Nenhuma correção de código foi necessária.
- **Etapa 006 — Testes manuais (2026-10-22):** T001–T007 executados pelo agente Codex a pedido do usuário e aprovados; os resultados e evidências estão em `docs/testing/TASK-001-testes-manuais.md`. T001 (build/start/HTTP), T002 (build sem cache, `npm ci`, lint, typecheck e build) e T007 (container sem env-file) passaram após uma primeira tentativa bloqueada pelo sandbox e uma repetição autorizada. Nenhuma execução foi atribuída a uma pessoa.
- **Etapa 007 — Conclusão (2026-10-22):** GATE-007 aprovado. Critérios e DoD satisfeitos: container construído e iniciado; build repetido sem cache com base por digest e lockfile; CI verde no commit; ambiente inicial sem endpoint de produção ou segredo versionado; deploy de teste e rollback documentados; Scope Guard aprovado. Evidências de T001–T007 em `docs/testing/TASK-001-testes-manuais.md`; revisão e CI também registrados acima. Definição de igualdade binária entre builds não consta nos requisitos; não foi afirmada igualdade de digest. Nenhuma implementação funcional ou recurso de produção foi adicionado. Sem commit/push nesta etapa: a implementação permanece no commit informado e os registros de revisão/conclusão estão locais para revisão.
- **Matriz final dos gates:**

| GATE | Etapa | Estado | Evidência |
|---|---|---|---|
| GATE-001 | Recontextualização e histórico | CONCLUÍDO | Relatório aprovado da Etapa 001 nesta execução. |
| GATE-002 | Pré-condições e decisões | CONCLUÍDO | Relatório aprovado da Etapa 002; CI escolhido pelo solicitante e pré-condições verificadas. |
| GATE-003 | Planejamento | CONCLUÍDO | Plano da Etapa 003 aprovado antes da implementação. |
| GATE-004 | Implementação | CONCLUÍDO | Commit `a260d08`; build Docker e CI aprovados; smoke test HTTP registrado na Etapa 004. |
| GATE-005 | Revisão | BLOQUEADO | Correções parciais registradas; achados obrigatórios restantes em docs/reports/TASK-003-etapa-005-revisao.md. |
| GATE-006 | Testes manuais | CONCLUÍDO | Sete testes executados pelo agente e aprovados; roteiro e saídas em `docs/testing/TASK-001-testes-manuais.md`. |
| GATE-007 | Conclusão | CONCLUÍDO | Aceite, DoD, pendências e matriz consolidados nesta etapa; `git diff --check` PASS. |

- **Gates acumulados:** 7 CONCLUÍDOS; 0 PENDENTES; 0 BLOQUEADOS.
- **Próxima TASK elegível na conclusão da TASK-001:** NENHUMA; naquele registro, TASK-002 estava BLOCKED. **Estado atual:** TASK-002 está DONE na branch `task/TASK-002-persistencia-postgresql`; evidência final em `docs/reports/TASK-002-etapa-007-conclusao.md`.

## TASK-002 — Persistência PostgreSQL e migrations base

- **Status:** DONE | **Branch:** `task/TASK-002-persistencia-postgresql` | **Checkpoint local:** `304eb32` (sem push) | **DEPENDS_ON:** TASK-001 | **Rastreabilidade:** RNF-001, RNF-010; ADR-002.
- **Objetivo:** definir conexão segura, migrations e convenções transacionais sem criar todas as entidades funcionais.
- **Allowed Changes:** ORM/query layer escolhido via decisão técnica documentada; migrations base; saúde/conexão; transação e pool.
- **Incidental:** dados de seed estritamente sintéticos para desenvolvimento.
- **Forbidden:** banco de produção sem autorização; credenciais reais; entidades/fluxos funcionais das próximas TASKs; armazenar estoque autoritativo em cache.
- **Aceite:** migração sobe e reverte em DB de teste; conexão usa secret/config; transação de exemplo demonstra rollback; nenhum segredo no repositório.
- **Validação:** migration round-trip, typecheck e checagem de configuração.
- **DoD:** estratégia de migration/rollback documentada e mudanças limitadas à fundação.
- **DoR/GATE-002 revalidado (2026-10-22):** READY autorizado pela solicitante após reavaliação. TASK-001 está DONE; rastreabilidade RNF-001/RNF-010/ADR-002 e critérios testáveis foram confirmados. Docker Engine acessível fora do sandbox (versão 29.9.2); os testes de implementação usaram PostgreSQL local em container e configuração sintética. Evidência: `docs/reports/TASK-002-revalidacao-dor-2026-10-22.md`. Nenhum serviço de produção, cobrança ou credencial real foi usado.
- **Etapa 003 — Planejamento (2026-10-22):** GATE-003 aprovado. Plano e matriz de escopo em `docs/reports/TASK-002-etapa-003-planejamento.md`. A recomendação Kysely + driver PostgreSQL `pg` + Migrator up/down foi formalizada como ADR-006 antes da implementação.
- **Etapa 004 — Implementação (2026-10-22):** GATE-004 aprovado; fundação PostgreSQL limitada ao query layer, cliente/pool, migration do namespace técnico vazio, health check, teste de rollback e documentação. Migration up/down, testes PostgreSQL 5/5, lint, typecheck, build sem `DATABASE_URL` e `git diff --check` passaram. Evidências e desvios corrigidos em `docs/reports/TASK-002-etapa-004-implementacao.md`. Nenhuma entidade funcional, commit, push ou deploy foi criado.
- **Etapa 005 — Revisão (2026-10-22):** GATE-005 aprovado; revisão estática, Scope Guard e validação OCI local passaram. Imagem `flor-da-meia-noite:task002-review` construída; servidor respondeu HTTP 200, health DB sem configuração respondeu 503 genérico; containers temporários removidos. README corrigido para esclarecer que `tsx` não carrega `.env.local`. Achados não bloqueantes e riscos diferidos registrados em `docs/reports/TASK-002-etapa-005-revisao.md`.
- **Etapa 006 — Testes manuais (2026-10-22):** GATE-006 aprovado; seis casos executados em Windows PowerShell por Codex a pedido da usuária, 6/6 aprovados, 0 falhas. Evidências, saídas e códigos em `docs/testing/TASK-002-testes-manuais.md`. PostgreSQL descartável removido ao final. O roteiro também contém procedimentos WSL/Linux, não executados nesta rodada. Relatório: `docs/reports/TASK-002-etapa-006-testes-manuais.md`.
- **Etapa 007 — Conclusão (2026-10-22):** GATE-007 aprovado; aceite e DoD satisfeitos com evidências de GATE-004 a GATE-006 e Scope Guard aprovado. Matriz e riscos em `docs/reports/TASK-002-etapa-007-conclusao.md`. TASK-002 marcada DONE; alterações permanecem locais, sem commit/push. TASK-003 segue BLOCKED; nenhuma tarefa posterior foi iniciada.
- **Checkpoint local posterior (2026-10-22):** a solicitante autorizou separar e consolidar as alterações já aceitas da TASK-002. Commit local `304eb32` contém exclusivamente a base PostgreSQL, ADR-006 e documentação/relatórios da TASK-002; não houve push. Registros da TASK-003 permaneceram fora desse commit.
- **Gates acumulados TASK-002:** 7 concluídos (GATE-001 a GATE-007); 0 pendentes; 0 bloqueados. **Status da TASK:** DONE. **Próxima TASK elegível:** nenhuma; TASK-003 está BLOCKED por suas próprias condições.

## TASK-003 — Contas, autenticação e autorização por função

- **Status:** DONE | **Branch:** `task/TASK-003-contas-autenticacao` | **DEPENDS_ON:** TASK-002 | **Rastreabilidade:** RF-004/005/016; RN-003/004/015; RNF-005/006; UC-02/07; ADR-005 (histórico)/ADR-007 (arquitetura vigente).
- **Migração arquitetural (2026-10-23):** a implementação Firebase/PostgreSQL direto/GCS foi substituída por Supabase Auth/Database/Storage (ADR-007). Registros da arquitetura anterior permanecem como histórico. GATE-004 a GATE-007 estão concluídos conforme a matriz atual abaixo; nenhuma TASK posterior foi iniciada.
- **Etapa 005 — revisão após migração Supabase e correções P1/P2/MFA phone:** diff restrito de step-up revisado; `amr=mfa/phone` aceito somente com `aal2` e timestamp dentro da janela de cinco minutos; AAL2 antigo sem prova recente permanece rejeitado. Testes step-up 4/4 e `npx tsc --noEmit` PASS. `getAdminSessionInsertOptions` é usado apenas em `registerAdminSession` para o POST `/api/auth/session`, com `ignoreDuplicates` evitando atualizar timestamps na sessão existente. `hasAdminStepUp` renova `last_activity_at` após ação administrativa protegida; somente `recordAdminStepUp` escreve `mfa_verified_at`. Build, suíte completa e harness NOT RUN; `.next` intocado. GATE-005 APROVADO para o diff limitado. Detalhes em `docs/reports/TASK-003-etapa-005-revisao-supabase-2026-10-23.md`.
- **Objetivo:** implementar cadastro/verificação, recuperação de senha, perfil e papéis Cliente/Funcionário/Administrador.
- **Allowed Changes:** modelo e serviços de identidade; verificação e-mail/celular; CPF brasileiro; RBAC backend; sessão; OTP administrativo; dados privados de funcionários e anexo.
- **Incidental:** telas mínimas de entrada/perfil para tornar o fluxo acessível.
- **Forbidden:** cliente sem verificação finalizar compra; funcionário gerir contas/cupons/relatórios ou confirmar pagamento; endpoint confiar em papel enviado pelo navegador; MFA para todos contra requisito; documentos reais em testes.
- **Aceite:** verificar e-mail e telefone é pré-condição de compra; reset por e-mail; autorização negativa para acesso cruzado; apenas administrador administra funcionários; dados de funcionário protegidos; reautenticação administrativa por OTP e regra de inatividade atendidas no backend.
- **Decisões DoR históricas (2026-10-22; provedor supersedido):** Firebase Authentication com upgrade para Identity Platform; confirmação de e-mail e celular dos clientes; OTP administrativo via SMS MFA. Permanecem as decisões de negócio independentes do provedor: validação local do CPF (normalizar para 11 dígitos, rejeitar dígitos repetidos, validar dígitos verificadores; sem consulta externa nem alegação de nacionalidade/titularidade) e política de sessão (OTP na primeira ação sensível e após mais de 1 hora de inatividade). O backend deve aplicar a exigência; o frontend isoladamente não basta. Para a arquitetura vigente, consultar ADR-007.
- **Validação:** testes de autorização, verificação, sessão, rate limit e arquivo privado.
- **DoD:** modelo de ameaça/auth decisões documentadas; nenhum segredo/CPF completo em logs.
- **Revalidação histórica do DoR (2026-10-22; arquitetura supersedida em 2026-10-23):** a solicitante escolheu Firebase Authentication/Identity Platform com SMS MFA e Auth Emulator para testes sintéticos. Dependência TASK-002 DONE, rastreabilidade, critérios, CPF e política de sessão foram confirmados naquela decisão. O estado `READY` e a decisão de provedor desse registro não representam a arquitetura vigente; consultar ADR-007 e a revalidação necessária antes de prosseguir. Evidência histórica: `docs/reports/TASK-003-revalidacao-dor-2026-10-22.md`.
- **Etapa 001 — Recontextualização e histórico (2026-10-22):** GATE-001 aprovado. Estado atual, dependência, IDs, fontes, código/testes, branch/log e divergências documentais registrados em `docs/reports/TASK-003-etapa-001-recontextualizacao.md`. A Etapa 002 reconciliou os documentos arquiteturais que ainda diziam que provedor estava por escolher.
- **Etapa 002 — Pré-condições e decisões (2026-10-22; histórica):** GATE-002 aprovado sob a decisão de provedor então vigente; README, overview e diagramas foram alinhados ao Firebase Authentication + Identity Platform/SMS MFA. Essa escolha foi substituída pelo ADR-007 em 2026-10-23; a evidência não valida a arquitetura atual. Registro: `docs/reports/TASK-003-etapa-002-pre-condicoes.md`.
- **Etapa 003 — Planejamento (2026-10-22):** plano e matriz critério→arquivos candidatos→validação, escopo, riscos, sequência e rollback registrados em `docs/reports/TASK-003-etapa-003-planejamento.md`. Após a avaliação inicial bloqueada, a solicitante definiu que cliente pode editar nome, telefone, e-mail e senha sob as regras integradas, mas não CPF; conta de funcionário desligado fica congelada por três meses e depois pode ser excluída manualmente pelo administrador. Revalidação: GATE-003 aprovado; plano atualizado. Nenhuma implementação, dependência, branch ou serviço foi criado/ativado. TASK-003 permanece `READY`; Etapa 004 habilitada no fluxo, mas requer autorização própria.
- **Etapa 004 — Implementação (2026-10-22):** autorização recebida. A tentativa inicial foi resolvida com checkpoint local TASK-002 `304eb32` (sem push) e branch `task/TASK-003-contas-autenticacao`. Implementados SDKs/configuração demo Auth, cadastro/verificações, perfil, RBAC, sessão, step-up SMS MFA, CPF, administração de funcionários, arquivo privado, migration e documentação. Typecheck, lint, build, CPF 2/2, audit (0 vulnerabilidades), migration up/down e diff-check passaram. GATE-004 permanece em validação. A solicitante autorizou ajuste mínimo somente no teste de compatibilidade da TASK-002; o teste agora reverte toda a pilha de migrations. A solicitante corrigiu `auth:bootstrap-admin`: script `.mts` para suportar top-level await sem alterar o modo de módulo do pacote. Lint/typecheck serão reexecutados; emulador e bootstrap não foram executados pelo Codex, conforme instrução da solicitante. Evidências: `docs/reports/TASK-003-etapa-004-implementacao.md`.
- **Validação integrada adicional (2026-10-22):** roteiro `docs/testing/TASK-003-harness-local.md`; `npm run db:migrate` PASS (2 migrations), `npm run test:db` PASS 5/5, `npm run lint` PASS, `npm run typecheck` PASS, `npm run test:auth` PASS 3/3, `npm run test:auth:emulator` PASS 3/3 contra Auth Emulator já iniciado, PostgreSQL descartável e fake-gcs-server local. Cobriu login/recuperação, negação RBAC via HTTP, ação admin sem MFA (428), janela de inatividade simulada e upload/leitura privada de contrato. Correção mínima para download no fake-GCS foi isolada ao uso de `STORAGE_EMULATOR_HOST`. Containers e servidor locais foram encerrados após a execução. O teste positivo OTP/MFA por SMS ainda não havia sido exercitado nessa rodada; essa pendência foi atendida pela evidência humana registrada abaixo.
- **Evidência OTP/MFA positivo (2026-10-23; histórica e supersedida):** Mariana (execução humana) informou execução do teste `test:auth:mfa:emulator` contra Firebase Auth Emulator. O resultado e detalhes técnicos permanecem no histórico, mas não validam a implementação Supabase nem os gates atuais. Evidência original: resultado relatado pela executora, não executado independentemente pelo agente.
- **Etapa 005 — Revisão (2026-10-23; histórica, pré-migração):** GATE-005 ficou BLOQUEADO após revisão da implementação Firebase/PostgreSQL direto/GCS. Achados e resultados daquela arquitetura estão em `docs/reports/TASK-003-etapa-005-revisao.md`; não devem ser interpretados como revisão do Supabase.
- **Correções pós-revisão (2026-10-23; históricas, pré-migração):** ajustes e validações então realizados para Firebase/Auth Emulator estão registrados no relatório de implementação e não constituem evidência para Supabase. A revisão da arquitetura vigente está aprovada conforme GATE-005 abaixo.
- **Artefatos TASK-001/TASK-002 preservados e fora do commit TASK-003:** TASK-001: docs/reports/TASK-001-resultados-das-etapas.docx e docs/testing/TASK-001-testes-manuais.md (não rastreados; não adicionar). TASK-002, já rastreados e inalterados no baseline: docs/reports/TASK-002-etapa-001-recontextualizacao.md, TASK-002-etapa-002-pre-condicoes.md, TASK-002-etapa-003-planejamento.md, TASK-002-etapa-004-implementacao.md, TASK-002-etapa-005-revisao.md, TASK-002-etapa-006-testes-manuais.md, TASK-002-etapa-007-conclusao.md, TASK-002-resultados-das-etapas.docx, TASK-002-revalidacao-dor-2026-10-22.md e docs/testing/TASK-002-testes-manuais.md. Nenhum artefato foi apagado ou commitado.
- **GATE-005 follow-up (2026-10-23; histórico pré-migração):** script typecheck foi atualizado para executar next typegen antes de tsc. A observação sobre controles Firebase/reCAPTCHA e validação manual em projeto Firebase pertencia à arquitetura anterior e está supersedida pelo ADR-007. Nenhum desses registros aprova GATE-004 ou GATE-005 para Supabase; a situação vigente está na matriz de gates abaixo.
- **Etapa 004 — Revalidação Supabase (2026-10-23):** APROVADA. Além das validações integradas listadas no relatório, a solicitante executou `npm run build` após encerrar processos e remover `.next`: EXIT 0 em 51,9 s, TypeScript passou, 10/10 páginas geradas e rotas da TASK-003 presentes; evidência em `build-etapa004.log`. A evidência limpa supersede as quatro tentativas locais anteriores que falharam ao operar sobre `.next` antigo. O Scope Guard passou nos 50 itens de status fora de `.next` após revisão da migração: remoções de Kysely/`pg`, camada `src/lib/db/*` e teste legado PostgreSQL são coerentes com ADR-007 e a camada Supabase substituta. `build-etapa004.log` é artefato adicional desta validação. O funcionário segue negado no POST administrativo (428), embora a mensagem confunda autorização de função com exigência de MFA; achado não bloqueante, sem alteração de rota nesta etapa. Os 236 arquivos `.next` rastreados ficam fora do escopo desta gate; `git rm -r --cached .next` permanece sugestão futura e depende de autorização específica. Relatório atualizado: `docs/reports/TASK-003-etapa-004-implementacao.md`.
- **Matriz de gates TASK-003:**

| GATE | Etapa | Estado | Evidência |
|---|---|---|---|
| GATE-001 | Recontextualização e histórico | CONCLUÍDO | `docs/reports/TASK-003-etapa-001-recontextualizacao.md`. |
| GATE-002 | Pré-condições e decisões | CONCLUÍDO | `docs/reports/TASK-003-etapa-002-pre-condicoes.md`. |
| GATE-003 | Planejamento | CONCLUÍDO | `docs/reports/TASK-003-etapa-003-planejamento.md`; revalidado após decisões de perfil cliente e ciclo de vida de funcionário. |
| GATE-004 | Implementação | CONCLUÍDO | Revalidação aprovada; build limpo manual EXIT 0 e Scope Guard fora de `.next`; detalhes em `docs/reports/TASK-003-etapa-004-implementacao.md`. |
| GATE-005 | Revisão | CONCLUÍDO | Correção P1/P2 e compatibilidade `amr=mfa/phone` revisadas; testes step-up 4/4 e typecheck PASS. Usos e atualização de timestamps documentados no relatório `docs/reports/TASK-003-etapa-005-revisao-supabase-2026-10-23.md`. |
| GATE-006 | Testes manuais | CONCLUÍDO | T001–T009 aprovados; resultados e ressalvas registrados em `docs/testing/TASK-003-etapa-006-testes-manuais.md`. Não houve repetição nesta consolidação. |
| GATE-007 | Conclusão | CONCLUÍDO | Aceite, DoD, riscos e status final em `docs/reports/TASK-003-etapa-007-conclusao.md`. |

- **Gates acumulados TASK-003 após Etapa 007:** GATE-001 a GATE-007 concluídos; 7 concluídos, 0 pendentes, 0 bloqueados. TASK-003: DONE. Evidências finais: `docs/testing/TASK-003-etapa-006-testes-manuais.md` e `docs/reports/TASK-003-etapa-007-conclusao.md`. A configuração local de SMS permanece risco ambiental; nenhum projeto remoto, billing ou envio real foi validado. Próxima TASK elegível: nenhuma nesta conclusão.

- **Histórico da tentativa OTP/MFA (2026-10-22):** a primeira execução falhou ao localizar o código SMS; a investigação identificou leitura do campo incorreto e incompatibilidade na interpretação da resposta inicial de MFA. Correções e execução positiva posterior estão registradas acima.

## TASK-004 — Catálogo, mídia, busca e traduções

- **Status:** DONE | **DEPENDS_ON:** TASK-002 | **Rastreabilidade:** RF-001/002/003/019; RN-001/002/018; RNF-002/007/009; UC-01; ADR-004.
- **Objetivo:** criar catálogo com categorias fixas, conteúdo completo, pesquisa/filtros e tradução automática em quatro idiomas.
- **Allowed Changes:** Product/Category/Translation/Image; páginas de catálogo/produto; busca; filtros tipo de flor, cor, tamanho, materiais e faixa de preço; integração backend Translation.
- **Incidental:** cache de catálogo/imagens para cumprir desempenho.
- **Forbidden:** tradução de preço/código; expor estoque interno além do alerta público definido; aceitar estoque decimal; publicar produto com estoque zero como comprável; tradução manual dentro do painel.
- **Aceite:** todos os campos e categorias do README; imagem responsiva; preço em BRL; busca/filtros combináveis; tradução en/es/ru com cache e fallback pt; erro de API não bloqueia navegação.
- **Validação:** testes de filtro/idioma/fallback/estoque e medição de imagem em cenário documentado.
- **DoD:** API key só backend; limites de custo configurados; conteúdos de teste sintéticos.
- **Etapa 001 — Recontextualização (2026-10-25):** GATE-001 APROVADO. Requisitos, escopo, ADR-004/007, arquitetura, ausência de implementação/relatórios anteriores, branch e working tree registrados em `docs/reports/TASK-004-etapa-001-recontextualizacao.md`. TASK-002 está DONE e a dependência declarada satisfeita. TASK-004 permanece BLOCKED: limite de custo para Google Cloud Translation não definido; taxonomia de ocasião/tipo e conteúdo de toxicidade/cuidados têm pendências no README; checkout atual é da TASK-003 e contém alterações preexistentes extensas. Etapas 002–007 pendentes; nenhuma implementação, chamada paga, branch, commit ou push realizada.
- **Etapa 002 — Pré-condições (2026-10-25):** GATE-002 CONCLUÍDO; DoR aprovado para iniciar somente o planejamento documental da Etapa 003. Google Cloud Translation faturável não será ativado nesta etapa; ativação futura depende de aprovação explícita de quota e limite de custo, sem número presumido. As 16 categorias do RF-002 são a taxonomia oficial; não adicionar nem renomear. Conteúdo botânico ausente usa “Informação não disponível.” em português e não bloqueia navegação; dados de teste serão sintéticos/mock, sem fatos botânicos inventados. Alterações existentes da TASK-003 permanecem intactas; a TASK-004 não assume nem altera o checkout, e carrinho/favoritos/reserva/checkout permanecem nas TASKs responsáveis. Branch/contexto isolado será necessário antes da implementação. Detalhes em `docs/reports/TASK-004-etapa-002-pre-condicoes.md`. GATE-003 habilitado; implementação e serviço pago não autorizados.
- **Etapa 003 — Planejamento (2026-10-25):** GATE-003 APROVADO; matriz critério→arquivos candidatos→validação, entidades/interfaces, escopo, sequência, riscos e rollback em `docs/reports/TASK-004-etapa-003-planejamento.md`. Nenhum código foi alterado. RNF-002 não define cenário de rede/dispositivo e depende dessa definição antes de medir desempenho; quota/limite de tradução faturável e fonte botânica aprovada seguem pendentes. TASK-004 permanece READY; GATE-004 não autorizado nesta solicitação. Antes da implementação é necessário checkout isolado e autorização própria; chamadas faturáveis continuam condicionadas à aprovação de quota/limite.
- **Etapa 004 — Preparação (2026-10-25):** GATE-003 permanece CONCLUÍDO. Cenário de medição RNF-002 definido em `docs/reports/TASK-004-etapa-004-implementacao.md`; validação real segue pendente da implementação. Não existe branch/worktree TASK-004 seguro no estado atual: a branch TASK-003 e as 278 mudanças preexistentes foram preservadas; não houve operação Git destrutiva. Para iniciar alterações de código, a TASK-004 necessita de checkout/working tree isolado com a base Supabase, preparado sem mover, descartar ou modificar o trabalho TASK-003. Nenhum código da TASK-004 foi implementado nesta preparação. TASK-004: READY; Etapa 004: PRONTA PARA EXECUÇÃO, iniciando pelo isolamento. GATE-004 permanece PENDENTE até implementação e validações. Tradução faturável segue desativada; sem API key real.
- **Etapa 004 — Tentativa de implementação (2026-10-25):** BLOQUEADA antes de alteração funcional. A solicitação pediu usar o checkout isolado preparado anteriormente, mas a verificação encontrou somente o checkout `task/TASK-003-contas-autenticacao` em `304eb32`, com 280 entradas no status; nenhum branch/worktree TASK-004 existe. Criar worktree a partir do HEAD não incluiria as alterações Supabase locais; copiá-las poderia misturar escopos. Nada foi movido, descartado ou modificado na TASK-003. GATE-004: BLOQUEADO; relatório atualizado em `docs/reports/TASK-004-etapa-004-implementacao.md`. TASK-004: BLOCKED até disponibilizar checkout isolado com base Supabase. Etapa 005 permanece bloqueada.
- **Etapa 005 — Revisão (2026-10-25):** GATE-005 BLOQUEADO por pré-condição; GATE-004 permanece PENDENTE porque a Etapa 004 apenas preparou o início da implementação e não produziu diff funcional nem evidências de aceite. Detalhes em `docs/reports/TASK-004-etapa-005-revisao.md`. TASK-004 permanece READY; retomar pela Etapa 004 em checkout isolado com base Supabase. GATE-006 e GATE-007 continuam pendentes.

## TASK-005 — Carrinho, favoritos e reserva concorrente

- **Status:** IN_REVIEW | **Branch:** `task/TASK-005-carrinho-favoritos-reservas` | **DEPENDS_ON:** TASK-002, TASK-003, TASK-004 | **Rastreabilidade:** RF-005/006/007/008; RN-005/007; RNF-001/010; UC-03; ADR-002.
- **Objetivo:** persistir carrinho/favoritos e reservar unidades escolhidas por três horas sem saldo negativo.
- **Allowed Changes:** Cart/CartItem/Favorite/Reservation/InventoryLedger; transação de checkout/reserva; job de expiração.
- **Incidental:** mecanismo idempotente de retry e painel técnico de reservas necessário ao suporte.
- **Forbidden:** checkout de visitante; reserva antes do botão final; reserva parcial; liberar item duas vezes; cancelar pedido pago por job; manipular saldo por cache.
- **Aceite:** cliente seleciona subconjunto; reserva começa no clique final e dura três horas mesmo durante conferência; saldo concorrente correto; expiração cancela e libera exatamente uma vez; visitante não usa carrinho/favorito; catálogo esconde zero.
- **Validação:** teste concorrente em último item, expiração repetida, rollback, relógio/fuso.
- **DoD:** transação e idempotência demonstradas com evidência e ledger auditável.

- **Recontextualização posterior:** no checkout integrado, TASK-004 foi concluída e aprovada (GATE-001–007); a integração mínima de UI TASK-004/TASK-005 foi autorizada e a Etapa 003 foi aprovada. Os registros bloqueados anteriores são históricos e foram superados por essas decisões.
- **Etapa 004 — implementação/validação (2026-10-25/26):** implementação em revisão. `npm run test:task005`: 4 PASS e suíte Supabase SKIP/NOT RUN; TypeScript e Biome direcionado PASS; build Next PASS em cópia temporária (Webpack, variáveis sintéticas); lint global FAIL com cinco diagnósticos fora do escopo. Migration `202610250003_task005_cart_favorites_reservations.sql`, concorrência, rollback, expiração/RLS e OCI permanecem NOT RUN: Docker Engine inacessível/sem resposta e não foi possível identificar com segurança uma stack integrada. GATE-004 = BLOQUEADO; Etapa 005 = BLOQUEADA. Evidência: `docs/reports/TASK-005-etapa-004-validacao-2026-10-26.md`.

- **Revalidação (2026-10-26):** Docker Client/Server 29.9.2 respondeu inicialmente. Stack integrada `task003-004-integration-20261025` identificada; seu histórico registra migrations 001–003, mas objetos TASK-005 já existem sem versionamento 004, então não foi alterada. Stack temporária exclusiva iniciou e travou em “Starting database”; estado final não confirmado após daemon deixar de responder. 4 testes unitários, TypeScript e Biome direcionado PASS; build em cópia nova compilou e gerou 16/16 páginas, com aviso de tracing externo; integração de banco, migration e OCI continuam pendentes. Detalhes e passos de resolução: `docs/reports/TASK-005-etapa-004-revalidacao-2026-10-26.md`.

## TASK-006 — Pedido e transição para WhatsApp

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-005 | **Rastreabilidade:** RF-007/009/010; RN-007/008/009; RNF-010; UC-03/04; ADR-003.
- **Objetivo:** vincular pedido ao cliente, criar resumo para WhatsApp e suportar conferência por funcionário e aprovação/confirmação pelo administrador.
- **Allowed Changes:** Order/OrderItem/OrderInspection/payment confirmation event; painel de fila; link WhatsApp; status e audit log.
- **Incidental:** mensagens de erro e recuperação do link após bloqueio de popup.
- **Forbidden:** pagamento no site; armazenar cartão; confirmar pagamento por funcionário; pôr CPF completo na URL ou texto WhatsApp; alterar preço sem consentimento.
- **Aceite:** funcionário registra conferência; administrador com OTP aprova e marca pago; pedido tem estados e histórico; link abre conversa da loja com identificador seguro; pagamento integral confirmado precede preparo; preparo começa entre 1–2 h e previsão fica clara/configurável. Permissão para funcionário mudar estados além de registrar conferência fica pendente e não deve ser presumida.
- **Pendências antes de iniciar:** número WhatsApp oficial; definição de como representar a janela de produção de 1–2 horas; política de preço/conteúdo do link.
- **Validação:** testes de transição, permissões e link sem PII excessiva.
- **DoD:** nenhum pagamento processado; registro financeiro mínimo auditável.

## TASK-007 — Painel de produtos, estoque e auditoria

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-004, TASK-005 | **Rastreabilidade:** RF-002/017; RN-002/016; RNF-005/010; UC-07; ADR-002.
- **Objetivo:** permitir cadastro/edição de produtos e estoque com histórico justificável.
- **Allowed Changes:** telas de catálogo/estoque; ledger; anexo de produto; alertas no limiar 7; notificação interna.
- **Incidental:** carregamento otimizado de imagens no painel.
- **Forbidden:** editar estoque sem motivo; motivo >400 caracteres; usuário modificar próprio autor/data; equipe acessar dados/contratos de funcionários; importação automatizada Excel.
- **Aceite:** funcionário administra produto e estoque; administrador também; registro contém operador, hora, anterior/novo e justificativa; alerta site quando ≤7; e-mail equipe ao cruzar para ≤7, sem spam; rearmar quando >7.
- **Validação:** testes de permissão e transições 8→7→6→8→7, auditoria e upload privado/público apropriado.
- **DoD:** motivos e log não editáveis por operadores; notificações idempotentes.

## TASK-008 — Cupons e indicadores de carrinho/favoritos

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-005 | **Rastreabilidade:** RF-006/015/018; RN-006/017; UC-03/08.
- **Objetivo:** administrar cupons e aplicar descontos válidos; registrar eventos de carrinho/favoritos para relatório.
- **Allowed Changes:** Coupon/Redemption/CartEvent; painel do administrador; validação no backend.
- **Incidental:** ferramenta de expiração dos cupons.
- **Forbidden:** funcionários criarem cupom; desconto acima do subtotal; aplicar cupom expirado; limite padrão de uso inventado.
- **Aceite:** percentual e valor fixo; data de validade; restrições configuráveis; preço recalculado no servidor; registro de adição/favorito suporta métricas; somente administrador cria/edita/desativa.
- **Pendente:** acumulação, mínimo, escopo, uso por cliente, arredondamento/reuso após cancelamento.
- **Validação:** limites, concorrência de resgate, cancelamento e autorização.
- **DoD:** sem defaults de negócio não aprovados; termos do cupom armazenados no pedido.

## TASK-009 — Gestão de pedido, retirada e cancelamentos

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-006, TASK-007 | **Rastreabilidade:** RF-009..014/020; RN-008..014; RNF-010; UC-04/05/07; ADR-003.
- **Objetivo:** concluir preparação/retirada, agenda, cancelamento e retorno seletivo de estoque.
- **Allowed Changes:** Order status/pickup/cancellation; agenda e tela de pedidos; seleção de itens usados; confirmação de retirada; avisos de política.
- **Incidental:** auditoria de decisões e timeline para cliente.
- **Forbidden:** cálculo ou execução de reembolso; cancelamento por funcionário; retornar itens usados/finalizados; alterar pedido sem acordo do cliente; inventar responsabilidade legal.
- **Aceite:** administrador define retirada; cliente vê previsão; status de pronto/retirado é alterado apenas por papel aprovado em requisito; cancelamento só administrador e exige estágio (não preparado/em preparo/finalizado); retorno de estoque corresponde exatamente aos itens não usados; tratamento de perecíveis/não perecíveis segue regra aprovada; defeito registrado para tratativa pelo WhatsApp.
- **Pendente:** uma semana corridos/calendário; permissão de equipe para alterar estados de pedido; estados finais de descarte.
- **Validação:** matriz de transição, devolução seletiva, abuso de permissão e auditoria.
- **DoD:** política informativa aprovada visível antes de pagamento; nenhuma regra financeira calculada.

## TASK-010 — Verificação e notificações agendadas

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-006, TASK-009 | **Rastreabilidade:** RF-004/012; RN-003/011/012; RNF-008/009; UC-02/06.
- **Objetivo:** envio confiável de mensagens de verificação, status, retirada e alertas de prazo.
- **Allowed Changes:** modelo Notification/outbox, workers, templates pt/en/es/ru, e-mail/SMS provider adapters.
- **Incidental:** monitor de falhas e reprocessamento.
- **Forbidden:** enviar marketing sem consentimento; duplicar mensagens em retries; mandar OTP/logs ao painel aberto; notificar clientes após cancelamento indevidamente.
- **Aceite:** verificação email/SMS; senha por email; e-mail pronto; lembretes T-24h/T-1h; avisos diários para perecíveis até três dias úteis; disponibilidade de canal/retry registrada; feriado respeitado.
- **Pendências:** escolher serviços, remetente/domínio, calendário de feriados e limites/custos.
- **Validação:** relógio simulado, retries, duplicidade, opt-out aplicável e falha de provedor.
- **DoD:** outbox/job idempotente; entrega/erro observável sem expor dados privados.

## TASK-011 — Relatórios, exportações e métricas

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-005, TASK-007, TASK-008, TASK-009 | **Rastreabilidade:** RF-018; RN-017; RNF-006; UC-08.
- **Objetivo:** relatórios semanais/mensais e exportações Excel/PDF disponíveis apenas ao administrador.
- **Allowed Changes:** consultas agregadas, filtros, geração XLSX/PDF, registro de exportação.
- **Incidental:** otimizações/índices locais ao relatório.
- **Forbidden:** relatórios para equipe; exportações públicas; esconder cancelamentos; faturamento confundido com pedidos não pagos; incluir todos os dados pessoais sem necessidade.
- **Aceite:** faturamento por data de criação e data de pagamento claramente separados; mais/menos vendidos, carrinho, favoritos; seletor Excel ou PDF; conteúdo consistente com filtros; somente administrador.
- **Pendente:** definição de semana, tratamento de cupom/cancelamento no faturamento e escopo de PII exportada.
- **Validação:** fixtures sintéticas contra totais calculados e autorização.
- **DoD:** export temporário protegido e com auditoria; relatórios explicam base temporal.

## TASK-012 — Direção visual, idiomas e acessibilidade

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-001, TASK-004 | **Rastreabilidade:** RF-001/019; RNF-002/007; UC-01; ADR-004.
- **Objetivo:** aplicar identidade visual gótica/industrial e experiência não convencional sem comprometer compra acessível.
- **Allowed Changes:** componentes/styles; tokens cor/tipografia; microinterações; layouts responsivos; seletor de idioma; conteúdo institucional configurável.
- **Incidental:** ajustes semânticos/accessibility diretamente ligados aos componentes.
- **Forbidden:** reduzir contraste; inventar logo oficial, endereço ou afirmação botânica; templates genéricos não justificados; dependência de animações para conteúdo essencial.
- **Aceite:** palette do README; fotos florais de impacto; navegação clara; teclado/foco, contraste, textos alternativos, mobile e estados de erro/vazio; quatro idiomas.
- **Pendente:** logo final, fontes licenciadas, fotos autorizadas, endereço e texto institucional.
- **Validação:** auditoria WCAG e inspeção visual em larguras acordadas.
- **DoD:** direção de arte documentada e assets com licença/origem identificada.

## TASK-013 — Segurança, backup, observabilidade e recuperação

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-001, TASK-002, TASK-003, TASK-005 | **Rastreabilidade:** RNF-003..006/008..011; ADR-001/002/005.
- **Objetivo:** preparar proteção e operação para produção confiável e permitir recuperação em RTO ≤24h.
- **Allowed Changes:** pipeline de deploy de imagens OCI, configuração de runtime/container registry, alertas, backups/PITR, cópia, runbooks, gestão de secrets, políticas de bucket/database e custos.
- **Incidental:** cabeçalhos/limites de segurança no gateway/app se necessários.
- **Forbidden:** deploy ou dados reais sem autorização; alegar RPO não medido; desabilitar auditoria; expor CPF/contratos/secret.
- **Aceite:** backup automático e independente; exercício de restore documentado; RTO avaliado ≤24h; RPO medido e aprovado; dashboards e alertas; rollback; budget alerts; teste/produção isolados; deploy de produção usa imagem de container aprovada e reproduzível.
- **Pendente:** SLO, região, retenção e valor de orçamento.
- **Validação:** restauração real de dados sintéticos, rotação de secret, revisão de acesso e cenário de falha.
- **DoD:** plano operacional aprovado e nenhum deploy final sem autorização.

## TASK-014 — Migração operacional de catálogo

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-004, TASK-007, TASK-012 | **Rastreabilidade:** RF-002; RN-002; UC-01/07.
- **Objetivo:** preparar processo seguro para funcionários cadastrar produtos, fotos, descrições e saldo manualmente.
- **Allowed Changes:** guia de cadastro, formulário, validações, checklist de consistência e treinamento.
- **Incidental:** melhorias de preenchimento em lote sem importar planilha, se aprovadas e localizadas.
- **Forbidden:** integração automática com Excel ou migrar saldo sem validação; inventar informações/toxicidade; publicar produtos incompletos sem autorização.
- **Aceite:** equipe consegue cadastrar item por item; imagens otimizadas; categoria fixa; contagem conferida contra inventário físico antes de abrir vendas.
- **Validação:** ensaio com produtos sintéticos; reconciliação manual documentada.
- **DoD:** processo e responsabilidade de dupla conferência definidos.

## TASK-015 — Capacidade, aceitação ponta a ponta e prontidão de lançamento

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013, TASK-014 | **Rastreabilidade:** todos RF/RNF; todos UCs; ADR-001..005.
- **Objetivo:** validar requisitos integrados e preparar lançamento controlado.
- **Allowed Changes:** scripts/config de carga, correções diretamente necessárias aos critérios, runbooks e release checklist.
- **Incidental:** defeitos P0/P1 dentro do escopo já aprovado.
- **Forbidden:** novos requisitos, mudar termos de negócio, operar pagamento real em carga, usar PII real, publicar site sem autorização explícita.
- **Aceite:** fluxos críticos E2E; 1.000 sessões simultâneas em carga acordada; imagens ≤2s no cenário definido; estoque sem divergência; notificações/retries; restore demonstrado; acessibilidade; privacidade/permissões; plano de suporte; aprovação de pendências.
- **Validação:** gates de build/lint/tipos, suíte unitária/integrada/E2E, carga, segurança, acessibilidade e regressão definidos no AGENTS.md.
- **DoD:** relatório de execução completo, pendências aceitas/rejeitadas, checklist de lançamento aprovado.


### Estado consolidado de tasks (2026-10-26)

- TASK-001: DONE (GATE-001–007 aprovados; evidências e testes manuais registrados).
- TASK-002: DONE (GATE-001–007 aprovados; testes PostgreSQL e validações registrados).
- TASK-003: DONE (GATE-001–007 aprovados na arquitetura Supabase; resultados e pendências ambientais documentados).
- TASK-004: DONE (GATE-001–007 concluídos; T001–T011 PASS; migration de alerta de estoque validada em Supabase isolado; RNF-002 registrado com medições 41 ms, 43 ms e 247 ms).
- TASK-005: IN_REVIEW; GATE-004 BLOQUEADO por migration/integration/OCI pendentes, conforme relatório vinculado acima. Etapa 005 não iniciada.
- TASK-006 a TASK-014: BLOCKED pelas dependências ainda não concluídas; nenhuma foi iniciada nesta atualização.
