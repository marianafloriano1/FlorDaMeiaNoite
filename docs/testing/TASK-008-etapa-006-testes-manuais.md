# TASK-008 — Roteiro de testes manuais — Etapa 006

**Data de preparação:** 2026-10-30
**Checkout:** `flor-da-meia-noite`
**Branch registrada:** `task/TASK-008-cupons-cart-events`
**HEAD base registrado:** `356ab80`
**Status:** roteiro preparado; nenhum teste manual executado nesta etapa.
**GATE-006:** AGUARDANDO EVIDÊNCIAS MANUAIS.

## 1. Objetivo e rastreabilidade

Validar manualmente as regras aprovadas de cupom (RF-015/RN-006), captura CartEvent (RF-018/RN-017), autorização administrativa e integração opcional com o checkout (UC-03). A TASK-008 registra eventos; agregação e exportação pertencem à TASK-011.

Este roteiro é para uso exclusivo com dados sintéticos em ambiente isolado. Resultados e evidências permanecem `[PREENCHER MANUALMENTE]` até a operadora executar cada caso. Testes automatizados não substituem esses resultados.

## 2. Segurança e preparação do ambiente

1. Use uma aplicação local conectada a uma stack Supabase descartável e isolada para teste da TASK-008. Confirme o projeto/porta antes de iniciar. **Não use** o projeto `flor-da-meia-noite-local`, produção, homologação compartilhada ou contas/dados reais.
2. A configuração versionada de `supabase/config.toml` aponta para `project_id = "flor-da-meia-noite-local"`; portanto, não execute `npm run supabase:start` no checkout padrão para estes testes. Se não houver stack isolada já preparada, marque os casos que dependem do banco como BLOQUEADO e solicite preparação própria; não tente trocar de ambiente.
3. Confirme que a stack isolada recebeu as migrations do repositório, incluindo `202610290002_task008_coupons_cart_events.sql`. Não aplique migrations em banco persistente.
4. Use apenas contas sintéticas separadas: `admin`, `employee` e dois clientes de teste. E-mails podem usar o domínio reservado `.invalid`. Use produtos sintéticos/publicados e valores de teste; não use PII.
5. Para iniciar a aplicação, configure `.env.local` com URL e chaves **da stack isolada** conforme `.env.example`; mantenha service role apenas no servidor, nunca em navegador, screenshot, comando salvo ou relatório. O WhatsApp deve permanecer sem número oficial e nenhum link deve ser enviado.
6. Com a aplicação configurada para a stack isolada, inicie `npm run dev` no diretório do projeto e abra `http://localhost:3000`. No PowerShell use a sessão local; no WSL/Linux use o shell equivalente. Não copie valores de chaves para este roteiro.
7. Se executar `npm run test:task008`, confirme saída TAP com `# skipped 0`; sem as variáveis `TASK008_TEST_SUPABASE_URL`, `TASK008_TEST_SUPABASE_ANON_KEY` e `TASK008_TEST_SUPABASE_SERVICE_ROLE_KEY`, o teste integrado pode ser ignorado e o resultado não aprova a integração.
8. Antes de cada caso, anote os IDs sintéticos de cliente, produto, cupom/cotação/reserva/pedido necessários, sem incluir e-mail ou qualquer outro dado pessoal. Para inspeção no SQL Editor, use somente a stack isolada e consultas `SELECT` nas tabelas de teste.

### Dados sintéticos sugeridos

- Produtos publicados com preço e categorias existentes no catálogo de teste; inclua dois produtos de categorias distintas e um produto de baixo subtotal.
- Campanhas com datas claramente no passado, no futuro e em vigência; códigos exclusivos como `T8-PCT-01` e `T8-FIX-01`.
- Dois clientes sintéticos para limite global/concor­rência e um administrador sintético com MFA local configurado.
- Nunca reutilize cupons, reservas ou pedidos reais. Registre os IDs técnicos em notas locais protegidas, não em screenshots públicos.

## 3. Testes manuais

### T001 — Criar, editar e desativar cupom percentual

**Objetivo:** confirmar administração exclusiva por admin e normalização/edição do código.
**Pré-condições:** stack isolada; sessão admin com MFA recente; produto/categoria sintéticos.
**Procedimento:** abra `/admin/coupons`; crie campanha percentual vigente com código em minúsculas; confirme sua exibição normalizada em maiúsculas; edite o código/valor; desative e depois reative a campanha.
**Resultado esperado:** operações aceitas pelo admin, persistidas e visíveis na lista; não-admin não pode executar essas mutações.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T002 — Cupom de valor fixo, arredondamento e limite do desconto

**Objetivo:** verificar desconto fixo em BRL, arredondamento a duas casas e limite ao subtotal elegível.
**Pré-condições:** produto sintético com preço conhecido e campanha fixa vigente.
**Procedimento:** crie cupom fixo para subtotal com centavos; faça uma cotação; repita com desconto fixo maior que o subtotal elegível.
**Resultado esperado:** desconto/total calculados no servidor com duas casas; desconto nunca excede subtotal elegível nem produz total negativo.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T003 — Janela de validade

**Objetivo:** validar início e fim da campanha.
**Pré-condições:** três campanhas sintéticas: uma futura, uma expirada e uma vigente.
**Procedimento:** tente cotar cada código pelo fluxo do carrinho.
**Resultado esperado:** campanhas futura e expirada são rejeitadas; campanha vigente pode ser cotada. Nenhuma falha bloqueia a navegação fora do fluxo de aplicação do cupom.
**Resultado obtido:** Conforme relatório fornecido pela usuária, as campanhas futura e expirada foram avaliadas como não vigentes, e `T8-FIXO-01` vigente como `true`. Evidência reportada; não reexecutada pelo Codex.
**Evidência:** `relat_rio_de_valida_o.md`, seção T014 (arquivo fornecido pela usuária).
**Status:** [ ] NÃO EXECUTADO [x] APROVADO (REPORTADO PELA USUÁRIA) [ ] REPROVADO [ ] BLOQUEADO

### T004 — Mínimo elegível por campanha

**Objetivo:** validar mínimo opcional sobre itens elegíveis.
**Pré-condições:** campanha com mínimo sintético e produtos/carrinho abaixo e acima do mínimo.
**Procedimento:** faça uma cotação abaixo do mínimo e outra acima dele.
**Resultado esperado:** abaixo do mínimo o código é recusado sem pedido/resgate; acima, o desconto é calculado apenas sobre os itens elegíveis.
**Resultado obtido:** Conforme relatório técnico fornecido pela usuária, `T8-FIXO-01` com mínimo R$ 50,00 foi rejeitado para subtotal R$ 40,00 (`REJECTED_BELOW_MINIMUM`) e aceito para subtotal R$ 70,00 com desconto de R$ 20,00. Evidência reportada; não reexecutada pelo Codex.
**Evidência:** `relat_rio_t_cnico_de_auditoria_oficial_etapa_006.md`, seção T002, e `relat_rio_t_cnico_de_execu_o_e_evid_ncias_etapa_006.md`, seção T004 (arquivos fornecidos pela usuária).
**Status:** [ ] NÃO EXECUTADO [x] APROVADO (REPORTADO PELA USUÁRIA) [ ] REPROVADO [ ] BLOQUEADO

### T005 — Escopo por categoria e produto

**Objetivo:** confirmar restrições por categoria/produto e escopo padrão geral.
**Pré-condições:** dois produtos sintéticos de categorias distintas; campanha geral, campanha restrita a categoria e campanha restrita a produto.
**Procedimento:** faça cotações com itens elegíveis e não elegíveis, isolados e mistos. Para produto específico, use a API administrativa autenticada de teste se o formulário não oferecer o campo; não use service role no cliente.
**Resultado esperado:** o desconto alcança apenas os itens elegíveis; sem restrições, aplica-se ao catálogo inteiro.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T006 — Preço autoritativo e consentimento após alteração

**Objetivo:** verificar recálculo no servidor se o preço mudar entre cotação e commit.
**Pré-condições:** reserva/cotação sintéticas e acesso admin de teste para alterar preço do produto isolado.
**Procedimento:** gere cotação; altere o preço do produto antes da confirmação; tente confirmar o valor antigo; revise a nova cotação e só então confirme explicitamente o total atualizado.
**Resultado esperado:** commit com preço antigo retorna conflito `order_quote_changed`, não deixa pedido/resgate parcial e força nova revisão/consentimento; a confirmação posterior usa o total autoritativo novo.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T007 — Limite global/por cliente e concorrência no último uso

**Objetivo:** validar limites de campanha sob concorrência.
**Pré-condições:** cupom sintético com último uso global disponível; dois clientes e duas cotações distintas.
**Procedimento:** submeta os dois commits quase simultaneamente; repita um caso separado para limite por cliente configurado.
**Resultado esperado:** no último uso global, apenas um commit vence; o outro recebe conflito de cupom/limite; contagens não excedem os limites e não há resgate duplicado. O limite por cliente também é respeitado.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T008 — Retry idempotente do pedido/cupom

**Objetivo:** confirmar replay sem pedido ou resgate duplicado.
**Pré-condições:** cotação válida com cupom em ambiente isolado.
**Procedimento:** envie o commit; repita a mesma chamada com o mesmo `quoteId` e `idempotencyKey`. Não gere nova chave no retry.
**Resultado esperado:** retry retorna o pedido original (`200`, replay idempotente), sem novo pedido ou resgate; chave reutilizada com outra cotação é rejeitada.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T009 — Cancelamento pré-pagamento libera resgate uma única vez

**Objetivo:** validar liberação do cupom em cancelamento antes do pagamento.
**Pré-condições:** pedido sintético aguardando pagamento com resgate ativo; admin com MFA recente.
**Procedimento:** cancele pelo fluxo autorizado; confira o estado do resgate; repita a tentativa de cancelamento se o fluxo permitir.
**Resultado esperado:** resgate passa a `released` uma vez e o uso volta a ficar disponível; não há lançamento duplicado nem pedido parcial.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T010 — Pedido pago não libera resgate

**Objetivo:** assegurar que cancelamento posterior a pagamento confirmado não reative automaticamente o cupom.
**Pré-condições:** pedido sintético pago com resgate `redeemed`; fluxo administrativo autorizado.
**Procedimento:** execute a transição disponível para o cenário de teste e consulte o estado do resgate na base isolada.
**Resultado esperado:** pagamento confirmado mantém o resgate consumido; não há reativação automática.
**Resultado obtido:** Conforme relatório fornecido pela usuária, um pedido `preparing` com `payment_confirmed_at` preenchido manteve o resgate `redeemed` e `released_at = null`. Evidência reportada; não reexecutada pelo Codex.
**Evidência:** `relat_rio_de_valida_o.md`, seção T010 (arquivo fornecido pela usuária).
**Status:** [ ] NÃO EXECUTADO [x] APROVADO (REPORTADO PELA USUÁRIA) [ ] REPROVADO [ ] BLOQUEADO

### T011 — CartEvent de carrinho/favorito sem duplicação nem PII

**Objetivo:** validar eventos para métricas e minimização de dados.
**Pré-condições:** cliente, carrinho e produto sintéticos; acesso somente leitura à base de teste.
**Procedimento:** adicione item; aumente sua quantidade; favorite produto; repita a ação de favorito sem mudança. Consulte apenas `customer_id`, `product_id`, `event_type`, `quantity_delta` e `created_at` em `cart_events`.
**Resultado esperado:** inserção/aumento registram `cart_item_added` com delta positivo; favorito efetivo registra `favorite_added` uma vez; repetição sem alteração não duplica evento. Eventos não incluem nome, e-mail, CPF, telefone ou tokens. Escrita direta de cliente/anon em `cart_events` é negada.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T012 — RBAC, same-origin e MFA de administração

**Objetivo:** validar controles de acesso da administração de cupons.
**Pré-condições:** sessões sintéticas guest/customer/employee/admin; admin com e sem MFA recente.
**Procedimento:** tente GET sem sessão; POST como customer e employee; mutação cross-origin; mutação admin sem MFA; por fim, operação com admin same-origin e MFA recente.
**Resultado esperado:** sem sessão `401`; customer/employee sem privilégio `403`; cross-origin `403`; admin sem MFA recente `428`; admin autorizado com MFA pode criar/editar/desativar. Nenhum caso negado grava campanha.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T013 — WhatsApp opcional após persistência

**Objetivo:** confirmar fronteira UC-03: canal complementar não bloqueia pedido.
**Pré-condições:** reserva/cotação sintéticas válidas; `WHATSAPP_STORE_NUMBER` ausente no servidor de teste.
**Procedimento:** confirme o pedido na UI/API e abra a referência de acompanhamento. Não envie mensagem nem use número oficial.
**Resultado esperado:** pedido é criado e resposta de sucesso contém o pedido e `whatsappUrl: null`; acompanhamento funciona e não aparece erro de criação por falta do WhatsApp.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### T014 — Não acumulação de cupons

**Objetivo:** verificar um cupom por pedido.
**Pré-condições:** carrinho/cotação sintéticos e dois códigos válidos.
**Procedimento:** tente fornecer mais de um código pelo cliente/API de cotação.
**Resultado esperado:** segundo cupom/campo extra não é aceito; nenhum desconto duplo nem resgate extra é persistido.
**Resultado obtido:** [PREENCHER MANUALMENTE]
**Evidência:** [PREENCHER MANUALMENTE]
**Status:** [ ] NÃO EXECUTADO [ ] APROVADO [ ] REPROVADO [ ] BLOQUEADO

## 4. Campos de evidência e resultado

| Total previsto | Executados | Aprovados | Reprovados | Bloqueados | Pendentes |
|---:|---:|---:|---:|---:|---:|
| 14 | 14 | 14 (reportados) | 0 | 0 | 0 |

Anexe evidência sanitizada por T001–T014: status HTTP/resultado visível, referência técnica sintética e consulta mínima sem PII. Redija tokens, cookies, chaves, e-mails, nomes, telefones e outros identificadores pessoais. Não use screenshot que revele credenciais. A operadora deve preencher `Resultado obtido`, `Evidência`, data/ambiente e status; não converter teste não executado em aprovação.

## 5. Evidência automatizada de referência (não aprova testes manuais)

- Etapa 004: `npm run test:task008` reportado PASS 11/11, 0 falhas, 0 SKIP contra Supabase efêmero; ver `docs/reports/TASK-008-etapa-004-implementacao.md`.
- Etapa 005: testes direcionados 16/16 PASS, 0 SKIP; lint Biome 18 arquivos PASS; TypeScript PASS; `git diff --check` PASS; ver `docs/reports/TASK-008-etapa-005-revisao.md`.
- Nenhuma dessas verificações preenche ou aprova T001–T014.

## 6. Gate da etapa

### Relatório fornecido pela usuária — 2026-10-30

A usuária forneceu nesta conversa um relatório declarando testes no Supabase Studio, com registros de cupons `T8-FIXO-01`, `T8-PERCENT-01`, `T8-EXPIRED-01`, `T8-LIMIT-01` e `T8-GLOBAL-01`, e estados de resgate `redeemed`/`released`. Este conteúdo é registrado como **evidência reportada pela usuária**, não como execução observada ou verificada independentemente pelo Codex. Não foram fornecidos capturas, logs HTTP, consultas completas de antes/depois ou identificador do projeto/ambiente que permitam validar a execução.

O relatório declara onze itens, mas a numeração e o escopo não correspondem aos T001–T014 deste roteiro. A informação sustenta somente evidência parcial de configuração de cupom fixo e percentual, registro de mínimo, rejeição de cupom expirado e transição de resgate `redeemed` para `released`. A indicação `maximum_per_customer = 1` com `current_customer_redemptions = 0` e `redemption_check = ELIGIBLE`, e `maximum_redemptions = 1` com `total_redeemed = 0`, demonstra disponibilidade declarada, mas não comprova tentativa repetida, concorrência ou bloqueio ao atingir o limite. A listagem final de cupons é uma auditoria declarada, não substitui os fluxos de UI/API definidos no roteiro.

Não há evidência fornecida para criação/edição/desativação autorizada por admin, cotação abaixo/acima do mínimo, escopo de categoria/produto, mudança de preço e consentimento, concorrência de resgate, replay idempotente pela API, pedido pago sem liberação, CartEvent/PII, RBAC/same-origin/MFA, WhatsApp opcional ou rejeição de acumulação. Portanto, nenhum caso completo T001–T014 pode ser marcado APROVADO com base apenas neste relatório. Os identificadores de cupom são dados sintéticos conforme declaração da usuária; o ambiente não foi verificado.

**Estado histórico:** as avaliações abaixo foram registradas antes da declaração formal final da operadora.

### Reavaliação do mapeamento fornecido pela usuária — 2026-10-30

A usuária forneceu uma segunda declaração agrupando T001–T004 como validação de cupons e cálculo; T005–T007 como expiração/limites; T008–T009 como ciclo de resgate/liberação; T010–T011 como limite global/auditoria/schema; e T012–T014 como API, concorrência, idempotência, CartEvent/PII, RBAC/MFA e não acumulação. Registra-se como **declaração reportada, não verificada independentemente**.

O agrupamento não apresenta resultado observado individual para cada caso, valores antes/depois, resposta de API, evidência de concorrência, replay da mesma chave, inspeção de CartEvent/PII ou matriz de autorização. Constraints e migrations, por si só, não comprovam esses comportamentos de ponta a ponta. A referência a microsserviços Spring Boot também não corresponde à arquitetura Next.js/Supabase registrada para esta TASK; não foi fornecida evidência de que outro serviço tenha sido usado. Assim, esta declaração não altera o status dos casos nem supre as evidências faltantes.

### Análise do anexo `comprova_o_detalhada_de_testes_etapa_006.md` — 2026-10-30

O anexo declara execuções de scripts SQL no Supabase e fornece dados de configuração/resultados para cupons fixo e percentual, validade expirada, contagens de resgate e transições `redeemed`/`released`. É aceito como **relato de evidência fornecido pela usuária**, sem verificação independente do ambiente ou dos scripts executados.

O conteúdo é compatível parcialmente com regras de cálculo percentual acima do mínimo configurado, rejeição de um cupom expirado e transição de resgate para `released`. Contudo, o registro do cupom fixo demonstra configuração, não um cálculo observado; a evidência de mínimo não mostra os dois resultados abaixo/acima do limiar; a contagem por cliente não mostra o resultado após atingir o limite; o limite global tem total zero e demonstra apenas disponibilidade; e a transição `released` não demonstra repetição idempotente ou ausência de dupla liberação. A auditoria de cupons não é evidência de `CartEvent`/PII.

O anexo termina em T011 e não contém resultados para T012–T014. Também não comprova os fluxos de administração/RBAC/same-origin/MFA, alteração de preço com consentimento, retry idempotente HTTP, pedido pago sem liberação, WhatsApp opcional ou recusa de acumulação. Logo, ele não completa o roteiro T001–T014 e não permite aprovar os casos integralmente.

### Reavaliação do anexo `relat_rio_t_cnico_definitivo_de_evid_ncias_e_auditoria_etapa_006.md` — 2026-10-30

O anexo declara 14/14 aprovados e apresenta descrições de massa/resultados. Foi conferido contra este roteiro; é registrado como relato fornecido pela usuária, sem verificação independente. O arquivo citado no pedido como `docs/reports/TASK-008-auditoria-completa-etapa-006.md` não existe neste checkout.

A numeração do anexo não corresponde aos casos oficiais: por exemplo, T001 do roteiro verifica criação/edição/desativação administrativa, enquanto T001 do anexo descreve aplicação de cupom fixo; T011 do roteiro verifica CartEvent sem duplicação/PII, enquanto T011 do anexo lista estados de cupons. T012–T014 do roteiro verificam RBAC/same-origin/MFA, WhatsApp opcional após persistência e não acumulação, mas o anexo agrupa esses critérios de outro modo. Alguns cenários também não demonstram o comportamento-limite alegado: T010 informa `total_redeemed = 0` e `GLOBAL_AVAILABLE`, não uma tentativa após atingir `maximum_redemptions`; as provas do T006/T007 não apresentam a resposta após a segunda utilização; e T012 não fornece saída verificável das duas respostas HTTP nem consulta de ausência de duplicação. T014 não demonstra que o WhatsApp da loja esteja ausente nem que o pedido continue persistido com sucesso.

O anexo não contém os resultados individualizados segundo o procedimento/aceite de T001–T014 deste roteiro, nem logs/capturas ou saídas brutas que permitam resolver as divergências. T004 foi reconhecido separadamente como aprovado reportado porque o anexo mais recente informa os dois subtotais e seus resultados. Os outros casos permanecem pendentes; o documento não aprova 14/14 dos casos oficiais. Status atualizado: **GATE-006 BLOQUEADO / AGUARDANDO EVIDÊNCIAS ALINHADAS AO ROTEIRO**; Etapa 007 não habilitada.

### Reavaliação do anexo `relat_rio_de_valida_o.md` — 2026-10-30

O relatório foi comparado com o roteiro oficial e registrado como evidência fornecida pela usuária, sem reexecução/verificação independente. T003 foi aprovado reportado: a seção T014 lista uma campanha vigente como `true`, uma expirada e uma futura como `false`, cobrindo a janela esperada. T010 foi aprovado reportado: a seção T010 mostra pedido `preparing`, pagamento confirmado, resgate `redeemed` e `released_at = null`. T004 continua aprovado pelas evidências de subtotais abaixo/acima do mínimo registradas anteriormente.

Os outros casos permanecem pendentes. A numeração do relatório diverge em vários pontos: por exemplo T006 do relatório trata concorrência, mas T006 do roteiro exige alteração de preço e novo consentimento; T009 do relatório descreve `awaiting_payment`→`preparing`, enquanto T009 do roteiro exige cancelamento pré-pagamento e liberação única; T011 do relatório é limite global, enquanto T011 do roteiro valida CartEvent. T008 cita uma constraint UNIQUE, que não comprova replay HTTP de sucesso; T012–T014 do roteiro não estão cobertos pelos casos de mesmo número do relatório. **GATE-006: 3/14 aprovados reportados (T003, T004, T010), 11 pendentes; Etapa 007 não habilitada.**

### Reavaliação do anexo `relat_rio_de_testes_manuais_task_008.md` — 2026-10-30

O documento declara 11/11 aprovados e informa consultas/inspeções no Supabase Studio. Foi comparado com os critérios oficiais deste roteiro e aceito como relato fornecido pela usuária, não como execução observada pelo Codex. A evidência de T004 permanece consistente com o resultado já registrado (subtotais R$ 40/R$ 70 para mínimo de R$ 50); ela não altera a contagem.

Para os demais casos, grande parte do material demonstra somente configuração ou schema, não o comportamento solicitado: T001 não mostra matriz de autorização HTTP e mutações de criar/editar/desativar; T002 informa configuração fixa sem cálculo, arredondamento ou teto observado; T003 informa duas datas inválidas, sem demonstrar cupom vigente aceito; T005 só cria cupom de categoria, sem cotação comparativa de itens elegíveis/não elegíveis; T006 não altera preço nem exige novo consentimento; T007 inspeciona colunas/estado sem provar concorrência/estouro de limites; T008 verifica a coluna idempotency_key, sem executar retry; T009 observa `released`, sem demonstrar cancelamento repetido e liberação única; T010 descreve consistência estrutural sem tentar liberação após pagamento; T011 inspeciona colunas sem demonstrar eventos, deduplicação, payload sem PII ou escrita negada. T012–T014 não são cobertos pelo relatório. Por isso, não há novos casos completos aprovados e T001–T003/T005–T014 permanecem pendentes.

**Estado histórico, supersedido pela declaração final da operadora.**

### Reavaliação da matriz de rastreabilidade enviada pela usuária — 2026-10-30

A matriz declara novamente 14/14, mas não segue os critérios/IDs deste roteiro. Exemplos: T002 descreve percentual, enquanto o T002 oficial verifica cupom fixo, arredondamento e teto; T006 descreve concorrência, enquanto o T006 oficial verifica alteração de preço e novo consentimento; T009 descreve transição para `preparing`, enquanto o T009 oficial verifica cancelamento pré-pagamento e liberação única; T011 descreve limite global, enquanto o T011 oficial verifica `CartEvent`; T012 é limite por cliente, não RBAC/same-origin/MFA; T013 é mínimo, não WhatsApp opcional; T014 é vigência, não não acumulação.

As evidências descritas para T001/T005/T006/T007/T008/T009/T011–T014 são criação/configuração, constraints, estruturas ou alegações sem as saídas/comportamentos exigidos pelo roteiro. A constraint UNIQUE de `idempotency_key` não demonstra replay HTTP bem-sucedido. T003, T004 e T010 continuam aprovados apenas com base nos relatórios previamente registrados. Nenhum novo caso foi aprovado nesta reavaliação. **GATE-006: BLOQUEADO (3/14 aprovados reportados; 11 pendentes); Etapa 007 não habilitada.**

### Reavaliação do DOCX `Relatorio_Tecnico_Validacao_TASK008_Etapa006.md.docx` — 2026-10-30

O DOCX contém uma matriz de 14 linhas, mas ela não corresponde aos IDs/aceites deste roteiro. Por exemplo: T001 é criação/aplicação de cupom, sem criar/editar/desativar com a matriz admin; T002 é desconto percentual, não valor fixo com arredondamento/teto; T006 é concorrência, não alteração de preço com novo consentimento; T009 trata de preparo, não cancelamento pré-pagamento com liberação única; T011 é limite global, não CartEvent; T012 é limite por cliente, e T013 mínimo, não RBAC/MFA e WhatsApp opcional; T014 é validade, não não acumulação.

O documento repete alegações compatíveis com T003 (janelas temporais), T004 (mínimo) e T010 (pedido pago com resgate `redeemed`/`released_at = null`), já reconhecidas como aprovadas reportadas. T008 descreve a constraint UNIQUE como barreira, mas não demonstra replay HTTP de sucesso devolvendo o pedido original. Para os demais critérios, a tabela apresenta conclusões resumidas sem entradas/saídas suficientes para confirmar os comportamentos exigidos. O DOCX não fornece comprovação adicional que altere o status: **3/14 aprovados reportados (T003, T004, T010); 11 pendentes; GATE-006 BLOQUEADO**.

```text
==================================================
TASK: TASK-008
ETAPA: 006
STATUS DA ETAPA: BLOQUEADA — AGUARDANDO TESTES MANUAIS
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 5
GATES PENDENTES: 1
GATES BLOQUEADOS: 1
PROBLEMAS ENCONTRADOS:
- Foi fornecida declaração de resultados, mas sem evidência individual verificável e sem cobertura suficiente dos T001–T014; nenhum teste foi observado pelo Codex.
CORREÇÕES REALIZADAS:
- Roteiro manual T001–T014 preparado com dados sintéticos e campos de evidência vazios.
PENDÊNCIAS:
- Complementar e registrar evidência individual para os 14 casos no ambiente Supabase isolado.
TESTES RELACIONADOS:
- Testes automatizados anteriores não substituem testes manuais; resultados documentados acima.
PRÓXIMA ETAPA: 007 — Conclusão
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: GATE-006 aguarda evidências manuais verificáveis e alinhadas ao roteiro.
==================================================
```

## Adendo final da operadora — 2026-10-30

A declaração formal da usuária nesta conversa substitui as avaliações anteriores deste roteiro e registra os 14 casos como executados/aprovados no ambiente isolado Supabase Studio e aplicação. O Codex não reexecutou os cenários; os resultados abaixo são **reportados pela operadora**.

| Caso | Resultado reportado | Status |
|---|---|---|
| T001 | Admin cria cupom; papéis comuns/funcionários são negados. | APROVADO — REPORTADO |
| T002 | Descontos percentuais e fixos calculados no backend com arredondamento correto. | APROVADO — REPORTADO |
| T003 | Cupons vigentes aceitos; expirados/futuros rejeitados via `NOW()`. | APROVADO — REPORTADO |
| T004 | Abaixo do mínimo rejeitado; no mínimo/acima elegível. | APROVADO — REPORTADO |
| T005 | Escopo de produto/categoria validado e persistido em `terms_snapshot`. | APROVADO — REPORTADO |
| T006 | Alteração de preço exige nova validação de consentimento/subtotal. | APROVADO — REPORTADO |
| T007 | Teto global configurado e respeitado. | APROVADO — REPORTADO |
| T008 | Retry com mesma `idempotency_key` não duplica transação/resgate. | APROVADO — REPORTADO |
| T009 | Cancelamento pré-pagamento libera resgate uma vez. | APROVADO — REPORTADO |
| T010 | Pedido pago/em preparo mantém `redeemed` e `released_at IS NULL`. | APROVADO — REPORTADO |
| T011 | Eventos de carrinho/favorito persistidos sem PII excessiva. | APROVADO — REPORTADO |
| T012 | RBAC/MFA protege rotas e ações administrativas. | APROVADO — REPORTADO |
| T013 | Link/resumo WhatsApp contém identificador seguro sem PII. | APROVADO — REPORTADO |
| T014 | Backend rejeita aplicação de mais de um cupom por pedido. | APROVADO — REPORTADO |

**Resultado final conforme declaração da operadora:** 14/14 aprovados. Esta declaração supersede as avaliações intermediárias de bloqueio registradas acima. **GATE-006 = CONCLUÍDO/APROVADO. Etapa 007 = HABILITADA PARA EXECUÇÃO FUTURA, não iniciada nesta atualização.**

```text
==================================================
TASK: TASK-008
ETAPA: 006
STATUS DA ETAPA: APROVADA (RESULTADOS REPORTADOS PELA OPERADORA)
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 6
GATES PENDENTES: 1
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Nenhum bloqueio declarado pela operadora; execução não revalidada pelo Codex.
CORREÇÕES REALIZADAS:
- Matriz final T001–T014 registrada conforme declaração formal da operadora.
PENDÊNCIAS:
- Conclusão documental da Etapa 007.
TESTES RELACIONADOS:
- T001–T014: 14/14 PASS reportados pela operadora; não reexecutados pelo Codex.
PRÓXIMA ETAPA: 007 — Conclusão
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-006 aprovado conforme declaração formal da operadora.
==================================================
```
