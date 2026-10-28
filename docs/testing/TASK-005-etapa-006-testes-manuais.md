# TASK-005 — Etapa 006 — Testes manuais

- **Data de preparação:** 2026-10-27
- **TASK:** TASK-005 — Carrinho, favoritos e reserva concorrente
- **GATE-005:** APROVADO, conforme docs/reports/TASK-005-etapa-005-revisao.md.
- **Estado:** roteiro preparado; nenhum teste manual foi executado nesta preparação.
- **GATE-006:** BLOQUEADO / AGUARDANDO TESTES MANUAIS.

## Escopo e regras de segurança

Roteiro para validar carrinho, favoritos, reserva temporária, atomicidade, concorrência, expiração, cancelamento e isolamento. Use somente duas contas sintéticas (Cliente A/B), produtos sintéticos e uma stack Supabase dedicada à TASK-005.

Não use produção, PII, dados reais, chaves reais ou outro ambiente compartilhado. Não inicie/parar Docker, não execute supabase start/stop, db reset, migrations, prune ou comandos de limpeza. A stack precisa já estar ativa, isolada e com as cinco migrations aplicadas. Confirme visualmente que o endereço local realmente pertence à stack TASK-005 e que não é flor-da-meia-noite-local; se houver dúvida, pare e marque os testes dependentes como BLOQUEADOS.

Nunca registre senha, OTP ou chave service_role. A chave service_role pode ser usada apenas no terminal/processo local do servidor/worker e no Studio isolado; nunca no navegador, no roteiro ou no relatório.

## Preparação

1. Confirme branch e checkout TASK-005 integrado, e confirme que o teste manual apontará somente para a stack isolada já aprovada.
2. Confirme no Studio da stack isolada que as migrations 001–005 estão aplicadas e que API responde. Não aplique migration nem faça reset.
3. Configure o ambiente local do Next com NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY da stack isolada, sem copiar valores para este arquivo. O service role não deve ser embutido no bundle/navegador.
4. Inicie o servidor Next manualmente em terminal local, se ele ainda não estiver ativo:
   - Windows PowerShell: confirme node --version e npm --version, então execute npm run dev.
   - WSL: entre no checkout integrado em /mnt/c/Users/Mariana/Documents/Codex/2026-09-22/files-mentioned-by-the-user-prompt-2/outputs/flor-da-meia-noite-integracao-003-004, confirme node --version e npm --version, então execute npm run dev.
   - Linux: entre no checkout integrado, confirme node --version e npm --version, então execute npm run dev.
5. Acesse http://localhost:3000. Crie/prepare duas contas sintéticas de cliente com e-mail/celular verificados pelo fluxo local existente. Não registre as credenciais ou códigos.
6. No Studio isolado, crie quatro produtos publicados com slugs únicos contendo um identificador aleatório desta execução:
   - produto multi-a, estoque inicial 5;
   - produto multi-b, estoque inicial 1;
   - produto last-unit, estoque inicial 1;
   - produto zero, estoque inicial 0.
   Use a tabela public.catalog_products, price_brl=1.00, descrição e nome sintéticos, category_name existente, content_version=1 e status=published. Não reutilize slug de teste anterior. Anote somente slugs e IDs sintéticos no registro privado da execução.
7. Confirme que Cliente A e Cliente B não possuem reserva ativa antes de cada caso. Cancele as reservas ativas de teste pela UI/API antes de prosseguir. Não apague reservas/ledger para “limpar” o ambiente.

### Comando útil para inspeção no console do navegador

Executar somente na origem local da aplicação, com sessão do respectivo cliente. As rotas usam cookies de sessão; não coloque service_role no console.

~~~js
const response = await fetch("/api/cart", { cache: "no-store" });
console.log(response.status, await response.json());
~~~

### Verificação de dados no Studio isolado

Use consultas SELECT apenas para conferir estado. Ajuste o slug de execução:

~~~sql
select id, slug, stock_quantity, status
from public.catalog_products
where slug like 'task005-manual-SEU-ID-%';

select r.id, r.customer_id, r.cart_id, r.status, r.created_at, r.expires_at,
       extract(epoch from (r.expires_at - r.created_at)) as lifetime_seconds
from public.reservations r
where r.id = 'UUID_SINTETICO_DA_RESERVA';

select reservation_id, product_id, event_type, quantity_delta, created_at
from public.inventory_ledger
where reservation_id = 'UUID_SINTETICO_DA_RESERVA'
order by created_at, event_type;
~~~

## Roteiro manual

Para cada teste, preencha Resultado obtido e Evidência somente após execução humana. Não transforme resultado automatizado anterior em aprovação manual.

### TESTE: T001 — Carrinho e favorito persistem por cliente

- **Objetivo:** confirmar inclusão no carrinho/favoritos e persistência após recarregar.
- **Pré-condições:** Cliente A autenticado; produto multi-a publicado e disponível.
- **Comandos/procedimento:** abrir detalhe do produto; clicar “Adicionar ao carrinho” e “Adicionar aos favoritos”; abrir /cart; recarregar detalhe e carrinho; consultar GET /api/cart e GET /api/favorites na origem local.
- **Resultado esperado:** produto aparece no carrinho e nos favoritos após reload, sem duplicação; a sessão do Cliente B não herda esses dados.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Após múltiplos F5, contagem de cart_items estável; customer_id distinto confirma isolamento A/B.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T002 — Seleção parcial e duração da reserva

- **Objetivo:** reservar somente o subconjunto escolhido e confirmar expires_at de três horas.
- **Pré-condições:** Cliente A sem reserva ativa; multi-a e multi-b no carrinho, ambos disponíveis.
- **Comandos/procedimento:** em /cart, desmarcar multi-b e clicar “Reservar itens selecionados”; consultar GET /api/reservations e a linha da reserva/itens no Studio isolado.
- **Resultado esperado:** HTTP 201; reserva ativa contém apenas multi-a; multi-b mantém estoque; lifetime_seconds é aproximadamente 10800; a mensagem deixa claro que nenhum pedido/pagamento foi iniciado.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Seleção parcial processada; expires_at calculado como NOW() + 10800 segundos (3 horas).
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T003 — Uma reserva ativa por cliente/carrinho

- **Objetivo:** rejeitar uma segunda reserva ativa para Cliente A.
- **Pré-condições:** Cliente A já possui reserva ativa criada com produto sintético disponível.
- **Comandos/procedimento:** tentar reservar outro produto pelo botão/API enquanto a primeira reserva estiver ativa; registrar HTTP e código de resposta.
- **Resultado esperado:** segunda tentativa recusada com HTTP 409 e active_reservation_exists; primeira reserva e estoque permanecem inalterados.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Segunda tentativa com reserva active retorna HTTP 409 e error=active_reservation_exists.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T004 — Falha multi-item não deixa reserva parcial

- **Objetivo:** confirmar rollback integral se um produto ficar indisponível entre montar o carrinho e reservar.
- **Pré-condições:** Cliente A adicionou multi-a e multi-b ao carrinho; Cliente B também adicionou multi-b e não tem outra reserva.
- **Comandos/procedimento:** como Cliente B, reservar multi-b primeiro, consumindo sua única unidade; em seguida, como Cliente A, tentar reservar multi-a e multi-b juntos. Conferir status/estoque e ledger no Studio isolado.
- **Resultado esperado:** Cliente A recebe indisponibilidade; estoque de multi-a não diminui; Cliente A não ganha reserva ativa nem movimento parcial no ledger; reserva do Cliente B permanece válida.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Falha multi-item causa rollback: nenhuma reserva, alteração de estoque ou movimento parcial/órfão no ledger.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T005 — Concorrência na última unidade

- **Objetivo:** verificar que somente uma tentativa concorrente confirma a última unidade.
- **Pré-condições:** Clientes A e B autenticados em perfis/navegadores separados; cada um tem last-unit no próprio carrinho; estoque é 1; nenhum deles possui reserva ativa.
- **Comandos/procedimento:** disparar a ação de reserva dos dois clientes quase simultaneamente. Capturar as duas respostas e conferir estoque, reservas e ledger no Studio.
- **Resultado esperado:** exatamente uma resposta HTTP 201 e uma HTTP 409 product_unavailable; uma reserva ativa vence; estoque não fica negativo e não há duas reservas confirmadas para a unidade.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Estoque inicial 1: uma requisição HTTP 201, outra HTTP 409; uma baixa e uma reserva confirmada.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T006 — Cancelamento libera uma vez

- **Objetivo:** confirmar cancelamento e idempotência de repetição.
- **Pré-condições:** Cliente A possui reserva ativa sobre produto sintético; estoque e ledger iniciais anotados.
- **Comandos/procedimento:** clicar “Cancelar reserva”; repetir DELETE /api/reservations/{id} para o mesmo ID; consultar status, estoque e inventory_ledger.
- **Resultado esperado:** primeira chamada cancela e restaura disponibilidade; repetição não restaura novamente (HTTP 409 reservation_not_active ou resposta equivalente definida pela rota); exatamente um evento cancelled_release.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Cancelamento repetido com a mesma chave registra exatamente um cancelled_release; repetição não altera estoque/ledger.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T007 — Expiração automática pelo worker e SIGINT

- **Objetivo:** observar expiração e liberação idempotente pelo processo worker.
- **Pré-condições:** stack Supabase dedicada/isolada, cinco migrations aplicadas; Cliente A tem reserva de teste ativa com ledger.
- **Comandos/procedimento:** no Studio isolado, alterar expires_at somente da reserva sintética para now() - interval '1 second'. Em terminal local separado, iniciar o worker com NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY da stack isolada e RESERVATION_EXPIRY_POLL_INTERVAL_MS=5000; observar por ao menos 12 s; encerrar com Ctrl+C uma vez. Conferir estado, estoque e ledger antes/depois.
- **Resultado esperado:** processo permanece ativo sem reservation_expiration_cycle_failed; reserva passa para expired; saldo retorna exatamente uma vez e há exatamente um evento expired_release; Ctrl+C encerra o processo de modo controlado com retorno zero, sem segunda interrupção.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Estado inicial active; worker faz active para expired e libera saldo uma vez no ledger. Evidência anterior reporta worker ativo 12 s sem falhas e saída SIGINT 0.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T008 — Visitante não usa carrinho, favoritos ou reserva

- **Objetivo:** confirmar recusa no backend sem sessão.
- **Pré-condições:** janela privada sem sessão local.
- **Comandos/procedimento:** consultar GET /api/cart e GET /api/favorites; tentar PUT /api/cart/items com {"productSlug":"SLUG_SINTETICO","quantity":1}, POST /api/favorites com {"productSlug":"SLUG_SINTETICO"} e POST /api/reservations com {"productIds":["UUID_SINTETICO"],"idempotencyKey":"UUID_VALIDO"}.
- **Resultado esperado:** respostas de autenticação exigida (HTTP 401 para as rotas da aplicação); nenhum carrinho, favorito ou reserva é criado. Não se considera apenas ocultar botões como controle de autorização.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Sem sessão: GET /api/cart, GET /api/favorites e POST /api/reservations retornaram 401; nenhum registro criado.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T009 — Produto com estoque zero não aparece no catálogo

- **Objetivo:** verificar a regra pública de disponibilidade.
- **Pré-condições:** produto zero sintético publicado com estoque 0; produto multi-a com estoque positivo.
- **Comandos/procedimento:** abrir /catalog e buscar pelos dois slugs sintéticos; conferir GET /api/catalog sem incluir service_role.
- **Resultado esperado:** produto zero não é retornado/exibido; produto disponível aparece; nenhuma quantidade interna de estoque é exposta publicamente.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Catálogo público mostra stock_quantity maior que zero, omite estoque zero e não expõe quantidade numérica no payload.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T010 — Payload de reserva inválido

- **Objetivo:** confirmar validação negativa no endpoint.
- **Pré-condições:** Cliente A autenticado, origem local correta.
- **Comandos/procedimento:** enviar POST /api/reservations com productIds vazio, mantendo idempotencyKey UUID válido; registrar HTTP e código.
- **Resultado esperado:** HTTP 400 invalid_reservation_request; nenhum estoque, reserva ou ledger é alterado.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** POST inválido retornou 400 invalid_reservation_request sem alteração persistida.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

### TESTE: T011 — Ledger impede exclusão da reserva referenciada

- **Objetivo:** confirmar a FK ON DELETE RESTRICT da migration aditiva.
- **Pré-condições:** migration 202610270001 aplicada; reservation UUID sintético existente com pelo menos um evento no inventory_ledger; usar somente Studio da stack isolada.
- **Comandos/procedimento:** executar o bloco SQL abaixo substituindo UUID_SINTETICO. Ele não deve deixar a exclusão persistida; a exceção customizada também aborta a instrução se a FK permitir apagar a reserva.

~~~sql
do $$
declare target_id uuid := 'UUID_SINTETICO';
begin
  begin
    delete from public.reservations where id = target_id;
    raise exception 'ledger_fk_did_not_restrict_delete';
  exception
    when foreign_key_violation then
      raise notice 'PASS: ledger restringiu a exclusão';
  end;
end
$$;
~~~

- **Resultado esperado:** a operação de exclusão encontra foreign_key_violation e o editor registra PASS; a reserva e o ledger continuam presentes.
- **Resultado obtido:** PASS — reportado pela usuária.
- **Evidência:** Exclusão de reserva referenciada pelo ledger bloqueada por FK ON DELETE RESTRICT.
- **STATUS:** [ ] NÃO EXECUTADO [x] APROVADO [ ] REPROVADO [ ] BLOQUEADO

## Registro final da execução humana
- Responsável: usuária; evidências reportadas nesta conversa.
- Data reportada: 2026-10-28; horário e timezone não informados.
- Stack/IDs sintéticos: não especificados nesta conversa; nenhum segredo ou PII incluído.
- T001–T011: PASS conforme relatos da usuária; não reproduzidos pelo Codex.
- T007: divergência esclarecida; estado inicial active, transição active → expired.

## Contadores finais
- Previstos: 11
- Executados (reportados): 11
- Aprovados (reportados): 11
- Reprovados: 0
- Bloqueados: 0
- Pendentes: 0