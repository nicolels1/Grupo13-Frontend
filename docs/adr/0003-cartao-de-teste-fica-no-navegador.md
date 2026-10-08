# Dados do cartão de teste ficam no navegador

**Contexto:** o pagamento é simulado (ADR 0011 do backend). O checkout precisa parecer um checkout de verdade, com número, nome, validade e CVV, mas não existe gateway para receber esses dados.

**Decisão:** o formulário do cartão confere os campos no navegador e não envia nenhum deles ao backend (`src/pages/loja/checkout/Pagamento.tsx`). O front só chama `POST /pagamentos/{id}/simular` dizendo se aprova: o cartão `4000 0000 0000 0002` recusa, qualquer outro válido aprova. O Pix mostra um QR e um "copia e cola" falsos e aprova sozinho depois de alguns segundos.

**Por quê:** dado de cartão nunca deve passar por um sistema que não precisa dele. Quando entrar um gateway real, o formulário dá lugar ao componente do próprio gateway e o backend passa a receber a confirmação dele, sem mudar o pedido nem a reserva.
