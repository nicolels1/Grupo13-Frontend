# Carrinho guardado no navegador

**Contexto:** o design pede que a pessoa monte o carrinho sem conta e só entre na hora de finalizar. Um carrinho no banco exigiria login desde a primeira peça ou um carrinho anônimo no backend.

**Decisão:** o carrinho fica no `localStorage` do navegador (`src/pages/loja/carrinho/CarrinhoProvider.tsx`), só com a variante e a quantidade. Preço, frete e disponibilidade vêm sempre da API (`POST /carrinho`), e a reserva das peças só acontece no checkout (ADR 0002 do backend). Dado estragado ou de outra versão vira carrinho vazio em vez de quebrar a loja.

**Por quê:** montar o carrinho sem conta e só entrar ao finalizar é o que a loja pede, e o navegador não guarda nada que precise de proteção: nenhum dado de conta, permissão ou preço vale por estar lá. A troca é que o carrinho não acompanha a pessoa de um aparelho para outro.
