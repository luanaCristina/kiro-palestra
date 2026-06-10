# 🧪 Hands-On: QA com Kiro — Do Jira ao Teste em 15 Minutos

## TDC Recife 2026 | Luana Cristina — Quality Analyst @ Thoughtworks

---

## 🎯 Objetivo

Demonstrar ao vivo como um QA usa o Kiro para:
1. Ler um card do Jira SEM sair da IDE
2. Criar testes automatizados baseados no requisito
3. Rodar e validar os testes
4. Documentar no Confluence
5. Registrar evidência no QMetry

**Tempo total estimado: 15 minutos**

---

## 📋 Pré-Requisitos (para quem quiser replicar)

- [Kiro instalado](https://kiro.dev/downloads/) (gratuito, 50 créditos/mês)
- Conta GitHub (para login)
- Node.js 18+ instalado
- (Opcional) Jira/Confluence para integração MCP

---

## 🎬 Roteiro do Hands-On

### Parte 1: Contexto do Projeto (2 min)

**Mostrar na tela:**

```
"Imagine que você entrou hoje no time. O tech lead te diz:
'Precisa validar o card SDC-8 — cancelamento de consulta com menos de 24h.
O código está no repo, a spec tá no Confluence. Boa sorte!' 😅"
```

**O que normalmente fazemos:**
1. Abrir Jira → ler o card (2 min)
2. Abrir Confluence → achar a spec (3 min)
3. Abrir o repo → entender o código (10 min)
4. Escrever testes (30 min)
5. Registrar no QMetry (5 min)

**Com Kiro: tudo ao mesmo tempo, sem sair da IDE.**

---

### Parte 2: Perguntar ao Kiro sobre o Card (3 min)

**Abrir o Kiro e digitar no chat:**

```
Kiro, busca o card SDC-8 no Jira e me diz o que precisa ser validado.
```

**O Kiro vai:**
- Conectar ao Jira via MCP
- Buscar o card SDC-8
- Retornar: título, descrição, acceptance criteria, status

**Perguntar em seguida:**

```
Quais são as regras de cancelamento de consulta nesse projeto?
Me mostra o código que implementa isso.
```

**O Kiro vai:**
- Ler o arquivo `src/modules/cancellation-policy.ts`
- Explicar as 3 regras:
  1. Já cancelada → não pode cancelar de novo
  2. Passada → não pode cancelar
  3. Precisa de MAIS de 24h (≤24h é negado, incluindo exatamente 24h)

> 💡 **Ponto para a audiência:** "Em 30 segundos, eu entendi o card E o código. Sem abrir browser, sem navegar repos."

---

### Parte 3: Gerar Testes com Kiro (5 min)

**Digitar no chat:**

```
Cria um teste unitário para a função canCancel do módulo cancellation-policy.
Testa os 5 cenários: já cancelada, passada, exatamente 24h (deve negar), 
menos de 24h (deve negar), e mais de 24h (deve permitir).
Usa Jest e segue o padrão dos testes existentes no projeto.
```

**O Kiro vai:**
- Ler o código existente e os padrões do projeto (via Steering)
- Gerar `tests/unit/cancellation-policy-demo.test.ts`
- Criar 5 test cases com assertions precisas

**Mostrar o código gerado e destacar:**
- Nome descritivo de cada teste
- Uso de datas fixas (não depende de `new Date()`)
- Teste de boundary: exatamente 24h → `allowed: false`

> 💡 **Ponto para a audiência:** "O Kiro leu o steering, entendeu o padrão Jest do projeto, e gerou testes que seguem a convenção. Não precisei explicar a stack."

---

### Parte 4: Rodar os Testes (2 min)

**No terminal integrado:**

```bash
npx jest tests/unit/cancellation-policy --verbose
```

**Resultado esperado:**
```
✓ should reject cancellation of already cancelled appointment
✓ should reject cancellation of past appointment
✓ should reject cancellation at exactly 24 hours (strict inequality)
✓ should reject cancellation less than 24 hours before
✓ should allow cancellation more than 24 hours before

Tests: 5 passed, 5 total
```

> 💡 **Ponto para a audiência:** "5 testes, 5 passing, validando a regra de negócio que está no card. Rastreabilidade: card → código → teste."

---

### Parte 5: Documentar e Registrar (3 min)

**Digitar no chat:**

```
Cria uma página no Confluence no space CM documentando os cenários 
de teste de cancelamento de consulta que acabamos de validar,
com uma tabela de cenários e resultados.
```

**O Kiro vai:**
- Criar a página no Confluence via MCP
- Incluir tabela com cenários, resultado esperado, status

**Em seguida:**

```
Agora roda os testes e envia os resultados ao QMetry linkado ao card SDC-8.
```

```bash
npm run test:qmetry -- --card SDC-8 --executor "Luana Cristina"
```

**Resultado:**
```
📋 Test Cycle:   Regression - 2026-06-10 14:30 - SDC-8
📊 RESULT: 182/183 passed (99.5%)
✅ Uploaded to QMetry! Tracking: abc123...
```

> 💡 **Ponto para a audiência:** "Documentei no Confluence E registrei no QMetry sem abrir um browser sequer. Tudo da IDE."

---

## 🎯 Resumo Visual para Projetar

```
┌────────────────────────────────────────────────────────────────┐
│                     ANTES (45+ minutos)                         │
├────────────────────────────────────────────────────────────────┤
│ Jira → Confluence → GitHub → IDE → Terminal → QMetry → Jira   │
│   📋       📄         🐙      💻      ⬛        🧪      📋    │
│ (lê)    (busca doc) (clone) (entende) (testa) (registra)(atualiza)│
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    COM KIRO (15 minutos)                        │
├────────────────────────────────────────────────────────────────┤
│                         KIRO IDE                               │
│  "lê o card" → "mostra código" → "gera testes" → "registra"   │
│       📋            💻               🧪              ✅         │
│     (MCP:Jira)    (Steering)      (IA + Jest)    (MCP:QMetry)  │
└────────────────────────────────────────────────────────────────┘
```

---

## 💬 Frases de Efeito para a Palestra

| Momento | Frase |
|---------|-------|
| Abertura | "E se o QA pudesse ler o Jira, o Confluence e o código ao mesmo tempo?" |
| Após ler card | "30 segundos. Entendi o card e o código. Sem abrir browser." |
| Após gerar testes | "O Kiro leu meus padrões e gerou testes que eu escreveria — em 10 segundos." |
| Após rodar | "5 testes, 5 pass. Validação de regra de negócio completa." |
| Após QMetry | "Rastreabilidade: card → código → teste → evidência. Automático." |
| Fechamento | "Com Kiro, pode. E o free tier dá 50 créditos. Começa hoje." |

---

## 🧑‍💻 Para Devs na Audiência

### "Mas eu sou dev, não QA. Por que me importa?"

| Situação | Como Kiro ajuda o Dev |
|----------|---------------------|
| PR sem testes | "Kiro, gera testes para essa função que acabei de criar" |
| Bug report vago | "Kiro, lê o card BUG-123 e me mostra onde no código pode estar o problema" |
| Novo no projeto | "Kiro, explica a arquitetura desse projeto" (Steering!) |
| Refatoração | "Kiro, cria spec para refatorar o módulo X" (Specs!) |
| Code review | "Kiro, review essa PR — tem algum edge case não coberto?" |
| Documentação | "Kiro, atualiza o Confluence com as mudanças que fiz" |

### Ganho para o time inteiro

```
QA usa Kiro para:          Dev usa Kiro para:
├── Entender requisitos    ├── Gerar testes junto com código
├── Criar testes           ├── Entender projetos novos
├── Validar regras         ├── Documentar automaticamente
├── Rastrear evidências    ├── Refatorar com segurança
└── Documentar cenários    └── Review com IA assistindo
```

---

## 📱 QR Code para a Audiência

Ao final da apresentação, mostrar QR code com:

- **Instalar Kiro**: https://kiro.dev/downloads/
- **Projeto demo**: https://github.com/luanaCristina/kiro-palestra
- **App online**: https://appointment-scheduling-api.onrender.com
- **Docs MCP**: https://kiro.dev/docs/guides/learn-by-playing/07-extending-kiro-with-mcp/

---

## ⚡ Plano B (se algo der errado ao vivo)

| Problema | Solução |
|----------|---------|
| Internet caindo | Mostrar screenshots/vídeo gravado como backup |
| MCP do Jira não conecta | Usar arquivo local com dados do card (já preparado) |
| Teste falha inesperadamente | "Isso é realidade! O Kiro me mostra o que falhou e por quê" |
| Kiro lento/timeout | Trocar para modo Vibe (mais rápido que Spec) |
| Créditos acabam | Ter conta secundária configurada |

---

## 🏁 Call to Action Final

```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   1. Instale: kiro.dev/downloads (gratuito)           ║
║   2. Clone: github.com/luanaCristina/kiro-palestra    ║
║   3. Pergunte: "Kiro, explica esse projeto"           ║
║   4. Teste: "Kiro, gera testes para cancellation"     ║
║                                                       ║
║   50 créditos grátis. Zero desculpas. 🚀              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

---

*Hands-on criado para TDC Recife 2026 — Trilha QA & Desenvolvimento*
*Luana Cristina | Quality Analyst @ Thoughtworks*
