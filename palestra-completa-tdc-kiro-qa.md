# Palestra Completa: Spec-Driven QA com Kiro

# Palestra: E se o QA pudesse ler o Jira, o Confluence e o código ao mesmo tempo? Com Kiro, pode.

## Dados
- **Palestrante**: Luana Cristina — Quality Analyst @ Thoughtworks (desde abril/2022)
- **Evento**: TDC Recife 2026 — Trilha IA
- **Duração**: 20 min + 10 min perguntas

---

# PARTE 1: O QUE É O KIRO

## Definição

Kiro é uma **IDE agentic** (ambiente de desenvolvimento com IA integrada) criada pela AWS. Diferente de assistentes de código como Copilot ou Gemini, o Kiro traz uma camada de **estrutura e verificabilidade** ao desenvolvimento com IA.

- **Site oficial**: https://kiro.dev
- **Download**: https://kiro.dev/downloads/
- **Documentação**: https://kiro.dev/docs/
- **GitHub**: https://github.com/kirodotdev/Kiro
- **Discord**: https://kiro.dev/discord/
- **Changelog**: https://kiro.dev/changelog/

## Base Tecnológica

- Construído sobre **Code OSS** (mesma base do VS Code)
- Compatível com extensões do VS Code
- Modelos de IA: Claude Sonnet 4.5/4.6, Qwen3 Coder Next, DeepSeek v3.2, MiniMax 2.1
- Disponível para **macOS, Windows e Linux**
- Também disponível como **CLI** e **versão Web** (preview)

---

# PARTE 2: PLANOS E PREÇOS

## Plano Gratuito (Kiro Free)

| | Detalhes |
|--|---------|
| **Preço** | $0/mês |
| **Créditos** | 50 por mês |
| **Modelos** | Claude Sonnet 4.5 + modelos open weight (Qwen3, DeepSeek, MiniMax) |
| **Limite de tempo** | Sem limite — é gratuito para sempre |
| **Precisa de cartão?** | Não |
| **Precisa de conta AWS?** | Não — pode usar login social (Google, GitHub) ou AWS Builder ID |

## Planos Pagos

| Plano | Preço | Créditos | Modelos |
|-------|-------|----------|---------|
| **Pro** | $20/mês | 1.000 | Premium (Claude Sonnet 4.6, Opus 4.6, Auto) |
| **Pro+** | $40/mês | 2.000 | Premium |
| **Power** | $200/mês | 10.000 | Premium |

- Overage (créditos extras): $0.04/crédito
- Bônus: $20 de crédito ao fazer upgrade pela primeira vez

## Para a palestra

> "Vocês podem começar a usar HOJE com o plano gratuito. 50 créditos por mês, sem limite de tempo, sem cartão de crédito. Dá para experimentar tudo que vou mostrar aqui."

---

# PARTE 3: RECURSOS PRINCIPAIS DO KIRO

## 3.1 Specs (Especificações)

**O que é**: Documentos estruturados que formalizam o processo de desenvolvimento.

**Como funciona**:
1. Você descreve uma ideia em linguagem natural
2. O Kiro gera **Requirements** (requisitos com critérios de aceite formais)
3. Depois gera **Design** (arquitetura técnica + propriedades de corretude)
4. Depois gera **Tasks** (plano de implementação com testes mapeados)

**Onde fica**: `.kiro/specs/{nome-da-feature}/`

**Tipos de workflow**:
- **Requirements-first**: Começa pelos requisitos → design → tasks
- **Design-first**: Começa pela arquitetura → requisitos → tasks
- **Quick Plan**: Gera tudo automaticamente
- **Bugfix**: Workflow específico para correção de bugs

**Link**: https://kiro.dev/docs/specs/

**Valor para QA**: O QA pode definir acceptance criteria formais ANTES do código existir. Os testes nascem junto com os requisitos.

---

## 3.2 Steering (Direcionamento)

**O que é**: Arquivos markdown que dão contexto persistente ao Kiro sobre seu projeto.

**Como funciona**: Você cria arquivos em `.kiro/steering/` com regras, padrões e convenções do seu time. O Kiro lê esses arquivos em TODA interação.

**Exemplo prático para QA**:

```markdown
<!-- .kiro/steering/testing-standards.md -->
# Padrões de Teste

- Todos os testes devem seguir o padrão AAA (Arrange, Act, Assert)
- Usar fast-check para property-based testing
- Cobertura mínima: 80%
- Nomear testes com: "should [comportamento] when [condição]"
- Sempre testar cenários de erro e edge cases
```

**Tipos de inclusão**:
- `always` (padrão): Incluído em toda interação
- `fileMatch`: Incluído quando um arquivo específico é lido
- `manual`: Incluído quando você referencia com `#` no chat

**Link**: https://kiro.dev/docs/steering/

**Valor para QA**: Garante que a IA SEMPRE segue os padrões de qualidade do time, sem precisar repetir em cada prompt.

---

## 3.3 Hooks (Automações)

**O que é**: Gatilhos automáticos que executam ações quando eventos acontecem na IDE.

**Eventos disponíveis**:
- `fileEdited` — Quando um arquivo é salvo
- `fileCreated` — Quando um arquivo é criado
- `promptSubmit` — Quando uma mensagem é enviada
- `preToolUse` / `postToolUse` — Antes/depois de uma ferramenta ser usada
- `preTaskExecution` / `postTaskExecution` — Antes/depois de uma task da spec
- `userTriggered` — Acionado manualmente

**Exemplo prático para QA**:

```json
{
  "name": "Run Tests on Save",
  "version": "1.0.0",
  "when": {
    "type": "fileEdited",
    "patterns": ["src/**/*.ts"]
  },
  "then": {
    "type": "runCommand",
    "command": "npm test"
  }
}
```

**Link**: https://kiro.dev/docs/hooks/

**Valor para QA**: Testes rodam automaticamente a cada mudança. Linting, validação de acessibilidade, atualização de documentação — tudo automático.

---

## 3.4 MCP (Model Context Protocol)

**O que é**: Protocolo aberto que permite ao Kiro se conectar com ferramentas externas.

**Como funciona**: Você configura servidores MCP em `.kiro/settings/mcp.json`. O Kiro ganha acesso a ler/escrever nessas ferramentas.

**Ferramentas disponíveis via MCP**:
- Jira, Confluence (Atlassian)
- GitHub, GitLab, Bitbucket
- QMetry (SmartBear)
- SonarQube
- AWS (CloudWatch, S3, Lambda...)
- Figma
- Bancos de dados
- E centenas de outros

**Link**: https://kiro.dev/docs/mcp/configuration

**Valor para QA**: Acesso a TODAS as fontes de verdade do projeto sem sair da IDE. Lê requisitos, regras de negócio, código e gera testes com contexto completo.

---

## 3.5 Modos de Sessão

| Modo | Descrição | Quando usar |
|------|-----------|-------------|
| **Vibe** | Chat conversacional, exploratório | Perguntas rápidas, prototipagem |
| **Spec** | Workflow estruturado (Requirements → Design → Tasks) | Features completas, bugs |

## 3.6 Modos de Autonomia

| Modo | Descrição |
|------|-----------|
| **Autopilot** | Kiro trabalha autonomamente, você revisa depois |
| **Supervised** | Kiro pede aprovação a cada mudança |

---

# PARTE 4: KIRO vs COPILOT vs GEMINI

| Aspecto | GitHub Copilot | Gemini Code Assist | Kiro |
|---------|---------------|-------------------|------|
| **Foco** | Autocompletar código inline | Raciocínio e geração | Desenvolvimento estruturado |
| **Specs** | ❌ Não tem | ❌ Não tem | ✅ Requirements → Design → Tasks |
| **Hooks** | ❌ | ❌ | ✅ Automações por evento |
| **Steering** | ❌ | ❌ | ✅ Contexto persistente |
| **MCP** | Limitado | Limitado | ✅ Protocolo aberto, 100+ servidores |
| **Property-based testing** | ❌ | ❌ | ✅ Integrado ao workflow |
| **Verificabilidade** | Baixa | Média | Alta (propriedades formais) |
| **Plano gratuito** | Limitado | Limitado | 50 créditos/mês, sem limite de tempo |
| **Base** | VS Code extension | VS Code extension | IDE completa (Code OSS) |

**Frase para a palestra**:
> "O Copilot é ótimo para autocompletar. O Gemini raciocina bem. O Kiro combina os dois E adiciona estrutura: Specs para planejar, Hooks para automatizar, Steering para padronizar, e MCP para conectar. É como ter um Gemini que planeja e um Copilot que executa — com um QA embutido que verifica."

---

# PARTE 5: COMO UTILIZEI NESTE PROJETO

## O projeto: Sistema de Agendamento de Consultas

### Passo 1: Criei a Spec
Pedi ao Kiro para gerar requisitos formais para um sistema de agendamento médico.

**Resultado**: 7 requisitos com 42+ critérios de aceite no formato EARS (Easy Approach to Requirements Syntax).

### Passo 2: Gerei o Design
O Kiro criou a arquitetura técnica com:
- 4 endpoints REST
- Modelos de dados (TypeScript)
- Algoritmo de detecção de overlap
- Controle de concorrência
- **15 propriedades de corretude** (o que SEMPRE deve ser verdade)

### Passo 3: Gerei as Tasks
Plano de implementação com 35 sub-tarefas organizadas em waves paralelas, incluindo:
- Setup do projeto
- Módulos de negócio
- Testes property-based (fast-check)
- Testes unitários e de integração

### O que isso demonstra:
> "Em menos de 30 minutos, o Kiro gerou uma spec completa que levaria dias para escrever manualmente. E os testes que ele gera cobrem cenários que eu talvez não pensaria — porque ele leu TODOS os requisitos de forma sistemática."

---

# PARTE 6: COMO CONECTAR COM JIRA, GITHUB, CONFLUENCE E QMETRY

## 6.1 Configuração Geral

Todas as integrações ficam em `.kiro/settings/mcp.json` no seu projeto:

```json
{
  "mcpServers": {
    "nome-do-servidor": {
      "command": "comando",
      "args": ["argumentos"],
      "env": {
        "VARIAVEL": "valor"
      }
    }
  }
}
```

---

## 6.2 GitHub

**Servidor**: `@modelcontextprotocol/server-github`

**Passo a passo**:
1. Acesse https://github.com/settings/tokens
2. Gere um Personal Access Token (classic) com scope `repo`
3. Salve no terminal: `export GITHUB_PERSONAL_TOKEN="ghp_seutoken"`

**Configuração**:
```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_TOKEN}"
  }
}
```

**O que você pode fazer**:
- Ler código de repositórios
- Criar/ler issues e PRs
- Analisar mudanças em PRs
- Criar branches e commits

---

## 6.3 Jira + Confluence (Atlassian)

**Servidor**: `mcp-atlassian` (comunidade, 72 ferramentas)

**Passo a passo**:
1. Crie uma conta gratuita em https://www.atlassian.com/software/jira/free
2. Gere um API Token em https://id.atlassian.com/manage-profile/security/api-tokens
3. Salve as variáveis:
```bash
export JIRA_PERSONAL_URL="https://seu-site.atlassian.net"
export JIRA_PERSONAL_USERNAME="seu-email@gmail.com"
export JIRA_PERSONAL_TOKEN="seu_token"
export CONFLUENCE_PERSONAL_URL="https://seu-site.atlassian.net/wiki"
export CONFLUENCE_PERSONAL_USERNAME="seu-email@gmail.com"
export CONFLUENCE_PERSONAL_TOKEN="seu_token"
```

**Configuração**:
```json
"atlassian": {
  "command": "uvx",
  "args": ["mcp-atlassian"],
  "env": {
    "JIRA_URL": "${JIRA_PERSONAL_URL}",
    "JIRA_USERNAME": "${JIRA_PERSONAL_USERNAME}",
    "JIRA_API_TOKEN": "${JIRA_PERSONAL_TOKEN}",
    "CONFLUENCE_URL": "${CONFLUENCE_PERSONAL_URL}",
    "CONFLUENCE_USERNAME": "${CONFLUENCE_PERSONAL_USERNAME}",
    "CONFLUENCE_API_TOKEN": "${CONFLUENCE_PERSONAL_TOKEN}"
  }
}
```

**Pré-requisito**: Instalar `uv` (gerenciador Python):
```bash
brew install uv
```

**O que você pode fazer**:
- Ler stories e acceptance criteria do Jira
- Buscar issues por JQL
- Ler páginas do Confluence (regras de negócio)
- Criar e atualizar issues

---

## 6.4 QMetry (SmartBear MCP Server)

**Servidor**: `@smartbear/mcp` (oficial da SmartBear)

**Passo a passo**:
1. Acesse https://www.qmetry.com e crie uma conta
2. Instale o QMetry Test Management no seu Jira Cloud (via Marketplace)
3. Gere a API Key em QMetry → Settings → API Key
4. Salve:
```bash
export QMETRY_PERSONAL_API_KEY="seu_token_qmetry"
export QMETRY_PERSONAL_BASE_URL="https://testmanagement.qmetry.com"
```

**Configuração**:
```json
"smartbear": {
  "command": "npx",
  "args": ["-y", "@smartbear/mcp@latest"],
  "env": {
    "QMETRY_API_KEY": "${QMETRY_PERSONAL_API_KEY}",
    "QMETRY_BASE_URL": "${QMETRY_PERSONAL_BASE_URL}"
  }
}
```

**O que você pode fazer**:
- Criar test cases com steps detalhados
- Criar releases e test cycles
- Criar test suites e vincular test cases
- Importar resultados de automação (JUnit, TestNG, Cucumber)
- Atualizar status de execução
- Vincular bugs a execuções
- Gerar relatórios de rastreabilidade

---

## 6.5 Configuração Completa (tudo junto)

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_TOKEN}"
      }
    },
    "atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "env": {
        "JIRA_URL": "${JIRA_PERSONAL_URL}",
        "JIRA_USERNAME": "${JIRA_PERSONAL_USERNAME}",
        "JIRA_API_TOKEN": "${JIRA_PERSONAL_TOKEN}",
        "CONFLUENCE_URL": "${CONFLUENCE_PERSONAL_URL}",
        "CONFLUENCE_USERNAME": "${CONFLUENCE_PERSONAL_USERNAME}",
        "CONFLUENCE_API_TOKEN": "${CONFLUENCE_PERSONAL_TOKEN}"
      }
    },
    "smartbear": {
      "command": "npx",
      "args": ["-y", "@smartbear/mcp@latest"],
      "env": {
        "QMETRY_API_KEY": "${QMETRY_PERSONAL_API_KEY}",
        "QMETRY_BASE_URL": "${QMETRY_PERSONAL_BASE_URL}"
      }
    }
  }
}
```

---

# PARTE 7: FLUXO COMPLETO PARA QA

```
┌──────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   JIRA   │───▶│ CONFLUENCE │───▶│   KIRO   │───▶│  GITHUB  │───▶│  QMETRY  │
│ (stories)│    │  (regras)  │    │ (specs + │    │ (código) │    │ (gestão) │
│          │    │            │    │  testes) │    │          │    │          │
└──────────┘    └────────────┘    └──────────┘    └──────────┘    └──────────┘
                                       │
                                  O QA DIRECIONA
                                  A IA EXECUTA
```

### Exemplo de prompt completo:

> "Leia a story DEMO-42 do Jira e a página 'Regras de Agendamento' do Confluence. Com base nessas informações, gere uma spec com requirements formais. Depois, crie test cases no QMetry com steps detalhados para cada cenário. Organize num test cycle 'Sprint 1' e vincule à release 'v1.0'."

---

# PARTE 8: LINKS PARA COMPARTILHAR COM A AUDIÊNCIA

## Links essenciais (colocar no último slide)

| Recurso | Link |
|---------|------|
| Download do Kiro | https://kiro.dev/downloads/ |
| Documentação | https://kiro.dev/docs/ |
| Primeiro projeto (tutorial) | https://kiro.dev/docs/getting-started/first-project |
| Preços | https://kiro.dev/pricing/ |
| Specs (como usar) | https://kiro.dev/docs/specs/ |
| Hooks (automações) | https://kiro.dev/docs/hooks/ |
| Steering (padrões) | https://kiro.dev/docs/steering/ |
| MCP (integrações) | https://kiro.dev/docs/mcp/configuration |
| Exemplos de MCP | https://kiro.dev/docs/cli/mcp/examples/ |
| Blog | https://kiro.dev/blog/ |
| Discord (comunidade) | https://kiro.dev/discord/ |
| FAQ | https://kiro.dev/faq/ |
| GitHub do Kiro | https://github.com/kirodotdev/Kiro |
| SmartBear MCP (QMetry) | https://developer.smartbear.com/smartbear-mcp/docs/qmetry-integration |
| MCP Atlassian | https://github.com/sooperset/mcp-atlassian |

---

# PARTE 9: MENSAGEM CENTRAL

## Para os ouvintes levarem para casa:

1. **O Kiro é gratuito para começar** — 50 créditos/mês, sem cartão, sem conta AWS
2. **A IA precisa de inputs** — Quanto melhor o contexto (Jira + Confluence + código), melhor o output
3. **O QA não é substituído** — O QA é quem define o que é correto (specs, acceptance criteria, propriedades)
4. **Holistic testing** — Conectar todas as fontes de verdade gera testes que cobrem o que importa
5. **Comece pequeno** — Pegue uma story, gere a spec, veja os testes. A adoção acontece naturalmente

## Frase de fechamento:

> "O Kiro executa. O QA direciona. E juntos, entregam qualidade que nenhum dos dois conseguiria sozinho."

---

# PARTE 10: ROTEIRO DE TEMPO (20 min)

| Bloco | Conteúdo | Tempo | Acumulado |
|-------|----------|-------|-----------|
| 1 | O problema (fragmentação de informação) | 2 min | 2 min |
| 2 | O que é o Kiro + plano gratuito | 3 min | 5 min |
| 3 | Recursos: Specs, Hooks, Steering, MCP | 3 min | 8 min |
| 4 | Kiro vs Copilot vs Gemini (tabela rápida) | 1 min | 9 min |
| 5 | Integrações: Jira + Confluence + QMetry + GitHub | 3 min | 12 min |
| 6 | Demo ao vivo (spec → testes → bug pego) | 6 min | 18 min |
| 7 | Fechamento + links | 2 min | 20 min |

---

# PARTE 11: PREPARAÇÃO TÉCNICA

## Pré-requisitos para rodar tudo:

```bash
# Node.js (para MCP servers que usam npx)
brew install node

# uv (para MCP servers que usam uvx, como o Atlassian)
brew install uv

# Verificar instalação
node --version
npx --version
uvx --version
```

## Testar se os MCPs estão funcionando:

Depois de configurar, reinicie o Kiro e teste:
- "Liste meus repositórios no GitHub"
- "Leia o projeto DEMO no Jira"
- "Liste os test cases no QMetry"

Se algum falhar, use a Command Palette → "MCP: Restart Servers"
