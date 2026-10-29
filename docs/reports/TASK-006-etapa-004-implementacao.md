# TASK-006 — Etapa 004 — Implementação

**Data:** 2026-10-28
**Branch:** `task/TASK-006-checkout-pedidos`
**Base:** `73225c6` — publicação da TASK-005
**Estado:** GATE-004 APROVADO após integração real em Supabase local isolado.

## Implementado

- Migration aditiva `202610280001_task006_orders.sql`: snapshot do preço na reserva, cotações, pedidos/itens, inspeção, histórico imutável, RLS e RPCs transacionais.
- Pedido é associado a reserva ativa do próprio cliente; cotação recalcula BRL no servidor; criação exige consentimento explícito e rejeita cotação alterada/expirada. A criação não movimenta estoque.
- Confirmação manual do pagamento por `admin` conclui a reserva sem nova baixa e registra a janela UTC de preparo em +1h/+2h. `employee` pode conferir e avançar apenas estados operacionais.
- Expiração da reserva cancela o pedido não pago na mesma transação; pagamento rejeita reserva expirada. Cancelamento administrativo usa a transição de reserva existente, sem criar segundo caminho de liberação.
- Sessão administrativa exige AAL2, registro de MFA ativo e janela de inatividade; as RPCs também verificam autorização, além das rotas.
- Carrinho, acompanhamento privado do próprio pedido, fila administrativa, link `wa.me` manual sem PII e política configurável de cancelamento exibida antes do pagamento. Confirmação de pagamento fica indisponível sem `ORDER_CANCELLATION_POLICY_TEXT`.
- CI dedicada prepara Supabase efêmero, aplica migrations em ordem, injeta URL/chaves da stack local e valores sintéticos; a etapa falha se variáveis faltarem, integração for ignorada ou os cenários integrados não forem reportados.

## Evidências executadas

| Verificação | Resultado |
|---|---|
| `npm run test:task006` com a stack isolada | 10 PASS, 0 FAIL, 0 SKIP; quatro cenários integrados e quatro testes unitários |
| Biome direcionado para os arquivos TASK-006 | PASS, 14 arquivos |
| `npm run lint` global | PASS; 61 arquivos verificados |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; Next.js compilou e gerou as rotas da TASK-006 |
| Prettier `--check .github/workflows/ci.yml` | PASS |
| `git diff --check` | PASS |
| Migrations integradas | PASS na ordem 001–006; `supabase migration list --local` confirmou `202610280001` aplicada |
| Integração Supabase | PASS na stack local isolada `task006-validation-20261028-ea587bf2`, portas 55420–55427; fixtures sintéticas |

Os 48 diagnósticos globais encontrados eram exclusivamente `format`. A causa era `core.autocrlf=true` sem `.gitattributes`, que fazia o checkout converter arquivos para CRLF enquanto o Biome exige LF. O formatter foi aplicado somente nesses arquivos e `.gitattributes` agora fixa LF; as mudanças nos arquivos TASK-003/004/005 são somente de formatação, sem alteração de lógica. A configuração TOTP foi habilitada somente na cópia efêmera do Supabase e no job integrado da CI para permitir a fixture MFA; `supabase/config.toml` do checkout não foi alterado. A execução local usou banco real efêmero, não mocks. A CI remota não foi disparada.

## Arquivos da implementação

- Migration: `supabase/migrations/202610280001_task006_orders.sql`.
- Pedidos: `src/lib/orders/*`, `src/app/api/orders/*`, `src/app/api/admin/orders/*`.
- Interface: `src/app/cart/page.tsx`, `src/app/orders/[reference]/page.tsx`, `src/app/admin/orders/page.tsx`.
- Validação: `tests/task006/*`; scripts/configuração em `package.json`, `.env.example`, `.github/workflows/ci.yml` e `.gitattributes`.

## Escopo e pendências

- TASK-003, TASK-004 e TASK-005: comportamento, lógica e migrations preservados. Os arquivos que tinham diagnóstico global receberam somente formatação Biome; isso inclui arquivos dessas TASKs, sem alteração funcional.
- Docker foi usado somente para a stack efêmera `task006-validation-20261028-ea587bf2`; a stack `flor-da-meia-noite-local` e as demais stacks existentes não foram alteradas. Não houve commit, push ou deploy.
- A CI remota não foi disparada; a validação integrada local em Supabase real isolado passou e satisfez este gate.
- GATE-004: **APROVADO** com evidência local integrada, lint global, typecheck e build PASS.
- Etapa 005: **HABILITADA PARA EXECUÇÃO FUTURA**; não iniciada nesta retomada.
