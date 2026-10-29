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
- **Objetivo:** criar catálogo com categorias fixas, conteúdo completo, pesquisa/filtros e exibição opcional de traduções persistidas em quatro idiomas.
- **Allowed Changes:** Product/Category/Translation/Image; páginas de catálogo/produto; busca; filtros tipo de flor, cor, tamanho, materiais e faixa de preço; leitura de traduções persistidas por idioma/versão com fallback pt-BR.
- **Incidental:** cache de catálogo/imagens para cumprir desempenho.
- **Forbidden:** tradução de preço/código; expor estoque interno além do alerta público definido; aceitar estoque decimal; publicar produto com estoque zero como comprável; tradução manual dentro do painel.
- **Aceite:** todos os campos e categorias do README; imagem responsiva; preço em BRL; busca/filtros combináveis; tradução persistida opcional en/es/ru com fallback pt-BR; estoque 1–2 mostra “Últimas unidades disponíveis.” sem divulgar saldo; estoque zero não aparece publicamente; falha de tradução não bloqueia navegação.
- **Validação:** testes de filtro/idioma/fallback/estoque e medição de imagem em cenário documentado. Testes de estoque cobrem >2, 1, 2, zero, sigilo do saldo e exclusão pública de zero.
- **DoD:** sem provider/API faturável ativo; traduções persistidas opcionais; fallback pt-BR; conteúdos de teste sintéticos.
- **Etapa 001 — Recontextualização (2026-10-25):** GATE-001 APROVADO. Requisitos, escopo, ADR-004/007, arquitetura, ausência de implementação/relatórios anteriores, branch e working tree registrados em `docs/reports/TASK-004-etapa-001-recontextualizacao.md`. TASK-002 está DONE e a dependência declarada satisfeita. TASK-004 permanece BLOCKED: limite de custo para Google Cloud Translation não definido; taxonomia de ocasião/tipo e conteúdo de toxicidade/cuidados têm pendências no README; checkout atual é da TASK-003 e contém alterações preexistentes extensas. Etapas 002–007 pendentes; nenhuma implementação, chamada paga, branch, commit ou push realizada.
- **Etapa 002 — Pré-condições (2026-10-25):** GATE-002 CONCLUÍDO; DoR aprovado para iniciar somente o planejamento documental da Etapa 003. Google Cloud Translation faturável não será ativado nesta etapa; ativação futura depende de aprovação explícita de quota e limite de custo, sem número presumido. As 16 categorias do RF-002 são a taxonomia oficial; não adicionar nem renomear. Conteúdo botânico ausente usa “Informação não disponível.” em português e não bloqueia navegação; dados de teste serão sintéticos/mock, sem fatos botânicos inventados. Alterações existentes da TASK-003 permanecem intactas; a TASK-004 não assume nem altera o checkout, e carrinho/favoritos/reserva/checkout permanecem nas TASKs responsáveis. Branch/contexto isolado será necessário antes da implementação. Detalhes em `docs/reports/TASK-004-etapa-002-pre-condicoes.md`. GATE-003 habilitado; implementação e serviço pago não autorizados.
- **Etapa 003 — Planejamento (2026-10-25):** GATE-003 APROVADO; matriz critério→arquivos candidatos→validação, entidades/interfaces, escopo, sequência, riscos e rollback em `docs/reports/TASK-004-etapa-003-planejamento.md`. Nenhum código foi alterado. RNF-002 não define cenário de rede/dispositivo e depende dessa definição antes de medir desempenho; quota/limite de tradução faturável e fonte botânica aprovada seguem pendentes. TASK-004 permanece READY; GATE-004 não autorizado nesta solicitação. Antes da implementação é necessário checkout isolado e autorização própria; chamadas faturáveis continuam condicionadas à aprovação de quota/limite.
- **Etapa 004 — Preparação (2026-10-25):** GATE-003 permanece CONCLUÍDO. Cenário de medição RNF-002 definido em `docs/reports/TASK-004-etapa-004-implementacao.md`; validação real segue pendente da implementação. Não existe branch/worktree TASK-004 seguro no estado atual: a branch TASK-003 e as 278 mudanças preexistentes foram preservadas; não houve operação Git destrutiva. Para iniciar alterações de código, a TASK-004 necessita de checkout/working tree isolado com a base Supabase, preparado sem mover, descartar ou modificar o trabalho TASK-003. Nenhum código da TASK-004 foi implementado nesta preparação. TASK-004: READY; Etapa 004: PRONTA PARA EXECUÇÃO, iniciando pelo isolamento. GATE-004 permanece PENDENTE até implementação e validações. Tradução faturável segue desativada; sem API key real.
- **Etapa 004 — Tentativa de implementação (2026-10-25):** BLOQUEADA antes de alteração funcional. A solicitação pediu usar o checkout isolado preparado anteriormente, mas a verificação encontrou somente o checkout `task/TASK-003-contas-autenticacao` em `304eb32`, com 280 entradas no status; nenhum branch/worktree TASK-004 existe. Criar worktree a partir do HEAD não incluiria as alterações Supabase locais; copiá-las poderia misturar escopos. Nada foi movido, descartado ou modificado na TASK-003. GATE-004: BLOQUEADO; relatório atualizado em `docs/reports/TASK-004-etapa-004-implementacao.md`. TASK-004: BLOCKED até disponibilizar checkout isolado com base Supabase. Etapa 005 permanece bloqueada.
- **Etapa 004 — Implementação no checkout físico isolado (2026-10-25):** implementados migration/modelos de catálogo, leitura pública Supabase, API e páginas públicas, filtros combináveis, imagens responsivas e leitura de traduções versionadas com fallback `pt-BR`; tradução faturável permanece desligada. Testes sintéticos 8/8, lint direcionado, typecheck e build passaram. Lint global falha por 5 diagnósticos preexistentes em `src/app/api/auth/register/route.ts` (TASK-003); nenhum arquivo dessa área foi alterado. Migration e integração Supabase não foram aplicadas: há stack local ativa com o mesmo `project_id`, e não foi feito reset/conexão para evitar atingir o estado original. Não há produtos/imagens de catálogo, então a medição RNF-002 está **VALIDAÇÃO PENDENTE**. Construção de imagem Docker não executada porque o acesso ao Docker Engine foi negado; scanner de whitespace próprio PASS (não há `.git` para `git diff --check`). Sem API faturável, segredos, deploy, branch, commit ou push. GATE-004: BLOQUEADO; GATE-005 não habilitado. TASK-004 permanece BLOCKED pelas evidências de integração, tradução ativa e RNF-002 pendentes. Detalhes no relatório da Etapa 004.
- **Etapa 005 — Revisão (2026-10-25):** GATE-005 BLOQUEADO por pré-condição; GATE-004 permanece PENDENTE porque a Etapa 004 apenas preparou o início da implementação e não produziu diff funcional nem evidências de aceite. Detalhes em `docs/reports/TASK-004-etapa-005-revisao.md`. TASK-004 permanece READY; retomar pela Etapa 004 em checkout isolado com base Supabase. GATE-006 e GATE-007 continuam pendentes.

- **Etapa 007 — Conclusão (2026-10-25):** GATE-007 aprovado e TASK-004 marcada DONE após consolidação de GATE-001–006, aceite e DoD. GATE-006 inclui T001–T011 PASS e migration `202610250002_catalog_low_stock_alert.sql` aplicada/validada em Supabase isolado. GATE-004 considera somente os quatro diagnósticos globais preexistentes da TASK-003 como fora do escopo; não corrigidos. P2 de imagem local/Storage permanecem documentados e não bloqueantes. Nenhum código funcional foi alterado nesta etapa; Git indisponível por ausência de `.git`; sem branch/commit/push. TASK-005 não iniciada e exige autorização própria.

## TASK-005 — Carrinho, favoritos e reserva concorrente

- **Status:** DONE | **Branch:** `task/TASK-005-carrinho-favoritos-reservas` | **DEPENDS_ON:** TASK-002, TASK-003, TASK-004 | **Rastreabilidade:** RF-005/006/007/008; RN-005/007; RNF-001/010; UC-03; ADR-002.
- **Objetivo:** persistir carrinho/favoritos e reservar unidades escolhidas por três horas sem saldo negativo.
- **Allowed Changes:** Cart/CartItem/Favorite/Reservation/InventoryLedger; transação de reserva; job de expiração; integração mínima compartilhada em src/app/catalog/[slug]/page.tsx para ações de carrinho/favoritos. Classificação: ARQUIVO COMPARTILHADO — TASK-004/TASK-005.
- **Incidental:** mecanismo idempotente de retry e painel técnico de reservas necessário ao suporte.
- **Forbidden:** checkout de visitante; reserva antes da ação explícita; reserva parcial; liberar item duas vezes; criar pedido, iniciar checkout ou processar pagamento nesta TASK; manipular saldo por cache.
- **Aceite:** cliente seleciona subconjunto e cria reserva temporária de três horas; no máximo uma reserva ativa por cliente/carrinho; saldo concorrente correto; expiração marca expired e libera disponibilidade exatamente uma vez; visitante não usa carrinho/favorito; catálogo esconde zero; TASK-005 não cria pedido/checkout.
- **Validação:** teste concorrente em último item, expiração repetida, rollback, relógio/fuso.
- **DoD:** transação e idempotência demonstradas com evidência e ledger auditável.

- **Etapa 001 (2026-10-25):** GATE-001 APROVADO no checkout integrado; implementação/testes/migrations/documentação da TASK-004 estão presentes e seu fechamento GATE-007 registra DONE. Aplicação integrada das migrations segue PENDENTE, separadamente. Decisões de reserva registradas no relatório. TASK-005 permanece BLOCKED pelo conflito de escopo da UI; Etapa 002 não iniciada.

- **Execução solicitada (2026-10-25):** BLOQUEADA antes de alterar código: o fluxo exige ações de carrinho/favoritos em páginas pertencentes à TASK-004, cuja alteração foi vedada. Relatório: docs/reports/TASK-005-bloqueio-escopo-2026-10-25.md. TASK-005 e GATE-005 permanecem BLOCKED; TASK-006 não iniciada.

- **Etapa 002 (2026-10-25):** GATE-002 APROVADO; DoR passou com TASK-002/003/004 DONE e decisões de reserva resolvidas. A solicitante autorizou integração mínima compartilhada em src/app/catalog/[slug]/page.tsx; src/app/catalog/page.tsx permanece fora do escopo. Migrations integradas seguem PENDENTES e não reclassificam TASK-004. TASK-005 READY; Etapa 003 habilitada para execução futura, não iniciada. Relatório: docs/reports/TASK-005-etapa-002-pre-condicoes.md.

- **Etapa 003 (2026-10-25):** GATE-003 CONCLUÍDO; plano aprovado em `docs/reports/TASK-005-etapa-003-planejamento.md`. Expiração: estado `active` com `expires_at` UTC de 3h; worker periódico em processo OCI existente expira e libera disponibilidade transacionalmente, com repetição idempotente. Fronteira definida: TASK-005 cria/expira/cancela reserva temporária; não cria pedido, checkout ou pagamento; TASK-006 poderá consumir reserva válida. Nenhum código, teste ou migration foi alterado. Validação integrada migrations 003+004 segue PENDENTE por Docker e não bloqueia o planejamento. TASK-005 READY; Etapa 004 habilitada para execução futura, não iniciada.

- **Etapa 004 (2026-10-25):** implementação TASK-005 registrada em `docs/reports/TASK-005-etapa-004-implementacao.md`. 4 testes unitários/worker PASS, integração Supabase 1 SKIP/NOT RUN; TypeScript e Biome direcionado PASS; lint global FAIL em 5 diagnósticos de arquivos preexistentes fora do escopo TASK-005; build Next PASS em cópia temporária com Webpack, sem alterar `.next` original. Docker Engine permanece inacessível; migration, integração concorrente/rollback/expiração/RLS e OCI NOT RUN. GATE-004 BLOQUEADO; TASK-005 IN_REVIEW; Etapa 005 não iniciada.

- **Revalidação da Etapa 004 (2026-10-27):** conforme evidência informada pela usuária, job integrado da CI PASS; `test:task005` 10/10 PASS, 0 SKIP, em Supabase isolado com quatro migrations; concorrência da última unidade, idempotência, rollback, expiração e RLS cobertos. Lint, typecheck e Biome PASS. **GATE-004: APROVADO.** O bloqueio de 2026-10-25 é histórico e foi supersedido por esta revalidação. A evidência não foi repetida nesta atualização documental.
- **Etapa 005 — Revisão (2026-10-27):** relatório `docs/reports/TASK-005-etapa-005-revisao.md`; GATE-005 BLOQUEADO por (P2) ledger com `ON DELETE CASCADE` contra imutabilidade do ADR-002, README RF-007/008 não reconciliado com decisão aprovada TASK-005/TASK-006, e ausência de evidência de execução do worker em processo/container. GATE-004 APROVADO com base na revalidação informada pela usuária (CI 10/10, 0 SKIP; quatro migrations; lint/typecheck/Biome PASS). Nenhum código/migration alterado; TASK-003/TASK-004 preservadas; TASK-006 não iniciada. GATES acumulados: 4 concluídos, 2 pendentes, 1 bloqueado. Etapa 006 não habilitada.
- **Retomada da Etapa 005 (2026-10-27):** conforme autorização da usuária, README RF-006/007/008 e RN-005/007 reconciliados com a fronteira TASK-005 (reserva temporária) / TASK-006 (pedido/checkout); migration aditiva 202610270001_task005_inventory_ledger_restrict_delete.sql substitui ON DELETE CASCADE do ledger por ON DELETE RESTRICT. Migration 202610270001_task005_inventory_ledger_restrict_delete.sql VALIDADA conforme evidência reportada pela usuária: migration up --local concluída, test:task005 10/10 PASS, 0 SKIP, e CI verde. Execução do worker reportada pela usuária: processo vivo após 12 s, sem logs de falha; Ctrl+C/SIGINT retornou ao prompt sem segunda interrupção nem erros, com LASTEXITCODE 0. GATE-005 APROVADO; contagem atual: 5 concluídos, 2 pendentes (006–007), 0 bloqueados. Etapa 006 habilitada para execução futura, mas não iniciada. TASK-006 não iniciada; nenhum Docker/container foi iniciado pelo Codex. TASK-003/TASK-004 e TASK-006 não alteradas/iniciada.

### Etapa 006 — testes manuais TASK-005 (2026-10-28)
- GATE-006 APROVADO; T001–T011 PASS conforme evidências reportadas pela usuária, consolidadas em docs/testing/TASK-005-etapa-006-testes-manuais.md e docs/reports/TASK-005-etapa-006-testes-manuais.md. Não reexecutadas pelo Codex.

### Etapa 007 — conclusão TASK-005 (2026-10-28)
- GATE-007 APROVADO; relatório em docs/reports/TASK-005-etapa-007-conclusao.md. GATE-001–007 registrados como concluídos.
- TASK-005 marcada DONE por solicitação explícita da usuária em 2026-10-28 após aprovação dos GATE-001–007. TASK-006 não iniciada; nenhuma TASK posterior iniciada automaticamente.
## TASK-006 — Pedido e transição para WhatsApp

- **Status:** DONE | **Branch:** `task/TASK-006-checkout-pedidos` | **DEPENDS_ON:** TASK-003, TASK-005 | **Rastreabilidade:** RF-007/009/010; RN-007/008/009; RNF-010; UC-03/04; ADR-003.
- **Objetivo:** consumir uma reserva válida e criar/vincular pedido, registrar conferência e transições autorizadas, confirmação manual de pagamento e acompanhamento via WhatsApp.
- **Allowed Changes:** Order/OrderItem/OrderInspection/payment confirmation event; painel de fila; link wa.me pré-preenchido; estados e audit log; campos de janela de preparo.
- **Incidental:** mensagens de erro e recuperação do link após bloqueio de popup; configuração sintética usada em testes.
- **Forbidden:** pagamento no site; armazenar cartão; envio WhatsApp automático/API; confirmar pagamento por employee; CPF completo em URL ou mensagem; alterar preço sem consentimento; duplicar baixa/liberação de estoque da TASK-005; estender expiração da reserva.
- **Aceite:** pedido vinculado a reserva válida, sem segunda movimentação do estoque; employee (operador) faz conferência e somente transições operacionais permitidas; admin (gerente) aprova e registra pagamento manual; estados/histórico auditáveis; link abre wa.me com mensagem pré-preenchida e envio manual; pagamento integral confirmado define `preparation_window_start = payment_confirmed_at + 1h` e `preparation_window_end = payment_confirmed_at + 2h` em UTC; configuração oficial do WhatsApp e texto de cancelamento fornecido pela loja são exigidos antes da implantação/confirmação de pagamento.
- **Decisões registradas (2026-10-28):** `WHATSAPP_STORE_NUMBER` configurável em E.164 (valor oficial antes da implantação; testes sintéticos); wa.me manual sem Business API; employee = operador e admin = gerente; janela de preparo representada por `preparation_window_start/end`, 1–2h após confirmação integral; texto legal via `ORDER_CANCELLATION_POLICY_TEXT`, sem conteúdo inventado nem cálculo de reembolso. Ver README, ADR-003 e `docs/reports/TASK-006-etapa-001-recontextualizacao.md`.
- **Validação:** testes de transição, autorização por papel, reserva válida/expirada, concorrência entre expiração e associação, link sem PII, TypeScript/lint/build e validação integrada definida no planejamento.
- **DoD:** nenhum pagamento processado; registro financeiro mínimo auditável; gates 001–007 e evidências documentados.
- **Etapa 001 (2026-10-28):** GATE-001 APROVADO; contexto, dependências, decisões autorizadas e reconciliação documental registrados em `docs/reports/TASK-006-etapa-001-recontextualizacao.md`. DoR para iniciar foi satisfeito após decisões de negócio registradas; status transitou BLOCKED → READY → IN_PROGRESS. Nenhum código, migration ou teste alterado/executado. Etapa 002 fica habilitada para execução futura, não iniciada.
- **Etapa 002 (2026-10-28):** GATE-002 CONCLUÍDO; checklist DoR aprovado em `docs/reports/TASK-006-etapa-002-pre-condicoes.md`. Dependências TASK-003/TASK-005 DONE; rastreabilidade e critérios confirmados; decisões de negócio registradas; scripts locais Supabase e workflow CI Linux efêmero disponíveis como meios de validação (nenhum serviço iniciado nesta etapa). TASK-006 permanece IN_PROGRESS; Etapa 003 habilitada para execução futura, não executada.
- **Etapa 003 (2026-10-28):** GATE-003 APROVADO; plano em `docs/reports/TASK-006-etapa-003-planejamento.md`. Decisões aprovadas: preço recalculado no servidor, diferença em tela e aceite explícito antes de criar pedido; reserva não paga expira no prazo original de 3h, worker libera estoque e trigger aditivo cancela pedido irreversivelmente; confirmação antes do prazo conclui a reserva sem nova movimentação. README reconciliado (papéis e RF-010). Gates 001–003 concluídos, 004–007 pendentes, 0 bloqueados.
- **Etapa 004 (2026-10-28):** GATE-004 **APROVADO**. `npm run test:task006` em Supabase local efêmero isolado: 10 PASS, 0 FAIL, 0 SKIP; migrations 001–006 aplicadas, `202610280001_task006_orders.sql` confirmada em `supabase migration list --local`. `npm run lint` PASS após correção exclusivamente de formatação nos 48 arquivos diagnosticados; `.gitattributes` fixa LF para impedir recorrência com `core.autocrlf=true`. Biome direcionado, `npm run typecheck`, `npm run build`, Prettier do workflow e `git diff --check` PASS. A configuração TOTP foi habilitada somente na cópia efêmera e no job de CI. A stack `flor-da-meia-noite-local` permaneceu preservada. TASK-003/004/005 sem alterações funcionais; arquivos diagnosticados tiveram somente formatação. Sem commit, push ou deploy. Relatório: `docs/reports/TASK-006-etapa-004-implementacao.md`. Etapa 005 **HABILITADA PARA EXECUÇÃO FUTURA**, não iniciada nesta retomada.
- **Etapa 005 (2026-10-28):** GATE-005 **APROVADO** após correções P1/P2 e revalidação em `docs/reports/TASK-006-etapa-005-revisao.md`. A RPC agora serializa retries pela idempotency key do cliente e retorna o pedido existente (HTTP 200); bloqueia produtos até o commit e aborta divergência de preço com `order_quote_changed`/HTTP 409. Migration aditiva `202610280002_task006_order_commit_guards.sql` aplicada na stack Supabase efêmera. `npm run test:task006`: 12/12 PASS, 0 SKIP; lint, typecheck, build e `git diff --check`: PASS. README reconciliado. Etapa 006 habilitada para execução futura, não iniciada.
- **Etapa 006 (2026-10-28):** T001–T011 = PASS conforme relatório/evidências manuais fornecidos pela usuária; não reexecutados pelo Codex. GATE-006 APROVADO. Relatório: `docs/reports/TASK-006-etapa-006-relatorio.md`; roteiro: `docs/testing/TASK-006-etapa-006-testes-manuais.md`. Referência `task/TASK-006-checkout-pedidos` / HEAD `73225c6a5df44245f6d6b059b95cf11df39800c1`; working tree suja e vínculo do estado completo à execução manual não comprovado. Ambiente informado: Supabase PostgreSQL / SQL Editor, sem project_id ou capturas brutas. Nenhum código, migration ou banco alterado nesta reconciliação documental.
- **Etapa 007 (2026-10-28; fechamento da TASK em 2026-10-29):** GATE-007 APROVADO; matriz acumulada 7/7 gates concluídos, 0 pendentes/bloqueados. Relatório: `docs/reports/TASK-006-etapa-007-conclusao.md`. Por solicitação explícita da usuária em 2026-10-29, a TASK-006 foi finalizada como DONE, resolvendo a ressalva anterior do prompt que limitava a conclusão ao gate; nenhuma TASK posterior foi iniciada. `git diff --check` PASS; sem commit/push até a publicação desta atualização.
## TASK-007 — Painel de produtos, estoque e auditoria

- **Status:** DONE | **Branch:** `task/TASK-007-painel-produtos-estoque` | **Commit publicado:** `1a06320` | **DEPENDS_ON:** TASK-003, TASK-004, TASK-005 | **Rastreabilidade:** RF-002/017; RN-002/016; RNF-005/010; UC-07; ADR-002.
- **Objetivo:** permitir cadastro/edição de produtos e estoque com histórico justificável.
- **Allowed Changes:** telas de catálogo/estoque; ledger; anexo de produto; alertas no limiar 7; notificação interna.
- **Incidental:** carregamento otimizado de imagens no painel.
- **Forbidden:** editar estoque sem motivo; motivo >400 caracteres; usuário modificar próprio autor/data; equipe acessar dados/contratos de funcionários; importação automatizada Excel.
- **Aceite:** funcionário administra produto e estoque; administrador também; registro contém operador, hora, anterior/novo e justificativa; aviso público exato “Últimas unidades disponíveis.” somente para estoque 1–2, sem expor o saldo e sem aviso acima de 2; e-mail interno da equipe ao cruzar de >7 para ≤7, sem repetição enquanto permanecer ≤7 e rearmado ao voltar para >7.
- **Validação:** testes de permissão e transições 8→7→6→8→7, auditoria e upload privado/público apropriado.
- **DoD:** motivos e log não editáveis por operadores; notificações idempotentes.
- **Etapa 007 (2026-10-29):** GATE-001–007 concluídos e TASK-007 DONE conforme commit `1a06320` na branch dedicada `task/TASK-007-painel-produtos-estoque`; implementação e relatório final permanecem nessa branch ainda não mesclada. Nenhum arquivo funcional da TASK-007 foi incorporado ao checkout TASK-006 nesta publicação.

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

### Validação complementar TASK-004 Etapa 004 (2026-10-25)
- Testes direcionados 8/8, lint direcionado, typecheck e build Next.js: PASS.
- Lint global: FAIL com cinco diagnósticos; build da imagem runner interrompido nesse lint. Somente estágio base OCI construído; container não iniciado.
- Supabase: NOT RUN; containers ativos compartilham `project_id` configurado, isolamento da stack não comprovado.
- RNF-002: PENDENTE, sem catálogo/imagens sintéticas para medição; tradução cache/fallback com fake: PASS, provider faturável não ativado.
- GATE-004 permanece BLOQUEADO. Etapa 005 não executada.

### Tentativa complementar Supabase/RNF-002 — TASK-004 (2026-10-25)
- Supabase: NOT RUN; o `project_id`/portas configurados coincidem com a stack ativa. Método de configuração alternativa não comprovado; nenhum container, volume ou banco foi tocado.
- RNF-002: PENDING; sem imagens locais, banco isolado ou navegador automatizável para medição real com cache desabilitado.
- OCI: BLOCKED BY PREEXISTING GLOBAL LINT FAILURE; tentativa do target runner parou no `npm run lint`. Nenhum container foi iniciado.
- GLOBAL LINT: BLOCKED BY PREEXISTING TASK-003 DIAGNOSTICS; não corrigido. `src/app/api/auth/register/route.ts` só foi lido pelo lint.
- Repetidos: `npm run test:catalog` 8/8 PASS; lint direcionado PASS; `npm run typecheck` PASS; `npm run build` PASS. Tradução faturável e billing continuam desativados.
- GATE-004 BLOCKED; Etapa 005 não executada.

### Validação final GATE-004 — TASK-004 (2026-10-25)
- Formatter aplicado somente a `src/app/api/catalog/route.ts`; lint direcionado PASS; `npm run test:catalog` PASS 8/8; typecheck PASS; build Next.js PASS.
- Lint global FAIL com quatro diagnósticos TASK-003: `src/app/api/auth/register/route.ts` (2), `src/lib/auth/http.ts` (1), `tests/auth/task003.step-up.test.ts` (1). Arquivos não alterados.
- Supabase NOT RUN: stack ativa compartilha project_id e portas; nenhum banco/container/volume alterado. RNF-002 PENDING: sem browser automatizável, catálogo/imagens sintéticas isoladas para medição real.
- OCI BLOCKED BY TASK-003 LINT: build do target runner interrompido no lint; nenhum container iniciado. Cache/fallback de tradução permanece validado com fake; API faturável/billing não ativados.
- GATE-004 BLOCKED; Etapa 005 não executada.

### Consolidação final GATE-004 — TASK-004 (2026-10-25)
- Supabase isolado PASS: projeto temporário `task004-validation-20261025`, portas 55421–55427; migration aplicada; tabelas, policies, views, constraints, FKs e índices confirmados; fixtures sintéticas verificaram busca, filtros combinados, detalhe, exclusão de estoque zero e não exposição do saldo. Imagem sintética PNG enviada. Stack temporária deixada identificada porque Docker Engine ficou sem resposta; stack original preservada.
- RNF-002 PENDING: Chrome 156 headless, cache desabilitado, 3 tentativas (171/118/117 ms), mas a imagem falhou nas 3 (`naturalWidth=0`, HTTP 400 do otimizador local); tempos não contam como medição do critério.
- OCI BLOCKED: Dockerfile oficial interrompe no lint global TASK-003. Dockerfile temporário executou testes/lint direcionado/typecheck, mas build Next dentro dele travou e Docker Engine passou a retornar HTTP 500; runner não iniciado.
- Testes 8/8 PASS; lint direcionado PASS; typecheck PASS; build Next com configuração restaurada PASS. Lint global FAIL, quatro diagnósticos apenas em `src/app/api/auth/register/route.ts` (2), `src/lib/auth/http.ts` (1), `tests/auth/task003.step-up.test.ts` (1); não alterados. Tradução cache/fallback fake PASS; billing/provider não ativados.
- Única alteração funcional persistente nesta execução: formatação de `src/app/api/catalog/route.ts`. `next.config.ts` foi restaurado; nenhuma alteração na TASK-003, stack original ou recursos existentes. GATE-004 permanece BLOCKED; Etapa 005 não executada.

- Limpeza: a tentativa de parar o projeto temporário via CLI não concluiu porque Docker Engine permaneceu sem resposta; nenhum volume/container foi removido. Stack temporária identificada permanece aguardando limpeza manual.

### Follow-up dos bloqueios RNF-002 e OCI — TASK-004 (2026-10-25)
- **Correção mínima de suporte local:** Next.js 16 bloqueia por padrão a otimização de IPs locais; a documentação instalada confirma que `unoptimized` é alternativa suportada. `src/app/catalog/page.tsx` agora usa `unoptimized` somente quando a imagem vem de `http://127.0.0.1:` ou `http://localhost:`; URLs HTTPS remotas continuam no caminho otimizado.
- **RNF-002: PASS na medição sintética local.** Quatro PNGs determinísticos 96×96 foram servidos por um mock local REST/Storage sintético; página real `/catalog` servida pelo Next.js, Chrome 156 headless, três perfis novos, cache desabilitado antes da navegação. Durações até todas as imagens completarem: 1.065 ms, 200 ms, 209 ms. Em todas as três execuções, 4/4 elementos `img` ficaram `complete=true` com `naturalWidth=96`; todas abaixo de 2 s. Esta medição usa serviço local simulado, não tráfego externo nem dispositivo móvel.
- **OCI: BLOCKED — Docker Engine indisponível (HTTP 500).** Diagnóstico anterior desta mesma tentativa registrou HTTP 500 na API do Engine; nesta retomada `docker info`/`docker version` não responderam no limite da chamada. Docker Desktop estava ativo, mas reiniciá-lo poderia interromper a stack original preservada; não foi reiniciado. `podman`, `buildah`, `nerdctl`, `containerd` e `ctr` não estavam disponíveis. Sem runtime funcional, não foi possível construir/iniciar runner nem validar endpoint.
- Revalidados após a correção: `npm run test:catalog` PASS 8/8; Biome direcionado PASS (12 arquivos); `npm run typecheck` PASS; `npm run build` PASS com rotas de catálogo presentes. Lint global não foi repetido; seus quatro diagnósticos TASK-003 permanecem previamente registrados e não foram alterados.
- **Preservação:** nenhuma mudança em TASK-003, Supabase, migrations ou configurações globais; nenhum container/volume foi removido/reiniciado; sem API faturável, secrets reais ou ações Git. Servidor Next, mock e processos Chrome iniciados para esta medição foram encerrados. Alterações desta retomada: `src/app/catalog/page.tsx`, este registro e o relatório TASK-004.
- **GATE-004: BLOCKED** somente pela validação OCI ainda sem evidência de build, inicialização e endpoint. RNF-002 medido abaixo de 2 s no cenário sintético local. Etapa 005 não executada.

### Validação OCI final complementar — TASK-004 (2026-10-25)
- `docker version`: **PASS**, Client 29.9.2 e Server Docker Desktop/Engine 29.9.2. `docker ps`: **PASS**; listou as stacks `task004-validation-20261025` e `flor-da-meia-noite-local`. Nenhum container/volume precisou ser removido; nenhum foi removido ou alterado nesta validação.
- Target oficial `docker build --target runner -t flor-task004-gate004-runner:20261025 .`: dependências reutilizadas da camada cacheada; lint global **FAIL** e interrompeu o `RUN npm run lint && npm run typecheck && npm run build` antes de typecheck/build. Quatro erros, todos TASK-003: `src/app/api/auth/register/route.ts` (organização de imports e format), `src/lib/auth/http.ts` (format) e `tests/auth/task003.step-up.test.ts` (format). Nenhum erro TASK-004 no lint global.
- Biome direcionado TASK-004: **PASS**, 12 arquivos sem diagnósticos. TASK-003 permaneceu inalterada.
- Segunda tentativa oficial com `--no-cache`: `npm ci --no-audit --no-fund` **PASS** (56 pacotes adicionados); após isso, a etapa `COPY --from=dependencies /app/node_modules ./node_modules` ficou sem progresso observável por cerca de três minutos. Foi interrompida sem remover imagem, container, volume ou dados. Lint/typecheck/build não foram alcançados nessa tentativa.
- Typecheck e build **OCI: NOT RUN**, pois o target oficial com cache parou no lint e a tentativa sem cache foi interrompida antes dessas etapas. Typecheck e build Next.js locais permanecem **PASS** na evidência da validação anterior; não foram repetidos nesta validação OCI.
- **GATE-004 permanece BLOCKED**: runner OCI não foi construído/iniciado e endpoint não foi validado. Bloqueio objetivo no fluxo oficial: quatro erros globais preexistentes da TASK-003; tentativa limpa adicional também ficou sem progresso ao copiar dependências. Nenhuma correção fora de TASK-004 aplicada. Etapa 005 não executada.

### Validação OCI por escopo TASK-004 — GATE-004 apto para aprovação (2026-10-25)
- Docker Client/Server 29.9.2 e `docker ps` PASS. As stacks `task004-validation-20261025` e `flor-da-meia-noite-local` foram preservadas. A imagem de validação foi criada com tag `flor-task004-scope-oci-validation:20261025`; o container de smoke `flor-task004-gate004-smoke-20261025` foi parado e preservado. Nenhum recurso Docker foi removido.
- Dockerfile temporário fora do checkout usou a mesma base Node 24.22.1 fixada por digest. O `npm ci` veio da camada cacheada cuja execução limpa anterior havia concluído com 56 pacotes; o Dockerfile temporário evitou copiar `node_modules` entre estágios. Arquivo temporário removido ao final.
- Testes TASK-004 `npm run test:catalog`: **PASS 8/8**. Lint direcionado Biome: **PASS, 12 arquivos, zero diagnósticos**. `npm run typecheck`: **PASS**. `npm run build`: **PASS**, rotas do catálogo geradas e runner standalone empacotado.
- Smoke test do runner: `GET /api/catalog` **200**, 2 produtos sintéticos retornados pela stack Supabase de validação; `GET /catalog` **200**; filtro inválido em `/api/catalog` **400** conforme esperado. O container foi parado ao fim e continua preservado.
- Evidências anteriores mantidas: migration/consultas Supabase isoladas **PASS**; RNF-002 sintético **PASS** (1.065/200/209 ms, 4/4 imagens completas); traduções/cache/fallback fake **PASS**.
- Lint global segue com os **4 diagnósticos preexistentes da TASK-003** (dois em `src/app/api/auth/register/route.ts`, um em `src/lib/auth/http.ts`, um em `tests/auth/task003.step-up.test.ts`). Não foram suprimidos, corrigidos nem alterados; a validação delimitada executou somente o lint TASK-004.
- **GATE-004: APROVADO para escopo TASK-004. TASK-004: IN_REVIEW/apta para aprovação.** Etapa 005 e etapas posteriores não executadas.

### Revisão TASK-004 Etapa 005 (2026-10-25)
- GATE-004 permanece aprovado. GATE-005 revisado contra requisitos, ADRs, planejamento e código atual; nenhum código foi alterado e os testes prévios do GATE-004 foram reutilizados, não rerodados.
- GATE-005 **BLOCKED**: tradução automática RF-019/RN-018 não está integrada ao runtime e depende de decisão de quota/custo/provider; alerta público RN-002 de baixo estoque não está implementado e depende de definição de limiar/copy.
- Achados adicionais: caminho de imagem local na página de detalhe sem tratamento observado na listagem (não reproduzido diretamente); bucket Storage público permite leitura por bucket sem condicionar à publicação (risco futuro, sem exposição atual demonstrada). Checkout sem baseline Git, então diff exato não pôde ser confirmado.
- Testes da revisão NOT RUN. Evidências anteriores GATE-004 permanecem conforme relatório; lint global ainda registra quatro diagnósticos preexistentes TASK-003, sem alteração.
- Estado da TASK-004 permanece IN_REVIEW. GATE-005 não habilita Etapa 006 até resolver os dois bloqueios de aceite; nenhuma etapa posterior iniciada.

### Decisões recebidas após revisão TASK-004 Etapa 005 (2026-10-25)
- Idioma: pt-BR padrão; outros idiomas opcionais quando houver tradução persistida; falha/ausência usa pt-BR. Sem provider, cobrança ou quota sem decisão futura. Preço BRL e códigos preservados. Reconciliar a redação antiga de “tradução automática” no README/TASKS antes de implementação futura.
- Estoque público: aviso exato “Últimas unidades disponíveis.” para 1–2; nenhum aviso acima de 2; estoque zero indisponível e oculto publicamente. É decisão resolvida, mas o aviso ainda não está implementado: view omite a quantidade e UI exibe apenas “Disponível”.
- GATE-005 continua BLOCKED pelo aviso de baixo estoque ausente e pela reconciliação documental pendente; a Etapa 006 não está habilitada. Nenhum código foi alterado; conferir adendo em `docs/reports/TASK-004-etapa-005-revisao.md`.

### Fechamento autorizado da Etapa 005 — TASK-004 (2026-10-25)
- Atualizados README e ADR-004 para a decisão final de idioma opcional, pt-BR padrão/fallback, traduções persistidas, sem provider/quota/cobrança; TASKS registra o contrato atualizado.
- Migration `202610250002_catalog_low_stock_alert.sql` deriva somente o booleano público `low_stock_alert` de estoque 1–2; segue filtrando zero e não expõe a quantidade. Listagem e detalhe exibem a mensagem exata. Erros ao carregar traduções persistidas mantêm o catálogo em pt-BR.
- `npm run test:catalog` 11/11 PASS; Biome direcionado 7 arquivos PASS; `npx tsc --noEmit --incremental false` PASS. `npm run typecheck` bloqueado por EPERM do Next em `.next`; build NOT RUN para preservar artefatos preexistentes. SQL/PostgreSQL NOT RUN porque `docker ps` recebeu acesso negado. Nenhum container/banco foi alterado; TASK-003 não foi editada.
- **GATE-005 APROVADO**; contagem acumulada: 5 concluídos, 2 pendentes, 0 bloqueados. TASK-004 retorna a IN_REVIEW. **Etapa 006 habilitada**; validar migration em Supabase isolado e testes manuais. P2 de imagem local/Storage permanece fora do escopo conforme autorização.

### Etapa 006 — kit de testes manuais preparado (2026-10-25)
- Roteiro em `docs/testing/TASK-004-etapa-006-testes-manuais.md` contém 11 casos cobrindo catálogo/campos/categorias, estoque 0/1/2/>2 e privacidade, busca/filtros, preço, idiomas e fallback, imagens/RNF-002, API e falha de serviço; fixtures apenas sintéticas.
- **Nenhum teste manual executado ou aprovado**; todos os resultados/evidências permanecem `[PREENCHER MANUALMENTE]`. Testes automatizados anteriores da Etapa 005 são apenas referência, não aprovam GATE-006.
- Não foi executado `db reset` ou comando remoto. O projeto Supabase local configurado aponta para `flor-da-meia-noite-local`; o roteiro só permite aplicar a migration 002 na stack `task004-validation-20261025` após confirmação de isolamento. Docker API negou acesso nesta sessão.
- Descoberta read-only da CLI: `npx supabase --help; npx supabase start --help` terminou com exit 1 por `EPERM` ao tentar gravar arquivo temporário de telemetria em `C:\Users\Mariana\.supabase`; não iniciou stack nem executou migration.
- Identificada estaticamente uma hipótese de falha em T006: link do catálogo para detalhe não propaga `locale`; registrar execução real antes de decidir correção. Nenhum código foi alterado nesta etapa.
- **GATE-006: BLOQUEADO / AGUARDANDO TESTES.** Gates acumulados: 5 concluídos, 1 pendente (GATE-007), 1 bloqueado (GATE-006). TASK-004 permanece IN_REVIEW; GATE-007 não iniciado.

### Continuação econômica da validação Etapa 006 (2026-10-25)
- Reutilizados sem repetir: teste catálogo 11/11 e `tsc --noEmit --incremental false` PASS. T001–T011 seguem sem evidência manual; nenhum foi marcado aprovado.
- Lint inicial apontou 6 erros. Corrigida somente formatação TASK-004 em `src/app/api/catalog/route.ts` e `src/app/catalog/page.tsx`; lint direcionado PASS. `npm run lint` seguinte ainda FAIL com quatro diagnósticos TASK-003. Hashes dos três arquivos TASK-003 consultados antes/depois são idênticos.
- `npm run build` executado uma vez: FAIL/BLOCKED por EPERM em `.next/trace`/lockfile. Sem retry, limpeza ou alteração em `.next`.
- Docker/Supabase isolado não acessível; migration e testes manuais não executados. Nenhum recurso/container foi alterado.
- GATE-006 permanece BLOCKED/AGUARDANDO TESTES; roteiro/adendo e evidências em `docs/testing/TASK-004-etapa-006-testes-manuais.md`. GATE-007 permanece pendente.

### Reconciliação de relatório de testes informado — TASK-004 Etapa 006 (2026-10-25)
- Conferidos roteiro T001–T011 e relatórios anteriores; não localizado anexo/arquivo com evidências originais manuais. As aprovações T001–T005 e T007–T011 são registradas como informadas, não verificadas.
- T006 não foi reportado como aprovado e não tem evidência manual; links atuais carregam `locale`, mas isso não prova navegação manual. T008 diverge do registro local que diz não executado; sem evidência-fonte para resolver. T011 tem resultados alegados HTTP 400/200/404; smoke prévio corrobora 400/200, não foi encontrada evidência original do 404.
- Reutilizados resultados automatizados: catálogo 11/11 e TypeScript PASS. Build falhou por EPERM em `.next`; lint global deixou quatro diagnósticos TASK-003. Docker/Supabase migration não validado. TASK-003 preservada.
- GATE-006 permanece BLOQUEADO/AGUARDANDO EVIDÊNCIAS; GATE-007 pendente. Nenhum teste foi repetido nem Etapa 007 iniciada.

### Reconciliação com DOCX de resultados — TASK-004 Etapa 006 (2026-10-25)
- Atualizado o relatório `docs/testing/TASK-004-etapa-006-testes-manuais.md` conforme `TASK-004-Etapa-006-resultados-e-prompt-Codex.docx` fornecido pela usuária. O DOCX relata 9/11 aprovados: T001–T005, T007, T009–T011; T006 REPROVADO; T008 PENDENTE/FALHOU.
- T006: detalhe não preservou `locale`. T008: URL inválida configurada, mas API retornou HTTP 200, esperado 503. T011: resultados informados 400/200/404 conforme critérios; somente 400/200 já têm smoke anterior documentado. DOCX não inclui capturas/logs originais; fonte e ressalva registradas, sem alegar verificação independente.
- GATE-006 permanece BLOQUEADO/PENDENTE; Etapa 007/GATE-007 não habilitados até resolver T006 e T008. Nenhum teste repetido, nenhum código alterado e TASK-003 preservada.

### Reteste T006 — locale catálogo → detalhe (2026-10-25)
- Centralizado o href do produto em `catalogProductHref`, usado nos três links do cartão; en/es/ru propagam `locale`, e pt-BR padrão omite query e continua usando default já existente.
- Teste T006 direcionado PASS 2/2: URLs en/es/ru e padrão; carregamento fake do detalhe seleciona tradução persistida `en` sem alterar preço. `npm run test:catalog` PASS 13/13; Biome direcionado PASS; `npx tsc --noEmit --incremental false` PASS.
- Não foi teste manual de browser. Git check/status não disponíveis por ausência de `.git`; arquivos TASK-003 não editados e hashes conferidos contra os valores registrados antes.
- GATE-006 permanece BLOCKED por T008 ainda falho/pendente (HTTP 200 observado em indisponibilidade, esperado 503). Etapa 007 não iniciada.

### Reteste automatizado T008 — API indisponível (2026-10-25)
- Testes direcionados da rota PASS (5 subtestes): serviço sintético disponível retorna 200; indisponibilidade retorna 503 genérico; tentativa real contra URL local sintética indisponível retorna 503; SSR mantém navegação e mensagem de indisponibilidade; filtro inválido retorna 400 antes da consulta.
- `npm run test:catalog`: PASS 19/19; Biome direcionado: PASS; `npx tsc --noEmit --incremental false`: PASS. Nenhuma alteração funcional da rota foi necessária; a rota já trata erro de leitura com resposta pública genérica 503.
- O servidor Next.js não pôde iniciar por EPERM no lock de `.next`, então o smoke HTTP manual continua sem execução. A causa do HTTP 200 reportado antes não foi determinada; ambiente/processo desatualizado é hipótese, não conclusão.
- T008 automatizado: PASS; registro manual permanece sem preencher. GATE-006 permanece BLOCKED até comprovação manual exigida pelo roteiro e resolução das demais pendências; GATE-007 não iniciado. T006 e TASK-003 não alterados nesta retomada.

### Fechamento manual T008 — TASK-004 Etapa 006 (2026-10-25)
- Evidência manual reportada pela usuária: `GET /api/catalog` normal → 200; com `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:1` → 503 Service Unavailable sem conteúdo interno adicional; `minPrice=invalid` → 400. T008 marcado PASS; causa do HTTP 200 histórico não comprovada.
- Evidência automatizada previamente executada: T008 5/5, `npm run test:catalog` 19/19, Biome direcionado e `npx tsc --noEmit --incremental false` PASS. Nenhum teste foi repetido e nenhum código funcional foi alterado.
- GATE-006 permanece BLOCKED: ainda há campos de evidência manual vazios no roteiro, histórico divergente de T006 e validação da migration em banco isolado não registrada. T006 e TASK-003 não alterados nesta retomada.
- Etapa 007 não iniciada; permanece para execução futura somente após GATE-006 aprovado.

### Retomada autorizada Etapa 005 — alerta de estoque e decisão de idioma (2026-10-25)
- Autorização explícita para reconciliar README/TASKS/ADR e corrigir somente o bloqueio P1 do GATE-005. Implementação de alerta usando booleano derivado na view pública; sem campo de quantidade, provider faturável, alteração TASK-003 ou escopo P2.
- Decisão vigente RF-019/RN-018: pt-BR padrão, idioma alternativo opcional somente com tradução persistida; fallback pt-BR; provider/quota/cobrança desativados; preço em BRL e códigos intactos. Veja atualização do ADR-004.
- RN-002: >2 sem alerta; 1–2 mensagem pública exata; zero permanece excluído; saldo não é exposto.


### Reconciliação documental final — TASK-004 Etapa 006 (2026-10-25)
- T001–T011: PASS conforme resultados fornecidos para reconciliação; sem repetição de testes nesta atualização. T006 tem locale propagado en/es/ru, pt-BR padrão, tradução persistida em inglês, preço não traduzido; reteste 2/2, suíte 13/13, TypeScript e Biome PASS.
- T008: manual normal 200, URL local indisponível `127.0.0.1:1` 503, filtro inválido 400; automação 5/5, `npm run test:catalog` 19/19, Biome e TypeScript PASS. Causa do HTTP 200 anterior não comprovada. T010: 41/43/247 ms; T011: 400/200/404 conforme critérios.
- Migration `202610250002_catalog_low_stock_alert.sql`: PENDENTE; falta comprovação de execução/validação em Supabase isolado. GATE-006 = PENDENTE — validação de migration. Etapa 007 = BLOQUEADA e não iniciada. Nenhum código funcional ou arquivo TASK-003 alterado.


### Validação migration TASK-004 e fechamento GATE-006 (2026-10-25)
- `202610250002_catalog_low_stock_alert.sql` aplicada pela Supabase CLI na stack isolada `task004-validation-20261025` (DB container `supabase_db_task004-validation-20261025`, PostgreSQL 15.19, porta 55422). Diretório temporário da CLI incluiu apenas migrations do catálogo 001/002; migration de identidade TASK-003 não foi executada.
- Histórico antes: 202610250001 aplicada, 202610250002 pendente. Histórico após: 202610250002 registrada uma vez. A migration atualiza somente `public.public_catalog_products`, incluindo sinal booleano de estoque 1–2 e mantendo estoque zero fora da view, sem expor quantidade.
- Validação transacional com fixtures sintéticas PASS: 5 sem alerta, 2/1 com alerta, 0 fora da view; nenhuma coluna pública de saldo; fixtures revertidas com ROLLBACK. Categorias=16, tabelas do catálogo preservadas, zero fixture persistida. Nenhum container/volume removido ou reiniciado; stack `flor-da-meia-noite-local` preservada.
- `MIGRATION 202610250002 = VALIDADA`; GATE-006 = CONCLUÍDO; T001–T011 permanecem PASS; Etapa 007 habilitada para execução futura, não iniciada. Nenhum código funcional ou arquivo TASK-003 alterado. Git indisponível neste checkout sem `.git`.


### Fechamento final — TASK-004 GATE-007 (2026-10-25)
- GATE-001 a GATE-007: CONCLUÍDOS; 7/7 gates, sem pendências ou bloqueios obrigatórios. T001–T011 PASS; migration 202610250002 aplicada e validada na stack isolada, com fixtures sintéticas revertidas em transação. Relatório: docs/reports/TASK-004-etapa-007-conclusao.md.
- TASK-004: DONE. Provider/quota/cobrança de tradução permanecem desativados; quatro diagnósticos globais preexistentes TASK-003 continuam sem alteração e fora do escopo aceito. P2 de imagem local/Storage documentados como não bloqueantes.
- Nenhum código funcional ou arquivo da TASK-003 alterado nesta etapa. Próxima candidata TASK-005 não iniciada; autorização e DoR próprios requeridos. Checkout sem .git; nenhuma operação de Git executada.
