# TASK-005 — Bloqueio de escopo antes da implementação

**Data:** 2026-10-25  
**Resultado:** BLOQUEADO antes de qualquer alteração funcional

## Conflito confirmado

A TASK-005 exige que cliente autenticado adicione produtos ao carrinho/favoritos e selecione itens antes da reserva. As páginas existentes que apresentam produtos são:

- src/app/catalog/page.tsx — implementa ProductCard e links para detalhes, sem ações de carrinho/favoritos.
- src/app/catalog/[slug]/page.tsx — implementa ProductDetails, sem ações de carrinho/favoritos.

Essas páginas pertencem à implementação da TASK-004. Acrescentar as ações necessárias para completar o fluxo cliente exige modificar esses arquivos. A solicitante proibiu alterações na TASK-004 e instruiu interromper antes de alterar qualquer arquivo compartilhado com ela. Portanto, a implementação end-to-end da TASK-005 não pode ser feita dentro do escopo autorizado atual.

## Estado do checkout

- Worktree: flor-da-meia-noite-integracao-003-004.
- HEAD: 304eb32; branch detached, sem branch própria TASK-005.
- Antes desta tentativa: 302 entradas em git status --short; diff tracked de 28 arquivos, incluindo alterações preexistentes da integração TASK-003/TASK-004 e remoções staged de artefatos .next já autorizadas anteriormente.
- O checkout original TASK-003 permaneceu na branch task/TASK-003-contas-autenticacao, HEAD 304eb32, com 280 entradas no status antes/depois desta tentativa.
- Nenhum arquivo de código, teste ou migration foi alterado nesta tentativa. Nenhum teste, lint, typecheck ou build foi executado; não houve implementação para validar.
- git diff --check terminou com exit 0. Os avisos exibidos foram apenas sobre conversão LF/CRLF.
- Sem reset, restore, descarte, rebase, cherry-pick, commit, push ou deploy.

## Decisões de negócio consideradas

- Máximo de uma reserva ativa por cliente/carrinho.
- Para a última unidade, vence a primeira reserva confirmada atomicamente; as demais falham por indisponibilidade.
- A validação integrada das migrations continua pendente por indisponibilidade/não resposta do ambiente Docker; conforme instrução da solicitante, isso não foi usado como bloqueio da implementação. O bloqueio atual é o conflito de escopo da UI catalogada.

## Estado

TASK-005 permanece BLOCKED. GATE-005 não pode ser aprovado sem implementação e evidências; permanece BLOQUEADO. TASK-006 permanece BLOCKED e não foi iniciada.

## Para retomar

É necessária autorização explícita para adicionar ações de carrinho/favoritos às páginas da TASK-004, ou uma decisão de produto/arquitetura que permita oferecer esses fluxos por arquivos novos sem modificar as páginas existentes. Nenhuma dessas alternativas foi presumida.


## Resolução posterior — 2026-10-25

A solicitante autorizou a integração mínima de carrinho/favoritos com alteração compartilhada TASK-004/TASK-005 somente em src/app/catalog/[slug]/page.tsx. A página de listagem src/app/catalog/page.tsx não precisa de alteração, pois já direciona ao detalhe. Este bloqueio histórico de escopo foi resolvido para planejamento; nenhuma implementação foi realizada nesta etapa. Preservar todas as funcionalidades TASK-004.