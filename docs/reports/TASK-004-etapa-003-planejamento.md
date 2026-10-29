# TASK-004 — Etapa 003 — Planejamento

**Data:** 2026-10-25
**TASK:** TASK-004 — Catálogo, mídia, busca e traduções
**Branch observada:** `task/TASK-003-contas-autenticacao`
**Status da TASK:** READY (não alterado nesta etapa)
**GATE-003:** APROVADO para o plano; esta execução não autoriza implementação.

## Objetivo e limites desta etapa

Plano de execução revisável para catálogo público, páginas de produto, busca/filtros, imagens e tradução. A etapa foi documental: nenhum código, configuração, migration, dependência, branch ou serviço foi alterado/criado; nenhum teste funcional, build, lint, typecheck, Docker/Supabase ou serviço externo foi executado. O working tree preexistente foi preservado.

Fontes de trabalho: `AGENTS.md`; `README.md` (RF-001/002/003/019, RN-001/002/018, RNF-002/007/009, UC-01 e pendências); seção TASK-004 de `TASKS.md`; `docs/adr/ADR-004-internacionalizacao.md`; `docs/adr/ADR-007-supabase-como-plataforma-de-dados.md`; `docs/architecture/overview.md`; diagramas `context.mmd` e `architecture.mmd`; relatórios das Etapas 001 e 002; prompt da Etapa 003; inventário atual de `src/app/` e `supabase/`.

## Estado confirmado e premissas autorizadas

- TASK-002 consta DONE e é a única dependência declarada. GATE-001 e GATE-002 constam concluídos; o GATE-002 aprovou o DoR somente para planejamento.
- Não foram encontrados módulos, rotas, páginas ou testes de catálogo. A aplicação usa Next.js App Router e Supabase; `supabase/migrations/202610230001_supabase_identity.sql` é a migration existente observada.
- Categorias: usar exatamente as 16 listadas no RF-002. Não criar taxonomias de ocasião/tipo nem renomear categorias.
- Persistência: Supabase Database pelas APIs nativas, conforme ADR-007; nenhuma conexão direta `pg`/Kysely.
- Tradução: português (`pt-BR`) é origem/fallback; inglês, espanhol e russo são gerados no backend conforme ADR-004. Testes usam fake/mock e dados sintéticos. Não configurar nem chamar serviço faturável até aprovação explícita de quota e limite de custo.
- Dados botânicos: não inventar cuidado, toxicidade ou significado. Conteúdo ausente usa “Informação não disponível.” em português e não impede navegação, conforme decisão registrada na Etapa 002.
- Checkout, carrinho, favoritos, reserva, pedidos e pagamento permanecem fora deste escopo. Administração/CRUD de catálogo e estoque pertence à TASK-007.
- Há uma pendência para validação de desempenho: o RNF-002 exige imagem principal visível em até 2 s no cenário de rede/dispositivo definido, mas README e demais fontes consultadas não definem esse cenário. Não inventar rede, dispositivo, cache ou protocolo de medição; defini-los antes de alegar aprovação do RNF-002.
- A branch atual e o working tree contêm alterações preexistentes extensas da TASK-003. Antes de qualquer implementação, preparar checkout isolado TASK-004 cujo baseline inclua a arquitetura Supabase necessária, sem descartar nem incorporar alterações não revisadas da TASK-003.

## Escopo planejado

### Permitido (Allowed Changes)

- Modelo e leitura pública de `Product`, `Category`, `Translation` e `Image`.
- Páginas públicas do catálogo e detalhe do produto.
- Busca por texto e filtros combináveis por tipo de flor, cor, tamanho, materiais e faixa de preço.
- Integração de tradução no backend, cache por idioma e versão da origem, fallback em português; cache de catálogo/imagens apenas se necessário ao desempenho.
- Testes unitários/integrados e fixtures sintéticas diretamente necessários a esses critérios.

### Proibido (Forbidden Changes)

- Traduzir preço ou código; exibir preço fora de BRL.
- Expor quantidade interna de estoque além do alerta público previsto; aceitar estoque decimal/negativo; apresentar estoque zero como comprável.
- Criar tradução/revisão manual dentro do painel.
- Implementar administração de produtos/estoque, carrinho, favoritos, reserva, pedido, checkout, pagamento ou qualquer escopo de outra TASK.
- Publicar alegações botânicas, imagens sem procedência/autorização ou dados reais; registrar segredos, credenciais ou PII.
- Ativar API faturável de tradução sem decisão explícita de custo/quota; colocar chave de tradução no cliente.
- Alterar autenticação, perfil, sessão/RBAC, arquivos `.next`, README ou ADR sem escopo/decisão autorizados.

### Mudanças incidentais admissíveis

- Cache de leitura de catálogo e imagens, exclusivamente se ligado ao requisito de desempenho e coberto por invalidação coerente com a versão do conteúdo.
- Ajustes mínimos de navegação/layout público diretamente necessários para acessar catálogo e produto. Qualquer mudança visual ampla ou fora desses critérios requer decisão separada.

## Arquivos e componentes candidatos

Os caminhos abaixo são **novos candidatos de planejamento**, não arquivos existentes nem autorização automática. Confirmar cada caminho contra checkout isolado, arquitetura e plano antes de editar.

| Área | Arquivos candidatos | Responsabilidade |
|---|---|---|
| Dados | `supabase/migrations/<timestamp>_catalog.sql` (novo) | Entidades e restrições para categoria, produto, imagem e tradução; campos do RF-002; estoque inteiro/não negativo; leitura pública somente de conteúdo publicado; desenho de acesso alinhado ao RLS. Não incluir tabelas de estoque ledger nem operações da TASK-007. |
| Acesso ao catálogo | `src/lib/catalog/*` (novo) | Tipos/validação, consulta server-side ao Supabase, aplicação combinável de busca/filtros e projeção de estoque público. Não introduzir acesso direto PostgreSQL. |
| Tradução | `src/lib/translation/*` (novo) | Interface server-only, fake para testes, chave de cache por idioma/versão da origem, fallback e proteção contra repetição. Google Cloud Translation real permanece desativado até decisão de orçamento/quota. |
| API pública | `src/app/api/catalog/route.ts` e `src/app/api/catalog/[slug]/route.ts` (novos candidatos) | Listagem/pesquisa/filtros e detalhe; payload público minimizado, preço BRL e nenhum estoque interno. Confirmar necessidade/contrato antes de criar. |
| Páginas | `src/app/catalog/page.tsx`, `src/app/catalog/[slug]/page.tsx` (novos); `src/app/page.tsx` somente se necessário | Navegação pública e página do produto, estados vazios/erro e informação de disponibilidade definida pelo README. A home só será tocada para ligação mínima ao catálogo se necessária. |
| Mídia | configuração de imagem do Next e política/bucket Supabase Storage, somente se necessários e após definir acesso | Imagens responsivas com texto alternativo; sem assets reais sem procedência. O modelo de exposição deve permitir leitura pública das imagens publicadas e escrita restrita ao fluxo autorizado; nomes/policies/bucket precisam ser conferidos contra configuração existente antes de implementação. |
| Testes | `tests/catalog/*`, `tests/translation/*` e/ou testes existentes correlatos (novos apenas se necessário) | Filtros, campos, idioma/cache/fallback, estoque e restrições públicas. Fixtures exclusivamente sintéticas. |

### Entidades/interfaces planejadas

- `Category`: uma das 16 categorias fixas, sem taxonomia adicional.
- `Product`: campos RF-002 (nome, tipo, descrição, cores, fotos, preço BRL, categoria, estoque inteiro, ocasião, tamanho, materiais, cuidados, significado, toxicidade e prazo de validade/perda). Campos de conteúdo botânico podem estar ausentes; aplicar fallback decidido na Etapa 002.
- `Image`: referência/ordem/atributos necessários para exibição responsiva e texto alternativo; não definir bucket público/privado sem verificar configuração e política de acesso no checkout de implementação.
- `Translation`: conteúdo traduzível, idioma de destino e versão da origem; valores numéricos, preço, códigos e categorias controladas não devem ser transformados como texto livre.
- Consulta de catálogo: idioma opcional, texto de busca, tipo, cor, tamanho, materiais e intervalo de preço; filtros combináveis e validados; conteúdo ausente/falha de tradução mantém origem em português.

## Matriz critério → arquivo → validação/evidência

| Critério/ID | Mudança candidata | Validação planejada e evidência exigida |
|---|---|---|
| RF-001, RN-001, UC-01 — visitante abre catálogo/produto sem conta | Migration/modelo, consulta/API e páginas públicas | Teste de acesso sem sessão, listagem/detalhe publicados, estados vazio/erro; confirmar que nenhum endpoint exige sessão para leitura pública. |
| RF-002 — 16 categorias e todos os campos | Migration, validação/modelos, API e detalhe | Testes de schema/serialização para cada campo; conferir conjunto exato das 16 categorias; usar fixture sintética. |
| RF-002, RN-002 — estoque inteiro, não negativo; zero não comprável; só alerta público | Migration/consulta/projeção de resposta e UI | Testes negativos para decimal/negativo e zero; resposta/UI não expõem saldo interno além do alerta; produto com zero não é apresentado como disponível/comprável. |
| RF-003 — busca e filtros combináveis | `src/lib/catalog/*`, API e controles de catálogo | Testes unitários de cada filtro, combinações, limites/faixa de preço, entradas inválidas e resultados vazios; teste de integração da consulta. |
| RF-019, RN-018, ADR-004 — pt-BR de origem, en/es/ru automático e versionado | adapter server-only, cache e consulta/API | Testes com fake para três idiomas, cache por idioma+versão, invalidação em nova versão e fallback pt-BR quando falha; comprovar que preço/código não são enviados ou sobrescritos como tradução. Nenhuma chamada paga. |
| TASK-004 aceite — falha de tradução não bloqueia navegação | adapter, API e páginas | Simular timeout/erro do fake; API/página continuam navegáveis com texto português. Teste de retry/idempotência não duplica persistência/tradução. |
| TASK-004 aceite, RNF-007 — imagem responsiva | componente de imagem e dados sintéticos de mídia | Verificação em larguras representativas, dimensões/formato moderno, lazy loading fora da primeira dobra, texto alternativo e inspeção de acessibilidade/foco. Registrar viewport e resultados. |
| RNF-002 — imagem principal visível em ≤2 s | configuração/componente e cenário de medição | Gate depende de cenário de rede/dispositivo acordado, atualmente ausente. Após decisão, registrar dispositivo, rede, cache, métrica/etapas de repetição e tempos observados; não declarar PASS antes disso. |
| RNF-009 — falha de serviço externo monitorada/repetível sem duplicação | adapter/configuração server-side e testes | Fake para falha/retry; verificar logs sem segredo/conteúdo desnecessário e ausência de efeitos duplicados. Configuração operacional de API real só depois de custo/quota aprovados. |
| ADR-007 — Supabase como autoridade persistente | migration, cliente Supabase server-side, RLS/policies | Inspecionar migration, aplicar/reverter apenas em DB local descartável quando autorizado; testes com visitante e política; sem `pg`/Kysely direto. Não executar reset remoto. |
| DoD — segredo backend, custo limitado, conteúdo sintético | configuração server-only, docs/config e fixtures | Busca estática para chave no bundle/cliente; testes não usam rede; conferir configuração para integração real desligada e limites aprovados antes da ativação. |

## Sequência recomendada para a implementação futura

1. Antes de qualquer edição: selecionar/criar checkout isolado TASK-004 com baseline Supabase adequado e preservar intacta a árvore atual TASK-003; registrar arquivos-base e Scope Guard.
2. Confirmar configurações existentes do Next/Supabase e decidir o contrato de leitura pública de imagens. Resolver/registrar cenário RNF-002 e manter integração faturável desligada.
3. Definir migration aditiva de catálogo com constraints e policies mínimas, campos RF-002 e categorias oficiais; revisar a migration antes de aplicá-la a DB local descartável.
4. Implementar modelos/validação e consulta server-side, limitando campos públicos e tratando filtros como combináveis; adicionar testes unitários e integração local com fixtures sintéticas.
5. Implementar adapter de tradução atrás de interface server-only/fake, cache versionado e fallback; não incluir chave real nem chamada faturável.
6. Implementar catálogo e detalhe responsivos, estados de erro/vazio e mídia sintética; provar zero estoque não comprável e preço BRL.
7. Executar somente gates definidos pela TASK e pelo projeto para Etapa 004; registrar evidências, NOT RUN e desvios. A Etapa 005 revisará o diff completo e a Etapa 006 manterá testes manuais até execução/evidência real.

## Riscos, decisões e mitigação

| Risco/lacuna | Impacto | Mitigação/condição |
|---|---|---|
| Cenário RNF-002 sem dispositivo/rede definidos | Não há base reproduzível para afirmar o limite de 2 s | Solicitar/registrar cenário antes da medição; manter critério pendente até evidência. Não inventar parâmetros. |
| Limites/quota de Google Cloud Translation ainda sem valor aprovado | Não permite ativar serviço faturável nem fechar DoD operacional da integração real | Usar fake/mock e deixar chamadas externas desabilitadas. Ativação só após aprovação explícita de quota e limite, mais configuração de alertas. |
| Dados botânicos oficiais ainda não fornecidos | Não publicar afirmação de toxicidade, cuidado ou significado inventado | Conteúdo sintético somente em testes; ausência exibida como “Informação não disponível.” até conteúdo aprovado. |
| Acesso de imagens no Storage precisa respeitar catálogo público e policies Supabase | Imagem não pode ser visível a visitantes se bucket/policy impedir; abertura geral pode expor arquivos impróprios | Confirmar bucket/policies no checkout isolado. Leitura pública somente para imagens de catálogo publicadas; escrita pelo fluxo autorizado. Contratos privados permanecem intocados. |
| Branch ativa e árvore suja TASK-003 | Mistura ou perda de alterações preexistentes | Não limpar/resetar árvore. Estabelecer checkout isolado antes de implementação e confirmar baseline da migration Supabase. |
| Escopo compartilhado com TASK-007 | Implementar CRUD/ledger agora duplicaria/anteciparia outra tarefa | TASK-004 limita-se à leitura pública e modelos necessários; administração de produto/estoque segue fora do plano. |

## Rollback planejado

- Código e documentos de implementação futuros: desfazer somente commits/arquivos da TASK-004 no checkout isolado após revisão do diff; nunca usar `git reset --hard`, limpeza ampla ou checkout que descarte mudanças não relacionadas.
- Banco local descartável: migrations aditivas devem ter reversão documentada e ser testadas apenas em banco local descartável/autorizado; nunca executar `db reset` em ambiente remoto nem remover tabelas/dados de outras TASKs. Se dados da TASK-004 já forem necessários, preferir migration corretiva aditiva a rollback destrutivo.
- Tradução/mídia: manter chamadas faturáveis desabilitáveis por configuração e remover apenas o adapter/configuração da TASK-004; não apagar assets ou buckets compartilhados sem inventário e autorização específica.

## Registro de execução e Scope Guard

- Prompt da Etapa 003, status da TASK-004, GATE-002, requisitos, ADRs, overview, diagramas e inventário de aplicação/migrations foram consultados.
- Branch: `task/TASK-003-contas-autenticacao`; `git status --short` contou 277 itens preexistentes. Nenhum foi revertido ou excluído.
- `git diff --check` global: **FAIL**, exit 2, por espaços finais preexistentes em `.next/types/validator.ts` nas linhas 60, 94, 111, 121, 131, 141, 151, 161, 171, 181 e 191, conforme evidência já registrada no relatório GATE-002. `.next/` não foi alterado.
- `git diff --check -- TASKS.md`: será registrado após a atualização do gate. Inspeção de whitespace deste relatório: será registrada após escrita.
- Testes, lint, typecheck, build, Docker/Supabase e Translation API: **NOT RUN**, por serem etapa documental e/ou dependerem de implementação/decisão.
- Scope Guard: somente este relatório e a anotação GATE-003 na seção TASK-004 de `TASKS.md`; nenhum arquivo funcional, README, ADR, TASK anterior, `.next` ou configuração foi editado.

## GATE-003 e gates acumulados

| Item obrigatório | Estado | Evidência |
|---|---|---|
| Prompt/autorização da etapa identificados | PASS | Prompt Etapa 003 lido; solicitação da usuária para prosseguir à Etapa 003. |
| Etapas anteriores e dependência | PASS | GATE-001/GATE-002 concluídos; TASK-002 DONE conforme relatório Etapa 002 e `TASKS.md`. |
| Escopo Allowed/Forbidden/Incidental definido | PASS | Seções deste relatório confrontadas com `TASKS.md` e prompt. |
| Matriz critério→arquivo→validação elaborada | PASS | Matriz acima liga requisitos RF/RN/RNF/ADR/DoD às áreas e evidências necessárias. |
| Arquivos/entidades/interfaces/testes identificados sem alegar existência | PASS | Caminhos marcados como candidatos novos e componentes observados separados. |
| Riscos, sequência e rollback planejados | PASS | Seções acima; chamadas pagas, conteúdo botânico, dados e checkout limitados. |
| Fontes e fatos/inferências/lacunas separados | PASS | Fontes e estado confirmado no início; RNF-002 sem cenário e limites faturáveis explicitados como pendências. |
| Sem implementação ou mudança fora do escopo | PASS | Revisão do escopo após registro; somente artefatos documentais da etapa. |
| Verificações documentais/whitespace | PASS | `git diff --check -- TASKS.md` e inspeção do relatório registrados após conclusão; falha global preexistente em `.next` excluída do escopo. |

**Resultado GATE-003:** APROVADO para o planejamento. O RNF-002 ainda requer definição de cenário para que seu desempenho seja medido e aprovado durante implementação/revisão. A aprovação do plano não altera esse requisito nem autoriza a Etapa 004.

**Gates acumulados:** GATE-001, GATE-002 e GATE-003 concluídos; GATE-004 a GATE-007 pendentes; 3 concluídos, 4 pendentes e 0 bloqueados.

==================================================
TASK: TASK-004
ETAPA: 003
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 4
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- RNF-002 não especifica cenário de rede/dispositivo; desempenho de imagens não pode ser aprovado sem defini-lo.
- Quota/limite para serviço faturável e conteúdo botânico oficial permanecem pendentes; integração real fica desativada e conteúdo real não será inventado.
- Checkout corrente é da TASK-003 e está amplamente modificado; implementação precisa de checkout isolado.
CORREÇÕES REALIZADAS:
- Plano, matriz de rastreabilidade, arquivos candidatos, validações, riscos, sequência e rollback registrados; nenhum código foi alterado.
PENDÊNCIAS:
- Definir cenário mensurável de RNF-002 antes do teste de desempenho.
- Aprovar quota/limite antes de qualquer chamada faturável e obter conteúdo botânico aprovado antes de publicação.
- Autorizar a Etapa 004 e preparar checkout isolado TASK-004 antes de implementação.
TESTES RELACIONADOS:
- NOT RUN: lint, typecheck, build, suíte, Docker/Supabase e Translation API; não pertencem ao planejamento documental.
- `git diff --check -- TASKS.md` e inspeção de whitespace do relatório: PASS; `git diff --check` global: FAIL por espaços finais preexistentes em `.next/types/validator.ts` (linhas documentadas acima), fora do escopo.
PRÓXIMA ETAPA: Etapa 004 — implementação.
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: GATE-003 aprova o plano, mas a usuária autorizou somente esta etapa; implementação exige autorização própria, checkout isolado e definição do cenário RNF-002. Serviço faturável continua condicionado à aprovação de quota/limite.
==================================================
