# TASK-002 — Persistência PostgreSQL e migrations base

**Estado inicial registrado:** BLOCKED. **Dependências declaradas:** TASK-001.

## Objetivo

definir conexão segura, migrations e convenções transacionais sem criar todas as entidades funcionais.

## Sequência

| Ordem | Etapa | Arquivo | GATE | Dependência |
|---:|---|---|---|---|
| 001 | Recontextualização e histórico | `prompt-task-002-etapa-001-recontextualizacao.md` | GATE-001 | — |
| 002 | Pré-condições e decisões | `prompt-task-002-etapa-002-pre-condicoes.md` | GATE-002 | GATE-001 |
| 003 | Planejamento | `prompt-task-002-etapa-003-planejamento.md` | GATE-003 | GATE-002 |
| 004 | Implementação | `prompt-task-002-etapa-004-implementacao.md` | GATE-004 | GATE-003 |
| 005 | Revisão | `prompt-task-002-etapa-005-revisao.md` | GATE-005 | GATE-004 |
| 006 | Testes manuais | `prompt-task-002-etapa-006-testes-manuais.md` | GATE-006 | GATE-005 |
| 007 | Conclusão | `prompt-task-002-etapa-007-conclusao.md` | GATE-007 | GATE-006 |

Execute sequencialmente; GATE anterior aprovado é pré-requisito. Primeiro prompt: `prompt-task-002-etapa-001-recontextualizacao.md`. A geração não inicia TASK nem altera estado. Respeite autorização, dependências, escopo, ADRs e pendências. Etapa 006 prepara testes manuais Windows/WSL/Linux; não aprova sem evidência do responsável. Conclusão exige critérios e DoD; TASK seguinte requer autorização própria.
