# TASK-003 — Preparação do harness local Supabase

O harness usa somente Supabase local em containers Docker, dados sintéticos e Mailpit. Não exige nem acessa projeto remoto. A configuração SQL cria as tabelas de identidade e o bucket privado de contratos.

## Iniciar ambiente

Na pasta raiz do projeto, em PowerShell:

```powershell
$env:npm_config_cache = "$PWD\.npm-cache"
npm run supabase:start
npm run supabase:status
Copy-Item .env.example .env.local
```

Atualize `.env.local` com as chaves **locais** exibidas pelo comando `supabase:status`, inicie o servidor em outra janela e aplique migrations no banco local descartável:

```powershell
$env:npm_config_cache = "$PWD\.npm-cache"
npm run db:reset
$env:npm_config_cache = "$PWD\.npm-cache"
npm run dev
```

`db:reset` apaga e recria o banco local Supabase. Use-o somente com dados sintéticos. Mailpit captura e-mails de confirmação/recuperação; para OTP SMS local, a configuração Supabase fixa o código `123456` apenas para o telefone sintético `+15555550100`. Nenhuma mensagem SMS é enviada a uma operadora.

Para validar MFA SMS sem serviço externo, a configuração local usa o hook `capture_local_sms_otp` e a tabela `local_sms_captures`, criada apenas pelo `supabase/seed.sql`. O teste lê o código sintético com a chave service-role local e o apaga junto da conta descartável. Esse hook é exclusivo do ambiente local; não configure o hook nem aplique o seed em projeto hospedado.

## Verificações automatizadas disponíveis

```powershell
$env:npm_config_cache = "$PWD\.npm-cache"
npm run lint
$env:npm_config_cache = "$PWD\.npm-cache"
npm run typecheck
$env:npm_config_cache = "$PWD\.npm-cache"
npm run test:auth
$env:npm_config_cache = "$PWD\.npm-cache"
npm run test:auth:supabase-mfa
```

O teste MFA requer `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` exportados no processo com os valores locais mostrados por `supabase status`. A URL deve ser loopback; o teste recusa outro endereço.

Esses comandos não substituem a validação HTTP integrada. Os testes de fluxo Supabase (cadastro/verificações, login, reset, MFA/AAL2 e bloqueios RBAC) e Storage/RLS devem ser executados contra a stack local antes de aprovar GATE-004/005.

## Casos manuais previstos

- Criar conta sintética com e-mail, CPF válido sintético, telefone teste, senha; confirmar mensagem em Mailpit e confirmar telefone com OTP local.
- Confirmar que perfil só é criado após as duas verificações, CPF não pode ser alterado por cliente e campos pessoais não aparecem em JWT metadata.
- Entrar e recuperar senha; usar link capturado no Mailpit para definir nova senha e validar login.
- Cadastrar fator de telefone para administrador, completar challenge/verify, confirmar AAL2 e renovar step-up após uma hora simulada.
- Confirmar que funcionário não acessa operações de administrador nem por chamada HTTP direta; estado congelado bloqueia novas sessões/rotas.
- Fazer upload e leitura de contrato sintético como administrador; confirmar negação para cliente/funcionário e bucket privado.

## Encerrar

Ao terminar, pare somente a stack Supabase local iniciada para este harness:

```powershell
$env:npm_config_cache = "$PWD\.npm-cache"
npm run supabase:stop
```

Não execute `supabase link`, `db push` ou comandos para projeto remoto durante validações locais.
