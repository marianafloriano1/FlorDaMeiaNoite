# TASK-004 — Etapa 005 — Revisão

**Data:** 2026-10-25
**Resultado:** BLOQUEADA por pré-condição
**Branch/HEAD observados:** `task/TASK-003-contas-autenticacao` / `304eb32`
**Gates anteriores:** GATE-001, GATE-002 e GATE-003 concluídos; GATE-004 pendente.

## Verificação da pré-condição

O prompt da Etapa 005 exige relatório e GATE aprovado da etapa anterior. A Etapa 004 foi preparada para execução, mas sua implementação funcional não ocorreu: `docs/reports/TASK-004-etapa-004-implementacao.md` registra cenário RNF-002 e estratégia de isolamento, declara explicitamente que nenhum critério funcional foi implementado ou validado e mantém GATE-004 PENDENTE.

Assim, não há diff funcional da TASK-004 nem evidências de implementação para revisar contra aceite, segurança, arquitetura ou DoD. A revisão de implementação e a aprovação do GATE-005 ficam bloqueadas até a execução da Etapa 004 e aprovação do GATE-004. A TASK-004 continua READY; o bloqueio é somente da sequência de revisão.

## Operações e Scope Guard

- Lidos: prompt local da Etapa 005, seção TASK-004 de `TASKS.md`, relatório da Etapa 004 e estado Git direcionado aos documentos da TASK-004.
- Branch `task/TASK-003-contas-autenticacao`; HEAD `304eb32`. O status do repositório já contém mudanças preexistentes. Nenhuma foi revertida ou alterada por esta etapa.
- `git diff --check -- TASKS.md`: PASS, exit 0; inspeção de whitespace deste relatório: PASS. Não foi executada checagem global nem revisão do diff funcional, pois a pré-condição do GATE-004 não passou.
- Nenhum arquivo de aplicação ou implementação da TASK-003 foi revisado ou modificado. Nenhum teste, lint, typecheck, build ou integração foi executado.
- Única alteração desta etapa: este relatório e a anotação da Etapa 005 na seção TASK-004 de `TASKS.md`.

## GATE-005

| Item | Estado | Evidência |
|---|---|---|
| Solicitação e prompt da Etapa 005 | PASS | Pedido explícito e prompt local identificados. |
| Gate anterior aprovado | BLOCKED | GATE-004 está PENDENTE no relatório da Etapa 004; implementação funcional não ocorreu. |
| Diff funcional da TASK-004 disponível | BLOCKED | Nenhuma implementação da Etapa 004 foi feita; não existe diff funcional para revisar. |
| Revisão de aceite, segurança, privacidade e arquitetura | NOT RUN | Dependem de implementação e evidências do GATE-004. |
| Correções | NOT RUN | Não há achado de implementação revisável; nenhuma correção foi autorizada/aplicada. |

**Resultado:** GATE-005 BLOQUEADO pela ausência de GATE-004 aprovado. Gates acumulados: 3 concluídos (GATE-001–003), 3 pendentes (GATE-004, GATE-006 e GATE-007) e 1 bloqueado (GATE-005).

==================================================

## Revisão retomada após aprovação do GATE-004

**Data:** 2026-10-25
**Pré-condição:** PASS — evidência mais recente em `TASKS.md` e no relatório da Etapa 004 registra GATE-004 aprovado para o escopo TASK-004.
**Resultado:** Etapa concluída como revisão; GATE-005 BLOQUEADO por lacunas de aceite e decisões pendentes.

### Escopo e evidências

- Revistos os requisitos RF-019/RN-018 e RN-002 no README, decisões do ADR-004/ADR-007 e Etapas 002/003, relatório final da Etapa 004 e código/testes de catálogo, mídia e tradução.
- Este checkout não contém metadados Git (`git rev-parse --is-inside-work-tree` falhou); portanto não foi possível produzir diff/status. A revisão foi feita por inventário e leitura do estado atual, comparados ao plano e aos registros existentes. Não se afirma proveniência exata de cada arquivo.
- A evidência de GATE-004 foi reutilizada, sem rerodar testes nesta revisão: catálogo 8/8, lint direcionado 12 arquivos, typecheck, build Next.js e OCI/smoke PASS; Supabase isolado PASS; RNF-002 sintético PASS; testes fake de cache/fallback PASS. O lint global continua com quatro diagnósticos conhecidos da TASK-003, fora do escopo desta revisão.
- Nenhum código, migration, configuração, arquivo da TASK-003 ou recurso Supabase/Docker foi alterado nesta etapa. Testes/lint/typecheck/build: NOT RUN nesta revisão.

### Achados

| Severidade | Área | Resultado e evidência | Estado |
|---|---|---|---|
| P1 | RF-019 / RN-018 — tradução | `src/lib/translation/catalog.ts` contém lógica de localização/cache, mas a busca de referências de runtime não encontrou chamada a `localizeCatalogProduct` fora dos testes. `src/lib/catalog/service.ts` lê traduções já persistidas e retorna pt-BR quando não há registro. A interface do catálogo/detalhe mantém rótulos estáticos em português. Não foi encontrado provider de tradução conectado na configuração/runtime. A aprovação anterior cobre fake/cache/fallback, não geração automática em execução. A ativação paga depende da decisão de quota/custo do registro da Etapa 002. | BLOCKED — DECISÃO NECESSÁRIA: aprovar quota/custo/provider ou revisar o critério de tradução automática. Nenhuma chamada faturável foi feita. |
| P1 | RN-002 — alerta de baixo estoque | A view pública omite a quantidade, e as páginas exibem somente “Disponível”; não há sinalização pública de última unidade/baixo estoque. README §11 mantém pendente o texto/limiar do alerta. Não foi inferido limiar nem copy. | BLOCKED — DECISÃO NECESSÁRIA: definir limiar e texto/comportamento público. |
| P2 | Imagem na página de detalhe | A listagem tem caminho `unoptimized` para URLs locais; `src/app/catalog/[slug]/page.tsx` usa `next/image` sem esse tratamento. `next.config.ts` cobre hosts configurados, mas não todo hostname/IP da stack/container. É risco estático; o smoke registrado verificou HTTP da página, não carregamento visual da imagem da página de detalhe. | PENDENTE — não reproduzido diretamente nesta revisão. |
| P2 | Storage público | A migration cria o bucket `catalog` como público e a policy de leitura autoriza objetos pelo bucket, sem vincular leitura ao estado publicado do produto. Não há fluxo de escrita/upload de produto nesta tarefa e os arquivos usados são sintéticos; portanto não foi constatada exposição atual de mídia não publicada. O limite deve ser definido antes de um fluxo de rascunho/upload futuro. | RISCO FUTURO — rever fronteira de publicação antes de TASK-007; sem mudança nesta revisão. |
| INFO | Baseline de diff | Sem `.git`, não há como confirmar de forma independente mudanças exatas versus baseline; os caminhos inventariados correspondem às áreas catalogadas no planejamento e à implementação documentada. | LIMITAÇÃO registrada. |

### Estado do GATE-005

| Item | Estado | Evidência |
|---|---|---|
| GATE-004 aprovado e documentação anterior disponível | PASS | Registro mais recente da validação por escopo TASK-004. |
| Revisão de escopo/inventário e arquitetura | PASS COM LIMITAÇÃO | Leitura dos artefatos listados; sem baseline Git para diff exato. |
| Testes e validações previamente associados ao GATE-004 | PASS, reutilizados | Evidências documentadas; não rerodadas durante esta revisão. |
| Tradução automática RF-019/RN-018 em runtime | BLOCKED | Código runtime não gera/aplica tradução automaticamente; decisão de custo/quota pendente. |
| Alerta público RN-002 | BLOCKED | Implementação ausente e limiar/copy pendentes. |
| Imagem local na página de detalhe | PENDENTE | Risco identificado estaticamente; sem teste visual dedicado. |
| Correções nesta revisão | NONE | Etapa de revisão sem autorização para corrigir. |

**Gates acumulados:** 4 concluídos (GATE-001–004), 2 pendentes (GATE-006–007), 1 bloqueado (GATE-005). A tarefa permanece `IN_REVIEW`; GATE-004 continua aprovado. A Etapa 006 não foi iniciada.

==================================================
TASK: TASK-004
ETAPA: 005
STATUS DA ETAPA: CONCLUÍDA (REVISÃO)
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 4
GATES PENDENTES: 2
GATES BLOQUEADOS: 1
PROBLEMAS ENCONTRADOS:
- P1 RF-019/RN-018: tradução automática não está conectada ao runtime; a UI permanece em português e a decisão de quota/custo do provider está pendente.
- P1 RN-002: alerta público de baixo estoque ausente; limiar e texto continuam pendentes.
- P2: imagem local na página de detalhe não usa o tratamento local presente na listagem; impacto não reproduzido diretamente.
- P2: leitura do bucket público não depende da publicação do produto; risco futuro, sem exposição atual demonstrada.
- Sem baseline Git, o diff exato não pôde ser verificado independentemente.
CORREÇÕES REALIZADAS:
- Nenhuma; revisão documental e de leitura somente.
PENDÊNCIAS:
- DECISÃO NECESSÁRIA: aprovar quota/custo/provider de tradução ou revisar o critério de tradução automática.
- DECISÃO NECESSÁRIA: definir limiar e texto/comportamento do alerta público de baixo estoque.
- Validar a imagem local na página de detalhe e definir o controle de publicação do Storage antes de ampliar escrita/upload.
TESTES RELACIONADOS:
- Evidência anterior reutilizada: catálogo 8/8; lint direcionado 12 arquivos; typecheck/build Next.js; smoke OCI e endpoints; Supabase isolado; RNF-002 sintético; cache/fallback fake — PASS, conforme relatório da Etapa 004.
- Lint global: FAIL com quatro diagnósticos preexistentes de TASK-003, preservados.
- Testes executados nesta revisão: NOT RUN.
PRÓXIMA ETAPA: Etapa 006 — testes manuais.
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: GATE-005 permanece bloqueado por dois requisitos pendentes de decisão/aceite; esta revisão não inicia a etapa seguinte.
==================================================
TASK: TASK-004
ETAPA: 005
STATUS DA ETAPA: BLOQUEADA
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 3
GATES BLOQUEADOS: 1
PROBLEMAS ENCONTRADOS:
- GATE-004 permanece PENDENTE; a etapa anterior apenas removeu bloqueios documentais e preparou o início da implementação.
- Não existe diff funcional da TASK-004 nem evidência de aceite para revisar.
CORREÇÕES REALIZADAS:
- Pré-condição e estado acumulado registrados; nenhuma alteração de código.
PENDÊNCIAS:
- Executar a Etapa 004 em checkout isolado com base Supabase e concluir suas validações antes de retomar a revisão.
TESTES RELACIONADOS:
- NOT RUN: revisão funcional, testes, lint, typecheck e build; a pré-condição de GATE-004 aprovado falhou.
PRÓXIMA ETAPA: Etapa 004 — implementação.
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-005 fica bloqueado; a sequência deve retornar à Etapa 004. O plano GATE-003 continua aprovado e a preparação documental deixou a Etapa 004 pronta para execução, começando pelo checkout isolado.
==================================================

## Adendo — decisões de idioma e estoque recebidas

**Data:** 2026-10-25

As definições recebidas depois da revisão resolvem as ambiguidades de produto. Elas substituem as solicitações de decisão registradas acima, mas não constituem implementação nem evidência de validação:

- **Idioma:** pt-BR é o padrão; seleção de outro idioma é opcional. Conteúdo traduzido já disponível pode ser exibido; ausente ou erro volta a pt-BR. Não ativar provider, cobrança ou quota sem autorização futura. Preço permanece BRL e códigos não são traduzidos. O código atual confirma seletor via `locale`, default/fallback pt-BR e preço formatado em BRL; traduções são lidas de registros persistidos. Não há geração de tradução em runtime. A decisão atende ao modelo opcional para conteúdo traduzido disponível; não foi validada a tradução de rótulos fixos da interface. A regra anterior de “tradução automática” no README/TASKS precisa de reconciliação documental antes de implementação futura.
- **Estoque:** limiar definido como `1–2` unidades, aviso exato “Últimas unidades disponíveis.”; acima de 2 sem alerta; zero indisponível e não listado publicamente para compra. A migration/view atual exclui estoque zero, mas omite a quantidade e a página só exibe “Disponível”; portanto não consegue apresentar o aviso em 1–2. A lacuna é de implementação, não mais de decisão.

**Reavaliação:** o achado de tradução deixa de ser bloqueio de decisão, sujeito à atualização rastreável do requisito RF-019/RN-018. O alerta de estoque baixo continua como bloqueio P1 do GATE-005, pois falta derivar/expor somente o sinal público permitido e renderizar a mensagem definida. Não alterei código, migration, README ou ADR nesta revisão; alterações funcionais exigem etapa autorizada própria. Os achados P2 de imagem local e fronteira pública do Storage permanecem registrados como pendência/risco, sem reprodução adicional.

**GATE-005:** BLOCKED — 4 gates concluídos (GATE-001–004), 2 pendentes (GATE-006–007), 1 bloqueado (GATE-005). A Etapa 006 não está habilitada até resolver/validar o aviso público de estoque baixo e reconciliar os requisitos documentais de idioma.

==================================================
TASK: TASK-004
ETAPA: 005
STATUS DA ETAPA: CONCLUÍDA (REVISÃO; ADENDO DE DECISÃO)
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 4
GATES PENDENTES: 2
GATES BLOQUEADOS: 1
PROBLEMAS ENCONTRADOS:
- P1 RN-002: aviso “Últimas unidades disponíveis.” para estoque 1–2 ainda não implementado. Estoque zero segue excluído da view pública.
- RF-019/RN-018: decisão recebida define idioma opcional, pt-BR padrão/fallback, sem provider pago; requisito atual ainda fala em tradução automática e precisa de reconciliação documental antes de implementação futura. Traduções persistidas disponíveis podem ser selecionadas.
- P2: caminho de imagem local na página de detalhe sem tratamento equivalente ao da listagem; impacto não reproduzido diretamente.
- P2: leitura do bucket Storage público não depende da publicação do produto; risco futuro, sem exposição atual demonstrada.
- Sem baseline Git, o diff exato não pôde ser verificado independentemente.
CORREÇÕES REALIZADAS:
- Nenhuma; somente documentação desta revisão/adendo.
PENDÊNCIAS:
- Implementar e validar aviso público de estoque 1–2 conforme o limite e texto definidos, preservando ocultação da quantidade e exclusão de estoque zero.
- Reconciliar README/TASKS/ADR sobre tradução automática versus tradução opcional persistida, sem ativar provider/custo.
- Validar imagem local na página de detalhe e definir controle de publicação do Storage antes de ampliar escrita/upload.
TESTES RELACIONADOS:
- Evidência anterior GATE-004 reutilizada conforme relatório; testes desta revisão/adendo NOT RUN.
- Lint global FAIL com quatro diagnósticos preexistentes de TASK-003, preservados.
PRÓXIMA ETAPA: Etapa 006 — testes manuais.
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: aviso obrigatório de estoque baixo não está implementado/validado e o requisito de idioma precisa de reconciliação documental.
==================================================

## Resolução autorizada do bloqueio P1 — revisão final

**Data:** 2026-10-25
**Autorização:** implementar o alerta público de estoque e reconciliar README/TASKS/ADR-004 com a decisão de idioma opcional. Achados P2 de imagem local e Storage foram explicitamente mantidos fora do escopo.

### Alterações

- Migration aditiva `202610250002_catalog_low_stock_alert.sql` substitui a view pública para adicionar somente `low_stock_alert`, derivado de `stock_quantity BETWEEN 1 AND 2`. A view mantém `stock_quantity > 0`, não seleciona nem retorna a quantidade real e mantém a barreira de segurança.
- Projeção/API expõe apenas `lowStockAlert` booleano. Listagem e detalhe exibem exatamente “Últimas unidades disponíveis.” quando verdadeiro; nenhum aviso para os demais produtos.
- Falhas lançadas ao consultar traduções persistidas agora resultam em fallback para pt-BR sem interromper o catálogo.
- README, TASKS e ADR-004 reconciliados: pt-BR padrão; idiomas alternativos opcionais quando tradução persistida estiver disponível; fallback pt-BR; sem provider/quota/cobrança; preços em BRL e códigos sem tradução.
- Achados P2 continuam registrados e não foram ampliados nem corrigidos.

### Evidências e limites

- `npm run test:catalog`: **PASS 11/11**. Casos de saldo `>2`, `1`, `2` e `0`; projeção sem quantidade; filtro público de zero; texto exato na listagem/detalhe; erro na leitura de tradução com fallback pt-BR.
- `npx biome check` direcionado nos sete arquivos TS/CSS alterados: **PASS**, zero diagnósticos.
- `npx tsc --noEmit --incremental false`: **PASS**.
- `npm run typecheck`: **BLOCKED** antes do TypeScript porque `next typegen` recebeu `EPERM` ao abrir `.next/types/routes.d.ts`. Build: **NOT RUN** para preservar `.next` preexistente diante do bloqueio de escrita.
- Validação PostgreSQL da migration: **NOT RUN**; `docker ps` retornou acesso negado à API Docker (`npipe://...dockerDesktopLinuxEngine`). Não foi iniciado, parado ou removido container e nenhum banco foi alterado. Os testes verificam a expressão/filtro da migration estaticamente e exercitam a projeção em dados sintéticos.
- Lint global não executado; os quatro diagnósticos preexistentes da TASK-003 continuam fora do escopo. Nenhum arquivo TASK-003 foi editado; sem metadados Git neste checkout, não há diff independente.

### Resultado do GATE-005

**GATE-005: APROVADO para a revisão da TASK-004.** Os critérios do escopo passaram nos testes direcionados e na revisão; a validação local do SQL em PostgreSQL permanece NOT RUN por indisponibilidade do Docker e deve ser considerada na aplicação/validação manual da Etapa 006. Os achados P2 permanecem documentados conforme autorização. Gates acumulados: 5 concluídos (GATE-001–005), 2 pendentes (GATE-006–007), 0 bloqueados. TASK-004 retorna a `IN_REVIEW`; Etapa 006 habilitada.

==================================================
TASK: TASK-004
ETAPA: 005
STATUS DA ETAPA: CONCLUÍDA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 5
GATES PENDENTES: 2
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- A validação do SQL em PostgreSQL não foi executada: Docker Engine retornou acesso negado.
- O `npm run typecheck` oficial falhou em `next typegen` por `EPERM` em `.next/types/routes.d.ts`; `tsc --noEmit --incremental false` passou.
- Build NOT RUN para preservar `.next` preexistente. Quatro diagnósticos globais já registrados da TASK-003 ficaram fora do escopo e não foram tocados.
- P2 de imagem local e política futura do Storage permanecem registrados, conforme autorização.
CORREÇÕES REALIZADAS:
- Adicionada migration aditiva com apenas o booleano derivado `low_stock_alert`; UI mostra o texto exato para 1–2; estoque zero segue filtrado.
- Consulta de tradução com exceção agora retorna catálogo em pt-BR.
- README, TASKS e ADR-004 atualizados para tradução opcional persistida, sem provider faturável.
PENDÊNCIAS:
- Aplicar/validar a migration em ambiente Supabase isolado e executar testes manuais da Etapa 006 quando o Docker estiver acessível.
- P2 de imagem local/Storage permanece fora do bloqueio atual por decisão da solicitante.
TESTES RELACIONADOS:
- `npm run test:catalog`: PASS 11/11.
- Lint direcionado Biome: PASS, 7 arquivos.
- `npx tsc --noEmit --incremental false`: PASS.
- `npm run typecheck`: BLOCKED por EPERM de `next typegen`; build: NOT RUN.
- SQL/PostgreSQL: NOT RUN; Docker indisponível. Sem recursos Docker/Supabase alterados.
PRÓXIMA ETAPA: Etapa 006 — testes manuais.
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-005 aprovado; o bloqueio de aceite do alerta foi implementado e passou nos testes direcionados. A Etapa 006 deverá validar a migration em ambiente isolado quando disponível.
==================================================
