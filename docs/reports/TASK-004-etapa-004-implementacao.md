
## Validação OCI complementar — 2026-10-25

### Disponibilidade e preservação

- `docker version`: **PASS**. Client 29.9.2 e Docker Desktop/Engine 29.9.2, contexto `desktop-linux`.
- `docker ps`: **PASS**. Listou containers das stacks `task004-validation-20261025` e `flor-da-meia-noite-local`. Não havia necessidade de remover containers/volumes; nenhum recurso existente foi removido, reiniciado ou alterado por esta validação.
- Não foi iniciado runner, pois a etapa de build não chegou à imagem final. Nenhuma ação Git ou deploy.

### Fluxo oficial do Dockerfile

O `Dockerfile` oficial usa o estágio `dependencies` para `npm ci --no-audit --no-fund`, seguido pelo estágio `build`, cujo comando é `npm run lint && npm run typecheck && npm run build`.

1. `docker build --target runner --tag flor-task004-gate004-runner:20261025 .` reutilizou a camada de dependências cacheada e alcançou o lint.
2. **Lint global: FAIL.** O Biome retornou quatro erros, todos em arquivos TASK-003:
   - `src/app/api/auth/register/route.ts`: `assist/source/organizeImports` e `format`;
   - `src/lib/auth/http.ts`: `format`;
   - `tests/auth/task003.step-up.test.ts`: `format`.
3. O lint direcionado TASK-004 foi executado separadamente: **PASS**, 12 arquivos, nenhum diagnóstico.
4. Por encadeamento `&&`, typecheck e build **não foram executados pelo runner oficial** depois da falha de lint.
5. Tentativa oficial adicional com `docker build --no-cache --progress=plain --target runner --tag flor-task004-gate004-runner:20261025 .`: `npm ci --no-audit --no-fund` terminou com sucesso e adicionou 56 pacotes. Em seguida, `COPY --from=dependencies /app/node_modules ./node_modules` não apresentou progresso por cerca de três minutos. Interrompi somente esse build em andamento; nenhuma imagem, container, volume ou dado foi removido.
6. Typecheck e build OCI permanecem **NOT RUN**. Typecheck e build Next.js locais haviam passado na validação anterior; esses resultados não equivalem a um runner OCI validado.

**OCI: BLOCKED.** A construção oficial em cache parou nos quatro diagnósticos globais preexistentes TASK-003; a tentativa limpa concluiu `npm ci`, mas ficou sem progresso na cópia das dependências antes de chegar ao lint. TASK-003 não foi alterada. Não foram iniciados container de aplicação nem smoke test de endpoint.

### Resultado do GATE-004

Os critérios documentados anteriormente (catálogo, testes, lint direcionado, typecheck/build local, Supabase isolado e RNF-002 sintético) permanecem registrados como **PASS**. O critério OCI segue sem prova de build final, inicialização do runner e resposta HTTP; portanto **GATE-004: BLOCKED**. Pendência objetiva: validar runner e endpoint OCI após resolver a etapa de cópia de dependências e obter lint global sem os erros preexistentes TASK-003, sem modificar essa TASK. Etapa 005 não executada.

## Validação OCI isolada TASK-004 — 2026-10-25

### Ambiente e preservação

- Checkout: cópia isolada `flor-da-meia-noite-task-004`.
- `docker version`: **PASS**, Client e Engine 29.9.2. `docker ps`: **PASS**; as stacks `task004-validation-20261025` e `flor-da-meia-noite-local` permaneceram ativas. Nenhum container, volume, rede ou imagem existente foi removido.
- Dockerfile oficial inspecionado: Node 24.22.1 slim fixado por digest; `npm ci --no-audit --no-fund`; estágio build encadeia lint global, typecheck e build (`&&`), sem alvos oficiais individuais para essas verificações.

### Validação OCI de escopo TASK-004

Para não alterar o runner oficial nem os quatro diagnósticos TASK-003, foi criado em `%TEMP%` um Dockerfile temporário com a mesma base Node fixada, dependências do lockfile e estágios de verificação separados: testes TASK-004, lint TASK-004, typecheck e build. O arranjo manteve dependências no mesmo estágio de build e evitou a cópia intermediária de `node_modules` que havia travado anteriormente. O `npm ci` utilizou a camada cacheada proveniente da execução limpa anterior que havia adicionado 56 pacotes. O Dockerfile temporário foi removido depois do build.

| Verificação | Resultado | Evidência |
|---|---|---|
| `npm run test:catalog` | **PASS** | 8 testes, 8 aprovados, 0 falhas. |
| Biome direcionado TASK-004 | **PASS** | 12 arquivos conferidos, zero diagnósticos. |
| `npm run typecheck` | **PASS** | `next typegen` e `tsc --noEmit` concluíram. |
| `npm run build` | **PASS** | Next.js 16.4.2 compilou e gerou rotas de catálogo. |
| Runner OCI de escopo TASK-004 | **PASS** | Imagem standalone criada como `flor-task004-scope-oci-validation:20261025`. |
| Endpoint de catálogo no runner | **PASS** | `GET /api/catalog` HTTP 200, 2 produtos sintéticos da stack Supabase isolada. |
| Página de catálogo no runner | **PASS** | `GET /catalog` HTTP 200. |
| Filtro inválido no runner | **PASS** | `GET /api/catalog?minPrice=invalid` HTTP 400 esperado. |

O container `flor-task004-gate004-smoke-20261025` foi parado ao final e preservado; não foi removido. A imagem temporária de validação foi preservada, conforme a restrição de não apagar imagens. As stacks Supabase originais e isolada continuaram ativas.

### Diagnósticos globais fora do escopo

O runner oficial permanece incapaz de atravessar o lint global por quatro diagnósticos preexistentes da TASK-003: `src/app/api/auth/register/route.ts` (organização de imports e format), `src/lib/auth/http.ts` (format) e `tests/auth/task003.step-up.test.ts` (format). Nenhum diagnóstico TASK-004 apareceu. A validação delimitada não suprimiu nem executou correções nesses arquivos; TASK-003 permaneceu inalterada.

### Resultado

Evidências específicas da TASK-004: testes, lint direcionado, typecheck, build, imagem runner, endpoint e evidências Supabase/RNF-002/tradução previamente aprovadas: **PASS**. Considerando os quatro diagnósticos globais TASK-003 como preexistentes e fora deste escopo, **GATE-004 APROVADO para TASK-004**. TASK-004 fica **IN_REVIEW/apta para aprovação final**; etapas 005–007 não foram executadas.
