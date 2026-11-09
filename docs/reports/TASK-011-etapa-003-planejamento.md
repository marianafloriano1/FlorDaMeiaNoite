# TASK-011 — Etapa 003 — Planejamento

**Data:** 2026-11-08
**Branch:** task/TASK-011-relatorios-exportacoes-metricas
**Base integrada:** fca96ed
**GATE-003:** APROVADO

## Objetivo e escopo

Implementar relatórios administrativos semanais e mensais, filtros consistentes e exportações XLSX/PDF. Acesso exclusivamente para admin, protegido no servidor. A semana usa segunda–domingo no fuso America/Sao_Paulo; o mês é civil nesse fuso. Faturamento usa somente pedidos com pagamento confirmado e total líquido do cupom. Data de criação e data de confirmação do pagamento são dimensões distintas. Cancelamentos após pagamento aparecem em indicador próprio sem inferir reembolso. Saídas agregadas; referência opaca apenas quando necessária, sem nome, contato, CPF ou endereço.

## Arquitetura planejada

1. Camada de domínio calcula intervalos locais inclusivos/exclusivos e agrega pedidos, linhas de produto e cart_events; converte limites do fuso local para instantes UTC.
2. Serviço server-side consulta apenas os campos necessários em orders, order_items e cart_events. Receita exige payment_confirmed_at não nulo. Cancelamentos pós-pagamento ficam em série separada.
3. Endpoint administrativo valida sessão/papel admin e filtros (intervalo, base temporal e formato). Nenhuma autorização apenas na UI.
4. UI administrativa apresenta período, base temporal, totais, mais/menos vendidos, adições ao carrinho e favoritos. Filtros e exportações reutilizam a mesma consulta/DTO.
5. Exportadores criam XLSX e PDF transitórios, sem armazenamento público. Registrar auditoria mínima da exportação (ator admin, instante do servidor, formato e filtros sem PII). Migration adicional somente se inspeção confirmar que não há estrutura existente suficiente; persistirá apenas metadados.
6. Valores monetários permanecem decimais até a formatação. Não subtrair cupom novamente de orders.total_brl, que é o total final do pedido.

## Matriz de critérios, arquivos e validação

| Critério | Mudança planejada | Evidência |
|---|---|---|
| Admin-only | API/page sob src/app/admin/reports e src/app/api/admin/reports; helper em src/lib/reports | Testes HTTP negam anônimo/customer/employee e permitem admin. |
| Semana/mês e fuso | src/lib/reports/periods.ts | Testes de fronteiras de semana, mês/ano e America/Sao_Paulo. |
| Receita por criação/pagamento | src/lib/reports/queries.ts e DTO | Fixtures comprovam dimensões separadas, líquido do cupom, exclusões e cancelamento pós-pagamento separado. |
| Produtos mais/menos vendidos | Agregação de order_items associada a pedidos elegíveis | Teste de quantidades e desempate determinístico. |
| Carrinho/favoritos | Agregação de cart_events por tipo e período | Testes distinguem cart_item_added e favorite_added; quantity_delta só conta unidades de carrinho. |
| Filtros consistentes | Parser compartilhado por JSON e exportadores | Comparação de mesmos filtros/valores; payload inválido retorna erro controlado. |
| XLSX/PDF | Exportadores isolados em src/lib/reports/export | Testes de MIME, conteúdo, nome seguro, sem PII e sem persistência pública. Dependências apenas se necessárias, registradas no lockfile. |
| Auditoria | Serviço de auditoria; migration aditiva somente se necessário | Integração Supabase verifica ator e instante do servidor, metadados minimizados e autorização. |
| Privacidade | DTO e exportadores | Asserções negativas para nome, contato, CPF e endereço; referência opaca apenas se necessária. |

## Arquivos previstos

Novos: src/app/admin/reports/page.tsx; src/app/api/admin/reports/route.ts e rota de exportação; src/lib/reports/types.ts, validation.ts, periods.ts, queries.ts, authorization.ts e exportadores; tests/task011; relatórios de implementação/revisão e roteiro manual.

Possíveis alterações: package.json/package-lock.json para scripts e bibliotecas de formatos; .github/workflows/ci.yml para validações TASK-011 e para separar corretamente diretivas if/run que hoje aparecem coladas em dois passos globais herdados; TASKS.md; migration aditiva de auditoria caso não haja estrutura adequada.

Não modificar funcionalidades de TASK-003/005/006/007/008/009, migrations históricas ou supabase/snippets/.

## Sequência de implementação

1. Confirmar schema, políticas e autorização; usar somente campos reais.
2. Implementar períodos e validação de filtros.
3. Implementar consultas agregadas e testes unitários sintéticos.
4. Criar endpoints admin-only e testes HTTP negativos/positivos.
5. Criar XLSX/PDF sobre DTO comum e testar ausência de PII.
6. Adicionar auditoria mínima; migration aditiva apenas se necessária.
7. Adicionar integração Supabase efêmera/CI sem skips, para agregações, auditoria e isolamento.
8. Construir UI administrativa sobre endpoints protegidos.
9. Rodar testes direcionados e regressões requeridas, lint, typecheck, build e diff check; revisar diff completo.
10. Preparar roteiro manual da Etapa 006 com procedimentos, resultados esperados e campos de evidência vazios; não declarar testes manuais executados.

## Dados e faturamento

- Fonte de pedidos: orders; linhas: order_items; métricas de interação: cart_events.
- Faturamento pela data de criação filtra orders.created_at e exige pagamento confirmado.
- Faturamento pela data de pagamento filtra orders.payment_confirmed_at.
- orders.total_brl é o total final persistido; não deduzir o cupom outra vez.
- Pedido não pago e cancelado antes do pagamento fica fora do faturamento.
- Cancelamento após pagamento é métrica separada, sem presumir reembolso.
- Períodos usam início inclusivo/fim exclusivo após conversão do fuso local para UTC.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Fronteiras de calendário/fuso | Testar viradas de semana, mês, ano e transições de timezone. |
| Receita duplicar desconto ou incluir pedido não pago | Reutilizar total final persistido e exigir confirmação de pagamento. |
| Vazamento de PII | Seleção explícita de colunas, DTO agregado, testes negativos e sem URL pública persistente. |
| Exportação excessiva | Limitar filtros/tamanho e registrar metadados sem payload pessoal. |
| Consultas lentas | Medir com dados sintéticos e adicionar somente índices justificados. |
| Auditoria sem estrutura existente | Avaliar schema antes; migration aditiva só para metadados mínimos. |
| CI YAML herdado inválido | Corrigir apenas separação sintática de if/run necessária à execução do workflow e validar YAML. |

## Rollback

Reverter somente arquivos da TASK-011 no branch dedicado. Se migration aditiva tiver sido aplicada em stack efêmera, descartar a stack efêmera; não executar rollback destrutivo em ambiente persistente. Código de exportação pode ser removido sem alterar pedidos ou ledger. Não fazer reset, limpeza de volume, rebase, cherry-pick ou push.

## Validações previstas

- Unitários: períodos, filtros, elegibilidade, agregações e serialização XLSX/PDF.
- HTTP: sessão, papéis, same-origin quando houver mutação de auditoria e validação dos parâmetros.
- Supabase efêmero: schema, agregações, auditoria, isolamento e ausência de PII.
- Regressão: suítes disponíveis de TASK-005/006/007/008/009 e test:catalog conforme escopo.
- Qualidade: lint direcionado TASK-011, typecheck, build, YAML e git diff --check.
- Neste planejamento, testes, migrations e serviços ficaram NOT RUN por ser uma etapa documental.

## Resultado do gate

Os critérios, arquivos, validações, riscos e rollback foram mapeados. As regras necessárias foram aprovadas anteriormente; não resta decisão essencial para iniciar implementação. A migration de auditoria será decidida após inspecionar as estruturas existentes.

TASK: TASK-011
ETAPA: 003
STATUS DA ETAPA: APROVADA
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 4
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Nenhum bloqueio do planejamento; detalhes de implementação serão validados na Etapa 004.
CORREÇÕES REALIZADAS:
- Plano, matriz de aceite, arquivos, testes, riscos e rollback registrados.
PENDÊNCIAS:
- Nenhuma decisão de negócio essencial para iniciar implementação.
TESTES RELACIONADOS:
- NOT RUN: etapa documental de planejamento.
PRÓXIMA ETAPA: 004 — Implementação
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-001, GATE-002 e GATE-003 aprovados.
