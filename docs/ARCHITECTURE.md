# Arquitetura e decisões

## Pesquisa cultural aplicada

A referência cultural foi usada como linguagem, não como conteúdo. O gesto foi abstraído como alternância rítmica das mãos, e a relação com basquete inspirou a quadra urbana. “Aura” é uma pontuação humorística de presença; “aura farming” é recompensado somente quando a ação parece adequada ao contexto; agir de modo forçado causa perda de ego. Não são usados música, vídeos, pessoas, marcas, modelos ou falas do material original.

Fontes consultadas em 23 de julho de 2026:

- AP, “Reaching 67 points is creating a ‘6-7’ frenzy”: https://apnews.com/article/e5a0cddd8d1e6ec5e90c51242367146d
- Merriam-Webster, “Aura”: https://www.merriam-webster.com/slang/aura
- Merriam-Webster, “Aura farming”: https://www.merriam-webster.com/slang/aura-farming

## Limites de confiança

```text
teclado/toque
    │ intenção {input, timestamp, sequence}
    ▼
Socket.IO autenticado ──► sala autoritativa ──► engine determinística
                                  │                      │
                                  │ estado oficial       ├─ aura/ego/combo
                                  │                      ├─ spam/janelas
                                  ▼                      └─ vitória/MMR
                              dois clientes
                                  │
                                  ▼
                              PostgreSQL
```

## Unidade de deploy

Frontend, API e Socket.IO são publicados como um único serviço. O build preserva módulos separados no repositório, mas o processo Express de produção serve `apps/web/dist`, responde às rotas HTTP e mantém as conexões WebSocket. Isso elimina CORS entre frontend/backend e exige apenas uma aplicação na hospedagem.

O cliente nunca envia pontos, ego, multiplicador, vencedor, estado do rival ou relógio oficial. Sequências repetidas ou regressivas, timestamps fora de cinco segundos, frequência excessiva e inputs fora do estado ativo são rejeitados.

## Estado e eventos

A engine representa `COUNTDOWN`, `ROUND_ACTIVE`, `ROUND_ENDING`, `INTERMISSION` e `FINISHED`. A camada de sala representa ainda carregamento, fila e reconexão. Eventos têm identificador, tipo, duração, janelas normal/perfeita, risco, recompensa, penalidade, ação/animação/som semântico, regra do bot e condição de ativação.

O servidor gera a linha do tempo usando uma seed. A compensação aplica no máximo 150 ms sobre metade da estimativa de latência. Isso reduz injustiça moderada sem permitir que conexões lentas ampliem a janela indefinidamente.

## Autenticação

- senha com bcrypt, custo 12;
- access JWT curto e refresh JWT em cookie `HttpOnly`;
- refresh token rotacionado e armazenado apenas como SHA-256;
- sessões revogáveis por banco;
- tokens de verificação e recuperação aleatórios, de uso único, expirados e armazenados como hash;
- resposta genérica em recuperação/reenvio e login com comparação dummy;
- bloqueio temporário após cinco falhas e limitador de requisições;
- autenticação independente no handshake WebSocket.

## Dados

A migration cria usuários, perfis, tokens, sessões, partidas, participantes e auditoria. E-mail e username são únicos; perfis têm índice descendente de MMR; tokens, sessões, histórico por usuário e estado de partidas têm índices orientados aos acessos.

## Desempenho e acessibilidade

As cenas usam geometria procedural reutilizável, uma luz dinâmica principal, limite de pixel ratio e carregamento Suspense. A interface mantém labels fora do canvas, foco nativo, feedback textual além de cor, controles grandes, safe area, teclado e preferência `prefers-reduced-motion`.
