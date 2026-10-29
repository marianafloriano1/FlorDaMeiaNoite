# TASK-007 — Etapa 003 — Planejamento

**Data:** 2026-10-28
**Branch:** `task/TASK-007-painel-produtos-estoque`
**HEAD/base:** `73225c6a5df44245f6d6b059b95cf11df39800c1`
**Escopo:** plano de implementação; nenhum código, teste ou migration alterado.

## Fontes e inspeção

- `AGENTS.md`, `README.md`, seção TASK-007 de `TASKS.md`, `docs/adr/ADR-002-postgresql-e-estoque.md`, `docs/architecture/overview.md` e relatórios das Etapas 001 e 002.
- Prompt `prompts/tasks/task-007/prompt-task-007-etapa-003-planejamento.md`.
- Esquema: migrations de catálogo, estoque baixo, carrinho/reserva e restrição do ledger (`202610250001`, `202610250002`, `202610250003`, `202610270001`).
- Componentes: `src/lib/catalog/{service,types,filters}.ts`, páginas de catálogo, rotas de catálogo, `src/lib/auth/http.ts`, `src/lib/supabase/admin.ts`, rota e upload administrativo de contratos como padrões de autorização/storage.
- Testes e automação: `tests/catalog/*`, `tests/task005/*`, scripts de `package.json`, `.github/workflows/ci.yml`.
- Estado Git conferido: branch `task/TASK-007-painel-produtos-estoque`; alterações antes desta etapa eram documentais das Etapas 001 e 002. Não há página/rota administrativa de produtos/estoque, testes TASK-007, outbox ou adaptador de e-mail no checkout.

## Decisão aprovada — escopo dos alertas de estoque

Na revisão inicial foi encontrada uma contradição explícita e material:

- O aceite da seção TASK-007 em `TASKS.md` exige **“alerta site quando ≤7”**.
- O README/RN-002 especifica a mensagem pública exata **“Últimas unidades disponíveis.” somente para estoque 1–2**, sem aviso acima de 2; a view atual da TASK-004 fornece `low_stock_alert` para 1–2.
- README/RN-016 e RF-012 destinam o limite **≤7 ao e-mail interno da equipe**, com disparo no cruzamento, deduplicação e rearme acima de 7.

**Decisão formal da solicitante:** adotar o comportamento já especificado pelo README/RN-002: aviso público exato “Últimas unidades disponíveis.” somente para estoque 1–2; sem aviso acima de 2 e sem expor o saldo numérico. O limiar ≤7 é exclusivamente para e-mail interno da equipe, disparado ao cruzar de >7 para ≤7, sem repetição contínua enquanto permanecer ≤7 e rearmado quando voltar a >7.

O aceite da TASK-007 e este plano foram reconciliados com essa decisão. A view pública e o contrato existentes continuam alinhados; não se altera a arquitetura ou o comportamento público da TASK-004.

## Arquitetura planejada

1. **Supabase Database como autoridade:** conservar `catalog_products.stock_quantity` não negativo e fazer mudanças de saldo por operação transacional no banco. Não gravar saldo no cache nem confiar em validação apenas na UI.
2. **Ajuste auditável:** RPC/transação com bloqueio de linha (`FOR UPDATE` ou atualização condicional), validação do saldo, ator derivado da identidade verificada no servidor, instante criado no banco e motivo obrigatório após trim, entre 1 e 400 caracteres. Persistir saldo anterior/novo e delta junto à alteração; falha em auditoria/outbox reverte também o saldo. Operadores não podem editar/remover auditoria.
3. **Ledger:** estender o ledger existente somente para eventos de ajuste administrativo, preservando os eventos/restrições de reserva. Cada ajuste deve ser atômico com o saldo e incluir produto, ator, instante, anterior, novo, delta e motivo. Antes da migration, confirmar constraints/FKs e compatibilidade da RPC com as quatro migrations existentes; usar migration aditiva, sem reescrever histórico.
4. **Autorização:** rotas server-side autenticam via `requireSession`; permitir somente roles `employee` e `admin`; negar visitante/cliente e IDs/roles enviados pelo cliente. Para operações administrativas de `admin`, aplicar step-up conforme os helpers existentes. Escritas de service-role ficam exclusivamente no servidor. Testar cada papel positivo e negativo.
5. **Produtos e imagens:** criar/editar os campos definidos em RF-002 e manter estados draft/published existentes. Usar bucket `catalog` já público apenas para imagens de produto que serão exibidas publicamente; upload passa por endpoint autorizado, valida MIME/tamanho/extensão e gera chave sem path fornecido pelo usuário. Não reutilizar o bucket privado de contratos nem alterar seu acesso.
6. **Notificação interna:** uma mudança de estoque que atravesse de >7 para ≤7 cria evento/outbox na mesma transação. O disparo externo deve ser assíncrono, idempotente e tolerante a falha, sem reverter alteração do estoque por falha do provedor. Mudanças que continuem em ≤7 não criam outro evento; voltar a >7 rearma pelo estado de saldo, e um próximo cruzamento cria novo evento. Provider e domínio permanecem configuração pré-implantação; testes usam transporte sintético. Sem segredo, envio real ou billing.
7. **Alerta público:** conservar o contrato de catálogo atual: estoque 1–2 gera o sinal para exibir a mensagem literal; acima de 2 não gera alerta; estoque zero continua oculto publicamente. A quantidade não será exposta.

## Matriz critério → arquivos/áreas → evidência

Os caminhos novos abaixo são propostas, sujeitos à revisão do Scope Guard. Não existem no checkout hoje.

| Critério | Mudança planejada | Evidência/validação |
|---|---|---|
| Employee/admin criam e editam produtos | `src/app/admin/catalog/page.tsx`, `src/app/admin/catalog/new/page.tsx`, `src/app/admin/catalog/[id]/page.tsx`; endpoints `src/app/api/admin/catalog/products/route.ts` e `[id]/route.ts`; serviço/validação `src/lib/catalog/admin-service.ts` e `admin-validation.ts` | Testes de criação/edição, campos obrigatórios, limites e papéis; navegação protegida no servidor. |
| Ajuste de saldo auditável e não negativo | migration aditiva `supabase/migrations/202610280002_task007_inventory_admin.sql` (nome provisório); RPC; `src/app/api/admin/catalog/products/[id]/stock/route.ts`; extensão em serviço admin | Integração Supabase: saldo, ator, hora, anterior/novo, motivo; negativo/sem motivo/>400 rejeitados; falha parcial faz rollback; tentativa de alterar/apagar audit trail rejeitada. |
| Permissões | helpers em `src/lib/catalog/admin-authorization.ts` ou reutilização direta de `src/lib/auth/http.ts` e `src/lib/auth/step-up.ts`; endpoints acima | Sem sessão e cliente negados; employee autorizado; admin sem step-up negado e com step-up autorizado. |
| Mídia de produto | `src/lib/storage/catalog-products.ts`; `src/app/api/admin/catalog/products/[id]/images/route.ts`; uso do bucket `catalog` já existente | Upload com MIME/tamanho suportados; extensão/pasta inválida recusada; imagem pública acessível após publicação; bucket de contratos permanece privado. |
| Regra pública do alerta | Reutilizar `low_stock_alert` em `public_catalog_products` e o contrato em `src/lib/catalog/types.ts`/`src/lib/catalog/service.ts`; ajustar UI somente se a inspeção da implementação mostrar falta da mensagem literal. Não alterar o limiar público da TASK-004. | Testes de fronteira: 1–2 exibe mensagem exata, >2 sem alerta, 0 oculto; payload não contém quantidade numérica. |
| E-mail interno de baixo estoque e idempotência | tabela de outbox/estado de entrega na migration; trigger/RPC de transição; `src/workers/catalog-low-stock-notifications.mjs`; adapter configurável em `src/lib/notifications/email.ts`; script no `package.json` | Testes do ciclo 8→7→6→8→7: dois eventos de cruzamento (8→7 e 8→7), nenhum em 7→6 ou 6→8; retry não duplica evento; falha de e-mail não altera saldo. |
| Testes específicos | `tests/catalog/admin-validation.test.ts`, `admin-routes.test.ts`, `task007.integration.test.ts` e, se necessário, `tests/catalog/low-stock-notifications.test.ts` | Unit/API com dados sintéticos; integração em Supabase isolado com migrations em ordem; cenários de segurança, auditoria, concorrência de ajuste e outbox. |
| Regressão e qualidade | script específico `test:task007` em `package.json`; lint direcionado; `npm run typecheck`, build e `git diff --check` | Saída real dos comandos e testes. `npm run test:catalog` protege a compatibilidade de catálogo. Workflow CI não será alterado sem confirmar que é necessário e autorizado pelo escopo. |

## Mudanças permitidas e proibidas

**Allowed Changes:** telas/rotas de catálogo e estoque administrativo; migration, RPC e ledger para ajuste auditado; upload de imagem de produto no bucket de catálogo; notificação interna no limiar 7.

**Incidental:** melhoria de carregamento de imagens no painel, somente se necessária e mensurada dentro do escopo.

**Forbidden:** ajuste sem motivo ou com motivo >400; permitir ao usuário definir ator/data; acesso da equipe a dados/contratos de funcionários; importação Excel; qualquer alteração a TASK-003/004 fora da integração necessária; mudanças em carrinho, pedidos, pagamento ou arquitetura; provider pago sem autorização; exposição de saldo numérico público.

## Sequência de implementação proposta (Etapa 004, ainda não iniciada)

1. Usar a regra reconciliada nesta etapa; confirmar contratos de campos/erros e lista final de arquivos no Scope Guard antes de editar.
2. Criar migration aditiva para RPC de ajuste, trilha imutável e outbox; preservar constraints e funções de reserva; validar em Supabase isolado.
3. Implementar validação server-side e APIs com autorização employee/admin e step-up para ações admin.
4. Implementar UI mínima de listagem/criação/edição e ajuste justificado, sem reescrever páginas públicas.
5. Implementar upload seguro de imagem no bucket `catalog`.
6. Implementar dispatcher de alertas com transporte configurável e sink sintético; não ativar integração faturável.
7. Adicionar testes unitários/API/integração, validar sequência completa de migrations, permissões, transações, idempotência, upload e regressão do catálogo; executar gates definidos.
8. Revisar diff contra Allowed/Forbidden Changes e registrar evidências antes de liberar revisão.

## Riscos e mitigação

- **Divergência do limiar público:** pode produzir contrato de API e interface incoerentes. Mitigação: decisão da solicitante antes de codificar; teste exato nos limites.
- **Múltiplos caminhos de alteração de saldo (reserva, expiração, ajuste):** podem ignorar auditoria ou alerta. Mitigação: trigger/outbox no banco sobre transição efetiva do saldo e integração Supabase que cobre todos os caminhos.
- **Concorrência:** ajustes baseados em valor lido pela UI podem sobrescrever alterações. Mitigação: RPC transacional, lock/condição e retorno do saldo confirmado; teste concorrente.
- **Falha do provedor de e-mail:** não pode reverter saldo nem perder silenciosamente o aviso. Mitigação: outbox, retry limitado, estado de falha observável e alerta operacional conforme padrão do projeto; adapter sintético nos testes.
- **Service-role/RLS:** uso indevido expõe escrita privilegiada. Mitigação: nunca enviar chave ao cliente, validar sessão/role em cada endpoint, limitar chamadas e testar negações.
- **Storage público:** imagens do catálogo são publicamente acessíveis. Mitigação: armazenar somente imagens aprovadas para publicação, validar tipo/tamanho e não colocar dados privados no bucket.
- **Migração e histórico:** alteração de constraints pode afetar reservas anteriores. Mitigação: migration estritamente aditiva, testar sobre as migrations reais em stack efêmera e não apagar/reescrever linhas existentes.

## Rollback

- Antes da publicação: reverter somente a versão da aplicação para o artefato anterior; migration aditiva permanece sem remover dados.
- Desabilitar temporariamente as novas rotas/links por autorização server-side e interromper o worker/outbox sem apagar eventos pendentes.
- Não executar `db reset`, apagar ledger/auditoria, remover objetos existentes ou aplicar rollback destrutivo. Qualquer compensação de estoque deve ser um novo movimento auditado.
- Se a migration falhar em ambiente isolado, parar no primeiro erro, preservar evidência e corrigir migration somente após autorização; nunca aplicar em produção para validar.

## Dependências e decisões

- Dependências externas de tarefa: TASK-003/004/005 DONE; GATE-001 e GATE-002 aprovados.
- Limiar resolvido e reconciliado: aviso público para 1–2; e-mail interno ao cruzar para ≤7, deduplicado e rearmado acima de 7.
- Provider/domínio de e-mail: não selecionados; configuração antes de implantação, não bloqueia planejamento nem testes com adapter sintético.
- CI: workflow existente oferece runner Ubuntu e stack Supabase efêmera para TASK-005. Se a validação TASK-007 precisar de job dedicado, revisar autorização de escopo antes de editar `.github/workflows/ci.yml`.

## Resultado e gates acumulados

O plano técnico e a matriz de escopo foram produzidos e a divergência foi resolvida pela decisão formal da solicitante. O GATE-003 está aprovado; a Etapa 004 está habilitada para execução futura, mas não foi iniciada nesta retomada.

| Gate | Estado | Evidência |
|---|---|---|
| GATE-001 | CONCLUÍDO | `docs/reports/TASK-007-etapa-001-recontextualizacao.md`. |
| GATE-002 | CONCLUÍDO | `docs/reports/TASK-007-etapa-002-pre-condicoes.md`. |
| GATE-003 | CONCLUÍDO | Plano e decisão de limiares reconciliados; este relatório. |
| GATE-004 | PENDENTE | Implementação não iniciada. |
| GATE-005 | PENDENTE | Revisão não iniciada. |
| GATE-006 | PENDENTE | Testes manuais não iniciados. |
| GATE-007 | PENDENTE | Conclusão não iniciada. |

**Totais:** 3 concluídos; 4 pendentes; 0 bloqueados.

==================================================
TASK: TASK-007
ETAPA: 003
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 4
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Nenhum bloqueio obrigatório restante para o planejamento.
CORREÇÕES REALIZADAS:
- Aceite da TASK-007 e plano reconciliados com a decisão formal: aviso público 1–2; e-mail interno ≤7 no cruzamento.
PENDÊNCIAS:
- Nenhuma decisão de negócio pendente para iniciar a Etapa 004.
TESTES RELACIONADOS:
- NOT RUN — planejamento documental; nenhuma implementação ou teste foi executado.
PRÓXIMA ETAPA: 004 — Implementação
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: a regra foi definida e documentada; GATE-001, GATE-002 e GATE-003 estão concluídos. A Etapa 004 não foi executada nesta retomada.
==================================================
