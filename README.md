# NJ Assistant Office

**Escritório virtual inteligente com agentes de IA para gestão administrativa.**

Sistema desenvolvido pela **NJ Sistemas** como parte da plataforma **NEVION**.

---

## Visão Geral

O NJ Assistant Office é uma aplicação web que centraliza a gestão administrativa do dia a dia, com suporte de Inteligência Artificial para análise de tarefas, conferência de processos, gestão de projetos e comunicação profissional.

---

## Módulos

| Módulo | Descrição |
|---|---|
| **Dashboard** | Visão geral com resumo inteligente do dia |
| **Caixa de Entrada** | Leitura e triagem de e-mails (Outlook / Gmail) |
| **Agenda** | Compromissos e calendário |
| **Tarefas** | Gestão de tarefas com histórico e análise de IA |
| **Central de Pendências** | Monitoramento de atividades em atraso |
| **Assistente NJ** | Chat com agentes especializados de IA |
| **Projetos** | Gestão de projetos com etapas, entregas e análise de IA |
| **Conferência** | Conferência de processos com checklist, inconsistências e parecer de IA |
| **Histórico** | Registro cronológico de todas as atividades |
| **Integrações** | Conexão com Outlook e Gmail via OAuth |

---

## Stack Técnica

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript 5
- **Estilização:** Tailwind CSS 3
- **ORM:** Prisma 5 → PostgreSQL (produção) / SQLite (desenvolvimento)
- **IA:** OpenAI GPT-4o-mini
- **Integrações:** Microsoft Graph API (Outlook), Google APIs (Gmail)

---

## Agentes de IA

| Agente | Especialidade |
|---|---|
| Assistente Administrativo | Organização e rotina |
| Analista Administrativo | Interpretação e plano de ação |
| Redator Administrativo | E-mails e comunicados profissionais |
| Gestor de Pendências | Monitoramento e cobrança |
| Coordenador Administrativo | Visão estratégica e prioridades |
| Gerente de Projetos | Cronogramas, riscos e entregas |
| Coordenador de Conferência | Análise de processos e parecer técnico |

---

## Requisitos

- Node.js 20+
- PostgreSQL 16+ (produção)
- Variáveis de ambiente configuradas (ver `.env.example`)

---

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# editar .env com suas chaves

# Sincronizar banco de dados
npx prisma db push

# Popular banco com dados de exemplo
npm run db:seed

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: `http://localhost:3000`

---

## Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | URL de conexão com o banco (PostgreSQL ou SQLite) |
| `NEXTAUTH_SECRET` | ✅ | Segredo para autenticação (mín. 32 caracteres) |
| `OPENAI_API_KEY` | ⚡ | Chave OpenAI para IA real (sem ela, usa modo local) |
| `MICROSOFT_CLIENT_ID` | 📧 | OAuth Outlook — App Registration no Azure |
| `MICROSOFT_CLIENT_SECRET` | 📧 | OAuth Outlook |
| `MICROSOFT_REDIRECT_URI` | 📧 | URI de callback do Outlook |
| `GOOGLE_CLIENT_ID` | 📧 | OAuth Gmail — Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | 📧 | OAuth Gmail |
| `GOOGLE_REDIRECT_URI` | 📧 | URI de callback do Gmail |

---

## Produção (NEVION)

- **URL:** https://assistant.nevion.com.br
- **Infraestrutura:** VPS Hostinger Ubuntu 24.04
- **Container:** Docker + Docker Compose
- **Banco:** PostgreSQL 16 dedicado
- **Proxy:** Nginx Proxy Manager
- **SSL:** Let's Encrypt

---

## Empresa

**NJ Sistemas** — Plataforma NEVION

---

> ⚠️ Este repositório é **privado**. Não compartilhar credenciais, `.env` ou dados de produção.
