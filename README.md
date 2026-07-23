# Aura & Ego

Jogo competitivo 3D para navegador sobre timing, leitura do adversário e controle de recursos. A aplicação é um monorepo com frontend React/Three.js, API Express/PostgreSQL e salas Socket.IO autoritativas.

## Arquitetura

```text
apps/
  web/                  React, Vite, R3F, Zustand e Socket.IO Client
    src/components/     logo, personagens procedurais e cenas 3D
    src/pages/          autenticação, tokens, lobby e partida
    src/api.ts          cliente HTTP autenticado
    src/socket.ts       transporte em tempo real
    src/store.ts        estado local efêmero da partida
  server/               Express, Socket.IO, Prisma e PostgreSQL
    prisma/             schema e migration SQL inicial
    src/auth.ts         cadastro, login, tokens e recuperação
    src/realtime.ts     fila, salas, bot, reconexão e persistência
    src/security.ts     JWT, hashing auxiliar e middleware
    src/email.ts        templates e transporte SMTP
    src/users.ts        perfil, histórico e ranking
packages/
  shared/               contratos, eventos, engine determinística, bot e MMR
docs/
  API.md                contratos HTTP e WebSocket
  ARCHITECTURE.md       decisões, segurança e regras operacionais
```

O backend é a fonte de verdade nas partidas. O cliente envia apenas `input`, timestamp e sequência; aura, ego, combo, eventos, relógio, resultado e MMR são calculados no servidor. A engine compartilhada evita divergência de tipos e permite pré-visualização segura, mas o estado do servidor sempre prevalece.

## Pré-requisitos

- Node.js 22+
- PostgreSQL 15+
- uma conta SMTP que aceite autenticação por usuário/senha

## Configuração local

1. Crie o banco:

   ```sql
   CREATE DATABASE aura_ego;
   ```

2. Copie `.env.example` para `.env` e preencha todos os campos. Gere três segredos independentes:

   ```bash
   openssl rand -base64 48
   ```

3. Configure `DATABASE_URL` com o usuário, senha, host, porta e banco corretos.

4. Configure SMTP. Em desenvolvimento, Mailpit ou MailHog podem ser usados com host local e sem TLS; em produção, use as credenciais do provedor, `SMTP_SECURE=true` para porta 465 ou a configuração recomendada pelo serviço.

5. Instale, gere o cliente e aplique as migrations:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   ```

6. Inicie os dois processos:

   ```bash
   npm run dev
   ```

Frontend: `http://localhost:5173`. Backend: `http://localhost:3000`.

## Variáveis

Todas estão documentadas em [.env.example](.env.example). São obrigatórias: origens do frontend/backend, `DATABASE_URL`, os dois segredos JWT, o segredo de verificação, todos os campos SMTP e a origem Socket.IO. O servidor valida a configuração antes de abrir a porta e informa apenas os nomes inválidos, nunca valores.

Em produção:

- use HTTPS;
- mantenha frontend e backend sob origens explícitas;
- troque os três segredos por valores aleatórios diferentes;
- configure `NODE_ENV=production` para cookies `Secure`;
- execute `prisma migrate deploy` no processo de release;
- use um adaptador Socket.IO compartilhado (Redis) antes de escalar para mais de uma instância.

## Qualidade

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Os testes determinísticos cobrem ordem 6→7, pacotes duplicados, spam, seed de eventos, atraso do bot e MMR. Fluxos que dependem de PostgreSQL e SMTP devem rodar em CI com serviços reais de teste; não há fallback que finja envio de e-mail.

## Mecânica

- Desktop: `6`, depois `7`. Mobile: dois controles grandes.
- A janela do evento, intervalo do par, combo, ego e latência limitada participam do cálculo.
- Eventos de espera recompensam quem não age.
- Mais de oito inputs em 1,5 segundo aciona punição de spam no servidor.
- Ego zerado interrompe o combo, restaura 25 pontos e bloqueia ações por quatro segundos.
- Melhor de três; empates disparam um evento de morte súbita.
- Bots usam a mesma engine, têm reação mínima e não recebem inputs futuros.

## Limitações conhecidas

- Personagens e sons são originais/procedurais, mas os modelos GLB finais e a trilha não estão incluídos; a cena não depende deles para funcionar.
- Salas e fila estão em memória de uma instância. PostgreSQL persiste resultados; Redis será necessário para alta disponibilidade horizontal.
- O histórico de auditoria foi modelado, porém o MVP persiste o resumo final e não todos os inputs.
- Termos e política aparecem no cadastro, mas o conteúdo jurídico final precisa ser fornecido antes de produção.
- Configuração de cosméticos, áudio e gráficos está modelada; a interface completa de edição é um próximo passo.
- E2E com dois navegadores, PostgreSQL e SMTP não é executável sem esses serviços externos configurados.

## Próximos passos

1. Adicionar suíte Playwright com dois contexts e containers PostgreSQL/Mailpit.
2. Adicionar Redis adapter, presença distribuída e idempotência de persistência.
3. Substituir personagens procedurais por GLB originais comprimidos com Draco/KTX2.
4. Produzir áudio original e disponibilizar legendas visuais equivalentes.
5. Instrumentar métricas de latência, abandono, equilíbrio dos eventos e taxa de spam.
