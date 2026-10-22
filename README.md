# Casa Lorenzi — Frontend

Frontend da plataforma da Casa Lorenzi, desenvolvida no Case Tech da Trainee Insper Jr 2026.2. Uma única aplicação com entrada única atende as duas frentes: a **plataforma do cliente** (loja online da Casa Lorenzi e da Vulto, compra, pedidos, chamados, avaliações e pontos) e a **plataforma interna** (estoque, transferências, caixa, pedidos, clientes, atendimento, avaliações, catálogo e gestão). A API fica no repositório [Grupo13-Backend](https://github.com/nicolels1/Grupo13-Backend).

- **Plataforma publicada:** https://lorenzi.vercel.app
- **API:** https://grupo13-backend-megw.onrender.com (documentação interativa em [`/docs`](https://grupo13-backend-megw.onrender.com/docs))
- **Backend:** https://github.com/nicolels1/Grupo13-Backend
- **Migração da Vulto (Entrega 3):** ver [Documentação da Entrega 3](#documentação-da-entrega-3)

> A API roda no plano gratuito do Render e dorme depois de 15 minutos sem uso. Se a primeira tela demorar para carregar, espere cerca de 1 minuto: as próximas respondem normalmente.

## Sumário

- [O que a plataforma faz](#o-que-a-plataforma-faz)
- [Arquitetura e stack](#arquitetura-e-stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Login e permissões](#login-e-permissões)
- [Telas e endereços](#telas-e-endereços)
- [Como rodar localmente](#como-rodar-localmente)
- [Scripts](#scripts)
- [Testes e CI](#testes-e-ci)
- [Convenções do código](#convenções-do-código)
- [Deploy (Vercel)](#deploy-vercel)
- [Problemas comuns](#problemas-comuns)
- [Decisões de arquitetura](#decisões-de-arquitetura)
- [Documentação da Entrega 3](#documentação-da-entrega-3)

## O que a plataforma faz

**Plataforma do cliente (`/loja`)**

- duas lojas como abas no topo, Casa Lorenzi e Vulto: a vitrine (início, lista e categorias) mostra a loja escolhida, que fica guardada no navegador; carrinho, checkout e conta são um só para as duas;
- vitrine com carrossel (slides editados pelo interno), categorias, busca sem acento e tolerante a erro de digitação, filtros de tamanho e estoque e ordenação;
- página do produto com fotos por cor, tamanhos esgotados riscados e avaliações com fotos, filtro "Com fotos", voto útil e denúncia;
- um carrinho só para a Casa Lorenzi e a Vulto, salvo no navegador (gaveta e página), com as peças separadas por marca e uma barra de frete grátis só, que conta as duas marcas juntas;
- checkout em uma página: entrega em casa (CEP preenchido pelo ViaCEP) ou retirada grátis numa loja (só com peças de uma marca), reserva de 15 minutos e um pagamento simulado por Pix ou cartão de teste para a compra inteira; com as duas marcas, o backend faz um pedido por marca; os pontos de cada marca viram desconto nas peças dela;
- área "Minha conta": pedidos com linha do tempo, avaliação da peça recebida, compra feita na loja ligada à conta pelo código da notinha, chamados com conversa e anexos, endereços e os pontos das duas lojas lado a lado (o programa da Vulto é o Vulto+), com o extrato de cada uma em **Meus pontos**;
- cadastro, login por e-mail ou CPF e recuperação de senha por e-mail.

**Plataforma interna (`/interno`)**

- **Visão Geral:** a primeira tela depois do login mostra as pendências da conta (peças abaixo do mínimo, transferências, pedidos para preparar, retiradas perto de vencer, chamados, denúncias) e os números das suas áreas; o Admin vê também a rede inteira e uma linha por unidade. Quem vê as duas marcas filtra os números por marca, e quem pode ver pontos acompanha os **pontos a resgatar** (passivo) de cada marca;
- **Estoque:** saldo por unidade em matriz cor × tamanho, movimentações e o **Histórico do estoque**, que responde "qual era o estoque da loja X em tal data e hora", com gráfico de evolução de cada peça;
- **Transferências** entre unidades (solicitada, enviada, recebida);
- **Caixa:** nova venda com CPF na nota opcional, pontos do cliente desse CPF como desconto e notinha com o nome da rede para imprimir, retiradas, vendas do dia, consulta de peça e troca ou devolução no balcão;
- **Pedidos** online para preparar, enviar e entregar, com canal, desconto, pagamento e, no pedido que veio da Vulto, a origem na Vulto;
- **Clientes:** abas "Com conta" e "Sem conta (Vulto)", com busca; a ficha de cada cliente mostra cadastro, pontos das duas lojas, pedidos, chamados e, para quem veio da Vulto, a origem da migração;
- **Fidelidade:** as regras dos pontos de cada marca (valor do ponto, pontos por real, multiplicador do site e do app, bônus do Ouro, vencimento, categorias e resgate mínimo): a que vale hoje, o histórico e a criação da próxima, que vale a partir de uma data futura e nunca muda um ponto já ganho;
- **Atendimento** em caixa de entrada: filas, conversa com nota interna, troca, devolução e estorno a partir do chamado; o chamado migrado da Vulto mostra o canal de origem (WhatsApp, Instagram ou e-mail);
- **Avaliações:** moderação das denúncias;
- **Catálogo:** produtos, variantes, preços e fotos, com a rede (marca), o código de barras e a origem da peça migrada, e a aba **Destaques da página inicial**, onde se editam os slides do carrossel (texto, botão, link, foto, ordem e se aparecem na loja);
- **Gestão** (só Admin): contas internas, modelos de acesso, exceções de permissão, unidades e a aba **Migração da Vulto** (`/interno/gestao?aba=migracao`), com os três números da Entrega 3 (faturamento de jan/2025 a set/2026, estoque e passivo de pontos em 01/10/2026): o que a migração calculou, o que a plataforma soma depois da carga, a diferença para o sistema da Vulto e a margem de erro.

Cada registro migrado (peça, pedido, cliente e chamado) mostra de onde veio na Vulto e o que a migração mudou nele, com o código da decisão do [registro de decisões](https://github.com/nicolels1/Grupo13-Backend/blob/main/migracao_vulto/registro_decisoes.md).

## Arquitetura e stack

```
Navegador ──▶ Frontend (Vercel, este repositório) ──HTTPS + token──▶ API FastAPI (Render) ──▶ PostgreSQL (Supabase)
                     │
                     └── login, cadastro de senha e recuperação no Supabase Auth
```

O frontend usa o Supabase só para o login. Todos os dados, inclusive os arquivos (fotos e anexos), passam pela API, que confere as permissões de cada conta.

| Tecnologia | Função |
|---|---|
| React 19 + TypeScript (`strict`) | interface |
| Vite 8 | servidor de desenvolvimento e build |
| React Router 7 | rotas |
| Tailwind CSS 4 | estilos, com os tokens de cor em `src/index.css` |
| shadcn/ui (base-ui) | componentes de interface em `src/components/ui` |
| Recharts | gráficos da Visão Geral e do Histórico do estoque |
| Embla Carousel | carrosséis da loja |
| Supabase JS | login (Supabase Auth) |
| openapi-typescript | tipos da API gerados do OpenAPI do backend |
| oxlint | lint |
| Vitest | execução dos testes automatizados |
| Testing Library + jsdom | testes dos hooks, num navegador simulado |
| GitHub Actions | lint, testes e build em cada PR para `main` |
| Vercel | deploy |

## Estrutura do projeto

```
src/
├── App.tsx              roteador: junta as rotas da loja e do interno
├── main.tsx             ponto de entrada
├── index.css            fontes, tokens de cor e estilos base
├── auth/                sessão, perfil e ações do Supabase Auth (AuthProvider), proteção das rotas e áreas
├── config/              o que muda por ambiente: endereço da API e projeto do Supabase
├── components/          componentes usados nas duas plataformas (logo, estados de tela, navegação, peça, status)
│   └── ui/              componentes do shadcn/ui ajustados ao design
├── layouts/             LayoutCliente (topo e rodapé da loja) e LayoutInterno (barra das áreas e unidade)
├── lib/                 chamada à API, cliente do Supabase, tipos da API, formatos de data e moeda, listas
│                        (cada arquivo com o seu teste ao lado, ex.: formato.ts e formato.test.ts)
├── rotas/               rotasLoja.tsx e rotasInterno.tsx; telasLoja.ts e telasInterno.ts carregam cada tela só quando é aberta
└── pages/
    ├── RotaInicial.tsx, NaoEncontrada.tsx, ErroDaPagina.tsx
    ├── acesso/          entrar, cadastro, esqueci a senha e criar nova senha (uma tela por arquivo)
    │   └── componentes/ moldura das telas de conta e campos de senha
    ├── loja/            telas da plataforma do cliente
    │   ├── carrinho/    estado, gaveta e lista de itens do carrinho
    │   ├── checkout/    endereço, CEP e pagamento simulado
    │   ├── conta/       área "Minha conta", com os pontos e o extrato
    │   ├── chamados/    chamado novo, conversa, mensagens e anexos
    │   └── componentes/ partes das telas da loja (cartão do produto, avaliações, estrelas, fotos)
    └── interno/         telas da plataforma interna
        ├── caixa/       nova venda (com o desconto de pontos), retiradas, vendas do dia e a notinha
        ├── clientes/    ficha do cliente com conta ou sem conta (migrado da Vulto)
        ├── fidelidade/  regras do programa de pontos de cada marca (área Fidelidade)
        ├── numeros/     aba "Migração da Vulto" da Gestão: os três números da Entrega 3
        ├── troca/       troca, devolução e estorno (usados no Caixa e no Atendimento) e as regras deles
        └── componentes/ partes das telas do interno (gráficos e estilos de bloco)
```

Fora do `src/`: `docs/adr/` (decisões de arquitetura), `.github/workflows/` (verificações no GitHub), `.env.example` e `vercel.json`.

Componente usado nas duas plataformas fica em `components/`; o que é de uma plataforma só fica em `componentes/` dentro da pasta dela. Cada rota tem o seu arquivo em `pages/`, e as telas nunca chamam o Supabase direto: entrar, sair e recuperar a senha passam pelo `useAuth()`.

## Login e permissões

- Há uma só tela de login (`/entrar`), por e-mail ou CPF. Depois de entrar, conta de cliente vai para a loja e conta interna para a Visão Geral.
- O perfil vem da API (`GET /me`) com as permissões efetivas da conta. A barra do interno mostra só as áreas que a conta pode usar; o que ela não pode fazer nem aparece.
- Cada conta interna vê a Casa Lorenzi, a Vulto ou as duas (permissões `ver_marca_lorenzi` e `ver_marca_vulto`; o Admin vê as duas). Unidades, listas e números mostram só as marcas que a conta vê, e o seletor de marca só aparece para quem vê as duas.
- Esconder na tela é conveniência: a regra de verdade é do backend, que recusa qualquer ação sem permissão.
- Se a API recusar o token (401), a sessão desta aba é encerrada e a página protegida leva de volta ao `/entrar`.
- A recuperação de senha e o convite de funcionário usam o mesmo link do Supabase Auth, que abre a página `/redefinir-senha`.

| Área | Aparece para quem tem |
|---|---|
| Visão Geral | todas as contas internas |
| Estoque | movimentar estoque, definir mínimo ou alguma permissão de transferência |
| Transferências | solicitar, enviar ou receber transferência |
| Caixa | venda física, troca e devolução ou preparar e entregar pedido |
| Pedidos | venda física, preparar e entregar pedido, cancelar pedido ou corrigir cadastro |
| Clientes | venda física, preparar e entregar pedido, cancelar pedido, corrigir cadastro, troca e devolução ou atender chamado |
| Fidelidade | gerenciar fidelidade (no começo, só o Admin) |
| Atendimento | atender chamado |
| Avaliações | moderar avaliações |
| Catálogo | gerenciar catálogo |
| Gestão | só o Admin |

## Telas e endereços

| Endereço | Tela | Acesso |
|---|---|---|
| `/` | leva para a loja ou para o interno, conforme a conta | — |
| `/entrar`, `/cadastro` | entrar e criar conta | público |
| `/esqueci-senha`, `/redefinir-senha` | pedir o link e criar a nova senha | público |
| `/loja` | início da loja | público |
| `/loja/produtos`, `/loja/produtos/:id` | lista e página do produto | público |
| `/loja/carrinho`, `/loja/ajuda` | carrinho e central de ajuda | público |
| `/loja/checkout`, `/loja/compra-confirmada/:id` | finalizar compra e confirmação | cliente |
| `/loja/conta`, `/loja/pedidos`, `/loja/chamados`, `/loja/enderecos`, `/loja/pontos` | área "Minha conta" | cliente |
| `/loja/avaliar/:idItem` | escrever avaliação | cliente |
| `/interno` | Visão Geral | conta interna |
| `/interno/estoque` (`/movimentacoes`, `/historico`) | saldo, movimentações e histórico | conforme a área |
| `/interno/transferencias`, `/interno/caixa`, `/interno/pedidos` | transferências, caixa e pedidos | conforme a área |
| `/interno/clientes` (`/conta/:idCliente`, `/sem-conta/:idCliente`) | clientes e ficha do cliente com ou sem conta | conforme a área |
| `/interno/fidelidade` | regras dos pontos de cada marca | conforme a área |
| `/interno/atendimento/:idChamado?` | caixa de entrada dos chamados | conforme a área |
| `/interno/avaliacoes`, `/interno/catalogo/:idProduto?`, `/interno/gestao` | moderação, catálogo e gestão (`?aba=migracao` abre os três números da Vulto) | conforme a área |

## Como rodar localmente

Requisitos: Node.js 20.19 ou mais recente (exigência do Vite 8).

```bash
# 1. Instalar as dependências
npm install

# 2. Criar o .env a partir do exemplo e preencher as variáveis
cp .env.example .env

# 3. Rodar em http://localhost:5173
npm run dev
```

Use sempre a porta **5173**: a API só aceita chamadas dos endereços liberados no CORS, e em outra porta as telas mostram "Sem conexão com o servidor".

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL da API, sem `/` no final. Produção: `https://grupo13-backend-megw.onrender.com`; local: `http://127.0.0.1:8000` |
| `VITE_SUPABASE_URL` | URL do projeto Supabase (`https://<project-ref>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave pública (publishable/anon) do Supabase |

Tudo que começa com `VITE_` vai para o navegador: nunca coloque uma chave secreta (como a `service_role`) aqui.

Para usar a API local (`http://127.0.0.1:8000`), suba o backend antes, seguindo o [README do Grupo13-Backend](https://github.com/nicolels1/Grupo13-Backend#readme). Se o `VITE_API_URL` estiver vazio ou sem `http://`/`https://`, o site avisa no console ao abrir e cada tela mostra a mensagem com o que corrigir.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | confere os tipos (`tsc`) e gera o build em `dist/` |
| `npm run preview` | serve o build localmente |
| `npm run lint` | roda o oxlint |
| `npm test` | roda os testes com o Vitest |
| `npm run tipos:api` | atualiza `src/lib/tiposApi.ts` a partir do OpenAPI da API publicada |

## Testes e CI

**Vitest** é a ferramenta que executa os testes automatizados do frontend. Cada arquivo terminado em `.test.ts` fica ao lado do código que testa. Hoje, os testes verificam:

- funções de formato (datas no horário de Brasília, moeda, CPF, plural e tamanho de arquivo) e a tradução de erros da API;
- as regras de acesso às áreas internas;
- as regras das telas: troca, devolução e estorno, variações e fotos do produto, anexos dos chamados, CEP, compra em aberto no checkout, fotos por cor, os pedidos da conta, as regras de pontos da Fidelidade e o desconto de pontos no caixa;
- as listas com cache (unidades e variantes) e os hooks de carregamento, envio e intervalo;
- as telas de entrar e a proteção das rotas, com o roteador de verdade e o `useAuth()` trocado por um de teste (`src/auth/authDeTeste.ts`): login por e-mail e CPF, credencial errada, volta à página de origem, conta do tipo errado e área sem permissão.

Não validam o visual das telas. Os testes de hooks e de telas precisam do React e rodam num navegador simulado (jsdom, com o Testing Library), marcado no topo do arquivo com `// @vitest-environment jsdom`; os outros rodam direto no Node. Para executar todos uma vez:

```bash
npm test
```

Em cada Pull Request para `main`, o GitHub Actions instala as dependências, confere as vulnerabilidades das dependências que vão para o site (`npm audit --omit=dev`) e roda lint, testes e build (`.github/workflows/verificacoes.yml`). Também roda no push direto para `main` ou manualmente pela aba Actions. O resultado aparece na aba Actions e no próprio PR.

## Convenções do código

- **TypeScript `strict`**, sem `any`. O formato das respostas vem dos tipos gerados da API (`Esquema<'Nome'>`), nunca declarado à mão.
- **Nomes em português**, com os termos do domínio do backend: "unidade", "variante", "plataforma interna".
- **Toda chamada passa por `api()`** (`src/lib/api.ts`): ela envia o token e transforma o erro da API numa mensagem para a tela. Dados são carregados com `useCarregar` e toda tela trata carregando, erro e lista vazia.
- **Dependências conferidas pelo lint:** o oxlint confere a lista de dependências do `useEffect`, do `useCallback` e também do `useCarregar`. Quando uma "chave" resume um valor de propósito, a exceção leva o motivo no próprio comentário (`// eslint-disable-next-line react-hooks/exhaustive-deps -- motivo`).
- **Códigos de permissão** vêm dos tipos gerados da API (`CodigoPermissao` em `src/auth/areas.ts`): um código escrito errado não compila. Permissão nova no backend chega aqui com `npm run tipos:api`.
- **Rótulos de status e categorias** (`src/lib/formato.ts`) são conferidos com os valores que a API declara: depois de `npm run tipos:api`, o `tsc` aponta o rótulo que faltar.
- **Datas** no horário de Brasília, valores em reais e números (`numero`), pelas funções de `src/lib/formato.ts`. Atualização periódica (conversas, contador da reserva, carrossel) usa o `useIntervalo`.
- **O navegador guarda só o carrinho** e preferências de tela; nada de dados de conta ou de permissão.
- **Visual:** cores só pelos tokens do `src/index.css`, fontes Jost, Newsreader (títulos da loja) e Marcellus (logo), cantos retos, telas de 360 px ao desktop e acessibilidade mínima (rótulo em todo campo, foco visível, botão de ícone com `aria-label`). As regras completas ficam em [contexto/design-casa-lorenzi.md](contexto/design-casa-lorenzi.md).
- **Componentes de interface** vêm do shadcn/ui (`npx shadcn@latest add <nome>`) e são ajustados ao design, em vez de escritos do zero. O lint não aplica a `src/components/ui` as regras de fast refresh e de estado em efeito, que o próprio padrão do shadcn não segue; o resto do código passa no lint sem nenhum aviso.
- **Tela nova** entra em `telasLoja.ts` ou `telasInterno.ts` (carregada só quando aberta) e na rota com `tela(...)`.

**Como contribuir:** atualize a `main`, crie uma branch com nome curto em kebab-case sem prefixo (ex.: `loja-meus-pedidos`), faça commits pequenos no formato `tipo: mensagem` e rode `npm run lint`, `npm test` e `npm run build` antes de abrir o PR.

## Deploy (Vercel)

- Cada push na `main` publica uma nova versão em https://lorenzi.vercel.app.
- As três variáveis de ambiente ficam em Settings → Environment Variables. O Vite grava os valores no build, então mudar uma variável exige um novo deploy.
- O `vercel.json` manda todos os endereços para o `index.html`, para que recarregar uma página como `/interno/estoque` não dê 404.
- O endereço da Vercel precisa estar liberado no CORS da API (`CORS_ORIGINS` ou `CORS_ORIGIN_REGEX`, no backend) e nas Redirect URLs do Supabase Auth, para os links de recuperação de senha e de convite.

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| "Sem conexão com o servidor" | a API está acordando no Render (espere cerca de 1 minuto) ou o endereço do front não está liberado no CORS. Localmente, confira se está na porta 5173 |
| Tela carregando por muito tempo na primeira visita | mesma causa: a API dormiu. As chamadas seguintes são rápidas |
| "O endereço da API (VITE_API_URL) não foi configurado" ou "é inválido" | preencha o `VITE_API_URL` com o endereço completo (com `https://`) no `.env` ou na Vercel e, na Vercel, faça um novo deploy |
| Link de recuperação de senha cai na página errada ou não funciona | o endereço não está nas Redirect URLs do Supabase Auth, ou o link venceu (vale 24 horas). Peça outro em "Esqueci minha senha" |
| Variável nova não faz efeito na Vercel | faltou fazer um novo deploy depois de mudar a variável |
| Erro de tipo depois de uma mudança na API | rode `npm run tipos:api` para atualizar os tipos gerados |

## Decisões de arquitetura

As decisões difíceis de desfazer ficam registradas em [docs/adr/](docs/adr/):

| ADR | Decisão |
|---|---|
| [0001](docs/adr/0001-supabase-so-para-login.md) | Supabase só para o login; os dados sempre pela API |
| [0002](docs/adr/0002-carrinho-no-navegador.md) | Carrinho guardado no navegador |
| [0003](docs/adr/0003-cartao-de-teste-fica-no-navegador.md) | Dados do cartão de teste ficam no navegador |
| [0004](docs/adr/0004-shadcn-com-base-ui-no-projeto.md) | Componentes do shadcn/ui, com base-ui, dentro do projeto |
| [0005](docs/adr/0005-tipos-gerados-do-openapi.md) | Tipos da API gerados do OpenAPI do backend |

As decisões do backend e do banco estão no [Grupo13-Backend](https://github.com/nicolels1/Grupo13-Backend/tree/main/docs/adr).

## Documentação da Entrega 3

A Entrega 3 trouxe a Vulto para a plataforma: os dados dela foram tratados e carregados no banco da Casa Lorenzi (carga definitiva em 21/10/2026), e a diretoria recebeu três números calculados a partir deles. A migração e os scripts ficam no backend; este frontend mostra o resultado (abas das lojas, área Clientes, origem dos registros migrados, pontos e a aba **Migração da Vulto** da Gestão).

| Documento | O que tem |
|---|---|
| [Repositório do backend](https://github.com/nicolels1/Grupo13-Backend) | API, banco e a pasta [`migracao_vulto/`](https://github.com/nicolels1/Grupo13-Backend/tree/main/migracao_vulto), com scripts, notebooks e de-para |
| [README da migração](https://github.com/nicolels1/Grupo13-Backend/blob/main/migracao_vulto/README.md) | etapas (padronização, tratamento, carga e validação), como rodar cada uma e o que cada arquivo faz |
| [Os três números](https://github.com/nicolels1/Grupo13-Backend/blob/main/migracao_vulto/numeros.md) | faturamento de jan/2025 a set/2026, estoque e passivo de pontos em 01/10/2026, com o detalhe, a diferença para o sistema da Vulto e a margem de erro |
| [Registro de decisões](https://github.com/nicolels1/Grupo13-Backend/blob/main/migracao_vulto/registro_decisoes.md) | cada problema encontrado nos dados da Vulto, o que foi decidido e o impacto em cada número |
| [Validação](https://github.com/nicolels1/Grupo13-Backend/blob/main/migracao_vulto/validacao.md) | o que entrou no banco, o motivo de cada linha que ficou de fora e a comparação de cada tabela tratada com o banco |
| [Mapeamento](https://github.com/nicolels1/Grupo13-Backend/blob/main/migracao_vulto/mapeamento.md) | onde cada dado da Vulto entra no banco da Casa Lorenzi e a decisão que o resolve |

Na plataforma publicada, os três números ficam em [Gestão → Migração da Vulto](https://lorenzi.vercel.app/interno/gestao?aba=migracao) (precisa de uma conta Admin).
