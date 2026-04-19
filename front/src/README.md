# Frontend Structure

Esta é a estrutura organizada do frontend da aplicação InstructAI.

## Estrutura de Diretórios

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Grupo de autenticação
│   │   └── login/                # Página de login
│   ├── (private)/                # Rotas autenticadas
│   │   ├── dashboard/            # Dashboard principal
│   │   ├── alice/                # Assistente AI
│   │   ├── orcamento/            # Gerenciamento de orçamentos
│   │   ├── linhas-orcamentarias/ # Linhas orçamentárias
│   │   ├── contratos/            # Contratos
│   │   ├── colaboradores/        # Colaboradores
│   │   ├── auxilios/             # Auxílios
│   │   ├── centro/               # Centros de gestão
│   │   ├── setor/                # Setores
│   │   ├── tags/                 # Tags
│   │   ├── tutoriais/            # Tutoriais
│   │   └── ajuda/                # Ajuda
│   ├── (public)/                 # Rotas públicas
│   │   └── home/                 # Página inicial
│   ├── layout.tsx                # Layout raiz
│   ├── error.tsx                 # Página de erro
│   └── not-found.tsx             # Página 404
│
├── components/
│   ├── layout/                   # Componentes de layout
│   │   ├── sidebar/              # Componentes da sidebar
│   │   ├── navigation/           # Componentes de navegação
│   │   └── header/               # Componentes do header
│   ├── auth/                     # Componentes de autenticação
│   │   ├── AuthGuard.tsx         # Guard de autenticação
│   │   ├── ProtectedRoute.tsx    # Rota protegida
│   │   └── login-form.tsx        # Formulário de login
│   ├── budget/                   # Componentes de orçamento
│   ├── forms/                    # Formulários genéricos
│   ├── modals/                   # Modais
│   ├── providers/                # Providers React
│   └── ui/                       # Componentes base (shadcn/ui)
│
├── lib/
│   ├── api/                      # Cliente API e endpoints
│   │   ├── auth.ts               # Autenticação
│   │   ├── authFetch.ts          # Fetch autenticado
│   │   ├── budgets.ts            # Orçamentos
│   │   ├── contracts.ts          # Contratos
│   │   └── ...                   # Outros endpoints
│   ├── config/                   # Configurações
│   │   ├── api.config.ts         # Configuração da API
│   │   └── config.ts             # Config antiga (mover)
│   ├── utils/                    # Utilitários genéricos
│   │   └── utils.ts              # Funções utilitárias
│   └── schemas/                  # Schemas de validação
│
├── services/                     # Lógica de negócio
│   └── auth.service.ts           # Serviço de autenticação
│
├── hooks/                        # Custom hooks
│   ├── useAuth.ts                # Hook de autenticação
│   ├── useDebounce.ts            # Hook de debounce
│   ├── useOptimistic*.ts         # Hooks de updates otimistas
│   └── ...
│
├── contexts/                     # React contexts
│   └── DataRefreshContext.tsx    # Context de refresh de dados
│
├── types/                        # TypeScript types/interfaces
│   ├── api.types.ts              # Tipos da API
│   └── user.types.ts             # Tipos de usuário
│
├── constants/                    # Constantes da aplicação
│   ├── routes.ts                 # Rotas da aplicação
│   └── config.ts                 # Configurações gerais
│
└── middleware.ts                 # Middleware do Next.js
```

## Convenções

### Nomenclatura de Arquivos
- Componentes React: `PascalCase.tsx`
- Utilitários e hooks: `camelCase.ts`
- Tipos: `kebab-case.types.ts`
- Configurações: `kebab-case.config.ts`
- Constantes: `kebab-case.ts`

### Imports
Use aliases de importação:
```typescript
import { Component } from '@/components/ui/component'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import type { User } from '@/types/user.types'
```

### Organização de Código
1. **app/**: Apenas páginas e layouts do Next.js
2. **components/**: Componentes reutilizáveis organizados por domínio
3. **lib/**: Funções utilitárias e configurações
4. **services/**: Lógica de negócio e integração com API
5. **hooks/**: Custom hooks React
6. **contexts/**: React contexts para estado global
7. **types/**: Definições de tipos TypeScript
8. **constants/**: Valores constantes da aplicação

## Próximos Passos

1. Migrar componentes restantes para a estrutura de domínios
2. Criar mais serviços seguindo o padrão de `auth.service.ts`
3. Consolidar tipos em arquivos específicos por domínio
4. Adicionar testes unitários em `__tests__/` ao lado dos arquivos
5. Documentar componentes principais com JSDoc
