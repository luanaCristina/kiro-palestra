# Portfólio - Luana Cristina

Portfólio profissional moderno, responsivo e com suporte a modo claro/escuro.

## Estrutura do Projeto

```
portfolio/
├── index.html    → Estrutura HTML do site
├── styles.css    → Estilos visuais (tema claro/escuro, responsivo)
├── script.js     → Interatividade (menu, tema, animações)
└── README.md     → Instruções de deploy
```

---

## Como Publicar Gratuitamente

### Opção 1: GitHub Pages (Recomendado)

1. **Crie um repositório no GitHub**
   - Acesse https://github.com/new
   - Nome sugerido: `portfolio` ou `luanacristina.github.io`
   - Deixe público e clique em "Create repository"

2. **Suba os arquivos**
   ```bash
   cd portfolio
   git init
   git add .
   git commit -m "Meu portfólio"
   git branch -M main
   git remote add origin https://github.com/luanaCristina/portfolio.git
   git push -u origin main
   ```

3. **Ative o GitHub Pages**
   - Vá em Settings → Pages
   - Em "Source", selecione `main` e pasta `/ (root)`
   - Clique em Save
   - Seu site estará disponível em: `https://luanacristina.github.io/portfolio`

### Opção 2: Vercel

1. Acesse https://vercel.com e faça login com sua conta GitHub
2. Clique em "Add New Project"
3. Importe o repositório do portfólio
4. Clique em "Deploy"
5. Pronto! Seu site terá uma URL como `portfolio-luanacristina.vercel.app`

---

## Personalização

- **Foto**: Substitua o `<div class="avatar-placeholder">LC</div>` por uma tag `<img>` com sua foto
- **Projetos**: Atualize os cards na seção `#projetos` com seus repositórios reais
- **E-mail**: Altere o link `mailto:` na seção de contato
- **Cores**: Edite as variáveis CSS no `:root` do `styles.css`
