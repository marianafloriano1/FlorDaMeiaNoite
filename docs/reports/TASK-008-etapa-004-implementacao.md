# TASK-008 — Etapa 004 — Implementação

**Data:** 2026-10-29
**Checkout:** `flor-da-meia-noite`
**Branch:** `task/TASK-008-cupons-cart-events`
**HEAD de base:** `356ab80`
**Status:** IMPLEMENTAÇÃO REALIZADA; GATE-004 CONCLUÍDO/APROVADO após validação Supabase integrada local isolada.

## Escopo e preservação

Implementada a Etapa 004 conforme o plano aprovado e a autorização explícita da integração mínima TASK-006/TASK-008. Os arquivos compartilhados editados foram somente a tela do carrinho, rotas de cotação/commit e tipos/validação de pedido. O núcleo das migrations/RPCs TASK-006 não foi editado; a integração usa uma migration aditiva com novas tabelas e wrappers.

TASK-003, TASK-004 e TASK-005 não foram alteradas. As mudanças documentais em `README.md` e os registros das Etapas 001–003 já estavam presentes antes desta etapa; não foram revertidos nem reescritos nesta implementação.

## Implementação

- Nova migration `202610290002_task008_coupons_cart_events.sql`: cupons, escopos por produto/categoria, snapshot de termos da cotação, resgates com snapshot ligado ao pedido e eventos privados de carrinho.
- RPCs administrativas exigem `app_metadata.role=admin`; mutações HTTP também passam pelo helper administrativo existente, que verifica same-origin e MFA recente. A tela administrativa permite criar, editar código/valor e ativar/desativar campanhas.
- Regras implementadas: cupom único por pedido; código normalizado; validade; mínimo opcional; escopo geral sem restrições ou restrição configurada; limites globais e por cliente opcionais; cálculo com `numeric`, arredondamento a duas casas e valor fixo limitado ao subtotal elegível.
- RPCs novas `create_order_quote_with_coupon` e `create_order_from_quote_with_coupon` envolvem as RPCs históricas, sem substituir suas definições. O commit bloqueia a linha do cupom, revalida termos, escopo, elegibilidade e uso, calcula o total no banco e grava o resgate/snapshot na mesma transação. A chave idempotente é serializada e o replay retorna o mesmo pedido sem novo resgate.
- Durante a integração, corrigido o replay da migration aditiva para carregar o pedido existente em variável `public.orders%rowtype`, evitando conversão inválida de UUID para JSONB; a repetição idempotente passou no teste integrado subsequente.
- Trigger libera o resgate uma vez na transição do pedido não pago para `cancelled`; pagamento confirmado mantém o resgate consumido. Triggers capturam inclusão/aumento de item e inclusão efetiva de favorito em `cart_events`, sem PII e sem escrita direta de clientes.
- UI/API do checkout enviam código opcional e exibem subtotal, desconto e total autoritativo antes do consentimento.
- CI ganha job Linux com Supabase efêmero, aplicação da sequência de migrations e teste integrado sem permissão para `SKIP`.

## Validações observadas

| Verificação | Resultado | Evidência |
|---|---|---|
| `npm run lint:task008` | PASS | Biome verificou 16 arquivos direcionados sem diagnóstico. |
| `npm run test:task008` | 11 PASS, 0 FAIL, 0 SKIP | Executado com sucesso contra Supabase local efêmero, incluindo a suíte integrada de cupons, resgates e CartEvent. |
| `npx tsc --noEmit --incremental false` | PASS | Exit code 0. |
| `npm run build` | PASS | Next.js 16.4.2 compilou, passou TypeScript, gerou 23/23 páginas e listou `/admin/coupons` e as rotas da API de cupons. |
| `git diff --check` | BLOCKED | Nesta revalidação, o Git não conseguiu acessar o worktree (`Permission denied` ao retornar ao diretório; `--git-dir/--work-tree` também recusou a operação como fora de um worktree). Não há confirmação atual do diff-check. |
| Migration e integração Supabase local | PASS | Stack efêmera `task008-validation-20261029-b17c`; migrations aplicadas em ordem, com `202610290002` confirmada em `supabase_migrations.schema_migrations`; teste integrado incluído no resultado 11/11. Nenhuma stack persistente foi usada ou alterada. |
| Lint global | NOT RUN | O gate desta branch é direcionado à TASK-008; lint global contém diagnósticos históricos fora do escopo e não foi necessário para a validação direcionada. |

O teste integrado exercita dois clientes concorrendo pelo último uso global, único vencedor, retry idempotente, captura de CartEvent, negação de RPC administrativa para customer e liberação única do resgate via expiração. Resultado TAP: 11 testes, 11 aprovados, 0 falhas, 0 ignorados. A validação foi local; o job remoto `task008-integration` da CI não foi disparado nesta execução.

## GATE-004

**CONCLUÍDO/APROVADO.** A migration aditiva foi aplicada em uma stack Supabase local efêmera e o teste integrado passou junto da suíte completa: 11/11, 0 falhas e 0 SKIP. O workflow dedicado continua configurado para falhar com variáveis ausentes, SKIP ou falhas. A CI remota não foi executada nesta rodada; a evidência aprovada aqui é a validação local real contra banco isolado.

Gates acumulados: GATE-001/002/003/004 = CONCLUÍDOS; GATE-005/006/007 = PENDENTES. Etapa 005 está habilitada para execução futura e não foi iniciada.

## Arquivos desta etapa

- Novos: migration TASK-008; serviço/tipos/validação de cupons; painel e APIs administrativas; testes unitários/HTTP/integrados; este relatório.
- Modificados: workflow CI, `package.json`, integração das APIs/tipos de pedidos e UI de carrinho.
- Arquivos TASK-003/TASK-004/TASK-005: nenhum.

```text
==================================================
TASK: TASK-008
ETAPA: 004
STATUS DA ETAPA: CONCLUÍDA/APROVADA
==================================================
GATE DA ETAPA: CONCLUÍDO/APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 4
GATES PENDENTES: 3
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Nenhum bloqueio obrigatório restante na Etapa 004.
CORREÇÕES REALIZADAS:
- Implementação aditiva de cupons, resgates, CartEvent, painel/admin e integração do checkout.
PENDÊNCIAS:
- Job remoto `task008-integration` da CI permanece não executado nesta rodada; a validação local isolada real passou com zero SKIP.
TESTES RELACIONADOS:
- Lint direcionado PASS; 11 testes PASS, 0 SKIP; migration e integração Supabase local PASS; TypeScript PASS; build PASS; diff-check BLOCKED nesta revalidação devido ao acesso Git.
PRÓXIMA ETAPA: 005 — Revisão
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-004 concluído; Etapa 005 ainda não iniciada.
==================================================
```
