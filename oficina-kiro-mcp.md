# 🧪 Oficina: Desenvolvimento Assistido por IA com Kiro + MCP

## Duração: 2h a 4h | Formato: Hands-On Prático

---

### 👤 Facilitadora
**Luana Cristina** | Quality Analyst Consultant @ Thoughtworks
- Pós-graduação: Residência em Desenvolvimento de Software — CIN/UFPE + EMPREL
- Women Techmakers Ambassador

---

## 📋 Ementa

| Bloco | Duração | Conteúdo |
|-------|---------|----------|
| 1 | 20 min | Abertura + O que é Kiro + Instalação |
| 2 | 30 min | Configurar MCP (Jira, Confluence, GitHub) |
| 3 | 30 min | Criar projeto do zero com Specs |
| 4 | 20 min | Steering, Hooks e Skills |
| 5 | 30 min | Hands-On: projeto existente (automações) |
| 6 | 20 min | Boas práticas de prompt + economia de créditos |
| 7 | 10 min | Q&A + Próximos passos |

**Total versão curta (2h):** Blocos 1-4 + resumo de 5-6
**Total versão completa (4h):** Todos + exercícios extras entre blocos

---

## 🎯 O que o participante sai sabendo

- Instalar e configurar o Kiro do zero
- Conectar Jira, Confluence e GitHub via MCP
- Criar um projeto completo usando Specs (requirements → design → tasks)
- Configurar Steering files para o projeto não alucinar
- Criar Hooks para automatizar tarefas repetitivas
- Usar um projeto existente para demonstrar ao time
- Construir prompts eficientes que economizam créditos

---

## 📦 Pré-Requisitos (enviar antes para participantes)

```
□ Node.js 18+ instalado (node --version)
□ Conta GitHub (para login no Kiro)
□ Kiro instalado: https://kiro.dev/downloads/
□ (Opcional) Conta Jira Cloud gratuita: https://www.atlassian.com/try
□ (Opcional) VS Code instalado (para comparar)
```

---

## Bloco 1: Abertura + O que é Kiro (20 min)

### Apresentação (10 min)

- O que é: IDE com IA da AWS (base Code OSS = VS Code)
- Diferencial: Specs + MCP + Steering + Hooks
- Modelo: Claude (Anthropic) incluído no preço
- Pricing: Free (50 créditos/mês), Pro ($20), Pro+ ($40)

### Instalação ao vivo (10 min)

```
Passo a passo com o público:
1. Acesse kiro.dev/downloads
2. Baixe para seu OS
3. Instale e abra
4. Login com GitHub
5. Verificar: Kiro abriu? Aparece "Kiro" no canto?
```

**Checkpoint:** Todo mundo com Kiro aberto ✓

---

## Bloco 2: Configurar MCP — Jira, Confluence, GitHub (30 min)

### O que é MCP (5 min)

> MCP (Model Context Protocol) é um protocolo que permite o Kiro se conectar a ferramentas externas como Jira, Confluence, GitHub, Datadog — lendo e escrevendo nelas diretamente do chat.

### Configurar GitHub (10 min)

**Passo 1:** Gerar token do GitHub
```
1. Acesse: github.com/settings/tokens
2. Generate new token (classic)
3. Marque: repo, read:user
4. Copie o token (ghp_...)
```

**Passo 2:** Criar arquivo `.kiro/settings/mcp.json` no workspace
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_SEU_TOKEN"
      }
    }
  }
}
```

**Passo 3:** Testar no chat
```
"Kiro, lista meus repositórios no GitHub"
```

### Configurar Atlassian — Jira + Confluence (10 min)

**Passo 1:** Gerar API Token
```
1. Acesse: id.atlassian.com/manage-profile/security/api-tokens
2. Create API token → nome: "Kiro"
3. Copie o token
```

**Passo 2:** Adicionar ao `mcp.json`
```json
{
  "mcpServers": {
    "github": { ... },
    "atlassian-cloud": {
      "url": "https://mcp.atlassian.com/v1/mcp",
      "env": {
        "ATLASSIAN_EMAIL": "seu@email.com",
        "ATLASSIAN_API_TOKEN": "SEU_TOKEN"
      }
    }
  }
}
```

**Passo 3:** Testar
```
"Kiro, lista os projetos no meu Jira"
"Kiro, cria um card de teste no projeto X"
```

### Exercício (5 min)
> Cada participante testa: "Kiro, cria um card no Jira com título 'Meu primeiro card via Kiro'"

**Checkpoint:** Todo mundo com MCP funcionando ✓

---

## Bloco 3: Criar Projeto do Zero com Specs (30 min)

### O que são Specs (5 min)

```
Ideia (prompt) → Requirements → Design → Tasks → Implementação
```

- Requirements: user stories com acceptance criteria
- Design: arquitetura, interfaces, error handling
- Tasks: lista de tarefas com dependências (DAG paralelo)
- O Kiro executa as tasks automaticamente

### Exercício: Criar projeto (25 min)

**Prompt para o público:**
```
Kiro, cria um projeto Node.js/TypeScript para uma lista de tarefas (to-do list).

Funcionalidades:
1. Criar tarefa (título, descrição, prioridade)
2. Listar tarefas (filtro por status: pendente/concluída)
3. Marcar tarefa como concluída
4. Deletar tarefa

API REST com Express. Use Jest para testes.
Cria a spec completa: requirements, design e tasks.
```

**O que o público vai ver acontecer:**
1. Kiro pergunta: Feature ou Bugfix? → Feature
2. Kiro pergunta: Requirements ou Design first? → Requirements
3. Kiro gera `requirements.md` com 4 requisitos
4. Kiro gera `design.md` com arquitetura
5. Kiro gera `tasks.md` com ~10 tasks

**Depois:**
```
"Kiro, executa todas as tasks"
```

→ Projeto implementado com testes em ~5 minutos

**Checkpoint:** Todo mundo com projeto gerado ✓

---

## Bloco 4: Steering, Hooks e Skills (20 min)

### Steering (10 min)

**O que é:** Arquivos Markdown que dão contexto permanente ao Kiro sobre o projeto.

**Criar com o público:**
```
"Kiro, cria os steering files para esse projeto com: product.md, tech.md, structure.md"
```

**Ou manualmente:** criar `.kiro/steering/tech.md`:
```markdown
# Tech Stack

- Runtime: Node.js 20
- Language: TypeScript
- Framework: Express
- Database: em memória (array)
- Testing: Jest
- Comandos: npm run dev, npm test
```

**Demonstração do efeito:**
```
ANTES do steering: "Kiro, adiciona um endpoint"
→ Pode criar em JavaScript, pode usar Fastify, etc.

DEPOIS do steering: "Kiro, adiciona um endpoint"
→ Sempre TypeScript, sempre Express, sempre com Jest test
```

### Hooks (5 min)

**O que é:** Automações que rodam quando eventos acontecem.

**Exemplo prático:**
```json
{
  "name": "Lint on Save",
  "version": "1.0.0",
  "when": { "type": "fileEdited", "patterns": ["*.ts"] },
  "then": { "type": "runCommand", "command": "npm run lint" }
}
```

**Criar com o público via paleta de comandos → Open Kiro Hook UI**

### Skills (5 min)

**O que é:** Instruções especializadas ativadas sob demanda.

**Exemplo:** `.kiro/skills/qa-tester.md`
```markdown
# QA Tester Skill

Quando atuar como QA:
- Sempre teste boundaries (exatamente no limite)
- Teste caminho feliz E todos os erros
- Nomes descritivos em inglês
- Referencie o card do Jira no teste
```

**Checkpoint:** Todo mundo com steering + 1 hook ✓

---

## Bloco 5: Projeto Existente — Automações Reais (30 min)

### Cenário: projeto já rodando, novo integrante chega

**Demo com o projeto da palestra (appointment-scheduling):**

#### 5.1 Onboarding automático (5 min)
```
"Kiro, me explica esse projeto como se eu fosse uma nova integrante do time"
```
→ Kiro lê steering + código + docs e explica tudo

#### 5.2 Commit + Push automático (10 min)
```
"Kiro, faz as alterações no arquivo X, commita com mensagem descritiva e faz push"
```
→ Demonstra git add → commit → push sem sair da IDE

#### 5.3 Criar página Confluence automaticamente (10 min)
```
"Kiro, cria uma página no Confluence documentando a arquitetura desse projeto"
```
→ Página criada no Confluence via MCP

#### 5.4 Refatoração em tempo real (5 min)
```
"Kiro, refatora o módulo slot-calculator extraindo a função subtractIntervals para um arquivo separado"
```
→ Move código, atualiza imports, roda testes

**Checkpoint:** Participantes fazem pelo menos 1 automação ✓

---

## Bloco 6: Boas Práticas de Prompt + Economia (20 min)

### Prompts que funcionam bem

| ❌ Vago | ✅ Específico |
|---------|-------------|
| "arruma o código" | "corrige o erro de tipo na linha 45 de app.ts" |
| "cria testes" | "cria 5 testes unitários para canCancel validando a regra de 24h" |
| "documenta" | "cria uma página Confluence no space CM com a arquitetura do projeto" |
| "faz deploy" | "faz push na branch feat/X e cria um PR para main" |

### Economia de créditos

| Dica | Economia estimada |
|------|-------------------|
| Usar Steering files | ~30% menos interações |
| Agrupar pedidos ("faz X, Y e Z") | ~50% menos créditos |
| Spec para tarefas grandes | Mais créditos por vez, mas entrega completa |
| Vibe mode para perguntas rápidas | Gasta menos que Spec |
| Inglês para código (PT para docs) | ~10-20% mais eficiente |

### Segurança

- **Plano pago:** dados NÃO usados para treinar IA
- **Nunca cole:** tokens reais, senhas, dados de clientes
- **Use:** variáveis de ambiente, dados fictícios, placeholders
- **MCP tokens:** escopo mínimo (read-only quando possível)

---

## Bloco 7: Q&A + Próximos Passos (10 min)

### Links úteis
- Kiro: https://kiro.dev
- Docs: https://kiro.dev/docs
- MCP Protocol: https://modelcontextprotocol.io
- Projeto demo: https://github.com/luanaCristina/kiro-palestra
- Pricing: https://kiro.dev/pricing

### Desafio para casa
```
1. Configure o MCP com SEU Jira/GitHub
2. Crie um projeto usando Specs
3. Adicione Steering files
4. Compartilhe no LinkedIn com #KiroIDE
```

---

## 📊 Material de Apoio para Submissão

### Título da Oficina
**"Desenvolvimento Assistido por IA: Do Zero ao Deploy com Kiro + MCP"**

### Descrição curta (150 palavras)
Oficina prática onde os participantes instalam o Kiro (IDE com IA da AWS), configuram integrações com Jira, Confluence e GitHub via MCP (Model Context Protocol), e criam um projeto completo do zero usando Spec-Driven Development. Ao final, cada participante terá um projeto funcional com testes automatizados, documentação no Confluence e cards no Jira — tudo criado por comandos no chat da IDE, sem copiar-colar manual entre ferramentas.

### Público-alvo
QAs, Devs, BAs e Tech Leads que querem acelerar o ciclo de desenvolvimento integrando ferramentas com IA de forma prática e segura.

### Pré-requisitos técnicos
- Notebook com Node.js 18+
- Conta GitHub
- Kiro instalado (gratuito)

### O que o participante leva
- Projeto funcionando no GitHub
- MCP configurado (Jira + Confluence + GitHub)
- Steering files como template
- Conhecimento prático de prompt engineering para IDEs com IA

---

*Oficina criada por Luana Cristina | Quality Analyst @ Thoughtworks*
*Contato: linkedin.com/in/luanacristinaas*
