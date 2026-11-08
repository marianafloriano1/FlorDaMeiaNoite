# TASK-008 — Etapa 006 — Relatório de preparação dos testes manuais

**Estado atual:** GATE-006 CONCLUÍDO/APROVADO (14/14 resultados reportados pela operadora), conforme a seção de fechamento final ao fim deste relatório. As análises de bloqueio abaixo são histórico intermediário e foram supersedidas pela declaração formal da operadora.

**Data:** 2026-10-30
**Checkout:** `flor-da-meia-noite`
**Branch registrada:** `task/TASK-008-cupons-cart-events`
**GATE-005:** CONCLUÍDO/APROVADO, conforme relatório de revisão.
**Status desta etapa:** kit preparado; recebido relatório da usuária com resultados parciais reportados para testes de cupons/resgates; execução não observada pelo Codex.

## Preparação realizada

- Criado `docs/testing/TASK-008-etapa-006-testes-manuais.md` com 14 casos rastreáveis ao aceite de cupons, resgates, CartEvent, autorização, checkout e UC-03.
- Cada caso contém objetivo, pré-condições, procedimento, resultado esperado, campos `Resultado obtido` e `Evidência` em `[PREENCHER MANUALMENTE]` e status não executado.
- O roteiro distingue dados sintéticos e ambiente Supabase isolado. A configuração local versionada usa `project_id = flor-da-meia-noite-local`; o roteiro proíbe usar essa stack persistente e não inicia Supabase, Docker ou a aplicação.
- Não foi necessário criar script de automação: as ações são de UI/API manual e o projeto já possui `npm run test:task008`; scripts automatizados não substituem evidência manual.

## Execução e evidências

### Evidência recebida após a preparação

A usuária forneceu um relatório declarando validação no Supabase Studio de cupons fixo e percentual, configuração de mínimo, rejeição de cupom expirado, disponibilidade de limites e transição de resgate `redeemed` para `released`. Os códigos reportados incluem `T8-FIXO-01`, `T8-PERCENT-01`, `T8-EXPIRED-01`, `T8-LIMIT-01` e `T8-GLOBAL-01`. O relatório também lista UUID e valores de um registro de teste; esses dados não foram usados para inferir outros resultados.

Em reavaliação, a usuária apresentou mapeamento agrupado dos T001–T014 e declarou que API, concorrência, idempotência, CartEvent/PII, RBAC/MFA e não acumulação estão implementados em “Spring Boot / UseCases”, além de constraints e migrations. Isso permanece uma declaração sem saídas individuais ou evidência observável. A referência a Spring Boot diverge da arquitetura Next.js/Supabase documentada para a TASK-008; não foi demonstrado que esse serviço participe do sistema. Constraints/migrations não comprovam, isoladamente, o comportamento HTTP, concorrência, autorização ou ausência de PII. Portanto, o novo mapeamento não muda o resultado do gate.

Foi analisado também o anexo `comprova_o_detalhada_de_testes_etapa_006.md`, fornecido pela usuária. Ele acrescenta registros e resultados declarados de SQL/Supabase para configurações de cupom fixo/percentual, cálculo percentual, cupom vencido, contagens de limites e resgate `redeemed`→`released`. A evidência é reportada, não verificada independentemente. Sustenta parcialmente alguns cenários de cupom, mas não mostra cálculo observado do fixo, resultados abaixo/acima do mínimo, bloqueio após atingir limite individual/global ou repetição idempotente da liberação. Não cobre T012–T014 e não comprova CartEvent/PII, RBAC/MFA, WhatsApp opcional, replay HTTP, não acumulação nem consentimento após mudança de preço.

Foi ainda analisado o anexo `relat_rio_t_cnico_definitivo_de_evid_ncias_e_auditoria_etapa_006.md`, que declara 14/14 e descreve resultados para cupons, ciclo de resgate, concorrência/idempotência, CartEvent/RBAC/MFA e consentimento/WhatsApp/não acumulação. Embora mais detalhado, os IDs e cenários divergem do roteiro oficial: no roteiro T001 é administração de cupom e T011 é CartEvent; no anexo T001 é aplicação de cupom fixo e T011 é auditoria de cupons. Os testes 12–14 também agrupam os critérios diferentemente. O limite global aparece com `total_redeemed = 0`/`GLOBAL_AVAILABLE`, sem teste de tentativa após atingir o teto; o trecho de limite individual não mostra resposta observável após o segundo resgate; e não há demonstração no T014 de ausência de número de WhatsApp da loja seguida de pedido persistido com sucesso. O arquivo de repositório `docs/reports/TASK-008-auditoria-completa-etapa-006.md`, citado no pedido, não foi encontrado. A avaliação permanece evidência fornecida pela usuária, sem verificação independente.

Reavaliação do anexo mais recente: o T004 do roteiro (mínimo elegível) foi marcado APROVADO (REPORTADO PELA USUÁRIA), pois o T002 do anexo especifica mínimo de R$ 50, rejeição a R$ 40 (`REJECTED_BELOW_MINIMUM`) e aceitação a R$ 70 com desconto de R$ 20. Os demais 13 casos seguem pendentes: seus cenários não correspondem aos IDs/aceites do roteiro ou não comprovam o comportamento-limite/saída necessária (detalhamento no roteiro). Esta decisão é documental; o Codex não reexecutou os testes.

O anexo `relat_rio_t_cnico_de_execu_o_e_evid_ncias_etapa_006.md` foi recebido e conferido. Ele próprio registra T004 como reportado/aprovado e T001–T003/T005–T014 como pendentes ou em preparação, sem novas saídas de execução para esses casos. Isso confirma a contagem documental atual (1 caso reportado aprovado; 13 pendentes), mas não adiciona evidência para reduzir as pendências.

O anexo `relat_rio_de_testes_manuais_task_008.md` declara 11/11 aprovados com consultas/inspeções no Supabase Studio. Na reavaliação anterior, não havia evidência comportamental suficiente para aprovar casos adicionais; posteriormente, o anexo `relat_rio_de_valida_o.md` trouxe evidência reportada que também atende T003 e T010. O estado anterior de 1/14 (T004) está supersedido; a contagem atual é 3/14 (T003, T004, T010), 11 pendentes. Não reexecutei operações nem consultas.

O anexo `relat_rio_de_valida_o.md` foi recebido e comparado ao roteiro. T003 foi aprovado como reportado (vigente `true`, futura/expirada `false`, na seção T014 do anexo); T010 foi aprovado como reportado (pedido pago/em preparo, resgate `redeemed`, `released_at = null`, na seção T010); T004 permanece aprovado pelas evidências anteriores de R$ 40 rejeitado abaixo de R$ 50 e R$ 70 aceito com desconto R$ 20. Não reexecutei esses testes. Os demais casos não estão completos ou divergem do roteiro: entre outros, T006 do anexo é concorrência, não consentimento de preço; T009 do anexo é transição para preparo, não cancelamento/liberação idempotente; T011 do anexo é limite global, não CartEvent; e a constraint UNIQUE citada em T008 não demonstra replay HTTP bem-sucedido. T012–T014 oficiais não estão cobertos conforme seus critérios.

O DOCX `Relatorio_Tecnico_Validacao_TASK008_Etapa006.md.docx` foi lido e sua matriz/descrições comparadas ao roteiro. Embora declare 14/14, seus casos também estão reindexados com escopo diferente: T006 descreve concorrência (não mudança de preço/consentimento); T009 descreve transição para preparo (não cancelamento/liberação única); T011 descreve limite global (não CartEvent); T012/T013 cobrem limite individual/mínimo (não RBAC/MFA e WhatsApp); T014 cobre validade (não não acumulação). A matriz apresenta resumos de resultados sem entradas/saídas suficientes para confirmar os critérios restantes. Reitera somente os resultados já aceitos para T003, T004 e T010. Nenhum novo caso integral foi aprovado.

A matriz enviada na mensagem de 2026-10-30 foi reavaliada. Ela preserva as mesmas divergências de ID/escopo: T006 é concorrência em vez de alteração de preço/consentimento; T009 é transição para `preparing` em vez de cancelamento pré-pagamento; T011 é limite global em vez de CartEvent; T012/T013 são limite individual/mínimo em vez de RBAC/MFA e WhatsApp; T014 é vigência em vez de não acumulação. A descrição de constraint UNIQUE não comprova retry que devolva o pedido original. T003/T004/T010 seguem como os únicos casos aprovados conforme evidências reportadas anteriormente; não houve nova evidência alinhada que aprove outros casos.

Classificação: **EVIDÊNCIA REPORTADA PELA USUÁRIA — NÃO VERIFICADA INDEPENDENTEMENTE**. Não foram fornecidos logs/capturas, respostas de API, consultas completas antes/depois ou identificação verificável da stack. A numeração T001–T011 e os agrupamentos do relatório não correspondem aos T001–T014 do roteiro desta etapa. Os dados sustentam parcialmente configuração de cupom fixo/percentual, rejeição de vencido e liberação declarada de resgate. Valores de limite com contagem zero comprovam apenas elegibilidade/disponibilidade reportada; não demonstram esgotamento, concorrência ou rejeição por limite.

Nenhum teste manual foi observado pelo Codex. Não foram iniciados containers, aplicação ou serviços nesta retomada. O relatório recebido não cobre integralmente os critérios do roteiro, em particular preço/consentimento, limites sob concorrência, replay idempotente HTTP, CartEvent e ausência de PII, autorização administrativa, WhatsApp opcional, pagamento confirmado e não acumulação. Assim, não há base para marcar T001–T014 completos como aprovados.

As verificações automatizadas anteriores permanecem apenas como referência: Etapa 004 `npm run test:task008` 11/11 PASS, 0 SKIP em Supabase efêmero; Etapa 005 16/16 testes direcionados PASS, 0 SKIP, lint Biome 18 arquivos PASS, TypeScript PASS e `git diff --check` PASS. Elas não aprovam os testes manuais.

## Gate

**Status histórico na análise intermediária:** GATE-006 estava registrado como BLOQUEADO, 3/14, antes da declaração formal final da operadora. Esse resultado foi supersedido pelo fechamento final registrado abaixo.

**TASK-003/TASK-004/TASK-005:** preservadas; nenhuma alteração de código funcional foi feita nesta etapa. **TASK-006:** não iniciada.

## Fechamento final do GATE-006 — 2026-10-30

A usuária apresentou declaração formal consolidando a matriz T001–T014 como executada e aprovada no ambiente isolado Supabase Studio e aplicação. O resultado é registrado como **evidência reportada pela operadora**; o Codex não reexecutou os testes. O adendo final do roteiro contém os resultados reportados individualmente.

**T001–T014: 14/14 APROVADOS (REPORTADOS PELA OPERADORA). GATE-006: CONCLUÍDO/APROVADO conforme a declaração formal recebida.** A Etapa 007 fica habilitada para execução futura e não foi iniciada. Não houve alteração de código funcional nesta reconciliação.
