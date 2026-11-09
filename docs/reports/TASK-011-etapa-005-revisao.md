# TASK-011 — Etapa 005 — Revisão

**Data:** 2026-11-08
**Branch:** `task/TASK-011-relatorios-exportacoes-metricas`
**GATE-005:** PENDENTE — integração Supabase da Etapa 004 não executada e regressão TASK-006 falhou

## Revisão do escopo

- Acesso aos relatórios e exportações é verificado no servidor; apenas `admin` passa.
- A rota mutável de exportação valida same-origin e filtros; falhas não expõem dados internos.
- Consultas selecionam apenas campos de pedido, itens, eventos e catálogo necessários à agregação. Dados pessoais de clientes não entram no DTO/export.
- Os arquivos XLSX/PDF são produzidos na resposta e não são armazenados em bucket público.
- A tabela de auditoria guarda somente UID do ator, período, base, formato e timestamp do banco.
- As bases temporais de criação e pagamento são separadas; ambos exigem pagamento confirmado para faturamento. Cancelamentos após pagamento aparecem separadamente sem assumir reembolso.
- A ordenação do ranking é determinística. As quantidades devolvidas em eventos de cancelamento por item são deduzidas das unidades; esta métrica representa unidades líquidas, não um cálculo de reembolso.
- Não foram alterados os contratos, código, testes ou migrations históricas das dependências.

## Achados

| Severidade | Achado | Situação |
|---|---|---|
| P1/P2 funcionais | Nenhum achado confirmado na revisão estática e nos testes direcionados executados | Resolvido/sem achado |
| Validação obrigatória | Supabase efêmero, aplicação da migration e integração real ainda aguardam CI | Pendente; não é resultado funcional aprovado |
| Regressão herdada | `npm run test:task006` falha em asserção do parser de cupom presente na base integrada: espera propriedade `couponCode` ausente, implementação retorna `null`; arquivo não foi alterado | Falha observada e registrada; requer triagem na tarefa proprietária antes de declarar regressão geral PASS |

## Verificações

- `npm run test:task011`: 13/13 PASS, 0 SKIP.
- `npm run lint:task011`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS; sem erros de whitespace. Git emitiu apenas avisos de normalização CRLF→LF para os arquivos do worktree.
- Integração Supabase: NOT RUN localmente porque Docker está inacessível; workflow efêmero preparado, sem execução remota nesta retomada.

## Veredito

A revisão estática e as verificações locais não apontaram defeito P1/P2 no escopo implementado. GATE-005 não pode ser aprovado enquanto a integração real da migration aguarda CI e a regressão `test:task006` permanece falhando na base integrada. A Etapa 006 está preparada por meio do roteiro, mas não foi iniciada nem executada; permanece dependente da aprovação dos gates anteriores e da execução manual pela operadora.
