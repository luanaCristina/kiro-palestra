# 🏥 Sistema de Agendamento de Consultas Médicas

API REST + Frontend para agendamento de consultas médicas, com suporte a múltiplas especialidades, controle de disponibilidade por médico e política de cancelamento de 24 horas.

**🌐 Demo online:** [https://appointment-scheduling-api.onrender.com](https://appointment-scheduling-api.onrender.com)

---

## � Links do Projeto

| Recurso | Link |
|---------|------|
| 🎬 **Slides da Palestra** | [GenSpark - Palestra Kiro + MCP](https://www.genspark.ai/slides?project_id=241ee489-f057-408d-941a-a9646258dca2&deck=palestra-kiro-mcp) *(requer login no [genspark.ai](https://www.genspark.ai))* |
| 📋 **Board Jira** | [SDC - Sistema de Consulta](https://luanacroft.atlassian.net/jira/software/projects/SDC/boards/5) |
| 🧪 **QMetry - Test Cases** | [Pasta Regression](https://luanacroft.atlassian.net/jira/apps/8b7b816c-2b85-4e73-ae22-aa0e6f0407ec/53926dc7-47de-4878-9fc2-5033dde60120/Manage/TestCase?folderId=2531077&projectId=10068&projectKey=SDC) |
| 🔄 **QMetry - Test Cycles** | [Execuções de Teste](https://luanacroft.atlassian.net/jira/apps/8b7b816c-2b85-4e73-ae22-aa0e6f0407ec/53926dc7-47de-4878-9fc2-5033dde60120/Manage/TestCycle?projectId=10068&projectKey=SDC) |
| 📄 **Confluence - Documentação** | [Automação de Testes - Guia Completo](https://luanacroft.atlassian.net/wiki/spaces/CM/pages/2752514/Automa+o+de+Testes+-+Guia+Completo) |
| 🌐 **App Online (Render)** | [appointment-scheduling-api.onrender.com](https://appointment-scheduling-api.onrender.com) |
| 💻 **Repositório GitHub** | [github.com/luanaCristina/kiro-palestra](https://github.com/luanaCristina/kiro-palestra) |

---

## �📋 Índice

- [Rodando localmente](#-rodando-localmente)
- [Acessando a versão online (Render)](#-acessando-a-versão-online-render)
- [Sobre o projeto](#-sobre-o-projeto)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Funcionalidades (Abas do sistema)](#-funcionalidades-abas-do-sistema)
- [API Endpoints](#-api-endpoints)
- [Testes automatizados](#-testes-automatizados)
- [Tecnologias](#-tecnologias)

---

## 🚀 Rodando localmente

### Pré-requisitos

- **Node.js** 18+ (recomendado: 20.x)
- **PostgreSQL** 14+ rodando localmente
- **npm** (vem com Node.js)

### Passo a passo

#### 1. Clone o repositório

```bash
git clone https://github.com/luanaCristina/kiro-palestra.git
cd kiro-palestra
```

> Faz o download do código-fonte para sua máquina.

#### 2. Instale as dependências

```bash
npm install
```

> Baixa todas as bibliotecas necessárias (Express, PostgreSQL, Zod, Jest, etc.).

#### 3. Configure o banco de dados

Crie um banco PostgreSQL local:

```bash
# Acesse o PostgreSQL (use seu usuário)
psql -U postgres

# Dentro do psql, crie o banco:
CREATE DATABASE appointment_scheduling;

# Saia do psql
\q
```

> O sistema precisa de um banco PostgreSQL para armazenar médicos, pacientes e consultas.

#### 4. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` se necessário (os valores padrão funcionam se seu PostgreSQL usa user `postgres` sem senha):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=appointment_scheduling
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3000
```

> Define a conexão com o banco e a porta do servidor.

#### 5. Execute as migrations

```bash
npm run migrate
```

> Cria as tabelas no banco de dados (doctors, patients, appointments, availability_ranges).

#### 6. Inicie o servidor

```bash
npm run dev
```

> Inicia o servidor em modo desenvolvimento com hot-reload. A aplicação estará disponível em **http://localhost:3000**.

#### 7. Acesse no navegador

Abra [http://localhost:3000](http://localhost:3000) — você verá o Sistema de Agendamento de Consultas com todas as funcionalidades.

### Comandos úteis

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Inicia o servidor em modo desenvolvimento (ts-node) |
| `npm run build` | Compila TypeScript para JavaScript na pasta `dist/` |
| `npm start` | Inicia o servidor compilado (produção) |
| `npm test` | Roda todos os testes (integração, unitários, property-based, E2E) |
| `npm run test:coverage` | Roda testes com relatório de cobertura |
| `npm run migrate` | Aplica as migrations SQL no banco de dados |

---

## 🌐 Acessando a versão online (Render)

A aplicação está hospedada gratuitamente no Render com um banco PostgreSQL:

**URL:** [https://appointment-scheduling-api.onrender.com](https://appointment-scheduling-api.onrender.com)

### Como funciona

1. Acesse o link acima
2. A primeira vez pode demorar ~30 segundos para carregar (o plano gratuito do Render "hiberna" o servidor após inatividade)
3. O sistema já vem com **dados de demonstração** pré-carregados:

| Médicos | Especialidade | Horários |
|---------|--------------|----------|
| Dra. Camila Rodrigues | Cardiologia | Seg-Sex 08:00-12:00, 14:00-18:00 |
| Dr. Fernando Oliveira | Neurologia | Ter-Qui 09:00-13:00, 15:00-19:00 |
| Dra. Beatriz Santos | Pediatria | Seg/Qua/Sex 07:00-12:00 |

| Pacientes | Email |
|-----------|-------|
| Lucas Ferreira | lucas.ferreira@email.com |
| Ana Paula Costa | ana.costa@email.com |
| Roberto Almeida | roberto.almeida@email.com |

### Verificando se o servidor está online

Acesse: [https://appointment-scheduling-api.onrender.com/health](https://appointment-scheduling-api.onrender.com/health)

Se retornar `{"status":"ok"}`, o servidor está funcionando.

---

## 📖 Sobre o projeto

Este é um sistema completo de agendamento de consultas médicas, composto por:

- **Backend REST API** em Node.js/Express com TypeScript
- **Frontend SPA** (Single Page Application) em HTML/CSS/JavaScript vanilla
- **Banco de dados PostgreSQL** para persistência
- **Suite de testes automatizados** com 4 camadas de validação

### Regras de negócio principais

- Médicos têm **horários de disponibilidade** configuráveis (por dia da semana)
- Pacientes podem agendar consultas em **slots de 30 ou 60 minutos**
- **Conflitos de horário** são prevenidos (dois pacientes não podem ocupar o mesmo slot)
- Cancelamento requer **mais de 24 horas** de antecedência (exatamente 24h não é permitido)
- Apenas o **próprio paciente** pode cancelar sua consulta
- O sistema considera **feriados nacionais e estaduais** brasileiros

### Especialidades suportadas

Cardiologia, Dermatologia, Neurologia, Ortopedia, Pediatria, Psiquiatria, Clínica Geral

---

## 📁 Estrutura do projeto

```
kiro-palestra/
├── public/              → Frontend (HTML/CSS/JS)
│   └── index.html       → Aplicação SPA completa
├── src/                 → Backend (TypeScript)
│   ├── app.ts           → Configuração do Express (rotas, middlewares)
│   ├── server.ts        → Ponto de entrada (start, migrations, seed)
│   ├── config/          → Configurações (banco, migrations, seed)
│   ├── middleware/      → Middlewares (validação Zod)
│   ├── models/          → Tipos, enums, interfaces, códigos de erro
│   ├── modules/         → Lógica de negócio pura (sem I/O)
│   │   ├── slot-calculator.ts      → Calcula horários disponíveis
│   │   ├── overlap-detector.ts     → Detecta conflitos de horário
│   │   ├── cancellation-policy.ts  → Regras de cancelamento
│   │   └── holidays.ts             → Feriados brasileiros
│   ├── repositories/    → Queries SQL (acesso ao banco)
│   ├── routes/          → Rotas HTTP (controllers)
│   ├── services/        → Orquestração de negócio
│   └── validation/      → Schemas Zod para validação de entrada
├── migrations/          → SQL para criar as tabelas
├── tests/               → Testes automatizados
│   ├── integration/     → Testes de API (Supertest + PostgreSQL)
│   ├── unit/            → Testes unitários dos módulos
│   ├── property/        → Testes baseados em propriedades (fast-check)
│   └── e2e/             → Testes do frontend (JSDOM + fetch mock)
├── render.yaml          → Configuração de deploy no Render
├── jest.config.ts       → Configuração do Jest
├── tsconfig.json        → Configuração do TypeScript
└── package.json         → Dependências e scripts
```

---

## 🖥️ Funcionalidades (Abas do sistema)

O frontend possui 4 abas principais:

### 👥 Cadastro

Permite registrar novos médicos e pacientes no sistema.

- **Cadastrar Médico:** Informe nome e selecione a especialidade. O médico fica disponível para receber agendamentos.
- **Cadastrar Paciente:** Informe nome e email. O paciente pode então agendar consultas.

### 📅 Disponibilidade

Gerencia os horários de atendimento dos médicos.

- **Adicionar Horário:** Selecione o médico, dia da semana, hora início e hora fim. Define quando o médico está disponível para consultas.
- **Editar Horário:** Clique no botão editar de um horário existente para alterar dia/hora.
- **Excluir Horário:** Remove um horário de disponibilidade (com confirmação).

> Regras: máximo 5 faixas por dia, horários em intervalos de 15 minutos, sem sobreposição.

### ✅ Agendamento

Fluxo para marcar uma nova consulta.

1. **Selecione o médico** — filtra pela especialidade desejada
2. **Escolha a data** — o sistema mostra apenas datas com disponibilidade
3. **Veja os slots** — horários livres aparecem como botões clicáveis
4. **Selecione o paciente e tipo** — Primeira Consulta (60 min) ou Retorno (30 min)
5. **Confirme** — a consulta é agendada e aparece na aba Consultas

> Se não houver slots, o sistema informa que não há disponibilidade.

### 📋 Consultas

Lista todas as consultas agendadas com opções de gerenciamento.

- **Visualizar:** Mostra médico, paciente, data, horário, tipo e status
- **Cancelar:** Cancela uma consulta (só funciona com mais de 24h de antecedência)
- **Status:** Confirmada (verde) ou Cancelada (vermelho)

> Só o próprio paciente pode cancelar. Consultas passadas ou já canceladas não podem ser alteradas.

---

## 🔌 API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| POST | `/api/doctors` | Cadastrar médico |
| GET | `/api/doctors/all` | Listar todos os médicos |
| GET | `/api/doctors?specialty=X&date=Y` | Buscar médicos com slots disponíveis |
| PUT | `/api/doctors/:id/availability` | Configurar disponibilidade |
| POST | `/api/patients` | Cadastrar paciente |
| GET | `/api/patients` | Listar pacientes |
| POST | `/api/appointments` | Agendar consulta |
| GET | `/api/appointments` | Listar consultas |
| POST | `/api/appointments/:id/cancel` | Cancelar consulta |
| GET | `/api/availability/:doctorId` | Ver disponibilidade do médico |
| PUT | `/api/availability/:rangeId` | Editar faixa de horário |
| DELETE | `/api/availability/:rangeId` | Remover faixa de horário |
| GET | `/api/holidays?state=XX` | Feriados por estado |
| GET | `/api/states` | Listar estados brasileiros |

---

## 🧪 Testes automatizados

O projeto possui uma suite completa com **4 camadas de teste**:

### Testes de Integração (`tests/integration/`)
Testam os endpoints da API com um banco PostgreSQL real. Validam o fluxo completo HTTP → serviço → banco → resposta.

```bash
npx jest --testPathPattern="integration"
```

### Testes Unitários (`tests/unit/`)
Testam módulos de lógica de negócio isoladamente, sem banco de dados.

```bash
npx jest --testPathPattern="unit"
```

### Testes Property-Based (`tests/property/`)
Usam **fast-check** para gerar centenas de entradas aleatórias e validar invariantes matemáticas (ex: "nenhum slot deve sobrepor uma consulta existente").

```bash
npx jest --testPathPattern="property"
```

### Testes E2E Frontend (`tests/e2e/`)
Testam o frontend carregando o HTML real com JSDOM e simulando cliques, preenchimento de formulários e respostas da API.

```bash
npx jest --testPathPattern="e2e"
```

### Rodar todos os testes

```bash
npm test
```

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20.x |
| Linguagem | TypeScript (strict mode) |
| Framework Web | Express 4.x |
| Banco de dados | PostgreSQL (pg, raw SQL) |
| Validação | Zod |
| Testes | Jest, Supertest, fast-check, JSDOM |
| Deploy | Render (Web Service + PostgreSQL) |
| Frontend | HTML/CSS/JavaScript vanilla |

---

## 📄 Licença

ISC

---

Desenvolvido com 💜 usando [Kiro](https://kiro.dev) como assistente de desenvolvimento.
