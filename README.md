# InstructAI

Plataforma educacional completa para criação, gerenciamento e entrega de conteúdo instrucional, com suporte a tutoriais em etapas, cursos com vídeos, avaliações, certificados e integração com IA.

## Funcionalidades

- **Tutoriais** — Criação de tutoriais multi-etapas com conteúdo rich text, upload de mídia (imagens/vídeos) e anotações em canvas
- **Cursos** — Estrutura de cursos com lições em vídeo (YouTube), exames de múltipla escolha e rastreamento de progresso
- **Certificados** — Geração automática de certificados em PDF com código de validação único
- **Manuais** — Upload e gestão de documentos PDF com indexação para busca semântica
- **Usuários** — Cadastro por convite via e-mail, criação manual pelo admin e redefinição de senha por link
- **Autenticação** — Login por e-mail com JWT, perfis de usuário com avatar e troca de senha obrigatória no primeiro acesso
- **Organização** — Setores e tags para categorização, com controle de visibilidade por setor e período de disponibilidade
- **IA (Alice)** — Assistente integrado com OpenAI (GPT-4o-mini), base de conhecimento vetorial (RAG), tool calling e memória por sessão

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Django 5.2, Django REST Framework, SimpleJWT, Celery, Redis |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Banco de dados | PostgreSQL 16 + pgvector |
| Infraestrutura | Docker, Docker Compose |

## Requisitos

- [Docker](https://www.docker.com/) e Docker Compose
- Arquivo `.env` configurado (veja abaixo)

## Configuração

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd InstructAI
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz com as seguintes variáveis:

```env
# Django
SECRET_KEY=sua-chave-secreta-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
FRONTEND_URL=http://localhost:3001

# PostgreSQL
POSTGRES_DB=instructai
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# IA
OPENAI_API_KEY=

# E-mail (console em desenvolvimento; trocar por SMTP em produção)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=InstructAI <noreply@instructai.com>
```

### 3. Suba os containers

```bash
docker compose up --build
```

Os serviços estarão disponíveis em:

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend (API) | http://localhost:8002 |
| Admin Django | http://localhost:8002/admin |

## Estrutura do Projeto

```
InstructAI/
├── back/                   # API Django REST Framework
│   ├── accounts/           # Autenticação, usuários e convites
│   ├── tutorial/           # Tutoriais e etapas
│   ├── courses/            # Cursos, lições, exames e certificados
│   ├── manual/             # Manuais em PDF
│   ├── tags/               # Sistema de tags
│   ├── sectors/            # Setores organizacionais
│   ├── agent/              # Integração com IA (Alice)
│   ├── documents/          # Base de conhecimento vetorial (RAG)
│   ├── access/             # Controle de acesso e auditoria
│   └── core/               # Configurações do projeto
├── front/                  # Aplicação Next.js
│   └── src/
│       ├── app/            # App Router (rotas públicas e privadas)
│       ├── components/     # Componentes reutilizáveis
│       ├── lib/            # Cliente API e schemas Zod
│       └── types/          # Tipos TypeScript
└── docker-compose.yml
```

## API

A documentação da API (OpenAPI/Swagger) está disponível em:

```
http://localhost:8002/api/schema/swagger-ui/
```

Principais endpoints:

| Recurso | Endpoint |
|---|---|
| Autenticação | `/api/v1/accounts/` |
| Usuários | `/api/v1/accounts/users/` |
| Tutoriais | `/api/v1/tutorials/` |
| Cursos | `/api/v1/courses/` |
| Manuais | `/api/v1/manuals/` |
| Tags | `/api/v1/tags/` |
| Setores | `/api/v1/sectors/` |
| Alice (IA) | `/api/v1/alice/` |

## Desenvolvimento local (sem Docker)

### Backend

```bash
cd back
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd front
npm install
npm run dev
```

## Licença

Uso interno. Todos os direitos reservados.

## Empresa emissora e validação de certificados

Um administrador deve cadastrar a empresa responsável em `/empresa-emissora` antes da emissão de certificados. O cadastro é único para todo o sistema e permite informar razão social, CNPJ, responsável pela assinatura, cargo e texto adicional. Cada certificado preserva os dados do emissor no momento da emissão.

A página pública `/validar-certificado` consulta o código do certificado sem exigir login. O PDF inclui QR Code e link para essa página. Configure `FRONTEND_URL` com o endereço acessível aos usuários para que os links funcionem fora do ambiente local. A assinatura no PDF é nominal, sem assinatura criptográfica.

O relatório da revisão local está em [docs/qa-interface-2026-11-17.md](docs/qa-interface-2026-11-17.md).