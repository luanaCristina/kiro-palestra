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
8. **Segurança e privacidade: posso usar IA em projetos de clientes?**
9. Kiro vs Copilot vs Gemini vs Cursor — comparativo
10. Instalação e pricing

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

## 9. 🔒 Segurança e Privacidade de Dados

### A pergunta que todo mundo faz:
> "Se eu uso o Kiro no projeto do cliente, estou expondo dados sensíveis? A IA usa nosso código para treinar?"

### Resposta curta: **Não.**

### Política de dados do Kiro (AWS)

| Aspecto | Plano Free | Plano Pro/Pro+/Power |
|---------|-----------|---------------------|
| **Dados usados para treinar IA?** | ⚠️ Pode ser usado para melhorar o serviço | ❌ **NÃO** é usado para treinar modelos |
| **Código armazenado?** | Temporariamente durante a sessão | Temporariamente durante a sessão |
| **Dados enviados para terceiros?** | Não | Não |
| **Telemetria** | Métricas de uso (opt-out disponível) | Métricas de uso (opt-out disponível) |

### O que a documentação oficial diz

Segundo a [documentação do Kiro](https://kiro.dev/docs/privacy-and-security/):

- **Infraestrutura AWS**: O Kiro roda sobre a infraestrutura de segurança da AWS
- **Shared Responsibility Model**: AWS protege a infra, você controla o conteúdo
- **Criptografia**: Dados em trânsito (TLS) e em repouso (AWS KMS)
- **Planos pagos**: Conteúdo **NÃO** é usado para treinar foundation models
- **Compliance**: Segue padrões AWS de segurança e compliance

### Para projetos empresariais: recomendações

| Prática | Como implementar |
|---------|-----------------|
| **Use plano pago** | Garante opt-out de uso para treinamento |
| **Não cole secrets no chat** | Use referências por nome, não valores (`$DB_PASSWORD` em vez do valor real) |
| **Use .env para credenciais** | Kiro lê mas não ecoa valores de secrets no output |
| **.gitignore correto** | `.env`, tokens, keys nunca vão pro repositório |
| **MCP com tokens rotativos** | Use tokens com escopo mínimo para cada integração |
| **Steering sem dados sensíveis** | Descreva padrões, não dados reais de clientes |
| **SSO corporativo** | Planos enterprise suportam IAM Identity Center |

### Comparação de privacidade com outras ferramentas

| Ferramenta | Usa código para treinar? | Opt-out disponível? |
|-----------|--------------------------|---------------------|
| **Kiro (Pro+)** | ❌ Não | ✅ (padrão no pago) |
| **GitHub Copilot Business** | ❌ Não | ✅ (padrão no Business) |
| **GitHub Copilot Individual** | ⚠️ Sim (por padrão) | ✅ (pode desligar) |
| **Gemini Code Assist** | ❌ Não (enterprise) | ✅ |
| **Cursor** | ⚠️ Depende do plano | Parcial |
| **ChatGPT/Claude web** | ⚠️ Sim (pode ser usado) | ✅ (precisa opt-out) |

### Boas práticas que seguimos na Thoughtworks

1. **Classificação de dados** — Antes de usar IA, classificamos o que pode e o que não pode ser compartilhado
2. **Plano empresarial** — Projetos de clientes usam planos que garantem não-treinamento
3. **Review de output** — IA gera, humano revisa antes de commitar
4. **Audit trail** — Tudo que o Kiro faz fica no histórico do chat (rastreável)
5. **Princípio do menor privilégio** — MCP tokens com escopo mínimo (read-only quando possível)
6. **Nenhum dado de produção** — Usamos dados fictícios/mock para demos e testes

### O que NUNCA colocar no chat do Kiro (ou qualquer IA)
- ❌ Credenciais reais de produção (senhas, tokens, API keys)
- ❌ Dados pessoais de clientes reais (PII: CPF, email real de clientes)
- ❌ Informações financeiras ou de compliance do cliente
- ❌ Código proprietário confidencial sem autorização

### O que é SEGURO usar
- ✅ Código open-source ou com permissão do cliente
- ✅ Dados fictícios/de teste
- ✅ Padrões e arquitetura (sem dados reais)
- ✅ Documentação pública do projeto
- ✅ Referências a variáveis de ambiente (sem os valores)

---

## 10. ⚔️ Kiro vs Outras Ferramentas de IA

### A IDE do Kiro

O Kiro é construído sobre o **Code OSS** (a mesma base open-source do Visual Studio Code). Isso significa:

- 🎨 **Interface idêntica ao VS Code** — mesma aparência, atalhos, paleta de comandos
- 📦 **Importa todas suas extensões** do VS Code (ESLint, Prettier, GitLens, etc.)
- ⚙️ **Importa configurações** — settings.json, keybindings, temas, snippets
- 🖥️ **CLI disponível** — `kiro` no terminal para automações e CI/CD
- 🌐 **Versão Web** — acesse via browser em [app.kiro.dev](https://app.kiro.dev)

> **Zero curva de aprendizado na IDE** — se você usa VS Code, já sabe usar o Kiro.

### Comparativo: Kiro vs Copilot vs Gemini vs Cursor

| Feature | **Kiro** | **GitHub Copilot** | **Gemini Code Assist** | **Cursor** |
|---------|----------|-------------------|----------------------|-----------|
| **Base da IDE** | Code OSS (VS Code) | Extension no VS Code | Extension no VS Code | Fork do VS Code |
| **Modelo de IA** | Claude (Anthropic) + modelos open-weight | GPT-4o (OpenAI) | Gemini (Google) | Claude + GPT-4 + outros |
| **Spec-Driven Dev** | ✅ Nativo (Requirements → Design → Tasks) | ❌ | ❌ | ❌ |
| **Agent Hooks** | ✅ Automações event-driven | ❌ | ❌ | ❌ |
| **Agent Steering** | ✅ Contexto persistente via .md | ❌ | ❌ | .cursorrules (similar) |
| **MCP (integrações)** | ✅ Nativo (Jira, Confluence, GitHub, etc.) | ❌ | ❌ | ✅ (limitado) |
| **Executa código** | ✅ Roda testes, builds, deploy | Parcial | Parcial | ✅ |
| **Cria/edita Jira** | ✅ Via MCP | ❌ | ❌ | ❌ |
| **Cria páginas Confluence** | ✅ Via MCP | ❌ | ❌ | ❌ |
| **Push pro GitHub** | ✅ Nativo | Via extensão | Via extensão | ✅ |
| **Import settings VS Code** | ✅ Completo | N/A (é extensão) | N/A (é extensão) | ✅ |
| **CLI** | ✅ `kiro` | `gh copilot` | ❌ | ❌ |
| **Versão Web** | ✅ app.kiro.dev | ❌ | ❌ | ❌ |
| **Plano gratuito** | 50 créditos/mês | ❌ ($10/mês min) | Limitado | 500 requests free |
| **Preço Pro** | $20/mês | $10/mês | $19/mês | $20/mês |

### Onde o Kiro se destaca

| Diferencial | Por que importa para QA |
|-------------|------------------------|
| **Spec-Driven** | Transforma requisito em testes de forma estruturada |
| **MCP nativo** | Lê Jira + Confluence + código ao mesmo tempo |
| **Hooks** | Automatiza validações quando salva/cria arquivos |
| **Steering** | Novos membros já têm contexto completo do projeto |
| **Execução completa** | Não só sugere código — roda testes, faz deploy, cria cards |

### Onde outras ferramentas se destacam

| Ferramenta | Vantagem |
|-----------|----------|
| **Copilot** | Melhor autocomplete inline (Tab-Tab), mais barato |
| **Gemini** | Integração nativa com Google Cloud, contexto de 1M tokens |
| **Cursor** | Multi-modelo (escolhe Claude, GPT-4, etc.), Tab completion |

### O modelo de IA: Claude (Anthropic)

O Kiro usa o **Claude** da Anthropic como modelo principal:
- Claude Sonnet 4.5 (no Free tier)
- Modelos premium nos planos pagos
- Conhecido por: raciocínio lógico forte, seguir instruções complexas, código de alta qualidade
- Mesmo modelo do Cursor (quando selecionado) e do Claude.ai

### CLI do Kiro

O Kiro também funciona via terminal — útil para CI/CD e automações:

```bash
# Instalar CLI
# (vem junto com a IDE ou pode instalar separadamente)

# Usar no terminal
kiro chat "explica esse código"
kiro spec create --feature user-auth
kiro run task 1.1
```

Ideal para:
- Pipelines de CI/CD que precisam de contexto de IA
- Scripts de automação em shell
- Ambientes remotos (SSH) sem interface gráfica

---

## 11. 📦 Instalação e Pricing

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
