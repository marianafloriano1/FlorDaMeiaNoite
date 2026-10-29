# TASK-006 — Etapa 005 — Revisão

**Data:** 2026-10-28
**Branch/HEAD:** `task/TASK-006-checkout-pedidos` / `73225c6`
**Resultado final após correções e revalidação:** GATE-005 APROVADO; a Etapa 006 está habilitada para execução futura e permanece não iniciada.

## Fontes e escopo revisados

Revisados `AGENTS.md`, README, TASKS, ADR-003, overview, relatórios das Etapas 001–004, migration `202610280001_task006_orders.sql`, APIs de pedidos/admin, componentes de carrinho/acompanhamento/fila, testes TASK-006, `.env.example`, `package.json`, workflow CI e estado/diff Git.

O planejamento aprovado permite somente alterações necessárias à TASK-006; proíbe pagamento no site, cartão, WhatsApp automático, exposição de PII, preço sem consentimento, movimento duplicado de estoque e extensão da reserva. A cópia isolada e a stack Supabase efêmera foram usadas na Etapa 004. O GATE-004 documenta 10/10 testes integrados, 0 SKIP, migrations 001–006, lint, typecheck, build e diff-check PASS.

## Achados

### P1 — retry concorrente da criação não é idempotente

`create_order_from_quote` consulta a chave de idempotência antes de bloquear a reserva. Duas chamadas simultâneas com a mesma chave podem ambas observar ausência de pedido; a segunda aguarda o `FOR UPDATE` da reserva e, após a primeira consumir a cotação, encontra `used_at` e retorna `order_quote_expired` em vez do pedido já criado. Isso viola a propriedade de replay idempotente sob concorrência, embora o retry posterior à conclusão seja suportado. O índice único evita duplicação, mas não converte a corrida em resposta idempotente.

**Correção aplicada:** a RPC serializa chamadas pela combinação cliente/chave com advisory lock transacional, relê o pedido já confirmado e devolve o pedido e seus itens como replay idempotente. A rota retorna HTTP 200 nesse replay e HTTP 201 na criação original. Teste integrado concorrente: PASS; duas chamadas retornaram o mesmo ID/referência, uma única linha de pedido/itens e marcadores original/replay.

### P2 — cotação vulnerável a atualização concorrente de preço

A RPC compara o preço atual com a cotação, mas a consulta de `catalog_products` não bloqueia as linhas de produto até persistir o pedido. Uma atualização concorrente de preço pode ocorrer após a comparação e antes do commit, permitindo criar pedido com o total cotado sem consentimento para o preço que passou a vigorar nesse intervalo.

**Correção aplicada:** a RPC bloqueia as linhas de produto com `FOR SHARE` até o fim da transação e compara preço, itens e total cotados imediatamente antes da gravação. Divergência aborta com `order_quote_changed` (HTTP 409), sem consumir a cotação nem alterar a reserva. Teste integrado de alteração de preço entre cotação e commit: PASS; nenhuma ordem foi criada e a cotação permaneceu não consumida.

### P2 — README mantém declaração geral desatualizada

A introdução do README ainda afirma que catálogo, contas, pedidos e demais fluxos “ainda não estão implementados”, embora TASK-004 e a implementação TASK-006 estejam registradas como presentes/aprovadas. A tabela de papéis e RF-009/010 já refletem o escopo. É inconsistência de estado documental; não altera os requisitos.

**Resolvido:** a frase introdutória do README agora diferencia catálogo/contas implementados do fluxo de pedidos/checkout em implementação.

## Segurança, arquitetura e privacidade

- RPCs usam `SECURITY DEFINER`, `search_path=''`, revogações explícitas e grants autenticados. Tabelas de pedidos/itens/eventos têm RLS de leitura por propriedade; cotação e snapshot não têm acesso direto concedido.
- Cliente lê o próprio pedido; a consulta por referência também está sujeita à policy de ownership. Rotas mutáveis exigem sessão e same-origin. `employee` só registra conferência/transições operacionais; `admin` exige step-up em mutations e é o único que aprova, confirma pagamento e cancela.
- Referência é UUID opaco; mensagem wa.me é manual, codificada, em BRL e sem CPF, e-mail, telefone ou token. A política informativa é configuração, exibida antes do pagamento; confirmação fica bloqueada sem texto configurado.
- O snapshot de preço vem dos itens da reserva; consentimento é obrigatório; pagamento conclui a reserva sem baixa extra; expiração cancela pedido não pago pelo trigger; cancelamento administrativo delega liberação à RPC da reserva.
- A migration é aditiva e foi aplicada na stack isolada. Nenhuma migration antiga foi editada.

## Cobertura e verificações

| Critério/evidência | Resultado |
|---|---|
| GATE-001 a GATE-004 | PASS/registrados nos relatórios anteriores; quatro gates concluídos |
| Integração Supabase TASK-006 | PASS: Etapa 004 10/10 e revalidação Etapa 005 12/12, 0 FAIL, 0 SKIP; migration 202610280002 aplicada na stack efêmera |
| `npm run lint` (Biome), `npm run typecheck`, `npm run build`, `git diff --check` | PASS nesta revalidação |
| Ownership/RLS, consentimento de preço, MFA e papéis, expiração, pagamento, corrida pagamento×expiração | Cobertos pelo teste integrado existente; PASS na Etapa 004 |
| Duas criações concorrentes com a mesma chave de idempotência | PASS; teste integrado confirmou replay do mesmo pedido, sem duplicação |
| Alteração de preço após cotação e antes da criação | PASS; `order_quote_changed`, pedido ausente, reserva ativa e cotação não consumida |
| Teste manual de interface/fluxo real | NOT RUN; pertence à Etapa 006, habilitada para execução futura e não iniciada |
| Workflow GitHub / imagem OCI e endpoint | NOT RUN nesta revalidação; a CI foi ajustada para exigir os dois cenários, mas não foi disparada nesta execução |

Nesta revalidação, os testes integrados foram executados novamente após aplicar a migration aditiva. Os dois cenários antes ausentes agora têm cobertura real na stack isolada; o GATE-004 permanece como evidência anterior e não substitui estes resultados.

## Alterações preexistentes e Scope Guard

A Etapa 004 aplicou formatação Biome aos 48 arquivos que causavam o lint global e adicionou `.gitattributes` para fixar LF com `core.autocrlf=true`. Os diffs das áreas TASK-003/004/005 comparados sem whitespace retornaram código 0, evidência de ausência de diferenças lógicas; ainda assim, esses arquivos aparecem modificados no estado Git por formatação. Essa alteração foi autorizada para resolver o lint global e está registrada no relatório da Etapa 004, mas exige revisão normal no diff antes de qualquer commit.

Na revalidação foram alterados somente arquivos da correção TASK-006: migration aditiva, rota/tipos, teste integrado, asserções do workflow, README e este relatório/TASKS.md. A migration `202610280002_task006_order_commit_guards.sql` foi aplicada à stack isolada `task006-validation-20261028-ea587bf2`, sem reset. `npm run test:task006`: 12 PASS, 0 FAIL, 0 SKIP; `npm run lint`, `npm run typecheck`, `npm run build` e `git diff --check`: PASS. Nenhuma stack persistente foi usada; sem commit, push ou deploy.

## GATE-005 e estado acumulado

- GATE-001: CONCLUÍDO — relatório de recontextualização.
- GATE-002: CONCLUÍDO — relatório DoR.
- GATE-003: CONCLUÍDO — planejamento e decisões aprovados.
- GATE-004: CONCLUÍDO/APROVADO — testes e validações integradas reportados na Etapa 004.
- GATE-005: APROVADO — P1 e P2 corrigidos; testes e verificações registrados abaixo.
- GATE-006/Etapa 006: HABILITADA PARA EXECUÇÃO FUTURA; não iniciada.
- GATE-007: PENDENTE — conclusão; não iniciado.

Totais: 7 gates; 5 concluídos (001–005); 2 pendentes (006–007); 0 bloqueados.

**Conclusão:** GATE-005 aprovado após correções e revalidação. TASK-006 permanece IN_PROGRESS enquanto a Etapa 006 não for executada. A Etapa 006 está habilitada para execução futura; nenhuma etapa posterior/TASK-007 foi iniciada.
