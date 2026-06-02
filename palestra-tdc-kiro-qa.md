# Spec-Driven QA: Testes Holísticos com IA do Requisito ao Código

## Dados da Palestra
- **Palestrante**: Luana Cristina — Quality Analyst @ Thoughtworks (desde abril/2022)
- **Evento**: TDC Recife 2026 — Trilha IA
- **Duração**: 20 min apresentação + 10 min perguntas
- **Público**: Devs, QAs, Tech Leads

---

## ROTEIRO DA APRESENTAÇÃO (20 minutos)

---

### BLOCO 1 — O Problema (3 min)

**Slide 1: Título**
> "Spec-Driven QA: Testes Holísticos com IA do Requisito ao Código"

**Slide 2: O dia a dia do QA**
> "Quem aqui já escreveu um teste baseado numa conversa no Slack porque a documentação estava desatualizada?"

Pontos para falar:
- Informação fragmentada: requisitos no Jira, regras de negócio no Confluence, código no GitHub
- O QA precisa ser detetive para juntar as peças
- Resultado: testes incompletos, cenários esquecidos, bugs em produção

**Slide 3: O custo da fragmentação**
- Testes que não testam o que importa
- Retrabalho quando alguém descobre que o teste não cobria o cenário real
- QA vira gargalo porque é o único que "entende o todo"

**Frase de transição**: "E se existisse uma ferramenta que pudesse ler TODAS essas fontes ao mesmo tempo e te ajudar a criar testes que realmente cobrem o que importa?"

---

### BLOCO 2 — Kiro + MCP: O Hub de Contexto (5 min)

**Slide 4: O que é o Kiro**
- IDE agentic (IA integrada ao ambiente de desenvolvimento)
- Combina capacidade de raciocínio e planejamento com geração de código contextual
- Diferencial: camada de Specs (especificações formais) + verificabilidade

**Slide 5: MCP — Model Context Protocol**
> "MCP é um protocolo aberto que permite ao Kiro se conectar com ferramentas externas de forma segura"

Explicar de forma simples:
- Pense no MCP como um "tradutor universal" entre a IA e suas ferramentas
- O Kiro pode LER dados do Jira, Confluence e GitHub ao mesmo tempo
- Isso dá à IA o CONTEXTO completo para gerar testes precisos

**Slide 6: Configuração prática (mostrar código)**

```json
// .kiro/settings/mcp.json
{
  "mcpServers": {
    "atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "env": {
        "JIRA_URL": "https://sua-empresa.atlassian.net",
        "JIRA_USERNAME": "seu-email@empresa.com",
        "JIRA_API_TOKEN": "${JIRA_TOKEN}",
        "CONFLUENCE_URL": "https://sua-empresa.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "seu-email@empresa.com",
        "CONFLUENCE_API_TOKEN": "${CONFLUENCE_TOKEN}"
      }
    },
    "smartbear": {
      "command": "npx",
      "args": ["-y", "@smartbear/mcp@latest"],
      "env": {
        "QMETRY_API_KEY": "${QMETRY_API_KEY}",
        "QMETRY_BASE_URL": "${QMETRY_BASE_URL}"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Slide 7: O que cada integração entrega**

| Fonte | O que o Kiro lê/escreve | Valor para o QA |
|-------|------------------------|-----------------|
| **Jira** | Lê user stories, acceptance criteria, bugs | Sabe O QUE testar |
| **Confluence** | Lê regras de negócio, fluxos, decisões | Sabe POR QUE testar |
| **GitHub** | Lê código existente, PRs, testes atuais | Sabe COMO testar |
| **QMetry** | Cria test cases, cycles, importa resultados | REGISTRA e REPORTA |

**Frase-chave**: "A IA precisa de inputs para saber o que executar e como executar. O MCP é o canal por onde esses inputs chegam. E com o QMetry, ela também REGISTRA o que testou — fechando o ciclo completo."

---

### BLOCO 3 — Holistic Testing com Specs (4 min)

**Slide 8: O que é Holistic Testing**
- Testar considerando o sistema inteiro, não só a unidade isolada
- Qualidade começa na especificação, não depois do deploy
- O QA enxerga o todo: negócio + técnico + experiência do usuário

**Slide 9: Spec-Driven Development**
> "No Kiro, o fluxo é: Requirements → Design → Tasks"

Explicar:
1. **Requirements**: User stories com critérios de aceite formais (formato EARS)
2. **Design**: Arquitetura técnica + propriedades de corretude
3. **Tasks**: Plano de implementação com testes mapeados aos requisitos

**Slide 10: O papel do QA nesse fluxo**
- QA não espera o código ficar pronto para testar
- QA DEFINE o que é correto desde o início (acceptance criteria)
- QA usa a IA para GERAR testes que verificam essas propriedades
- QA VALIDA que os testes cobrem todos os cenários

**Frase-chave**: "A IA não substitui o QA. Ela AMPLIFICA o QA. Mas ela precisa que VOCÊ diga o que é correto."

---

### BLOCO 4 — Demo ao Vivo (6 min)

**Slide 11: "Vamos ver na prática"**

#### Fluxo da Demo:

**Passo 1 — Mostrar o contexto (30s)**
> "Imaginem que recebi essa story no Jira: 'Como paciente, quero agendar uma consulta com um médico disponível'"

Mostrar no Kiro:
- Pedir ao Kiro para ler a story do Jira via MCP
- Pedir para ler as regras de negócio do Confluence (política de cancelamento, duração por tipo)

**Passo 2 — Gerar a Spec (1min)**
> "Agora vou pedir ao Kiro para criar os requisitos formais baseado nesse contexto"

Mostrar:
- O Kiro gerando requirements.md com acceptance criteria formais
- Destacar como ele combinou informação do Jira + Confluence

**Passo 3 — Gerar o Design com Propriedades de Corretude (1min)**
> "O design inclui propriedades formais — coisas que SEMPRE devem ser verdade no sistema"

Mostrar exemplos:
- "Para quaisquer dois intervalos de tempo do mesmo médico, o sistema rejeita o segundo se e somente se os intervalos se sobrepõem"
- "Para qualquer consulta cancelada, o horário volta a ficar disponível"

**Passo 4 — Gerar os Testes (2min)**
> "Agora o Kiro gera testes que VERIFICAM essas propriedades"

Mostrar:
- Property-based tests com fast-check (testes que rodam com inputs aleatórios)
- Destacar: "Esse teste roda 100 vezes com dados diferentes. Se algum cenário quebrar, ele encontra"
- Mostrar um teste de overlap detection rodando

**Passo 5 — Introduzir um bug e ver o teste pegar (1.5min)**
> "Vou introduzir um bug proposital: remover a validação de overlap"

Mostrar:
- Alterar o código
- Rodar os testes
- O property test FALHA e mostra exatamente qual cenário quebrou
- "O teste encontrou um caso que eu talvez não pensaria: duas consultas adjacentes no mesmo minuto"

---

### BLOCO 5 — Reflexão e Fechamento (2 min)

**Slide 12: O QA como arquiteto de intenção**

> "O QA não é quem encontra bugs depois. É quem DEFINE o que é correto antes."

Pontos:
- Com Kiro + MCP, o QA tem acesso a TODO o contexto
- A IA gera testes, mas o QA define as PROPRIEDADES
- Holistic testing só é viável quando você conecta todas as fontes de verdade

**Slide 13: O valor entregue**

| Sem Kiro | Com Kiro + MCP + QMetry |
|----------|------------------------|
| QA lê Jira manualmente | Kiro lê Jira + Confluence + código |
| Testes baseados em interpretação | Testes baseados em specs formais |
| Cenários esquecidos | Property tests cobrem edge cases |
| Test cases escritos à mão no QMetry | Kiro gera test cases com steps |
| Relatórios montados manualmente | Resultados importados automaticamente |
| QA é gargalo | QA é acelerador e orquestrador |

**Slide 14: Mensagem final**

> "A melhor IA é aquela que recebe os melhores inputs. O papel do QA é ser o curador desses inputs — conectando negócio, técnica e experiência do usuário para que a IA entregue testes que realmente importam."

> "O Kiro não é mágica. É uma ferramenta que precisa de VOCÊ para funcionar bem. E é exatamente isso que torna o QA indispensável na era da IA."

**Slide 15: O ciclo completo (slide visual)**

```
JIRA Story ──▶ Confluence ──▶ Kiro Spec ──▶ Código + Testes ──▶ QMetry
     │           (regras)      (formal)       (GitHub)         (gestão)
     │                                                            │
     └────────────────── Rastreabilidade completa ────────────────┘
```

> "Do requisito ao relatório. Sem copiar e colar. Sem informação perdida."

---

## PREPARAÇÃO PARA PERGUNTAS (10 min)

### Perguntas prováveis e respostas sugeridas:

**P: "O Kiro substitui o QA?"**
> R: "Não. O Kiro precisa de inputs de qualidade para gerar outputs de qualidade. Quem define o que é correto, quais propriedades testar, e valida se os testes fazem sentido? O QA. A IA amplifica, não substitui."

**P: "Precisa saber programar para usar?"**
> R: "Ajuda, mas não é obrigatório. O fluxo de Specs é em linguagem natural. Você define requisitos e critérios de aceite, e o Kiro gera o código. Mas entender o que está sendo gerado te dá mais poder de validação."

**P: "Como funciona com dados sensíveis? Posso usar com projetos reais?"**
> R: "O MCP roda localmente na sua máquina. Os tokens de acesso ficam em variáveis de ambiente. Você controla o que a IA acessa. Mas sempre siga as políticas de segurança da sua empresa."

**P: "Qual a diferença para o Copilot ou Gemini?"**
> R: "O Copilot gera código inline. O Gemini raciocina bem. O Kiro combina os dois E adiciona uma camada de especificação formal — Specs, Hooks, Steering. Isso dá estrutura e verificabilidade que os outros não têm."

**P: "Funciona com qualquer linguagem?"**
> R: "Sim. O Kiro suporta qualquer linguagem que rode em VS Code. A demo usou TypeScript, mas funciona com Java, Python, C#, etc."

**P: "Como convencer meu time a adotar?"**
> R: "Comece pequeno. Pegue uma story do Jira, gere a spec, mostre os testes. Quando o time vê testes cobrindo cenários que ninguém pensou, a adoção acontece naturalmente."

---

## DICAS DE TEMPO

| Bloco | Tempo | Acumulado |
|-------|-------|-----------|
| 1. O Problema | 3 min | 3 min |
| 2. Kiro + MCP | 5 min | 8 min |
| 3. Holistic Testing | 4 min | 12 min |
| 4. Demo | 6 min | 18 min |
| 5. Fechamento | 2 min | 20 min |

---

## CHECKLIST PRÉ-PALESTRA

- [ ] Projeto demo funcionando (appointment-scheduling)
- [ ] MCP configurado (ou mockado para a demo)
- [ ] Jira com story fictícia criada
- [ ] Confluence com página de regras de negócio
- [ ] Testes rodando e passando
- [ ] Bug proposital preparado (comentar linha de overlap)
- [ ] Vídeo backup gravado (caso internet falhe)
- [ ] Slides com fonte grande (legível do fundo da sala)
- [ ] Timer visível durante a apresentação

---

## CONFIGURAÇÃO MCP DETALHADA PARA A DEMO

### 1. Atlassian (Jira + Confluence)

O servidor `mcp-atlassian` da comunidade oferece 72 ferramentas para interagir com Jira e Confluence:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "env": {
        "JIRA_URL": "https://demo-tdc.atlassian.net",
        "JIRA_USERNAME": "luana@thoughtworks.com",
        "JIRA_API_TOKEN": "${JIRA_TOKEN}",
        "CONFLUENCE_URL": "https://demo-tdc.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "luana@thoughtworks.com",
        "CONFLUENCE_API_TOKEN": "${CONFLUENCE_TOKEN}"
      }
    }
  }
}
```

**Ferramentas úteis para QA:**
- `jira_get_issue` — Lê uma story com acceptance criteria
- `jira_search` — Busca stories por JQL (ex: sprint atual)
- `confluence_get_page` — Lê documentação de regras de negócio
- `confluence_search` — Busca páginas por termo

### 2. GitHub

```json
{
  "mcpServers": {
    "github": {
      "command": "uvx",
      "args": ["mcp-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Ferramentas úteis para QA:**
- Lê código existente e testes atuais
- Analisa PRs para entender mudanças
- Verifica cobertura de testes

### 3. Prompt de exemplo para a demo

Depois de configurar os MCPs, o prompt que você dá ao Kiro:

> "Leia a story DEMO-42 do Jira e a página 'Regras de Agendamento' do Confluence. Com base nessas informações e no código atual do repositório, gere uma spec com requirements, design e testes property-based que cubram todos os cenários de negócio."

---

## NARRATIVA CENTRAL DA PALESTRA

**Tese**: A IA precisa de inputs de qualidade para gerar outputs de qualidade. O QA é quem curadoria esses inputs — conectando Jira, Confluence e código — e valida os outputs. Isso EXPANDE o papel do QA ao invés de eliminá-lo.

**Arco narrativo**:
1. Problema (fragmentação) → 
2. Solução (Kiro + MCP como hub) → 
3. Método (Holistic Testing via Specs) → 
4. Prova (Demo ao vivo) → 
5. Impacto (QA amplificado, valor para time e cliente)
