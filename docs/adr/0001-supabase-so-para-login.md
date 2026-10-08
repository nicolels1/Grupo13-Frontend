# Supabase só para o login; os dados sempre pela API

**Contexto:** o Supabase guarda o banco e o login. O cliente JavaScript do Supabase permite ler e gravar tabelas direto do navegador, o que pouparia rotas no backend.

**Decisão:** o front usa o Supabase só para entrar, sair, recuperar a senha e ler o token da sessão (`src/lib/supabaseClient.ts`). Todo dado, inclusive fotos e anexos, passa pela API (`src/lib/api.ts`), que manda o token em cada chamada. As tabelas ficam fechadas para a API automática do Supabase (ADR 0001 do backend).

**Por quê:** a regra de quem pode fazer o quê fica num lugar só, o backend, e não depende do que a tela esconde. Uma conta sem permissão que chame a API por fora recebe 403 do mesmo jeito.
