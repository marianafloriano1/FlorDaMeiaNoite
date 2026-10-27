# TASK-004 — Etapa 002 — Pré-condições e decisões

## Reavaliação final autorizada — 2026-10-25

**Estado anterior:** GATE-002 BLOQUEADO após a análise inicial abaixo.
**Estado final:** GATE-002 CONCLUÍDO; TASK-004 READY para iniciar somente a Etapa 003 — Planejamento.

### Decisões registradas

- **Tradução:** não ativar tradução faturável nesta etapa; nenhuma API key real, cobrança ou chamada externa. Desenvolvimento/testes usarão mock/fake e dados sintéticos; português (`pt-BR`) é origem/fallback. Ativação faturável futura depende de aprovação explícita de quota e limite de custo; não foi inventado nenhum valor.
- **Taxonomia:** a taxonomia oficial continua sendo exatamente a lista de 16 categorias do RF-002 em `README.md`: Buquês, Arranjos, Boxes, Embalagens, Laços, Vasos, Ornamentos, Flores, Plantas, Fertilizantes, Terras, Sementes, Ferramentas de jardinagem, Decorações, Pedras e Insumos. Não adicionar nem renomear categoria nem criar listas de ocasião/tipo nesta etapa.
- **Conteúdo botânico:** usar somente material sintético/mock para teste; não inventar toxicidade, propriedades medicinais, cuidados ou significados. Para informação ausente, usar “Informação não disponível.” em português; isso não bloqueia a navegação. Conteúdo real depende de fonte aprovada pela loja.
- **Checkout:** “Alterações existentes da TASK-003 não serão modificadas nesta etapa. A TASK-004 não assumirá nem alterará o checkout existente. O checkout permanece fora do escopo da Etapa 002.” Carrinho, favoritos, reserva e checkout ficam nas TASKs responsáveis conforme `TASKS.md`. A inspeção não encontrou implementação de catálogo nem código de checkout da TASK-004.

### DoR revalidado para início do planejamento

| Critério | Estado | Evidência |
|---|---|---|
| Dependências | PASS | TASK-004 depende de TASK-002, que está DONE. TASK-003 não é dependência declarada. |
| Rastreabilidade | PASS | RF-001/002/003/019, RN-001/002/018, RNF-002/007/009, UC-01 e ADR-004 existem; ADR-007 define a persistência Supabase. |
| Critérios testáveis e escopo | PASS para Etapa 003 | README/TASKS definem campos, categorias, filtros, tradução/fallback e restrições. O planejamento poderá mapear pendências sem inventar requisitos. |
| Ambiente e validações | PASS para Etapa 003 | A etapa é documental; mock e dados sintéticos não exigem chave nem serviço. Nenhum teste de implementação é necessário para planejar. |
| Decisões externas essenciais | PASS para Etapa 003 | Provedor já consta no ADR-004; chamadas faturáveis são explicitamente adiadas até aprovação futura de limites. |
| Checkout/working tree | PASS para Etapa 003 | O checkout corrente permanece intocado no escopo funcional; etapa documental não altera arquivos TASK-003. Checkout isolado será exigido antes de implementação. |

**Conclusão:** DoR **APROVADO para planejamento**. A aprovação habilita somente GATE-003; não autoriza implementação, integração faturável, alteração do checkout ou mudanças em TASK-001/002/003 e etapas anteriores.

**Gates acumulados:** GATE-001 e GATE-002 concluídos; GATE-003 a GATE-007 pendentes; 2 concluídos, 5 pendentes, 0 bloqueados.

**Arquivos alterados nesta reavaliação:** este relatório e somente a seção TASK-004 de `TASKS.md`. Nenhum arquivo de TASK-003 foi modificado nesta operação.

### Validações desta reavaliação

- `git diff --check` (repositório): FAIL, exit 2, por espaços finais em `.next/types/validator.ts` nas linhas 60, 94, 111, 121, 131, 141, 151, 161, 171, 181 e 191. Esses artefatos já estavam modificados antes desta etapa e permaneceram intactos.
- `git diff --check -- TASKS.md`: PASS, exit 0.
- Relatório desta etapa: inspeção de whitespace PASS; sem espaços finais.
- Revisão de escopo: apenas `TASKS.md` na seção TASK-004 e este relatório foram atualizados nesta operação. Nenhum arquivo de implementação ou de TASK-003 foi alterado; nenhuma alteração preexistente foi descartada.
- Testes funcionais, lint, typecheck, build, Docker/Supabase e integração externa: NOT RUN.

---

## Registro da avaliação inicial bloqueada (histórico; substituído pela reavaliação acima)

**Data:** 2026-10-25
**TASK:** TASK-004 — Catálogo, mídia, busca e traduções
**Branch observada:** `task/TASK-003-contas-autenticacao`
**Status da TASK:** BLOCKED
**GATE-001:** CONCLUÍDO — `docs/reports/TASK-004-etapa-001-recontextualizacao.md`
**GATE-002:** BLOQUEADO — pré-condições obrigatórias ainda não estão resolvidas.

## Checklist de pré-condições e DoR

| Item | Estado | Evidência/observação |
|---|---|---|
| Autorização e seleção da TASK/etapa | PASS | Solicitação explícita para executar Etapa 002 da TASK-004. Esta autorização não inclui implementação ou serviço pago. |
| Etapa anterior | PASS | GATE-001 aprovado e registrado em `docs/reports/TASK-004-etapa-001-recontextualizacao.md`. |
| Dependências | PASS | TASK-004 declara dependência apenas de TASK-002; TASK-002 consta DONE em `TASKS.md`. TASK-003 também consta DONE, mas não é dependência declarada. |
| Rastreabilidade | PASS | RF-001/002/003/019; RN-001/002/018; RNF-002/007/009; UC-01 e ADR-004 estão presentes nos documentos consultados. ADR-007 define a persistência Supabase. |
| Critérios e escopo | PASS | `TASKS.md`, README e ADR-004 delimitam campos, filtros, idiomas, fallback, cache, segurança da API key e mudanças proibidas. |
| Decisão de provedor de tradução | PASS | ADR-004 aceita Google Cloud Translation pelo backend, com cache e fallback. Nenhum provedor alternativo foi escolhido. |
| Limite/controle de custo da tradução | BLOCKED | O DoD requer limites configurados e ADR-004 exige quotas/alertas. Não há valor aprovado nem configuração correspondente no `.env.example`/`package.json`; .env.local foi conferido apenas quanto a nomes de variáveis, sem ler valores, e não contém nome de variável relacionado à tradução. Nenhum serviço foi chamado. |
| Pendências de produto que afetam conteúdo/categorias | BLOCKED | README seção 11, item 7, mantém pendente a taxonomia de ocasião/tipo e a tradução de toxicidade/cuidados; determina que conteúdo botânico seja fornecido pela loja. Não há decisão sobre comportamento de catálogo enquanto esse conteúdo não estiver disponível. |
| Ambiente e validações | BLOCKED | Não foram encontrados módulos/testes de catálogo. O working tree tem 276 entradas modificadas ou não rastreadas, e a branch ativa é da TASK-003; não existe contexto limpo/isolado TASK-004 observado. Fazer implementação agora misturaria trabalho não consolidado. Nenhuma limpeza ou troca de branch foi feita. |
| Dados sintéticos | PENDENTE para implementação | A política exige conteúdo sintético; ainda não há fixture de catálogo definida. Dados reais e alegações botânicas não serão inventados. |

**Resultado DoR:** NÃO SATISFEITO. Embora dependência, autorização para esta etapa, rastreabilidade e critérios gerais estejam confirmados, as decisões de conteúdo/categoria e orçamento/limites são necessárias para concluir o escopo/DoD; o contexto de trabalho também precisa ser isolado sem descartar as mudanças existentes.

## Decisão necessária — bloqueios e alternativas

### 1. Limite de custo e ativação de tradução

- **Problema/impacto:** tradução automática chama um serviço externo potencialmente faturável; sem quotas/limites definidos não é possível satisfazer o DoD nem habilitar chamadas reais.
- **Por que está bloqueado:** `AGENTS.md` exige orçamento/limites antes de ativar consumo faturável; `README.md` e ADR-004 exigem controle, mas não especificam valores.
- **Mudança/decisão necessária:** aprovar um teto e quotas para o projeto de teste e decidir quando chamadas reais podem ser ativadas.
- **Arquivos potenciais:** `.env.example`, configuração/adapter server-side de tradução, testes e documentação de custo. Nenhum foi alterado nesta etapa.
- **Alternativas:** (a) não chamar API faturável e desenvolver/testar contra fake até a aprovação de limites; (b) aprovar limites/alertas antes de configurar a integração real.
- **Recomendação:** alternativa (a) durante implementação e testes sintéticos; só habilitar chamadas externas depois da aprovação explícita dos limites.
- **Estado:** `DECISÃO NECESSÁRIA`; nenhum gasto autorizado ou realizado.

### 2. Taxonomia e conteúdo botânico

- **Problema/impacto:** os campos de ocasião/tipo e a tradução de toxicidade/cuidados aparecem como pendência; conteúdo de toxicidade/cuidados não pode ser criado por inferência.
- **Por que está bloqueado:** README seção 11, item 7, deixa o ajuste pendente e requer conteúdo da loja.
- **Decisão necessária:** fornecer/aprovar as categorias de ocasião/tipo e conteúdo botânico, ou aprovar explicitamente o comportamento para registros sem esses dados (por exemplo, omissão/fallback português). Não assumir obrigatoriedade, nulabilidade ou texto substituto.
- **Arquivos potenciais:** README/ADR se houver mudança de requisito, modelo de dados, validação/formulário, adapter e testes; nenhum foi alterado nesta etapa.
- **Alternativas:** aguardar conteúdo oficial da loja; ou aprovar formalmente que esses campos fiquem ausentes/fallback até a fonte oficial ser fornecida.
- **Recomendação:** aguardar conteúdo de origem e usar somente texto sintético neutro em testes.
- **Estado:** `DECISÃO NECESSÁRIA` para concluir o aceite integral da TASK-004.

### 3. Checkout isolado da TASK-004

- **Problema/impacto:** checkout atual está na branch `task/TASK-003-contas-autenticacao`, com 276 entradas modificadas/não rastreadas. A separação prevista por `AGENTS.md` não pode ser garantida editando neste estado.
- **Mudança necessária:** estabelecer um checkout/branch TASK-004 cujo baseline inclua a fundação Supabase necessária e não carregue mudanças sem revisão da TASK-003.
- **Alternativas:** consolidar/autorizadamente registrar a TASK-003 antes de derivar TASK-004; ou solicitar um checkout isolado com baseline explicitamente escolhido após analisar os arquivos necessários.
- **Recomendação:** preservar o working tree atual integralmente e escolher o baseline/estratégia de isolamento antes de qualquer implementação.
- **Estado:** BLOQUEADO operacionalmente; não houve criação de branch, commit, limpeza ou cópia de arquivos.

## Operações e testes

- Lidos: roteiro da Etapa 002, `TASKS.md`/seção TASK-004, relatório GATE-001, `README.md`, `docs/adr/ADR-004-internacionalizacao.md`, `docs/adr/ADR-007-supabase-como-plataforma-de-dados.md`, `AGENTS.md` e configuração de ambiente apenas por nomes.
- `git branch --show-current`: `task/TASK-003-contas-autenticacao`.
- `git status --porcelain`: 276 entradas modificadas/não rastreadas.
- `.env.local` existe; os valores não foram lidos. Nenhum nome de variável relacionada a tradução foi encontrado.
- Testes, lint, typecheck, build, Docker/Supabase, rede e chamada Google Cloud Translation: **NOT RUN**. Nenhuma dependência foi instalada.
- Alterações nesta etapa: este relatório e a anotação do GATE-002 na seção TASK-004 de `TASKS.md`; sem código ou configuração operacional.

## Resultado

GATE-002 fica BLOQUEADO por decisões de custo e conteúdo, além do checkout sem isolamento. A TASK-004 mantém status BLOCKED; não está autorizada/pronta para implementação. GATE-001 continua concluído; GATE-003 a GATE-007 continuam pendentes. Não se inicia a próxima etapa automaticamente.

==================================================
TASK: TASK-004
ETAPA: 002
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: CONCLUÍDO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 2
GATES PENDENTES: 5
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Limite financeiro permanece sem valor aprovado; por isso, tradução faturável segue desativada até aprovação futura.
CORREÇÕES REALIZADAS:
- Regras documentais de não ativação faturável, taxonomia existente, fallback neutro e escopo do checkout registradas; nenhuma alteração de produto.
PENDÊNCIAS:
- Aprovar quota/limite antes de ativar chamadas faturáveis; obter fonte aprovada antes de publicar conteúdo botânico real; escolher checkout isolado antes da implementação.
TESTES RELACIONADOS:
- NOT RUN: lint, typecheck, build, suíte, Docker/Supabase e API externa.
PRÓXIMA ETAPA: Etapa 003 — planejamento.
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: DoR aprovado para planejamento documental; nenhuma implementação ou serviço faturável foi autorizado.
==================================================
