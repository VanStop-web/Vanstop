# ZapAssina

Protótipo estático do painel ZapAssina para motoristas de van escolar.

## Publicação

### GitHub Pages

1. Abra o repositório no GitHub.
2. Vá em `Settings` -> `Pages`.
3. Em `Build and deployment`, selecione `Deploy from a branch`.
4. Escolha branch `main` e pasta `/root`.
5. A página inicial será `index.html`.

URL esperada:

`https://v4sp3r.github.io/ZapAssina/`

### Vercel

1. Importe o repositório `V4SP3R/ZapAssina`.
2. Use framework `Other`.
3. Não é necessário build command.
4. Output directory: `.`.

O arquivo `vercel.json` adiciona aliases limpos como `/rotas`, `/passageiros`, `/financeiro` e `/logistica`.

## Entrada principal

`index.html` redireciona para `ZapAssina_Driver_App.html`, que contém o overview inicial.
