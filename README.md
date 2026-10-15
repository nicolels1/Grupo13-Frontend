# Casa Lorenzi — Frontend

Frontend da plataforma da Casa Lorenzi, desenvolvida no Case Tech da Trainee Insper Jr 2026.2. Uma única aplicação com entrada única atende as duas frentes: a **plataforma do cliente** (loja online, compra, pedidos, chamados e avaliações) e a **plataforma interna** (estoque, transferências, caixa, pedidos, atendimento, avaliações, catálogo e gestão). A API fica no repositório [Grupo13-Backend](https://github.com/nicolels1/Grupo13-Backend).

- **Plataforma publicada:** https://lorenzi.vercel.app
- **API:** https://grupo13-backend-megw.onrender.com (documentação em `/docs`)

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

## O que a plataforma faz

**Plataforma do cliente (`/loja`)**

- vitrine com carrossel, categorias, busca sem acento e tolerante a erro de digitação, filtros de tamanho e estoque e ordenação;
- página do produto com fotos por cor, tamanhos esgotados riscados e avaliações com fotos, filtro "Com fotos", voto útil e denúncia;
- carrinho salvo no navegador (gaveta e página), com barra de frete grátis;
- checkout em uma página: entrega em casa (CEP preenchido pelo ViaCEP) ou retirada grátis numa loja, reserva de 15 minutos e pagamento simulado por Pix ou cartão de teste;
- área "Minha conta": pedidos com linha do tempo, avaliação da peça recebida, compra feita na loja ligada à conta pelo código da notinha, chamados com conversa e anexos, e endereços;
- cadastro, login por e-mail ou CPF e recuperação de senha por e-mail.

**Plataforma interna (`/interno`)**

- **Visão Geral:** a primeira tela depois do login mostra as pendências da conta (peças abaixo do mínimo, transferências, pedidos para preparar, retiradas perto de vencer, chamados, denúncias) e os números das suas áreas; o Admin vê também a rede inteira e uma linha por unidade;
- **Estoque:** saldo por unidade em matriz cor × tamanho, movimentações e o **Histórico do estoque**, que responde "qual era o estoque da loja X em tal data e hora", com gráfico de evolução de cada peça;
- **Transferências** entre unidades (solicitada, enviada, recebida);
- **Caixa:** nova venda com CPF na nota opcional e notinha para imprimir, retiradas, vendas do dia, consulta de peça e troca ou devolução no balcão;
- **Pedidos** online para preparar, enviar e entregar;
- **Atendimento** em caixa de entrada: filas, conversa com nota interna, troca, devolução e estorno a partir do chamado;
- **Avaliações:** moderação das denúncias;
- **Catálogo:** produtos, variantes, preços e fotos;
- **Gestão** (só Admin): contas internas, modelos de acesso, exceções de permissão e unidades.

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
    │   ├── conta/       área "Minha conta"
    │   ├── chamados/    chamado novo, conversa, mensagens e anexos
    │   └── componentes/ partes das telas da loja (cartão do produto, avaliações, estrelas, fotos)
    └── interno/         telas da plataforma interna
        ├── troca/       troca, devolução e estorno (usados no Caixa e no Atendimento) e as regras deles
        └── componentes/ partes das telas do interno (gráficos e estilos de bloco)
```

Fora do `src/`: `public/imagens/carrossel/` (imagens estáticas dos destaques da loja, publicadas junto com o frontend), `docs/adr/` (decisões de arquitetura), `.github/workflows/` (verificações no GitHub), `.env.example` e `vercel.json`.

Componente usado nas duas plataformas fica em `components/`; o que é de uma plataforma só fica em `componentes/` dentro da pasta dela. Cada rota tem o seu arquivo em `pages/`, e as telas nunca chamam o Supabase direto: entrar, sair e recuperar a senha passam pelo `useAuth()`.

## Login e permissões

- Há uma só tela de login (`/entrar`), por e-mail ou CPF. Depois de entrar, conta de cliente vai para a loja e conta interna para a Visão Geral.
- O perfil vem da API (`GET /me`) com as permissões efetivas da conta. A barra do interno mostra só as áreas que a conta pode usar; o que ela não pode fazer nem aparece.
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
| `/loja/checkout`, `/loja/pedido-confirmado/:id` | finalizar compra e confirmação | cliente |
| `/loja/conta`, `/loja/pedidos`, `/loja/chamados`, `/loja/enderecos` | área "Minha conta" | cliente |
| `/loja/avaliar/:idItem` | escrever avaliação | cliente |
| `/interno` | Visão Geral | conta interna |
| `/interno/estoque` (`/movimentacoes`, `/historico`) | saldo, movimentações e histórico | conforme a área |
| `/interno/transferencias`, `/interno/caixa`, `/interno/pedidos` | transferências, caixa e pedidos | conforme a área |
| `/interno/atendimento/:idChamado?` | caixa de entrada dos chamados | conforme a área |
| `/interno/avaliacoes`, `/interno/catalogo/:idProduto?`, `/interno/gestao` | moderação, catálogo e gestão | conforme a área |

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
- as regras das telas: troca, devolução e estorno, variações e fotos do produto, anexos dos chamados, CEP, pedido em aberto no checkout, fotos por cor e os pedidos da conta;
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
