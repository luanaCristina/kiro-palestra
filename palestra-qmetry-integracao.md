# Integração Kiro + QMetry: Test Cases, Test Cycles e Relatórios

## Contexto para a Palestra

Este conteúdo complementa a palestra principal, adicionando a integração com QMetry para mostrar como o Kiro pode gerar test cases, criar test cycles e alimentar relatórios diretamente nos cards do Jira — fechando o ciclo completo de QA.

---

## CONFIGURAÇÃO DO MCP — SmartBear (QMetry)

A SmartBear oferece um MCP Server oficial que inclui integração com QMetry. A configuração no Kiro fica assim:

```json
// .kiro/settings/mcp.json
{
  "mcpServers": {
    "smartbear": {
      "command": "npx",
      "args": ["-y", "@smartbear/mcp@latest"],
      "env": {
        "QMETRY_API_KEY": "${QMETRY_API_KEY}",
        "QMETRY_BASE_URL": "${QMETRY_BASE_URL}"
      }
    }
  }
}
```

**Para obter a API Key do QMetry:**
1. Acesse QMetry → Settings → API Key
2. Gere um token com permissões de leitura e escrita
3. Salve como variável de ambiente: `export QMETRY_API_KEY="seu-token"`

---

## CONFIGURAÇÃO COMPLETA (Jira + Confluence + QMetry + GitHub)

Para a demo completa na palestra, a configuração unificada:

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

---

## FERRAMENTAS QMETRY DISPONÍVEIS VIA MCP

O SmartBear MCP Server expõe as seguintes ferramentas do QMetry:

### Gerenciamento de Projetos
| Ferramenta | O que faz |
|-----------|-----------|
| `set_qmetry_project` | Define o projeto ativo |
| `get_qmetry_project` | Retorna detalhes do projeto atual |
| `list_qmetry_project_list` | Lista todos os projetos |

### Test Cases
| Ferramenta | O que faz |
|-----------|-----------|
| `create_test_case` | Cria test case com steps, metadata e mapeamento release/cycle |
| `update_test_case` | Atualiza test case existente |
| `list_qmetry_testcases` | Lista test cases do projeto |
| `qmetry_testcase_details` | Detalhes de um test case |
| `qmetry_testcase_steps` | Retorna os steps de um test case |

### Test Suites e Cycles
| Ferramenta | O que faz |
|-----------|-----------|
| `create_release` | Cria release com cycle opcional |
| `create_cycle` | Cria cycle dentro de uma release |
| `create_test_suite` | Cria test suite com metadata |
| `link_testcases_to_testsuite` | Vincula test cases a uma suite |
| `get_qmetry_releases_cycles` | Lista releases e cycles |

### Execução e Relatórios
| Ferramenta | O que faz |
|-----------|-----------|
| `qmetry_testcase_executions` | Histórico de execuções de um test case |
| `qmetry_executions_by_testsuite` | Execuções por test suite |
| `update_testcase_execution_status` | Atualiza status de execução (PASS/FAIL) |
| `get_testcase_runs_by_testsuite_run` | Resultados individuais de uma execução |
| `import_automation_test_results` | Importa resultados de TestNG, JUnit, Cucumber, etc. |

### Rastreabilidade
| Ferramenta | O que faz |
|-----------|-----------|
| `linked_requirements_to_testcase` | Vincula requisitos a test cases |
| `fetch_test_cases_linked_to_requirement` | Test cases vinculados a um requisito |
| `link_issues_to_testcase_run` | Vincula bugs a execuções |
| `get_issues_linked_to_tc` | Bugs vinculados a um test case |

---

## FLUXO COMPLETO: DO JIRA AO QMETRY VIA KIRO

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│    JIRA     │     │  CONFLUENCE  │     │    KIRO     │     │   QMETRY     │
│  (Stories)  │────▶│   (Regras)   │────▶│  (Specs +   │────▶│ (Test Cases  │
│             │     │              │     │   Testes)   │     │  + Cycles)   │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
       │                                        │                     │
       │              ┌──────────────┐          │                     │
       └─────────────▶│   GITHUB     │◀─────────┘                     │
                      │   (Código)   │                                │
                      └──────────────┘                                │
                             │                                        │
                             └────────── Resultados ──────────────────┘
```

### Passo a Passo do Fluxo:

**1. Leitura de contexto (Jira + Confluence)**
```
Prompt: "Leia a story DEMO-42 do Jira e a página 'Política de Agendamento' 
do Confluence. Identifique todos os cenários de teste necessários."
```

**2. Geração de Spec com propriedades de corretude**
```
Prompt: "Com base no contexto, gere uma spec com requirements e 
acceptance criteria formais no formato EARS."
```

**3. Criação de Test Cases no QMetry**
```
Prompt: "Baseado nos acceptance criteria da spec, crie test cases no 
QMetry com steps detalhados para cada cenário. Vincule ao requisito 
correspondente."
```

**4. Criação de Test Cycle**
```
Prompt: "Crie um test cycle 'Sprint 15 - Agendamento' na release 
'v2.1' e vincule todos os test cases criados."
```

**5. Execução e importação de resultados**
```
Prompt: "Rode os testes automatizados e importe os resultados para 
o QMetry no formato JUnit."
```

**6. Relatório de cobertura**
```
Prompt: "Liste todos os test cases vinculados ao requisito de 
agendamento e mostre o status de execução de cada um."
```

---

## SLIDE EXTRA PARA A PALESTRA: QMetry Integration

### Slide: "Fechando o ciclo: do requisito ao relatório"

```
JIRA Story ──▶ Kiro Spec ──▶ QMetry Test Cases ──▶ Execução ──▶ Relatório
     │              │                │                  │            │
     │              │                │                  │            │
  "O QUE"      "COMO"         "VERIFICAR"        "EXECUTAR"    "REPORTAR"
  testar       testar          formalmente        automatizado   rastreável
```

**Falar na palestra:**
> "Com o QMetry integrado via MCP, o Kiro não só gera os testes — ele cria os test cases diretamente na ferramenta de gestão, vincula aos requisitos do Jira, organiza em cycles por sprint, e depois importa os resultados da execução automatizada. O QA tem rastreabilidade completa sem sair da IDE."

---

## EXEMPLOS DE PROMPTS PARA A DEMO COM QMETRY

### Criar Test Cases a partir da Spec

```
"Baseado nos acceptance criteria do Requirement 3 (Prevent Double-Booking) 
da spec appointment-scheduling, crie test cases no QMetry com os seguintes 
cenários:
1. Tentativa de agendamento em horário já ocupado
2. Agendamentos adjacentes (um termina quando outro começa) 
3. Requisições concorrentes para o mesmo horário
4. Agendamento que contém completamente outro

Para cada test case, inclua:
- Steps claros (Given/When/Then)
- Dados de teste
- Resultado esperado
- Prioridade baseada no risco"
```

### Criar Test Cycle para Sprint

```
"Crie uma release 'v1.0 - Agendamento de Consultas' no QMetry com um 
cycle 'Sprint 1 - Core Booking'. Vincule todos os test cases que criamos 
para os requisitos de booking e double-booking."
```

### Importar Resultados Automatizados

```
"Os testes automatizados geraram o arquivo tests/results/junit-report.xml. 
Importe esses resultados para o QMetry no formato JUNIT e atualize o 
status de execução dos test cases correspondentes."
```

### Gerar Relatório de Cobertura

```
"Liste todos os requisitos do projeto appointment-scheduling e para cada 
um mostre:
- Quantos test cases estão vinculados
- Status da última execução (PASS/FAIL/NOT RUN)
- Bugs vinculados (se houver)

Formate como uma tabela de rastreabilidade."
```

---

## VALOR PARA A PALESTRA

### Por que mostrar QMetry?

1. **Audiência reconhece**: Muitos QAs no TDC usam QMetry ou ferramentas similares
2. **Fecha o ciclo**: Mostra que o Kiro não é só geração de código — é gestão de qualidade completa
3. **Rastreabilidade**: Requisito → Test Case → Execução → Bug — tudo conectado
4. **Relatórios**: Gestores e POs entendem dashboards do QMetry

### Como encaixar nos 20 minutos

Sugiro mencionar o QMetry no **Bloco 2 (Kiro + MCP)** como uma das integrações disponíveis, e se sobrar tempo na demo, mostrar rapidamente a criação de um test case. Não precisa demonstrar tudo — o importante é que a audiência SAIBA que é possível.

**Frase para usar:**
> "E o melhor: esses testes que o Kiro gerou? Eu posso pedir para ele criar os test cases diretamente no QMetry, vincular à story do Jira, e organizar num test cycle da sprint. Rastreabilidade completa, sem copiar e colar."

---

## NARRATIVA EXPANDIDA: O QA COMO ORQUESTRADOR

Com todas as integrações (Jira + Confluence + GitHub + QMetry), o QA se torna um **orquestrador de qualidade**:

| Atividade tradicional | Com Kiro + MCP |
|----------------------|----------------|
| Ler story no Jira e anotar cenários | Kiro lê e sugere cenários automaticamente |
| Escrever test cases manualmente no QMetry | Kiro gera test cases com steps |
| Criar test cycle e vincular test cases | Kiro organiza por sprint/release |
| Rodar testes e atualizar status | Kiro importa resultados automaticamente |
| Gerar relatório de cobertura | Kiro consulta e formata rastreabilidade |
| Identificar gaps de cobertura | Kiro compara requisitos vs test cases |

**Mensagem central**: "A IA precisa de inputs para saber o que executar. O QA é quem fornece esses inputs — definindo o que é correto, priorizando riscos, e validando que a cobertura faz sentido. O Kiro executa. O QA direciona."
