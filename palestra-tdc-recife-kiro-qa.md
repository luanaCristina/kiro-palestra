# 🎤 E se o QA pudesse ler o Jira, o Confluence e o código ao mesmo tempo? Com Kiro, pode.

## TDC Recife 2026 | Trilha QA & Desenvolvimento

---

### 👤 Sobre a Palestrante

**Luana Cristina** | Quality Analyst @ Thoughtworks
- Pós-graduação: Residency Program in Software Development — CIN/UFPE + EMPREL
- Consultora especializada em QA, automação de testes e IA aplicada ao desenvolvimento
- Foco: integração de ferramentas com IA para qualidade e rastreabilidade de entregas

---

## 📋 Agenda

1. O problema: silos de informação no QA
2. A solução: Kiro + MCP (Model Context Protocol)
3. Demo ao vivo: do Jira ao teste automatizado em minutos
4. Recursos do Kiro: Specs, Hooks, Steering, Skills
5. Integração com Jira, Confluence, GitHub, QMetry
6. Thoughtworks + IA: como trabalhamos
7. Dicas práticas: como usar Kiro sem gastar créditos à toa
8. Instalação e pricing

---

## 1. 🧩 O Problema: Silos de Informação

### A realidade do QA hoje

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Jira   │     │Confluence│    │  GitHub  │     │  QMetry  │
│ (cards) │     │  (docs)  │    │ (código) │     │ (testes) │
└────┬────┘     └────┬─────┘    └────┬─────┘     └────┬────┘
     │               │               │                 │
     └───────────────┼───────────────┼─────────────────┘
                     │               │
              🧠 QA precisa navegar 4+ ferramentas
              ⏱️ Tempo perdido alternando contexto
              ❌ Informação desatualizada ou perdida
```

### Consequências
- QA não tem visão completa do requisito + código + teste
- Documentação fica desatualizada (quem atualiza o Confluence depois do sprint?)
- Rastreabilidade inexistente ou manual (planilhas, links no Jira)
- Novos integrantes levam semanas para entender o projeto

---

## 2. 🚀 A Solução: Kiro + MCP

### O que é o Kiro?

**Kiro** é uma IDE com IA desenvolvida pela AWS que funciona como um parceiro de desenvolvimento. Diferente de outros assistentes de código, o Kiro:

- **Lê e escreve em múltiplas ferramentas simultaneamente** (Jira, Confluence, GitHub, QMetry)
- **Entende contexto completo** do projeto via Steering files
- **Automatiza fluxos** com Agent Hooks
- **Cria specs estruturadas** (requisitos → design → implementação)

### O que é MCP (Model Context Protocol)?

**MCP** é um protocolo open-source criado pela Anthropic que permite que modelos de IA se conectem de forma segura a ferramentas externas.

```
┌──────────────┐     MCP Protocol     ┌──────────────────┐
│     KIRO     │◄───────────────────►│   MCP Servers     │
│   (IA/IDE)   │                      │                  │
└──────────────┘                      │  ┌─── Jira       │
                                      │  ├─── Confluence  │
                                      │  ├─── GitHub      │
                                      │  ├─── QMetry      │
                                      │  ├─── Datadog     │
                                      │  └─── Qualquer    │
                                      └──────────────────┘
```

### Analogia simples
> MCP é como um **adaptador universal de tomada**. Você pluga o Kiro em qualquer ferramenta — Jira, Confluence, GitHub, QMetry, Datadog — e ele consegue ler e escrever em todas ao mesmo tempo, sem precisar sair da IDE.

### Como configurar MCP no Kiro

Arquivo: `~/.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${TOKEN}" }
    },
    "atlassian-cloud": {
      "url": "https://mcp.atlassian.com/v1/mcp",
      "env": {
        "ATLASSIAN_EMAIL": "seu@email.com",
        "ATLASSIAN_API_TOKEN": "seu-token"
      }
    },
    "smartbear": {
      "command": "npx",
      "args": ["-y", "@smartbear/mcp@latest"],
      "env": { "QMETRY_API_KEY": "sua-api-key" }
    }
  }
}
```

### Vantagens do MCP
| Benefício | Descrição |
|-----------|-----------|
| **Unificação** | Todas as ferramentas acessíveis de um só lugar |
| **Contexto completo** | IA entende requisito + código + teste junto |
| **Automação** | Cria cards, atualiza docs, faz push — tudo por comando |
| **Rastreabilidade** | Conecta card → código → teste → evidência automaticamente |
| **Onboarding** | Novos devs perguntam ao Kiro e ele busca nas ferramentas |

---

## 3. 🎬 Demo: Do Jira ao Teste em Minutos

### Fluxo que demonstramos ao vivo

```
1. "Kiro, cria uma spec para automação de testes"
   → Kiro gera requirements.md + design.md + tasks.md

2. "Kiro, executa todas as tasks"
   → Kiro implementa 183 testes automatizados (62 tasks)

3. "Kiro, cria um card no Jira e coloca em Testing"
   → Kiro cria SDC-16, move para Testing, linka ao GitHub

4. "Kiro, roda os testes e envia pro QMetry associado ao card SDC-8"
   → npm run test:qmetry -- --card SDC-8
   → 182/183 pass, Test Cycle criado no QMetry

5. "Kiro, cria uma página Confluence explicando os testes"
   → Página completa com cenários, comandos, rastreabilidade

6. "Kiro, faz deploy no Render"
   → Aplicação online com dados demo
```

### Resultado: projeto completo em 1 sessão
- 183 testes automatizados
- 4 camadas de teste (integração, unit, property, E2E)
- Rastreabilidade Jira → QMetry → GitHub
- Documentação no Confluence
- Aplicação rodando online

---

## 4. 🛠️ Recursos do Kiro

### 📐 Specs (Spec-Driven Development)

Specs transformam uma ideia em um plano estruturado:

```
Ideia → Requirements → Design → Tasks → Implementação
```

- **Requirements**: User stories com acceptance criteria (formato EARS)
- **Design**: Arquitetura, componentes, modelos de dados
- **Tasks**: Lista de tarefas com dependências (DAG)
- O Kiro executa as tasks automaticamente com subagentes

### 🪝 Agent Hooks

Hooks são automações que disparam quando eventos acontecem:

```json
{
  "name": "Run Tests on Save",
  "when": { "type": "fileEdited", "patterns": ["*.ts"] },
  "then": { "type": "runCommand", "command": "npm test" }
}
```

**Exemplos úteis para QA:**
- Rodar linter quando salvar arquivo
- Rodar testes quando criar/editar test files
- Validar código antes de fazer commit
- Gerar documentação automaticamente

### 🧭 Agent Steering

Steering files dão contexto persistente ao Kiro sobre o projeto:

```
.kiro/steering/
├── product.md      → O que o produto faz (domínio)
├── tech.md         → Stack, comandos, bibliotecas
└── structure.md    → Estrutura de pastas, padrões
```

**Por que é poderoso:**
- Novos integrantes não precisam memorizar a arquitetura
- Kiro sempre segue os padrões do projeto
- Consistência em todo código gerado

### ⚡ Skills

Skills são instruções especializadas que o Kiro ativa sob demanda:
- Podem incluir padrões de código específicos
- Templates de teste
- Guias de refatoração
- Padrões de design da empresa

---

## 5. 🔗 Integrações que Usamos

| Ferramenta | MCP Server | O que o Kiro faz |
|-----------|------------|-----------------|
| **Jira** | atlassian-cloud | Cria/atualiza cards, move entre colunas, adiciona comentários |
| **Confluence** | atlassian-cloud | Cria/edita páginas, busca documentação existente |
| **GitHub** | @modelcontextprotocol/server-github | Push, PR, branches, file contents |
| **QMetry** | @smartbear/mcp | Importa resultados de teste, cria test cycles |
| **Datadog** | MCP personalizado | Consulta logs, métricas, alertas |

### Exemplo real: criando um card e linkando ao código

```
"Kiro, cria um card no Jira com as alterações dos testes,
coloca em Testing e linka ao repositório"
```

Resultado:
- Card SDC-16 criado no Jira
- Status movido para Testing
- Comentário com link do branch e commit
- Tudo em 1 interação

---

## 6. 🧠 Thoughtworks + IA: Como Trabalhamos

### Thoughtworks AI Works
> [thoughtworks.com/ai/works](https://www.thoughtworks.com/en-br/ai/works)

A Thoughtworks investe fortemente em IA responsável e aplicada. Como consultoras, seguimos:

### Princípios
- **IA como par** — não substitui o dev/QA, amplifica capacidade
- **Responsible AI** — transparência, segurança, governança
- **Pragmatismo** — usar IA onde agrega valor real, não por hype
- **Qualidade first** — testes automatizados, code review, CI/CD

### Como consultoras da TW trabalham
1. **Entender o contexto** — domínio, stack, equipe, processos
2. **Estabelecer padrões** — steering files, linters, test suites
3. **Automatizar o repetitivo** — hooks, scripts, CI/CD
4. **Documentar decisions** — ADRs, specs, Confluence
5. **Entregar com evidência** — testes + rastreabilidade + métricas

### Padrões e Melhores Práticas
- **TDD/BDD** com property-based testing para invariantes
- **Spec-driven development** — nunca codificar sem spec
- **Trunk-based development** com feature flags
- **Continuous delivery** — deploy a qualquer momento
- **Observability** — logs, metrics, traces (Datadog/Grafana)

---

## 7. 💡 Dicas Práticas: Usando Kiro sem Gastar Créditos à Toa

### Plano Free: 50 créditos/mês

Cada interação gasta créditos. Como maximizar:

| Dica | Impacto |
|------|---------|
| **Seja específico no pedido** | 1 pedido claro > 5 pedidos vagos |
| **Use Steering files** | Kiro já sabe o contexto, menos perguntas |
| **Agrupe tarefas** | "Faz X, Y e Z" em vez de 3 pedidos separados |
| **Use Specs para tarefas complexas** | Spec gasta mais mas entrega mais |
| **Vibe mode para perguntas simples** | Quick questions = menos créditos |
| **Escreva em inglês quando possível** | Modelos processam mais eficientemente em inglês |

### Sobre linguagem: inglês vs português
- O Kiro entende **português perfeitamente** e responde em PT
- Internamente, os modelos de IA processam melhor em inglês (treinados majoritariamente em EN)
- **Dica**: para tarefas complexas (specs, geração de código), inglês pode ser ~10-20% mais eficiente
- **Para documentação e comunicação**: use português sem problemas
- **Melhor abordagem**: pedir em português, código e specs em inglês

### Quando usar Spec vs Vibe
| Situação | Usar |
|----------|------|
| Perguntas rápidas, correções pontuais | Vibe (chat) |
| Features novas, refatorações grandes | Spec |
| Debugging, investigação | Vibe |
| Suite de testes, nova arquitetura | Spec |

---

## 8. 📦 Instalação e Pricing

### Como instalar o Kiro

1. Acesse [kiro.dev/downloads](https://kiro.dev/downloads/)
2. Baixe para seu OS (macOS, Windows, Linux)
3. Instale e abra
4. Login com GitHub, Google ou AWS Builder ID
5. Pronto! Free tier ativo

### Pricing (Junho 2026)

| Plano | Preço | Créditos | Para quem |
|-------|-------|----------|-----------|
| **Free** | $0/mês | 50 créditos | Experimentar, uso leve |
| **Pro** | $20/mês | 1.000 créditos | Dev/QA individual |
| **Pro+** | $40/mês | 2.000 créditos | Uso intensivo |
| **Power** | $200/mês | 10.000 créditos | Times/enterprise |

- Overage (créditos extras): $0.04/crédito nos planos pagos
- Bônus: $20 de crédito ao fazer upgrade na primeira vez
- Acesso a modelos premium (Claude Sonnet 4.5+) em todos os planos pagos
- Não precisa de conta AWS para usar

### Onde encontrar mais
- **Site oficial**: [kiro.dev](https://kiro.dev)
- **Documentação**: [kiro.dev/docs](https://kiro.dev/docs)
- **FAQ**: [kiro.dev/faq](https://kiro.dev/faq)
- **Blog**: [kiro.dev/blog](https://kiro.dev/blog)
- **MCP Guide**: [kiro.dev/docs/guides/learn-by-playing/07-extending-kiro-with-mcp](https://kiro.dev/docs/guides/learn-by-playing/07-extending-kiro-with-mcp/)

---

## 🎯 Resumo: O que o Kiro muda para o QA

### Antes do Kiro
```
QA abre Jira → lê requisito → abre Confluence → lê spec → 
abre IDE → lê código → escreve teste → roda → 
abre QMetry → registra → volta pro Jira → comenta
(~45 min por ciclo de validação)
```

### Com o Kiro
```
QA: "Kiro, valida o card SDC-8 com testes automatizados
     e registra no QMetry"
(~5 min para 183 testes + rastreabilidade completa)
```

### Impacto mensurável
- **90% menos tempo** alternando entre ferramentas
- **183 testes** gerados e executados em minutos
- **Rastreabilidade automática** Card → Teste → Evidência
- **Documentação sempre atualizada** (Confluence via MCP)
- **Onboarding 10x mais rápido** (novos devs perguntam ao Kiro)

---

## 📞 Contato

**Luana Cristina**
- Quality Analyst @ Thoughtworks
- CIN/UFPE — Residency Program in Software Development (EMPREL)
- Projeto demo: [github.com/luanaCristina/kiro-palestra](https://github.com/luanaCristina/kiro-palestra)
- App online: [appointment-scheduling-api.onrender.com](https://appointment-scheduling-api.onrender.com)

---

## 📚 Referências

- [Kiro — Site oficial](https://kiro.dev)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Thoughtworks AI Works](https://www.thoughtworks.com/en-br/ai/works)
- [Thoughtworks Brasil](https://www.thoughtworks.com/pt-br)
- [Teaching Kiro with Steering and MCP](https://kiro.dev/blog/teaching-kiro-new-tricks-with-agent-steering-and-mcp)
- [Unlock Productivity with Kiro and MCP](https://kiro.dev/blog/unlock-your-development-productivity-with-kiro-and-mcp/)
- [Introducing Kiro](https://kiro.dev/blog/introducing-kiro/)

---

*Apresentação criada para o TDC Recife 2026 — Trilha QA & Desenvolvimento*
*"E se o QA pudesse ler o Jira, o Confluence e o código ao mesmo tempo? Com Kiro, pode."*
