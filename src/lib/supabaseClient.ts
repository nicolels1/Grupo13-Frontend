import { createClient } from '@supabase/supabase-js'

import { enderecoDoLinkDeSenha } from '@/auth/linkDeSenha'
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from '@/config/ambiente'

// precisa vir antes do createClient: o cliente lê o link da URL assim que é criado
const destino = enderecoDoLinkDeSenha(window.location.pathname, window.location.hash)
if (destino) window.history.replaceState(null, '', destino)

export const supabase = createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA)
