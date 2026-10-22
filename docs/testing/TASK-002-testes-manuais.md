# TASK-002 — Kit de testes manuais (GATE-006)

**Escopo:** persistência PostgreSQL, migrations base e rollback transacional.  
**Ambiente autorizado:** banco local descartável PostgreSQL 17.11 em container, dados e credencial sintéticos. Nunca apontar para produção.  
**Resultado:** seis testes executados em Windows PowerShell por Codex a pedido da usuária; os procedimentos WSL/Linux foram preparados, mas não executados nesta rodada.

## Antes de começar

1. Use a branch `task/TASK-002-persistencia-postgresql` e a raiz do repositório.
2. Confirme Node.js `>=22 <25`, npm e Docker Engine funcionais. Não instale nada fora do lockfile; `npm ci` é o procedimento reproduzível caso `node_modules` não esteja disponível.
3. Use somente o container e a URL abaixo, que são locais e descartáveis. Não copie os valores para arquivos versionados, tickets ou evidências públicas.
4. Mantenha o container ativo durante os testes de migration e rollback. Ao terminar, pare-o e confirme a remoção.
5. Faça cada teste separadamente e preencha os campos “Resultado obtido”, “Evidência” e “Responsável/data” com fatos observados. Não marque aprovado somente porque um comando foi preparado.

### Preparação — Windows PowerShell

Na raiz do repositório, em uma janela PowerShell:

```powershell
docker run --rm --detach --name flor-task002-manual --publish 127.0.0.1:54329:5432 --env POSTGRES_PASSWORD=local-only-change-me --env POSTGRES_DB=flor_test postgres@sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb
docker exec flor-task002-manual pg_isready -U postgres -d flor_test
$env:DATABASE_URL = 'postgresql://postgres:local-only-change-me@127.0.0.1:54329/flor_test'
$env:DB_POOL_MAX = '2'
npm ci
```

Esperado: o container inicia, `pg_isready` confirma conexões aceitas e `npm ci` termina com código 0. Se as dependências já estiverem instaladas pelo mesmo lockfile, `npm ci` ainda é o modo limpo recomendado.

### Preparação — WSL/Linux (Bash)

Na raiz do repositório, em Bash:

```bash
docker run --rm --detach --name flor-task002-manual --publish 127.0.0.1:54329:5432 --env POSTGRES_PASSWORD=local-only-change-me --env POSTGRES_DB=flor_test postgres@sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb
docker exec flor-task002-manual pg_isready -U postgres -d flor_test
export DATABASE_URL='postgresql://postgres:local-only-change-me@127.0.0.1:54329/flor_test'
export DB_POOL_MAX='2'
npm ci
```

No WSL, confirme que o Docker CLI usado aponta para o daemon habilitado no ambiente. Não use credenciais nem banco do host/produção.

## Testes

### TESTE: T002-006-01 — Configuração obrigatória e validação negativa

**Objetivo:** provar que a aplicação exige `DATABASE_URL` PostgreSQL e `DB_POOL_MAX` inteiro positivo; configuração ausente, protocolo incorreto e limite zero são rejeitados sem expor a URL.

**Pré-condições:** dependências instaladas; PostgreSQL descartável ativo; execute a suíte primeiro sem `DATABASE_URL`/`DB_POOL_MAX` se seu shell ainda não os definiu, depois com variáveis sintéticas conforme preparação.

**Comando/procedimento (PowerShell):**

```powershell
node --import=tsx --test --test-name-pattern="database configuration requires a PostgreSQL URL" tests/db/task002.test.ts
$LASTEXITCODE
```

**Comando/procedimento (WSL/Linux):**

```bash
node --import=tsx --test --test-name-pattern="database configuration requires a PostgreSQL URL" tests/db/task002.test.ts
echo $?
```

**Resultado esperado:** um teste aprovado, zero falhas; o caso comprova as três rejeições e a configuração válida, usando valores sintéticos definidos dentro do teste. Os demais casos da suíte devem ser ignorados pelo filtro de nome. Para validar a suíte completa com DB, execute T002-006-04.

**Resultado obtido:** aprovado; Node.js v22.15.0 executou 1 teste, 1 aprovado, 0 falhas, 0 ignorados; código 0.  
**Evidência:** saída TAP resumida: `# tests 1`, `# pass 1`, `# fail 0`, `EXIT:0`. O teste verificou URL ausente, protocolo inválido, pool zero e configuração sintética válida.  
**Responsável/data:** Codex, execução solicitada pela usuária; 22/10/2026, BRT.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T002-006-02 — Migration sobe, repete sem efeito e reverte

**Objetivo:** verificar o round-trip da migration do schema técnico vazio `app`, a idempotência de `up` repetido e a remoção segura por `down` no DB descartável.

**Pré-condições:** PostgreSQL descartável ativo; `DATABASE_URL` e `DB_POOL_MAX` definidos conforme preparação.

**Comando/procedimento (PowerShell):**

```powershell
npm run db:migrate
docker exec flor-task002-manual psql -U postgres -d flor_test -Atc "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app';"
npm run db:migrate
npm run db:rollback
docker exec flor-task002-manual psql -U postgres -d flor_test -Atc "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app';"
npm run db:rollback
```

**Comando/procedimento (WSL/Linux):**

```bash
npm run db:migrate
docker exec flor-task002-manual psql -U postgres -d flor_test -Atc "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app';"
npm run db:migrate
npm run db:rollback
docker exec flor-task002-manual psql -U postgres -d flor_test -Atc "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app';"
npm run db:rollback
```

**Resultado esperado:** primeiro `up` reporta a migration aplicada; consulta retorna somente `app`; segundo `up` informa que não há migrations; primeiro `down` reverte a migration; segunda consulta não retorna linhas; segundo `down` termina sem erro. Todos os comandos usam somente a base local descartável.

**Resultado obtido:** aprovado; `up` inicial criou o schema; repetição não aplicou migration; `down` removeu schema; repetição de `down` não aplicou migration.  
**Evidência:** `UP1_EXIT:0`, consulta retornou `app`, `UP2_EXIT:0` com “No migrations to apply.”, `DOWN1_EXIT:0`, consulta pós-down vazia, `DOWN2_EXIT:0` com “No migrations to apply.”  
**Responsável/data:** Codex, execução solicitada pela usuária; 22/10/2026, BRT.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T002-006-03 — Falha de conexão não revela segredo

**Objetivo:** conferir que falha de conexão encerra o comando com código diferente de zero e mensagem sanitizada, sem URL/usuário/senha.

**Pré-condições:** nenhuma instância escutando em `127.0.0.1:54330`; utilize o marcador sintético abaixo, nunca um segredo real.

**Comando/procedimento (PowerShell):**

```powershell
$env:DATABASE_URL = 'postgresql://synthetic-marker:synthetic-secret@127.0.0.1:54330/unavailable'
$env:DB_POOL_MAX = '2'
npm run db:migrate
$LASTEXITCODE
```

**Comando/procedimento (WSL/Linux):**

```bash
DATABASE_URL='postgresql://synthetic-marker:synthetic-secret@127.0.0.1:54330/unavailable' DB_POOL_MAX=2 npm run db:migrate
echo $?
```

**Resultado esperado:** código diferente de zero e somente a mensagem genérica do migrator; `synthetic-marker`, `synthetic-secret`, URL, stack e detalhes do driver não aparecem na saída. Depois restaure a URL do banco de teste para seguir.

**Resultado obtido:** aprovado; comando falhou de forma controlada com código 1 e a mensagem genérica esperada.  
**Evidência:** `EXIT:1`; `MARKER_PRESENT:False`; saída continha somente `Database migration failed. Check database configuration and connectivity.` e nenhum detalhe de conexão.  
**Responsável/data:** Codex, execução solicitada pela usuária; 22/10/2026, BRT.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T002-006-04 — Suíte DB: health, round-trip e rollback transacional

**Objetivo:** executar a suíte já existente que cobre configuração válida, migration e repetição, health check conectado, rollback de transação com fixture sintética e resposta sanitizada quando o DB está indisponível.

**Pré-condições:** banco local descartável ativo e migration limpa; restaure `DATABASE_URL` para `flor_test` e `DB_POOL_MAX=2`.

**Comando/procedimento (PowerShell):**

```powershell
$env:DATABASE_URL = 'postgresql://postgres:local-only-change-me@127.0.0.1:54329/flor_test'
$env:DB_POOL_MAX = '2'
npm run test:db
$LASTEXITCODE
```

**Comando/procedimento (WSL/Linux):**

```bash
export DATABASE_URL='postgresql://postgres:local-only-change-me@127.0.0.1:54329/flor_test'
export DB_POOL_MAX=2
npm run test:db
echo $?
```

**Resultado esperado:** 5 testes aprovados, 0 falhas, código 0. Em particular, teste transacional confirma que a linha sintética não persiste após falha induzida; teste sem DB retorna apenas `503 {"status":"unavailable"}`. Não copiar URLs dos relatórios.

**Resultado obtido:** aprovado; os cinco testes da suíte passaram, sem falhas, código 0.  
**Evidência:** TAP `# tests 5`, `# pass 5`, `# fail 0`, `EXIT:0`; cobriu configuração, migration round-trip, health conectado, rollback transacional e health sanitizado sem DB.  
**Responsável/data:** Codex, execução solicitada pela usuária; 22/10/2026, BRT.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T002-006-05 — Segredos e arquivos de configuração não versionados

**Objetivo:** conferir que `.env*` é ignorado, exceto o modelo `.env.example`, e que arquivos/configurações com credenciais reais não serão incluídos no repositório.

**Pré-condições:** revisão local da árvore e do diff; nunca revelar valores de segredo na captura.

**Comando/procedimento (PowerShell):**

```powershell
git check-ignore -v .env.local
"ENV_LOCAL_EXIT:$LASTEXITCODE"
git check-ignore .env.example
"ENV_EXAMPLE_EXIT:$LASTEXITCODE"
git ls-files | Select-String '(^|/)\.env($|\.)'
git status --short
```

**Comando/procedimento (WSL/Linux):**

```bash
git check-ignore -v .env.local
echo "ENV_LOCAL_EXIT:$?"
git check-ignore .env.example
echo "ENV_EXAMPLE_EXIT:$?"
git ls-files | grep -E '(^|/)\.env($|\.)' || true
git status --short
```

**Resultado esperado:** `.env.local` está ignorado (`git check-ignore -v` código 0); `.env.example` não está ignorado (`git check-ignore` sem `-v` não imprime correspondência e retorna código 1, esperado). Qualquer arquivo `.env` rastreado é investigado antes da aprovação. Revise o conteúdo versionado e alterações não rastreadas localmente para garantir que só haja placeholders sintéticos. Não inclua conteúdo/valores de arquivos `.env` na evidência. No estado atual inspecionado para esta etapa, `.env.example` existe como arquivo local ainda não rastreado, então o `git ls-files` pode não listá-lo; registre esse fato sem tratá-lo como segredo.

**Resultado obtido:** aprovado após ajuste do comando no roteiro. `.env.local` ignorado; `.env.example` não ignorado; nenhum caminho `.env` rastreado encontrado; varredura de padrões de chaves privadas/AWS/Stripe/Google não encontrou correspondências.  
**Evidência:** `.env.local`: `.gitignore:6:.env*`, código 0; `.env.example`: sem correspondência, código 1 (esperado); varredura de caminho apenas: `NO_MATCHES`; `git diff --check`: código 0.  
**Responsável/data:** Codex, execução solicitada pela usuária; 22/10/2026, BRT.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T002-006-06 — Limpeza do ambiente descartável

**Objetivo:** provar que o banco temporário foi encerrado/removido e que nenhuma conexão de produção foi utilizada.

**Pré-condições:** T002-006-01 a T002-006-05 concluídos ou anotados como não executados; nenhuma outra pessoa usando o container nomeado.

**Comando/procedimento (PowerShell e WSL/Linux):**

```text
docker stop flor-task002-manual
docker ps -a --filter name=flor-task002-manual
```

No PowerShell, remova as variáveis sintéticas da sessão ao terminar:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DB_POOL_MAX -ErrorAction SilentlyContinue
```

Em Bash:

```bash
unset DATABASE_URL DB_POOL_MAX
```

**Resultado esperado:** `docker stop` termina com código 0; devido a `--rm`, a consulta não apresenta container; variáveis sintéticas removidas do shell. Se o container não iniciou, registre `NOT RUN` para stop e explique.

**Resultado obtido:** aprovado; container parado e removido pelo `--rm`; nenhuma variável foi persistida fora dos processos PowerShell usados para os comandos.  
**Evidência:** `docker stop` identificou o container, código 0; `docker ps -a --filter name=flor-task002-manual` não listou containers, código 0.  
**Responsável/data:** Codex, execução solicitada pela usuária; 22/10/2026, BRT.  
**STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

## Registro consolidado de execução

Preencher após execução pelo responsável; itens não executados permanecem pendentes.

| Medida | Total |
|---|---:|
| Testes previstos | 6 |
| Executados | 6 |
| Aprovados | 6 |
| Reprovados | 0 |
| Bloqueados | 0 |
| Pendentes / não executados | 0 |

**Responsável pela execução:** Codex, a pedido explícito da usuária.  
**Data/hora e fuso:** 22/10/2026; durante esta sessão, fuso America/Sao_Paulo (UTC−03:00).  
**Ambiente:** Windows PowerShell; Node v22.15.0; npm 11.6.1; Docker Engine 29.9.2; PostgreSQL 17.11 fixado pelo digest da ADR-006.  
**Observações/falhas e códigos de saída:** container iniciou e `pg_isready` retornou código 0. `npm ci` não foi executado porque dependências necessárias já estavam disponíveis. A primeira checagem T005 utilizou `git check-ignore -v` para `.env.example`, que exibe a exceção e retorna 0; o roteiro foi corrigido para usar `git check-ignore` sem `-v`, obtendo código 1 esperado para arquivo não ignorado, e o teste foi repetido e aprovado. O primeiro comando de `rg` teve erro de sintaxe por o padrão começar com hífen; foi repetido com `-e`, sem correspondências. O container foi removido ao final. WSL/Linux não foi executado.

## Limites e rastreabilidade

- A implementação já contém `npm run test:db` (5 testes automatizados) e validação de migration no GATE-004. Isso é evidência complementar, não substitui a execução e o registro dos cenários deste roteiro.
- A suíte e os comandos foram derivados de `TASKS.md`, `README.md`, ADR-002, ADR-006, GATE-004 e GATE-005. Não há entidades de domínio nesta TASK, logo cenários de permissão de funcionário/cliente não se aplicam.
- O banco de teste é o PostgreSQL descartável local já aprovado na ADR-006. Não há configuração de CI remoto, deploy, DB produtivo ou serviço pago neste kit.
- **Observação de segurança:** o teste negativo insere um marcador sintético no comando; não use segredo real e não armazene sua saída integral. Se detectar vazamento de configuração, pare, classifique como falha e reporte sem reproduzir o valor.
