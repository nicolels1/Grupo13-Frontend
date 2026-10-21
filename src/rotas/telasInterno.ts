import { lazy } from 'react'

// as telas do interno só baixam quando alguém da equipe abre: quem visita a loja não leva o código
// delas (nem o dos gráficos) junto
export const Atendimento = lazy(() => import('@/pages/interno/Atendimento').then((m) => ({ default: m.Atendimento })))
export const Caixa = lazy(() => import('@/pages/interno/Caixa').then((m) => ({ default: m.Caixa })))
export const Clientes = lazy(() => import('@/pages/interno/Clientes').then((m) => ({ default: m.Clientes })))
export const FichaCliente = lazy(() => import('@/pages/interno/clientes/FichaCliente').then((m) => ({ default: m.FichaCliente })))
export const Catalogo = lazy(() => import('@/pages/interno/Catalogo').then((m) => ({ default: m.Catalogo })))
export const Estoque = lazy(() => import('@/pages/interno/Estoque').then((m) => ({ default: m.Estoque })))
export const HistoricoEstoque = lazy(() => import('@/pages/interno/HistoricoEstoque').then((m) => ({ default: m.HistoricoEstoque })))
export const Gestao = lazy(() => import('@/pages/interno/Gestao').then((m) => ({ default: m.Gestao })))
export const Moderacao = lazy(() => import('@/pages/interno/Moderacao').then((m) => ({ default: m.Moderacao })))
export const Movimentacoes = lazy(() => import('@/pages/interno/Movimentacoes').then((m) => ({ default: m.Movimentacoes })))
export const Pedidos = lazy(() => import('@/pages/interno/Pedidos').then((m) => ({ default: m.Pedidos })))
export const ProdutoInterno = lazy(() => import('@/pages/interno/ProdutoInterno').then((m) => ({ default: m.ProdutoInterno })))
export const Transferencias = lazy(() => import('@/pages/interno/Transferencias').then((m) => ({ default: m.Transferencias })))
export const VisaoGeral = lazy(() => import('@/pages/interno/VisaoGeral').then((m) => ({ default: m.VisaoGeral })))
