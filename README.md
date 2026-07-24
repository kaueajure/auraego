# Aura & Ego

Jogo competitivo 3D para navegador sobre timing, leitura do adversário e controle de recursos. O código é organizado como monorepo, mas a entrega de produção é uma única aplicação: um processo Express serve o frontend React/Three.js compilado, a API, o acesso MySQL e as salas Socket.IO autoritativas no mesmo domínio e porta.

## Arquitetura

```text
apps/
  web/                  React, Vite, R3F, Zustand e Socket.IO Client
    src/components/     logo, personagens procedurais e cenas 3D
    src/pages/          autenticação, tokens, lobby e partida
    src/api.ts          cliente HTTP autenticado
    src/socket.ts       transporte em tempo real
    src/store.ts        estado local efêmero da partida
  server/               Express, Socket.IO e mysql2
    migrations/         migration SQL MySQL 8
    src/auth.ts         cadastro, login, tokens e recuperação
    src/realtime.ts     fila, salas, bot, reconexão e persistência
    src/repositories/   queries parametrizadas e transações
    src/security.ts     JWT, hashing auxiliar e middleware
    src/email.ts        templates e transporte SMTP
    src/users.ts        perfil, histórico e ranking
packages/
  shared/               contratos, eventos, engine determinística, bot e MMR
docs/
  API.md                contratos HTTP e WebSocket
  ARCHITECTURE.md       decisões, segurança e regras operacionais
```

O backend é a fonte de verdade nas partidas. O cliente envia apenas `input`, timestamp e sequência; aura, ego, combo, eventos, relógio, resultado e MMR são calculados no servidor. A engine compartilhada evita divergência de tipos e permite pré-visualização segura, mas o estado do servidor sempre prevalece. Em produção, `npm run build` gera todos os pacotes e `npm start` inicia o único serviço Express, que também entrega `apps/web/dist`.

## Pré-requisitos

- Node.js 22+
- MySQL 8+
- uma conta SMTP que aceite autenticação por usuário/senha

## Configuração local

1. Crie o banco MySQL:

   ```sql
   CREATE DATABASE aura_ego
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_0900_ai_ci;
   ```

2. Copie `.env.example` para `.env` e preencha todos os campos. Gere três segredos independentes:

   ```bash
   openssl rand -base64 48
   ```

3. Configure as variáveis do banco com as credenciais exibidas em **hPanel → Bancos de dados → Gerenciamento**:

   ```env
   DATABASE_HOST=host
   DATABASE_PORT=3306
   DATABASE_NAME=aura_ego
   DATABASE_USERNAME=usuario
   DATABASE_PASSWORD=senha
   DATABASE_SSL=false
   ```

4. Configure SMTP. Em desenvolvimento, Mailpit ou MailHog podem ser usados com host local e sem TLS; em produção, use as credenciais do provedor, `SMTP_SECURE=true` para porta 465 ou a configuração recomendada pelo serviço.

5. Instale e aplique a migration:

   ```bash
   npm install
   npm run db:migrate
   ```

6. Inicie os dois processos:

   ```bash
   npm run dev
   ```

Frontend: `http://localhost:5173`. Backend: `http://localhost:3000`.

## Variáveis

Todas estão documentadas em [.env.example](.env.example). São obrigatórias: origens do frontend/backend, host, porta, nome, usuário e senha do MySQL, os dois segredos JWT, o segredo de verificação, todos os campos SMTP e a origem Socket.IO. O servidor valida a configuração e testa a conexão MySQL antes de abrir a porta. Ele informa apenas os nomes inválidos, nunca valores.

Em produção:

- use HTTPS;
- mantenha frontend e backend sob origens explícitas;
- troque os três segredos por valores aleatórios diferentes;
- configure `NODE_ENV=production` para cookies `Secure`;
- execute `npm run db:migrate` uma vez antes do primeiro start e após novas migrations;
- use um adaptador Socket.IO compartilhado (Redis) antes de escalar para mais de uma instância.

## Deploy único na Hostinger

Crie somente uma **Node.js Web App** e selecione **Express**.

```text
Build command: npm run build
Start command: npm start
Entry file: app.js
Node.js: 22
```

A Hostinger deve executar a instalação e o build em fases separadas. Não há
`postinstall`: após concluir `npm install`, o painel deve executar
`npm run build`. Esse comando gera `server.bundle.cjs` e `public/` diretamente
na raiz do runtime antes de carregar `app.js`. O bundle inclui a engine
compartilhada e mantém apenas dependências npm como externas.

Os artefatos raiz `server.bundle.cjs` e `public/` são
intencionalmente versionados. A hospedagem Express da Hostinger pode recriar o
diretório de runtime apenas com arquivos do repositório; versioná-los impede
que o entrypoint seja publicado sem o bundle e evita erros de módulo no
runtime. `app.js` e o bundle usam CommonJS porque o LiteSpeed `lsnode.js` da
Hostinger carrega o entrypoint com `require()`.

Defina `FRONTEND_URL`, `BACKEND_URL` e `SOCKET_CORS_ORIGIN` com o mesmo domínio HTTPS. Não defina `VITE_API_URL` nem `VITE_SOCKET_URL` em produção: assim o navegador usa automaticamente o mesmo domínio. Adicione também `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` e `DATABASE_SSL` com os dados do MySQL da Hostinger. O processo Express entrega os arquivos do Vite, mantém o Socket.IO ativo e utiliza um pool MySQL de até dez conexões.

## Qualidade

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Os testes determinísticos cobrem ordem 6→7, pacotes duplicados, alternância rápida, proteção contra velocidade impossível, seed de eventos, ritmo do bot e MMR. Fluxos que dependem de MySQL e SMTP devem rodar em CI com serviços reais de teste; não há fallback que finja envio de e-mail.

## Mecânica

- Desktop: alterne `6` e `7` o mais rápido possível. Mobile: alterne os dois controles grandes.
- Cada par válido `6 → 7` alimenta o farm; a Aura sobe um ponto a cada três pares e o Ego, um ponto a cada cinco.
- Tecla repetida ou intervalo acima de 450 ms quebra o combo, mas não retira os pontos já conquistados.
- A proteção do servidor rejeita somente taxas fisicamente impossíveis; alternância humana rápida é a mecânica principal.
- Os eventos dão ritmo visual à rodada, sem obrigar o jogador a parar de farmar.
- Esferas raras podem surgir durante pares válidos; ao serem tocadas, ativam por dez segundos uma transformação facial original de mandíbula marcada e um gesto animado da mão no queixo.
- Os personagens procedurais têm face, pescoço, ombros, bíceps, antebraços, palmas e dedos modelados separadamente.
- Melhor de três; empates disparam um evento de morte súbita.
- Bots usam a mesma engine, têm reação mínima e não recebem inputs futuros.

## Limitações conhecidas

- Personagens e sons são originais/procedurais, mas os modelos GLB finais e a trilha não estão incluídos; a cena não depende deles para funcionar.
- Salas e fila estão em memória de uma instância. MySQL persiste resultados; Redis será necessário para alta disponibilidade horizontal.
- O histórico de auditoria foi modelado, porém o MVP persiste o resumo final e não todos os inputs.
- Termos e política aparecem no cadastro, mas o conteúdo jurídico final precisa ser fornecido antes de produção.
- Configuração de cosméticos, áudio e gráficos está modelada; a interface completa de edição é um próximo passo.
- E2E com dois navegadores, MySQL e SMTP não é executável sem esses serviços externos configurados.

## Próximos passos

1. Adicionar suíte Playwright com dois contexts e containers MySQL/Mailpit.
2. Adicionar Redis adapter, presença distribuída e idempotência de persistência.
3. Substituir personagens procedurais por GLB originais comprimidos com Draco/KTX2.
4. Produzir áudio original e disponibilizar legendas visuais equivalentes.
5. Instrumentar métricas de latência, abandono, pares por segundo e equilíbrio dos bots.
