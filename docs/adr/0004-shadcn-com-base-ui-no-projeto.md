# Componentes do shadcn/ui, com base-ui, dentro do projeto

**Contexto:** a interface precisa de diálogo, painel lateral, menu, carrossel, gráfico e outros componentes acessíveis, com o visual da Casa Lorenzi. Uma biblioteca fechada traria o visual dela; escrever tudo do zero levaria tempo e erraria em acessibilidade.

**Decisão:** os componentes vêm do shadcn/ui no estilo `base-nova`, que usa a base-ui por baixo (`components.json`). O CLI copia o código para `src/components/ui/`, onde ele é ajustado ao design: cantos retos pelo `--radius`, cores dos tokens do `src/index.css`, variantes próprias de botão. Componente sem uso sai do projeto.

**Por quê:** o código é nosso, então dá para ajustar sem lutar contra a biblioteca, e o foco, o teclado e os atributos de acessibilidade já vêm prontos. Como os arquivos foram editados, rodar `npx shadcn add` de novo por cima de um componente que já existe apaga esses ajustes.
