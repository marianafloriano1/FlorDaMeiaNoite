# ADR-002 — PostgreSQL transacional como fonte oficial de estoque

- **Status:** SEMÂNTICA TRANSACIONAL MANTIDA; provedor/implementação substituídos pelo ADR-007.
- **Data:** 2026-09-23
- **Rastreabilidade:** RF-007/008/014/017; RN-005/007/014/016; RNF-001/010; TASK-005, TASK-007, TASK-009.

## Contexto

O mesmo produto pode ser pedido por várias pessoas; finalização reserva unidades por três horas; expiração, cancelamento parcial e devolução ao estoque precisam ser idempotentes e auditáveis. Estoque online substituirá o Excel.

## Decisão

O princípio de banco relacional transacional e estoque como fonte oficial permanece. A escolha do serviço PostgreSQL direto/gerenciado anterior foi substituída por Supabase Database; não usar conexão direta `pg` na aplicação.

Usar PostgreSQL relacional gerenciado, transações e restrições como fonte oficial. Manter saldo atual com razão imutável de movimentos (`InventoryLedgerEntry`) e registros de reserva associados a pedido/linha. Reserva deve bloquear/condicionar a atualização do saldo disponível em uma transação; confirmar, expirar ou cancelar deve consumir/liberar exatamente uma vez. Não usar cache como autoridade de estoque.

## Alternativas

- Planilha: não resolve concorrência, trilha de auditoria nem atomicidade.
- Banco key-value/cache: não é adequado como única fonte para vínculos transacionais e relatórios.
- PostgreSQL em instância única sem HA: menor custo, pior recuperação de falha zonal.

## Consequências

- Requer modelo explícito de reserva/razão e testes de concorrência/idempotência.
- Consultas de leitura do catálogo podem usar cache; toda compra volta à transação no PostgreSQL.
- Regras pendentes (limite de reserva, produto último, limiar de alerta) devem ser decididas antes da TASK correspondente.
