# Design e plano do front — Casa Lorenzi

O código é a fonte da verdade (o Figma não é referência). Os tokens ficam no `@theme` / `:root` do `src/index.css`; este arquivo explica as regras e não duplica valores. Quadro com as telas de referência: "Casa Lorenzi — Telas" (ainda com fonte e topo antigos: valem as regras deste arquivo).

## Regras gerais

### Tipografia
| Uso | Fonte |
|---|---|
| Logo "CASA LORENZI" | **Marcellus**, caixa alta espaçada (único lugar com ela) |
| Títulos da loja (carrossel, nome do produto, títulos de seção e das páginas de compra) | **Newsreader** |
| Todo o resto, incluindo o interno inteiro | **Jost** |

- Caixa alta só na logo e na faixa do topo da loja. Menus, categorias e títulos em escrita normal.
- Códigos (SKU, pedido, venda) em Jost com números tabulares, nunca em fonte monoespaçada.
- Sem "·" juntando informações, sem "!" em mensagens, sem "→" em botões.

### Cores (paleta oficial do PDF + branco + 2 neutros, sem preto puro)
| Cor | Uso |
|---|---|
| marinho `#1b2a4a` | Botões principais, área Estoque |
| marinho-escuro `#12203a` | Texto, faixa do topo da loja, rodapé da loja, topo do interno, área Transferências |
| ardósia `#5b6b8c` | Texto secundário, fundo de seções de categoria e da área "Sua conta", bloco "Fale com a gente", nota interna do chamado (tom claro), área Avaliações |
| aço `#3a7ca5` | Faixa de vantagens da loja, links, foco, sucesso, "em andamento", área Atendimento, aumento no histórico |
| terracota `#c1613f` | Destaques com significado: "Novo", "Frete grátis", contador da reserva, pendência, mensagem nova, abaixo do mínimo, queda no histórico, área Pedidos |
| ferrugem `#a64e33` | Só erro, cancelamento e ação destrutiva. Nunca em gráfico |
| branco, superfície `#f4f4f2`, borda `#e2e2e2` | Fundos e divisões |

- A área dos produtos fica neutra (fotos de moda pedem fundo limpo); a cor entra em blocos grandes ao redor.
- Na loja, a terracota também pode ser cor de bloco (ex.: um dos assuntos da Central de ajuda), só com texto grande por cima: branco sobre terracota não tem contraste para texto pequeno. A ferrugem continua só para erro.
- Sem modo escuro, sem degradê, cantos retos.

### Status (iguais nas duas plataformas)
Etiqueta reta, texto curto: neutro (aguardando pagamento, aberto, solicitada) · aço (pago, em andamento, enviada, pronto para retirada) · marinho sólido (entregue, concluído, recebida) · ferrugem (cancelado).

### Componentes e comportamento
- Botões principais da loja com 44px (largura total no celular). Um botão principal por tela.
- Sucesso inline, perto da ação. Sem toasts. A gaveta do carrinho é a confirmação de "adicionado".
- Erros dizem o que aconteceu e como resolver.
- Animação: só a gaveta do carrinho, o carrossel e o abrir e fechar do acordeão (o padrão do shadcn). Respeitar `prefers-reduced-motion`.
- Gráficos só na Visão Geral e no Histórico do estoque. Séries: marinho → aço → terracota → ardósia.
- Responsivo de 360px ao desktop; polimento máximo no desktop; loja e checkout conferidos no celular.

## Plataforma do cliente (loja)

- **Topo (estilo C&A, uma linha):** faixa marinho-escura "FRETE GRÁTIS A PARTIR DE R$ 299 E RETIRADA GRÁTIS NA LOJA"; logo à esquerda, categorias, busca, conta, "Pedidos" e carrinho. Deslogado: "Entrar ou criar conta". Logado: "Olá, Marina" com menu "Minha conta" (Meus pedidos, Chamados, Endereços, Ajuda, Sair) e ponto terracota quando há resposta nova. "Pedidos" fica à vista no topo (ícone e texto no desktop, só ícone no celular) porque dentro do menu pouca gente achava. Sem "Ajuda" solto no topo.
- **Início:** carrossel de largura total (estilo Renner), 3 slides (Linho, Alfaiataria, Retire grátis na loja), título em Newsreader branco e um botão; troca a cada 6 s, pausa no mouse, setas e pontinhos. Abaixo, faixa de vantagens em aço, Novidades, categorias em blocos ardósia, rodapé marinho-escuro.
- **Rodapé:** coluna "Minha conta" (Meus pedidos, Chamados, Endereços); coluna "Ajuda" com Central de ajuda, Trocas e devoluções, Prazos de entrega, Fale com a gente.
- **Central de ajuda:** 4 assuntos em grade (Pedidos e entrega, Trocas e devoluções, Pagamento, Sua conta); embaixo, bloco ardósia "Não achou? Fale com a gente pelo chat" (pede login se precisar).
- **Lista:** caminho de navegação, título em Newsreader, filtros de tamanho e estoque, ordenação, "Mostrar mais peças".
- **Produto:** miniaturas verticais à esquerda, foto grande, informações à direita; cores como amostras (trocar a cor troca as fotos), tamanhos quadrados (esgotado riscado), "Adicionar ao carrinho" 44px, frete/retirada/troca abaixo. Celular: fotos deslizando com pontinhos.
- **Avaliações (estilo Shein):** nota média, barras de 5 a 1, fotos de clientes, filtro "Com fotos", lista com cor e tamanho comprados, "Útil (n)" e "Denunciar". Estrelas em marinho.
- **Fotos:** 2 a 3 por cor, estúdio claro, corpo inteiro, 3:4. Demo ajustada às fotos, meta de 12 produtos.
- **Carrinho:** gaveta lateral + página; salvo no navegador; login só ao finalizar; barra de frete grátis.
- **Checkout:** uma página, três blocos (Receber → Endereço ou loja → Pagamento); resumo fixo à direita (no celular, recolhido no topo com o total); reserva de 15 min em terracota; botão com valor exato.
- **Pagamento simulado:** Pix com QR e "copia e cola" falsos, aprovação automática; cartão com dados de teste que não vão ao backend; um número de teste que recusa.
- **Confirmação:** número do pedido copiável, entrega e pagamento, itens, "Acompanhar pedido".
- **Meus pedidos:** cartões por pedido com status, linha do tempo (Pago → Enviado/Pronto → Entregue), "Preciso de ajuda com este pedido", "Avaliar", "Trocar ou devolver". Link "Comprou numa loja sem informar o CPF?" abre o campo do código da notinha.
- **Escrever avaliação:** página própria; 5 estrelas, texto opcional, até 5 fotos; depois de publicar, "Você pode editar até [data]".
- **Chamados:** lista + conversa; cabeçalho com status e o pedido ligado; anexo pelo clipe com prévia antes de enviar; foto aparece dentro do balão. Abrir chamado a partir do pedido já vem ligado a ele.
- **Entrar:** foto à esquerda, formulário à direita; um campo "E-mail ou CPF"; erro sempre "E-mail, CPF ou senha incorretos", com "Criar conta" visível.
- **Cadastro:** nome, CPF, e-mail, senha. Se o CPF tinha compras de loja, abre Meus pedidos com o aviso em aço "Encontramos 2 compras feitas em lojas com o seu CPF".
- Sem página de ativação (o caixa não cria conta).

## Plataforma interna

- **Topo:** uma faixa marinho-escura: logo, áreas, seletor de unidade e menu da pessoa. Aba ativa sublinhada na cor da área: Estoque marinho, Pedidos terracota, Atendimento aço, Avaliações ardósia, Transferências marinho-escuro.
- **Visão Geral:**
  - todos: pendências em lista com número grande (marcador terracota, ou cinza com "tudo em dia"), indicadores e gráficos só das suas áreas, na sua unidade (sem unidade: tudo, com seletor);
  - gráficos: vendas dos últimos 14 dias (online marinho × loja aço), 5 mais vendidas na semana, chamados abertos × concluídos;
  - admin: seção "A rede agora", com cobertura de estoque, ruptura no online, vendas 14 dias, ticket médio, tempo até a primeira resposta, nota média e denúncias, retiradas perto de vencer, e uma tabela com uma linha por unidade (números fora do esperado coloridos). Uma rota de resumo no backend calcula esses números.
- **Estoque**, com três subabas:
  - **Saldo:** uma linha por produto que abre a matriz cor × tamanho (célula terracota abaixo do mínimo); clicar numa célula mostra as últimas movimentações. Sem gráfico.
  - **Movimentações:** lista e "Registrar movimentação".
  - **Histórico do estoque (diferencial da entrega):** frase-filtro "Estoque da [unidade] em [data] às [hora]", atalhos (há 1 semana, 2 semanas, 1 mês) e régua de datas; tabela "Naquele momento × Agora" com a diferença (aumento em aço, queda em terracota); peças em trânsito separadas; ao abrir uma peça, gráfico de evolução (7, 30, 90 dias ou intervalo livre, até por hora) com resumo curto em números e a lista das movimentações do período.
- **Atendimento:** caixa de entrada em três colunas (filas, lista, conversa). Nota interna em balão ardósia-claro com "Só a equipe vê". Painel à direita: cliente e pedido, prioridade, responsável ("Repassar"), "Registrar troca", "Registrar devolução", "Estornar" (painel lateral passo a passo), "Concluir chamado" com motivo, histórico.
- **Caixa** é uma área da barra do interno (não um tipo de conta): aparece para quem tem venda física, troca e devolução ou entregar pedido. Cada pessoa usa o próprio login. Quem tem unidade abre travado nela; quem não tem (Admin) escolhe a loja antes da primeira venda, visível no topo ("Vendendo na Loja Paulista"); CD não aparece. Modelo de acesso novo na demo: **Vendedor** (venda física, troca e devolução, entregar retirada), que vê só Visão Geral, Caixa e Pedidos. Abas:
  - **Nova venda:** busca de peça à esquerda; à direita, "CPF na nota?" opcional (mostra o nome se tem conta, ou "CPF sem conta, a compra fica guardada nele"), forma de pagamento (troco no dinheiro), total, "Finalizar venda". A notinha abre para imprimir na hora; "Nova venda" só depois da impressão; "Imprimir de novo" se falhar. Notinha com o código da venda.
  - **Retiradas:** código do pedido + conferir documento + "Entregar".
  - **Vendas de hoje:** lista com "Reimprimir notinha" e total por forma de pagamento.
  - **Consultar peça:** matriz cor × tamanho em todas as unidades.
  - **Troca ou devolução:** busca por código da venda, CPF (30 dias) ou código do pedido; escolher peças; troca (nova cor/tamanho com o estoque da loja) ou devolução (estorno pelo mesmo meio); fora do prazo, botão desabilitado com o motivo; imprime comprovante. Sem chamado.
- **Pedidos:** filas (Para preparar, Esperando retirada, Enviados, Aguardando pagamento, Todos) + painel do pedido com a ação do momento e "Cancelar pedido" (pede motivo).
- **Moderação de avaliações:** fila de denúncias com a avaliação inteira e o motivo; "Manter publicada" ou "Ocultar" (pede motivo); aba "Ocultadas".
- **Transferências, Catálogo e Gestão:** sem redesenho, só as regras novas (topo, etiquetas, sem caixa alta e sem monoespaçada) e sem gráficos.

## Plano (ordem de execução)

1. TypeScript completo (`strict`), com tipos gerados do OpenAPI do backend.
2. Fundamentos visuais: fontes, tokens de cor, etiquetas de status, botões, topo novo da loja e do interno, rodapé.
3. Loja: início com carrossel, lista, produto com avaliações, central de ajuda.
4. Carrinho e checkout com pagamento simulado; confirmação.
5. Conta do cliente: Meus pedidos, escrever avaliação, reivindicar, chamados com anexo, cadastro com o aviso de compras.
6. Interno: Visão Geral por perfil (com a rota de resumo), Estoque com as três subabas e o Histórico.
7. Caixa com as cinco abas (depende do backend de troca/devolução no balcão).
8. Atendimento em caixa de entrada; Pedidos; Moderação.
9. Fotos e produtos da demo.
10. Revisão final dos dois repos, docs atualizados (case, ADRs, CONTEXT.md, `docs/design.md` no front).

Vitest só se sobrar tempo.
