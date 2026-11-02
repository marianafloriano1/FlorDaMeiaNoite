# TASK-009 — Etapa 003 — Planejamento

**Registro restaurado:** 2026-11-02
**Checkout:** `flor-da-meia-noite-task-009`
**Branch:** `task/TASK-009-gestao-pedidos-retirada`
**HEAD de referência:** `356ab8048896905f4b30c0cc78d2aa700ae30007`

## Proveniência e estado

O plano original não foi encontrado no checkout dedicado após sua reestruturação; a busca nas pastas acessíveis encontrou o prompt da Etapa 003, mas não o relatório. Este plano foi restaurado conforme o histórico desta conversa e as decisões que a solicitante aprovou. A solicitação posterior para iniciar a Etapa 004 e o registro `IN_PROGRESS` em `TASKS.md` confirmam a aprovação anterior do GATE-003. Este arquivo não alega execução de código, migrations ou testes.

## Escopo e critérios de aceite

- Admin agenda a retirada em data/hora acordadas e o cliente consulta a previsão.
- Employee prepara, muda para pronto para retirada e registra a retirada. Customer não altera estado; somente admin cancela.
- Admin classifica cada linha do pedido como perecível ou não perecível.
- Para linha perecível não retirada, após três dias úteis desde a data acordada (segunda a sábado; feriados não excluídos), admin registra `discarded`. O descarte é por linha e não devolve estoque.
- Linha não perecível pode aguardar sete dias corridos após a data acordada; após o prazo, admin pode cancelar.
- Cancelamento é idempotente e transacional. Linhas não preparadas/não usadas podem retornar ao estoque uma única vez; usadas, retiradas e descartadas nunca retornam.
- Em `ready_for_pickup`, admin pode cancelar e retorna apenas linhas que registrou como não usadas. Em pedido pago, a confirmação do acordo do cliente é auditada por ator e horário de servidor, sem armazenar conteúdo da conversa.
- Em pedido misto, eventos e resultados são por linha; o pedido não alcança estado terminal até todas as linhas estarem retiradas, canceladas ou descartadas.
- Não processar nem calcular reembolso; não enviar e-mail/WhatsApp automaticamente na TASK-009; defeitos são registrados para tratamento manual pelo canal já definido.

## Matriz de implementação e validação

| Critério | Áreas previstas (confirmar antes de editar) | Evidência planejada |
|---|---|---|
| Agenda e visualização pelo cliente | `src/app/api/admin/orders/[id]/route.ts`, `src/app/api/admin/orders/route.ts`, `src/app/admin/orders/page.tsx`, `src/app/api/orders/[reference]/route.ts`, `src/app/orders/[reference]/page.tsx`, tipos/validação de pedidos | Testes de RBAC, persistência da agenda, fuso `America/Sao_Paulo` e acesso do cliente apenas ao próprio pedido |
| Preparo, pronto e retirada por employee | rota administrativa, serviço/RPC de transição, timeline/painel | Matriz de transições permitidas e negadas para employee/customer/admin |
| Classificação e prazo por linha | migration aditiva em `supabase/migrations/`, tipos, validação, API administrativa | Testes de classificação por admin e cálculo dos limites com relógio simulado, inclusive domingo e feriados não excluídos |
| Cancelamento, acordo e retorno | migration/RPC transacional, rota administrativa e UI | Testes para unpaid/paid, confirmação auditada, ausência de PII e idempotência de cancelamento |
| Estoque e ledger | migration aditiva e RPC que reutiliza as estruturas existentes | Testes de retorno único de linhas não usadas; zero retorno para usadas/retiradas/descartadas; falha atômica sem saldo negativo |
| Pedido misto e descarte | estado operacional por linha, agregação de estado do pedido e timeline | Testes de mistura retirada/cancelada/descartada; pedido permanece não terminal até resolver todas as linhas |
| Defeito/dano | evento de auditoria/timeline e formulário administrativo apenas se couber nos componentes existentes | Teste sem conteúdo de WhatsApp, PII desnecessária ou envio automatizado |
| Regressão e integração | `tests/task009/`, scripts de teste existentes e job Supabase efêmero em CI, se necessário e autorizado pelo fluxo existente | Testes unitários, API/RBAC, migration/RPC em Supabase isolado, typecheck, lint direcionado, build e `git diff --check` |

## Arquivos candidatos

Confirmação obrigatória contra o diff e o código atual antes de qualquer alteração:

- migration nova e aditiva `supabase/migrations/<próximo_timestamp_livre>_task009_order_lifecycle.sql`; não editar migrations TASK-003/004/005/006/007;
- `src/app/api/admin/orders/[id]/route.ts`, `src/app/api/admin/orders/route.ts`;
- `src/app/admin/orders/page.tsx`;
- `src/lib/orders/types.ts` e `src/lib/orders/validation.ts`;
- `src/app/api/orders/[reference]/route.ts`, `src/app/orders/[reference]/page.tsx`;
- testes focados em `tests/task009/` e scripts/workflow apenas se indispensáveis para executá-los;
- documentos de produto/arquitetura e este relatório quando necessários à rastreabilidade.

Não modificar autenticação da TASK-003, catálogo da TASK-004, checkout/preço da TASK-006, auditoria de estoque da TASK-007, cupons da TASK-008 nem funcionalidades da TASK-010. Mudanças em arquivos compartilhados devem ser estritamente necessárias para estados/agendamento/cancelamento da TASK-009.

## Sequência proposta

1. Confirmar schema real de `orders`, `order_items`, `order_events` e `inventory_ledger`, suas RPCs, RLS, transições, testes e migrations. Escolher o próximo timestamp livre sem renomear migrations existentes.
2. Especificar e adicionar, sem alterar migrations antigas, classificação e resultado operacional por linha, agenda e trilha de eventos; manter políticas/RLS e constraints compatíveis.
3. Implementar RPCs transacionais e idempotentes para agenda/transições, classificação, retirada, descarte e cancelamento/retorno seletivo.
4. Integrar validação backend e UI admin/cliente, sem alterar preço, pagamento, reservas ou fluxo de WhatsApp.
5. Adicionar testes unitários/API e integração Supabase; executar a validação direcionada, lint, typecheck, build aplicável e diff-check.
6. Registrar evidência real e limitações; não aprovar GATE-004 se algum teste obrigatório não rodar.

## Riscos e rollback

- **Corrida entre retirada, descarte e cancelamento:** resolver estado por linha sob transação/lock e chave idempotente.
- **Dupla devolução:** movimentos do ledger e transição de estado precisam ser atômicos, vinculados à linha e únicos; não editar saldo diretamente.
- **Pedido misto:** não encerrar o agregado enquanto houver linha não resolvida; testar combinações e atualização repetida.
- **Tempo/calendário:** calcular no fuso `America/Sao_Paulo`, persistir timestamps UTC e aplicar a regra especial seg–sáb sem feriado excluído somente à contagem de três dias úteis.
- **Permissão/privacidade:** verificar papel no servidor/RPC, preservar RLS por `customer_id` e não armazenar conversa, CPF ou dados desnecessários.
- **Rollback:** migration aditiva/backward-compatible; em falha de release, voltar a versão da aplicação compatível. Preservar histórico/ledger; nunca apagar movimentos, dados ou migrations aplicadas. Fazer correção forward quando houver estado persistido.

## Gate e verificações

**GATE-003: CONCLUÍDO conforme aprovação anterior registrada no histórico da conversa.** O relatório original não foi localizado e esta cópia restaurada registra essa limitação. O plano contém critérios, escopo, sequência, áreas, testes, riscos e rollback; nenhum código foi alterado para este planejamento. Testes/build/migration: **NOT RUN** nesta restauração.

```text
TASK: TASK-009
ETAPA: 003 — Planejamento
STATUS DA ETAPA: APROVADA (registro restaurado)
GATE-003: CONCLUÍDO conforme aprovação anterior reportada pela solicitante
Relatório original: não localizado; plano restaurado a partir do prompt e decisões desta conversa
Implementação/testes: NOT RUN nesta etapa
Próxima etapa: 004 — Implementação (autorização já fornecida, não executada por este registro)
```
