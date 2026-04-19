# InstructAI

Plataforma educacional completa para criação, gerenciamento e entrega de conteúdo instrucional, com suporte a tutoriais em etapas, cursos com vídeos, avaliações, certificados e integração com IA.

## Funcionalidades

- **Tutoriais** — Criação de tutoriais multi-etapas com conteúdo rich text, upload de mídia (imagens/vídeos) e anotações em canvas
- **Cursos** — Estrutura de cursos com lições em vídeo (YouTube), exames de múltipla escolha e rastreamento de progresso
- **Certificados** — Geração automática de certificados em PDF com código de validação único
- **Autenticação** — Login baseado em e-mail com JWT, perfis de usuário com avatar
- **Organização** — Setores e tags para categorização de conteúdo, com busca e filtragem
- **IA (Alice)** — Assistente integrado com OpenAI (GPT-4o-mini), tool calling, consulta à base de conhecimento e memória por sessão

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Django 5.2, Django REST Framework, SimpleJWT, Celery, Redis |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Banco de dados | PostgreSQL 16 |
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

# PostgreSQL
POSTGRES_DB=instructai
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# IA (opcional)
GOOGLE_API_KEY=
OPENAI_API_KEY=
```

### 3. Suba os containers

```bash
docker compose up --build
```

Os serviços estarão disponíveis em:

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend (API) | http://localhost:8001 |
| Admin Django | http://localhost:8001/admin |

## Estrutura do Projeto

```
InstructAI/
├── back/                   # API Django REST Framework
│   ├── accounts/           # Autenticação e perfis de usuário
│   ├── tutorials/          # Tutoriais e etapas
│   ├── courses/            # Cursos, lições, exames e certificados
│   ├── tags/               # Sistema de tags
│   ├── sectors/            # Setores organizacionais
│   ├── agent/              # Integração com IA
│   └── core/               # Configurações do projeto
├── front/                  # Aplicação Next.js
│   └── src/
│       ├── app/            # App Router (rotas públicas e privadas)
│       ├── components/     # Componentes reutilizáveis
│       ├── lib/            # Cliente API e schemas Zod
│       └── hooks/          # React hooks customizados
└── docker-compose.yml
```

## API

A documentação da API (OpenAPI/Swagger) está disponível em:

```
http://localhost:8001/api/schema/swagger-ui/
```

Principais endpoints:

| Recurso | Endpoint |
|---|---|
| Autenticação | `/api/v1/accounts/` |
| Tutoriais | `/api/v1/tutorials/` |
| Cursos | `/api/v1/courses/` |
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
