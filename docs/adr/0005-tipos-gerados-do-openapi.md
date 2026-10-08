# Tipos da API gerados do OpenAPI do backend

**Contexto:** o front lê e manda dezenas de formatos da API. Declarar cada resposta à mão em TypeScript deixa o front desatualizado sem aviso quando o backend muda um campo.

**Decisão:** `npm run tipos:api` gera `src/lib/tiposApi.ts` a partir do `/openapi.json` da API publicada, com o openapi-typescript. As telas usam `Esquema<'Nome'>` (`src/lib/api.ts`) e nunca escrevem o formato de uma resposta à mão. O arquivo gerado não é editado.

**Por quê:** quando o backend muda, gerar de novo e rodar o `tsc` aponta cada tela que quebrou antes de ela chegar ao navegador. A troca é lembrar de gerar de novo depois de cada mudança na API; o README avisa disso em "Problemas comuns".
