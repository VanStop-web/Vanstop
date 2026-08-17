<div align="center">
  <img src="assets/img/logo.jpeg" alt="VanStop Logo" width="380" />

  <p align="center">
    <strong>Plataforma inteligente de gestão, logística tática e cobrança para motoristas de transporte escolar.</strong>
  </p>

  <p align="center">
    <a href="#-principais-funcionalidades">Funcionalidades</a> •
    <a href="#-arquitetura-e-tecnologias">Tecnologias</a> •
    <a href="#-estrutura-do-projeto">Estrutura</a> •
    <a href="#-configuração-e-instalação">Instalação</a> •
    <a href="#-deploy">Deploy</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/FastAPI-0.136-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Vercel-Deployment-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
  </p>
</div>

---

## 📌 Sobre o VanStop

O **VanStop** é uma solução completa em modelo micro-SaaS desenhada especificamente para simplificar o dia a dia do motorista de van escolar. A plataforma une o planeamento logístico de rotas, o controlo tático de embarque com telemetria GPS em tempo real, a conciliação financeira automatizada e a triagem geográfica de novos passageiros.

---

## ✨ Principais Funcionalidades

### 1. 🧭 Cockpit de Despacho & Telemetria GPS (`/logistica`)
* **Transmissão em Tempo Real:** Captura o GPS do dispositivo do motorista e envia as coordenadas em tempo real para a nuvem.
* **Controlo de Embarque:** Marcação rápida de presença dos alunos na van.
* **Notificações aos Encarregados de Educação:** Geração e registo de mensagens de confirmação de chegada segura dos alunos à escola.

### 2. 🗺️ Rotas Inteligentes & Otimização Geométrica (`/rotas`)
* **Modos de Otimização:** Alternância inteligente entre rota por **Menor KM (economia de combustível)** e rota **Mais Rápida (corredor de tráfego)**.
* **Cálculo de Custos Operacionais:** Estimativa de consumo e custos baseados na tarifa parametrizável por quilómetro rodado.
* **Navegação Integrada:** Exportação e abertura direta do trajeto com waypoints no **Google Maps**.

### 3. 👥 Aquisição e Triagem de Novos Passageiros (`/passageiros`)
* **Análise de Impacto de Desvio:** Cálculo automático da distância e minutos adicionais que uma nova paragem adiciona à rota existente.
* **Controlo de Lotação:** Monitorização visual da capacidade máxima da van (ex.: ocupação de 20 lugares).
* **Aprovação Instantânea:** Criação automática de registos do aluno e do responsável na base de dados com apenas um clique.

### 4. 💳 Motor Financeiro & Conciliação (`/financeiro`)
* **Métricas em Tempo Real (KPIs):** Faturamento previsto, valores liquidados e pagamentos em atraso.
* **Conciliação de Mensalidades:** Registo de baixa manual e histórico de liquidações por PIX/Boleto.
* **Extrato e Auditoria:** Visualização de logs e relatórios compatíveis com normas de conformidade/privacidade.

### 5. 🔐 Autenticação & Gestão de Conta (`/` e Modal de Definições)
* Registo e login seguro via JWT e Supabase Auth com proteção contra ataques de força bruta (*Rate Limiting*).
* Modal centralizado para configuração de instâncias do WhatsApp Bot, integração com Mercado Pago e definição de regras tarifárias (por km, por rota ou mensalidade fixa).

---

## 🛠️ Arquitetura e Tecnologias

### **Front-end**
* **Linguagens:** HTML5 semântico, JavaScript moderno (ES6+ / Vanilla).
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) via CDN com tema customizado e suporte a *Glassmorphism*.
* **Ícones & Tipografia:** [Google Material Symbols](https://fonts.google.com/icons) & [Inter Font](https://fonts.google.com/specimen/Inter).
* **Integrações:** Supabase JS Client e Google Maps Embed API.

### **Back-end**
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+).
* **Validação & Configurações:** [Pydantic v2](https://docs.pydantic.dev/) e `pydantic-settings`.
* **Segurança & Rate Limit:** [SlowAPI](https://github.com/laurentS/slowapi) (limitação de 5 req/min no login).
* **Servidor ASGI:** Uvicorn / Gunicorn.

### **Base de Dados & Autenticação**
* **PostgreSQL (Supabase):** Tabelas relacionais (`motoristas`, `alunos`, `responsaveis`, `solicitacoes`, `mensalidades`, `configuracoes`, `localizacao_van`).
* **Automações PL/pgSQL:** Triggers automáticos para sincronização do `auth.users` com os perfis públicos.
* **Segurança:** Políticas de *Row Level Security* (RLS).

---

## 📂 Estrutura do Repositório

```text
vanstop/
├── assets/
│   └── img/                    # Identidade visual e imagens de apoio
├── backend/
│   ├── core/
│   │   ├── config.py           # Gestão de variáveis de ambiente com Pydantic
│   │   ├── supabase_client.py  # Instância singleton do cliente Supabase
│   │   └── supabase_setup.sql  # Script DDL/DML de inicialização do banco
│   ├── routes/
│   │   └── auth.py             # Endpoints de login e registo (/api/register, /api/login)
│   ├── main.py                 # Ponto de entrada da API FastAPI e Middlewares (CORS, Limiter)
│   └── requirements.txt        # Dependências Python
├── 404.html                    # Redirecionamento de rotas não encontradas
├── Despacho_Tatico.html        # Cockpit de telemetria GPS e embarque de alunos
├── index.html                  # Overview e Dashboard analítico geral
├── Motor_Financeiro.html       # Painel de mensalidades e fluxo de caixa
├── PaginaDeLogin.html          # Portal de autenticação, registo e recuperação de senha
├── settings-modal.js           # Componente modal de definições e integrações
├── supabase-client.js          # Camada de abstração e comunicação client-side com o Supabase
├── Triagem_de_Passageiros.html # Triagem geográfica de novas adesões
├── Validacao_Geografica.html   # Otimizador de percursos e cálculo de km
└── vercel.json                 # Regras de rewrites e clean URLs para a Vercel
