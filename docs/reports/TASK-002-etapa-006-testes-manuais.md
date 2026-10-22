# TASK-002 — Etapa 006: Testes manuais

**Data:** 2026-10-22  
**Branch:** `task/TASK-002-persistencia-postgresql`  
**GATE:** GATE-006  
**Status da etapa:** APROVADA  
**Status da TASK:** `IN_REVIEW`

## 1. Escopo e pré-condições

O prompt da Etapa 006 foi lido junto com `AGENTS.md`, `TASKS.md`, `README.md`, ADR-006, relatório de implementação (GATE-004) e relatório de revisão (GATE-005). GATE-005 está aprovado. Branch atual corresponde à TASK-002; as alterações preexistentes da implementação e seus relatórios foram preservadas.

O escopo desta etapa é preparar e executar roteiro em Windows/PowerShell, com procedimentos complementares para WSL/Linux. `docs/testing/TASK-002-testes-manuais.md` inclui seis casos para configuração, migration round-trip/idempotência, conexão indisponível e sanitização, rollback transacional/health, segredo/configuração não versionados e limpeza. O container e a URL são sintéticos e locais, com imagem PostgreSQL fixada pelo digest de ADR-006.

## 2. Resultado e distinção entre evidência e pendência

Os seis casos foram executados pelo agente Codex a pedido explícito da usuária, em Windows PowerShell, com saídas e códigos preenchidos no roteiro. O banco PostgreSQL local descartável foi iniciado e removido após o teste. Não houve acesso a produção, credencial real ou serviço pago. WSL/Linux não foi executado nesta rodada; o kit contém comandos para esses ambientes. Uma discrepância no comando `git check-ignore` do teste T005 foi corrigida no próprio roteiro e o teste foi repetido com o procedimento corrigido. Uma tentativa inicial de varredura `rg` falhou por sintaxe do padrão; foi corrigida antes da aprovação final e não indicou falha de segurança.

Totais previstos: 6; executados: 6; aprovados: 6; reprovados: 0; bloqueados: 0; pendentes/não executados: 0.

## 3. Operações e validações desta etapa

| Operação | Código/resultado | Evidência |
|---|---|---|
| Leitura do prompt, `AGENTS.md`, `TASKS.md`, GATE-004 e GATE-005, ADR-006, código e scripts reais | PASS | Comandos de inspeção local; confirmados scripts `db:migrate`, `db:rollback`, `test:db`, arquivo `tests/db/task002.test.ts`, migration, configuração e comportamento do migrator. |
| Preparação do roteiro e casos T002-006-01..06 | PASS | `docs/testing/TASK-002-testes-manuais.md`; instruções PowerShell e Bash, esperado, evidência manual e status por caso. |
| Container PostgreSQL descartável + `pg_isready` | PASS, códigos 0 | Container iniciou na porta loopback 54329; health aceitou conexões; imagem e URL conforme ADR-006/roteiro. |
| T002-006-01 — configuração negativa/positiva | PASS, código 0 | Node v22.15.0: um teste, um aprovado, zero falhas/ignorados; URLs inválidas, limite zero e configuração válida cobertos pelo teste. |
| T002-006-02 — migration up/idempotência/down | PASS, códigos 0 | Schema `app` apareceu após up e desapareceu após down; repetição de up/down informou que não havia migration a aplicar. |
| T002-006-03 — conexão indisponível e sanitização | PASS, código 1 esperado | Migração encerrou com código 1; saída genérica; marcador sintético ausente (`MARKER_PRESENT:False`). |
| T002-006-04 — suíte DB/health/rollback | PASS, código 0 | 5/5 testes aprovados, 0 falhas. |
| T002-006-05 — ignore/segredos | PASS | `.env.local` ignorado, `.env.example` não ignorado, nenhum `.env` rastreado identificado; varredura limitada a padrões de chaves privadas/AWS/Stripe/Google não encontrou correspondências; nenhum valor foi exibido. `git diff --check` código 0. |
| T002-006-06 — limpeza | PASS, código 0 | `docker stop` terminou; `docker ps -a` confirmou remoção por `--rm`. Variáveis não foram persistidas fora dos processos de comando. |
| `npm ci` e execução WSL/Linux | NOT RUN | Dependências já estavam disponíveis; o roteiro foi executado em PowerShell. O procedimento WSL/Linux está documentado, mas não foi validado nesta rodada. |
| Deploy, serviço pago, banco de produção, credenciais/dados reais | NOT RUN | Fora do escopo/proibidos. |

## 4. Gate local e acumulado

| GATE | Etapa | Status | Evidência |
|---|---|---|---|
| GATE-001 | Recontextualização e histórico | CONCLUÍDO | `docs/reports/TASK-002-etapa-001-recontextualizacao.md`. |
| GATE-002 | Pré-condições e decisões | CONCLUÍDO | `docs/reports/TASK-002-revalidacao-dor-2026-10-22.md`. |
| GATE-003 | Planejamento | CONCLUÍDO | `docs/reports/TASK-002-etapa-003-planejamento.md`. |
| GATE-004 | Implementação | CONCLUÍDO | `docs/reports/TASK-002-etapa-004-implementacao.md`; migrations, DB tests e validações reportados. |
| GATE-005 | Revisão | CONCLUÍDO | `docs/reports/TASK-002-etapa-005-revisao.md`; dois achados não bloqueantes e risco diferido. |
| GATE-006 | Testes manuais | CONCLUÍDO | Seis casos executados e aprovados em `docs/testing/TASK-002-testes-manuais.md`; resultados e códigos observados registrados. |
| GATE-007 | Conclusão | PENDENTE | Não iniciado; depende de gate(s) anteriores e autorização explícita própria. |

**Gates concluídos:** 6/7. **Pendentes:** 1/7. **Bloqueados:** 0/7.

## 5. Scope Guard e pendências

**Scope Guard: PASS.** Alterados somente documentos diretamente afetados pela etapa (`docs/testing/TASK-002-testes-manuais.md`, este relatório e o registro GATE-006 em `TASKS.md`). Nenhum código, dependência, container, banco, credencial, CI, deploy ou tarefa posterior foi alterado/executado. A working tree já continha alterações da implementação TASK-002 e arquivos locais prévios; foram preservados.

Próxima etapa: GATE-007 — Conclusão, elegível para autorização explícita da usuária; não iniciado por esta execução. A limitação de plataforma está registrada: WSL/Linux não foi executado. Os achados R-005-01 (timeout global) e R-005-02 (diagnóstico genérico) permanecem observações não bloqueantes da revisão; esta etapa não os alterou.

==================================================
TASK: TASK-002
ETAPA: 006
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 6
GATES PENDENTES: 1
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- O comando inicial de T005 usava `git check-ignore -v` para `.env.example`, retornando 0 pela exceção; roteiro corrigido para testar ausência de ignore corretamente e reexecutado com código 1 esperado.
- Primeira tentativa da varredura `rg` teve erro de sintaxe no padrão iniciado por hífen; comando corrigido e reexecutado sem correspondências.
CORREÇÕES REALIZADAS:
- Executados os seis casos em Windows PowerShell e preenchidos resultados, códigos e evidências redigidas no roteiro.
- Corrigida a instrução do `git check-ignore` em T005, repetidos os testes T005 e verificada a limpeza do container.
- Atualizado `TASKS.md` com GATE-006 concluído.
PENDÊNCIAS:
- WSL/Linux não executado; a Etapa 007 ainda requer autorização explícita própria segundo `AGENTS.md`.
TESTES RELACIONADOS:
- PASS: T002-006-01 a T002-006-06 (6/6); suíte DB 5/5; round-trip e conexão sanitizada conforme evidências acima.
- PASS: `git diff --check` (código 0); container descartável removido.
- NOT RUN: `npm ci`, WSL/Linux, CI remoto, deploy e serviços/bancos de produção.
PRÓXIMA ETAPA: Etapa 007 — Conclusão
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-006 foi aprovado com 6/6 testes executados. A Etapa 007 pode ser autorizada separadamente; não foi iniciada agora, conforme `AGENTS.md`.
==================================================
