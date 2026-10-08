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
- [Convenções do código](#convenções-do-código)
- [Deploy (Vercel)](#deploy-vercel)
- [Problemas comuns](#problemas-comuns)

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
| Vercel | deploy |

## Estrutura do projeto

```
src/
├── App.tsx              roteador: junta as rotas da loja e do interno
├── main.tsx             ponto de entrada
├── index.css            fontes, tokens de cor e estilos base
├── auth/                sessão e perfil (AuthProvider), proteção das rotas e áreas por permissão
├── components/          componentes usados nas duas plataformas (logo, estados de tela, navegação, peça, status)
│   └── ui/              componentes do shadcn/ui ajustados ao design
├── layouts/             LayoutCliente (topo e rodapé da loja) e LayoutInterno (barra das áreas e unidade)
├── lib/                 chamada à API, cliente do Supabase, tipos da API, formatos de data e moeda, listas
├── rotas/               rotasLoja.tsx e rotasInterno.tsx
└── pages/
    ├── Entrar.tsx       entrar, cadastro, esqueci a senha e criar nova senha
    ├── Basicas.tsx      rota inicial, página não encontrada e erro
    ├── loja/            telas da plataforma do cliente
    │   ├── carrinho/    estado, gaveta e lista de itens do carrinho
    │   ├── checkout/    endereço, CEP e pagamento simulado
    │   ├── conta/       área "Minha conta"
    │   ├── chamados/    conversa e anexos
    │   └── componentes/ partes das telas da loja (cartão do produto, avaliações, estrelas, fotos)
    └── interno/         telas da plataforma interna
        └── componentes/ partes das telas do interno (gráficos, troca e devolução)
```

Componente usado nas duas plataformas fica em `components/`; o que é de uma plataforma só fica em `componentes/` dentro da pasta dela.

## Login e permissões

- Há uma só tela de login (`/entrar`), por e-mail ou CPF. Depois de entrar, conta de cliente vai para a loja e conta interna para a Visão Geral.
- O perfil vem da API (`GET /me`) com as permissões efetivas da conta. A barra do interno mostra só as áreas que a conta pode usar; o que ela não pode fazer nem aparece.
- Esconder na tela é conveniência: a regra de verdade é do backend, que recusa qualquer ação sem permissão.
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
| `npm run tipos:api` | atualiza `src/lib/tiposApi.ts` a partir do OpenAPI da API publicada |

## Convenções do código

- **TypeScript `strict`**, sem `any`. O formato das respostas vem dos tipos gerados da API (`Esquema<'Nome'>`), nunca declarado à mão.
- **Nomes em português**, com os termos do domínio do backend: "unidade", "variante", "plataforma interna".
- **Toda chamada passa por `api()`** (`src/lib/api.ts`): ela envia o token e transforma o erro da API numa mensagem para a tela. Dados são carregados com `useCarregar` e toda tela trata carregando, erro e lista vazia.
- **Datas** no horário de Brasília e valores em reais, pelas funções de `src/lib/formato.ts`.
- **O navegador guarda só o carrinho** e preferências de tela; nada de dados de conta ou de permissão.
- **Visual:** cores só pelos tokens do `src/index.css`, fontes Jost, Newsreader (títulos da loja) e Marcellus (logo), cantos retos, telas de 360 px ao desktop e acessibilidade mínima (rótulo em todo campo, foco visível, botão de ícone com `aria-label`). As regras completas ficam em [contexto/design-casa-lorenzi.md](contexto/design-casa-lorenzi.md).
- **Componentes de interface** vêm do shadcn/ui (`npx shadcn@latest add <nome>`) e são ajustados ao design, em vez de escritos do zero.

**Como contribuir:** atualize a `main`, crie uma branch com nome curto em kebab-case sem prefixo (ex.: `loja-meus-pedidos`), faça commits pequenos no formato `tipo: mensagem` e rode `npm run build` e `npm run lint` antes de abrir o PR.

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
