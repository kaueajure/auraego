# Desenvolvimento completo do jogo “Aura & Ego”

Crie um jogo multiplayer 3D completo e funcional para navegador chamado **Aura & Ego**.

O projeto deve ser uma aplicação real, com frontend, backend próprio, banco de dados, autenticação, verificação de e-mail, matchmaking, partidas online em tempo real, modo de treinamento contra bots e sistema de progressão persistente.

Não entregue apenas uma demonstração visual, landing page, protótipo estático ou jogo simulado. Todas as funcionalidades descritas devem funcionar de verdade.

---

# 1. Pesquisa obrigatória antes da implementação

Antes de escrever o código, pesquise e compreenda corretamente:

* o meme “Six Seven” ou “67”;
* o gesto característico realizado alternando as duas mãos;
* a relação do meme com basquete e vídeos curtos;
* os conceitos de “aura”, “aura points”, “aura farming” e “negative aura”;
* o uso de “ego” como reputação, confiança e presença social;
* a linguagem visual, comportamental e humorística associada ao meme.

Utilize essa pesquisa somente como referência cultural.

Não copie:

* músicas protegidas;
* vídeos;
* personagens reais;
* jogadores famosos;
* marcas;
* imagens;
* modelos 3D;
* falas;
* animações;
* efeitos sonoros protegidos.

Crie personagens, animações, cenários, sons e identidade visual próprios.

---

# 2. Conceito do jogo

**Aura & Ego** é um jogo competitivo 3D no qual dois personagens disputam para descobrir quem consegue acumular mais aura e destruir o ego do adversário.

Os jogadores executam o gesto “Six Seven” em momentos estratégicos da partida.

O objetivo não é apertar botões indiscriminadamente. O jogador precisa:

* interpretar situações;
* reagir no momento correto;
* manter o ritmo;
* controlar o próprio ego;
* evitar parecer forçado;
* interromper o combo adversário;
* administrar risco e recompensa;
* saber quando agir e quando permanecer parado.

A experiência deve misturar:

* timing;
* reação;
* leitura do adversário;
* ritmo;
* blefe;
* combos;
* gerenciamento de recursos;
* decisões rápidas;
* competição online.

O humor deve surgir naturalmente das animações, situações e reações dos personagens.

---

# 3. Regras visuais obrigatórias

Não crie um jogo genérico com aparência de projeto produzido automaticamente.

Evite completamente:

* cyberpunk;
* ficção científica sem contexto;
* robôs;
* hologramas;
* arenas espaciais;
* armas futuristas;
* grades neon;
* excesso de brilhos;
* partículas aleatórias;
* gradientes exagerados;
* personagens genéricos de jogos mobile;
* interface parecida com dashboard SaaS;
* botões genéricos sobre um fundo vazio;
* estética de cassino;
* poluição visual;
* emojis como elementos principais.

O jogo deve possuir uma identidade própria, urbana, competitiva, expressiva e atual.

Utilize cenários relacionados ao universo do jogo, como:

* quadra de basquete;
* corredor de escola;
* praça;
* arquibancada;
* festa;
* shopping;
* academia;
* estação;
* palco improvisado;
* rua movimentada.

Os cenários devem ser 3D, mas estilizados e otimizados para navegador.

---

# 4. Stack técnica recomendada

Utilize preferencialmente:

## Frontend

* React;
* TypeScript;
* Vite;
* React Three Fiber;
* Three.js;
* Drei;
* Zustand para estado local;
* React Router;
* Motion ou GSAP para interfaces fora do cenário 3D;
* CSS moderno, CSS Modules ou Tailwind CSS.

## Backend

* Node.js;
* TypeScript;
* NestJS ou Express com arquitetura modular;
* Socket.IO para comunicação em tempo real;
* PostgreSQL;
* Prisma ORM;
* JWT com access token e refresh token;
* bcrypt ou Argon2 para senhas;
* Nodemailer ou biblioteca equivalente para envio de e-mails;
* Zod, class-validator ou solução equivalente para validação.

## Testes

* Vitest ou Jest;
* Supertest para endpoints;
* Playwright para fluxos principais;
* testes das regras determinísticas do jogo.

Caso o projeto já possua uma stack definida, analise a arquitetura existente antes de trocar tecnologias. Não substitua bibliotecas funcionais sem uma justificativa técnica real.

Não utilize Firebase, Supabase ou autenticação terceirizada. O sistema deve possuir backend e autenticação próprios.

---

# 5. Configuração por variáveis de ambiente

Todos os dados sensíveis devem ser armazenados exclusivamente em variáveis de ambiente.

Crie um arquivo `.env.example` documentado contendo, no mínimo:

```env
NODE_ENV=development

PORT=3000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

DATABASE_URL=postgresql://usuario:senha@localhost:5432/aura_ego

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

EMAIL_VERIFICATION_SECRET=
EMAIL_VERIFICATION_EXPIRES_IN=24h

SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=Aura & Ego
SMTP_FROM_EMAIL=

SOCKET_CORS_ORIGIN=http://localhost:5173
```

O arquivo `.env` real não pode ser enviado ao Git nem possuir valores fixos dentro do código.

Adicione `.env` ao `.gitignore`.

A aplicação deve:

* validar as variáveis obrigatórias ao iniciar;
* encerrar com uma mensagem clara quando alguma variável essencial estiver ausente;
* nunca exibir segredos nos logs;
* nunca enviar credenciais ao frontend;
* nunca armazenar senhas sem hash.

---

# 6. Primeira tela: cadastro e autenticação

A primeira tela apresentada ao visitante deve ser uma tela de autenticação moderna, tendo o cadastro como opção principal.

Ela deve conter:

* nome de usuário;
* endereço de e-mail;
* senha;
* confirmação da senha;
* indicador visual dos requisitos da senha;
* botão para criar a conta;
* opção para entrar em uma conta existente;
* opção para recuperar a senha;
* termos de uso e política de privacidade;
* mensagens claras de erro e sucesso.

Apesar de o cadastro ser a visualização principal, usuários já cadastrados precisam ter acesso a uma aba ou opção de login.

A tela não deve parecer um formulário administrativo simples.

Crie uma apresentação visual relacionada ao jogo, contendo:

* logotipo “Aura & Ego”;
* personagem 3D ou animação temática;
* prévia discreta de uma arena;
* animações suaves;
* boa hierarquia;
* responsividade;
* identidade visual coerente com o restante do projeto.

Não permita acesso ao jogo sem autenticação.

---

# 7. Regras do cadastro

Implemente um cadastro realmente funcional.

Valide:

* formato do e-mail;
* e-mails duplicados;
* nomes de usuário duplicados;
* tamanho do nome de usuário;
* caracteres permitidos;
* confirmação da senha;
* força mínima da senha;
* campos obrigatórios;
* tentativas excessivas;
* payloads inválidos.

Requisitos mínimos de senha:

* pelo menos oito caracteres;
* pelo menos uma letra;
* pelo menos um número.

Armazene apenas o hash da senha.

Nunca retorne o campo de senha ou seu hash pela API.

As mensagens de erro não devem permitir enumeração indevida de contas.

---

# 8. Verificação de e-mail

Após o cadastro:

1. Crie a conta com o estado de e-mail não verificado.
2. Gere um token seguro, aleatório, de uso único e com expiração.
3. Armazene apenas o hash do token no banco de dados.
4. Envie um e-mail contendo o link de verificação.
5. Exiba uma tela informando que o link foi enviado.
6. Permita reenviar a verificação após um intervalo de segurança.
7. Limite tentativas de reenvio.
8. Ao acessar o link, valide o token no backend.
9. Marque o e-mail como verificado.
10. Invalide o token utilizado.
11. Redirecione o usuário para o login ou para o jogo autenticado.

O link pode seguir uma estrutura semelhante a:

```text
https://dominio-do-jogo.com/verificar-email?token=TOKEN
```

Não permita que jogadores com e-mail não verificado acessem:

* matchmaking;
* partidas 1v1;
* ranking;
* recursos sociais.

Crie também:

* tela de token expirado;
* tela de token inválido;
* opção de reenviar o link;
* e-mail responsivo e visualmente coerente com a marca;
* confirmação visual após a verificação.

---

# 9. Login e sessão

Implemente:

* login com e-mail e senha;
* logout;
* access token de curta duração;
* refresh token seguro;
* rotação de refresh token;
* revogação de sessões;
* proteção das rotas;
* recuperação de senha;
* redefinição de senha por link com expiração;
* rate limiting;
* bloqueio temporário após várias tentativas inválidas;
* identificação segura do usuário nas conexões WebSocket.

Caso utilize cookies:

* use `HttpOnly`;
* use `Secure` em produção;
* configure `SameSite` corretamente;
* implemente proteção contra CSRF quando necessário.

---

# 10. Tela principal após autenticação

Após o login e a verificação do e-mail, apresente a tela principal do jogo.

Ela deve conter:

* personagem 3D do jogador;
* nome de usuário;
* nível;
* aura total;
* ego atual;
* classificação competitiva;
* vitórias;
* derrotas;
* sequência atual;
* histórico resumido;
* botão “Treinar”;
* botão “1v1 Online”;
* personalização;
* ranking;
* configurações;
* perfil;
* sair.

As opções principais devem ser visualmente destacadas:

## Treinar

Partida contra um bot controlado pelo sistema.

## 1v1 Online

Partida competitiva em tempo real contra outro jogador conectado.

Não transforme essa tela em um dashboard corporativo. Ela deve parecer o menu principal de um jogo 3D moderno.

---

# 11. Personagens 3D

Crie personagens estilizados e originais.

Os personagens devem possuir:

* cabeça;
* tronco;
* pernas;
* braços articulados;
* mãos claramente visíveis;
* rosto expressivo;
* postura;
* animações de espera;
* animações de vitória;
* animações de derrota;
* animações de provocação;
* animações de vergonha;
* animações do gesto Six Seven;
* transições entre estados.

O gesto deve alternar corretamente as mãos para cima e para baixo.

Não utilize apenas cubos sem personalidade como personagens finais.

Modelos provisórios podem ser utilizados durante o desenvolvimento, mas a arquitetura precisa permitir a troca por modelos GLTF ou GLB definitivos.

Implemente:

* carregamento assíncrono;
* tela de carregamento;
* fallback caso um modelo falhe;
* compressão e otimização;
* reutilização de materiais;
* animações por `AnimationMixer` ou solução equivalente;
* redução de qualidade em dispositivos fracos.

---

# 12. Mecânica central do Six Seven

O gesto principal deve ser executado por uma sequência de comandos.

No desktop:

* tecla `6`;
* seguida da tecla `7`;
* alternativamente, controles configuráveis.

No celular:

* botão virtual `6`;
* botão virtual `7`;
* grandes áreas de toque;
* feedback visual imediato.

O sistema deve analisar:

* ordem dos comandos;
* intervalo entre `6` e `7`;
* momento em relação ao evento;
* ritmo;
* consistência;
* repetição;
* combo;
* condição da arena;
* ação do adversário;
* estado do ego.

Possíveis avaliações:

* Errou
* Fora do Ritmo
* Forçado
* Sem Aura
* Limpo
* Aura Farm
* Six Seven Perfeito
* Ego Destruído
* Aura Lendária

O resultado precisa ser calculado por regras objetivas e reproduzíveis, não por valores completamente aleatórios.

---

# 13. Aura e Ego

Implemente duas métricas principais.

## Aura

Representa os pontos competitivos acumulados durante a partida.

O jogador ganha aura ao:

* acertar o timing;
* executar combos;
* reagir corretamente aos eventos;
* antecipar o adversário;
* vencer confrontos;
* realizar uma defesa perfeita;
* evitar uma armadilha;
* permanecer parado quando agir seria uma decisão ruim.

## Ego

Representa a estabilidade emocional e competitiva do personagem.

O jogador perde ego ao:

* errar o gesto;
* sofrer um contra-ataque;
* cair em um evento falso;
* realizar spam;
* ser interrompido;
* falhar diante da plateia;
* ter um combo quebrado;
* ser superado pelo adversário.

Quando o ego chega a zero, o jogador entra temporariamente no estado **Ego Quebrado**.

Esse estado pode:

* interromper o combo;
* reduzir temporariamente os pontos recebidos;
* alterar a postura do personagem;
* ativar uma animação de constrangimento;
* abrir uma oportunidade para o adversário.

O jogo precisa ser equilibrado para evitar que uma vantagem inicial torne a recuperação impossível.

---

# 14. Eventos da arena

Durante a partida, eventos devem surgir no cenário.

Exemplos:

## Momento 67

Um placar, número, anúncio ou elemento do cenário apresenta uma referência a 6 e 7. Os jogadores precisam reagir rapidamente.

## Olhares da multidão

A plateia começa a prestar atenção. O gesto correto concede mais aura, mas um erro causa dano maior ao ego.

## Silêncio constrangedor

Executar o gesto imediatamente é a escolha errada. O jogador que souber esperar recebe vantagem.

## Evento falso

O cenário sugere uma oportunidade perfeita, mas executar o gesto resulta em perda de ego.

## Disputa de ritmo

Os jogadores precisam acompanhar uma sequência alternada de comandos.

## Roubo de aura

O adversário pode responder a uma execução previsível e capturar parte da pontuação.

## Pressão máxima

A janela de acerto fica menor e as recompensas aumentam.

## Aura coletiva

NPCs começam uma sequência. Os jogadores devem identificar o ponto correto para entrar.

## Quebra de clima

Uma situação inesperada interrompe a oportunidade. Continuar executando o gesto é considerado spam.

Crie os eventos utilizando uma estrutura de dados extensível.

Cada evento deve conter, no mínimo:

* identificador;
* nome;
* duração;
* janela de acerto;
* janela perfeita;
* risco;
* recompensa;
* penalidade;
* animação;
* som;
* regras do bot;
* regras de sincronização;
* condições de ativação.

---

# 15. Detecção de spam

O jogo não pode recompensar o jogador por apertar `6` e `7` continuamente.

Implemente detecção de spam considerando:

* quantidade de comandos por segundo;
* repetição sem evento;
* repetição com intervalo idêntico;
* tentativas durante bloqueios;
* padrões impossíveis de entrada humana;
* comandos enviados além do limite permitido.

Consequências possíveis:

* perda de aura;
* perda de ego;
* cancelamento do combo;
* bloqueio temporário da ação;
* reação negativa da plateia;
* mensagem “Forçou demais”;
* registro da ação suspeita no servidor.

A validação principal deve acontecer no servidor durante partidas online.

Nunca confie exclusivamente nos cálculos enviados pelo cliente.

---

# 16. Modo Treino contra bot

O modo Treino deve ser uma partida real contra um bot.

O bot não pode ser apenas um número ou uma animação aleatória.

Ele deve:

* receber os mesmos eventos;
* executar comandos;
* acertar e errar;
* construir combos;
* perder ego;
* reagir ao jogador;
* utilizar estratégias diferentes;
* respeitar limitações semelhantes às humanas.

Crie níveis de dificuldade:

## Iniciante

* reações lentas;
* mais erros;
* baixa capacidade de contra-ataque;
* indicado para tutorial.

## Normal

* comportamento equilibrado;
* variação de timing;
* alguns contra-ataques;
* leitura limitada do jogador.

## Difícil

* reações mais rápidas;
* melhor gestão de ego;
* reconhece padrões repetitivos;
* pune spam;
* utiliza blefes.

## Insano

* janelas de erro pequenas;
* leitura avançada;
* ótimo timing;
* comportamento competitivo;
* ainda precisa ser vencível.

Os bots não devem trapacear lendo comandos futuros ou reagindo instantaneamente sem atraso.

Utilize uma máquina de estados ou sistema de comportamento contendo:

* observar;
* aguardar;
* atacar;
* defender;
* blefar;
* contra-atacar;
* recuperar;
* provocar;
* cometer erro.

---

# 17. Tutorial

O primeiro acesso ao modo Treino deve oferecer um tutorial interativo.

Ensine:

* movimentação da câmera, quando aplicável;
* execução do gesto;
* timing;
* aura;
* ego;
* combos;
* eventos falsos;
* importância de não realizar spam;
* contra-ataques;
* condição de vitória.

Não utilize apenas uma tela longa de texto.

O tutorial deve apresentar objetivos curtos, demonstrar a ação e aguardar o jogador executá-la.

Salve no banco de dados se o tutorial foi concluído.

Permita repeti-lo nas configurações.

---

# 18. Multiplayer 1v1 online em tempo real

O modo 1v1 deve conectar dois jogadores reais pela internet.

Não simule o oponente localmente.

Implemente:

* fila de matchmaking;
* criação de sala;
* identificação dos dois jogadores;
* tela de procura de adversário;
* cancelamento de busca;
* confirmação de conexão;
* contagem regressiva;
* sincronização dos eventos;
* sincronização das ações;
* sincronização da pontuação;
* resultado validado pelo servidor;
* desconexão;
* reconexão;
* abandono;
* vitória por desistência;
* encerramento seguro da sala.

A partida deve utilizar comunicação em tempo real por WebSocket, preferencialmente Socket.IO.

---

# 19. Arquitetura autoritativa do servidor

Durante o 1v1, o servidor deve ser a fonte de verdade.

O servidor deve controlar:

* seed da partida;
* ordem dos eventos;
* início e término dos eventos;
* relógio oficial;
* pontuação;
* aura;
* ego;
* combos;
* penalidades;
* condição de vitória;
* resultado final;
* abandono;
* desconexões.

O cliente pode enviar apenas intenções de ação, por exemplo:

```json
{
  "type": "PLAYER_INPUT",
  "input": "SIX",
  "clientTimestamp": 1720000000000,
  "sequence": 145
}
```

O servidor deve validar a ação e enviar o resultado calculado.

Não aceite do cliente:

* pontuação calculada;
* dano de ego;
* multiplicador;
* resultado da partida;
* tempo oficial;
* estado do adversário;
* vitória ou derrota.

Implemente proteção contra:

* pacotes duplicados;
* ações fora de ordem;
* spam;
* timestamps impossíveis;
* inputs em frequência sobre-humana;
* manipulação do cliente;
* reconexão em outra conta;
* participação simultânea em várias salas.

---

# 20. Latência e sincronização

O jogo deve permanecer justo mesmo com diferenças moderadas de latência.

Implemente:

* ping periódico;
* cálculo aproximado de latência;
* relógio sincronizado com o servidor;
* número sequencial dos eventos;
* timestamps do servidor;
* pequena compensação de latência com limite;
* tolerância máxima configurável;
* interpolação visual;
* atualização imediata local apenas quando segura;
* correção pelo estado oficial do servidor.

A compensação não pode permitir que jogadores com alta latência obtenham vantagem indevida.

Exiba um indicador de conexão:

* Boa;
* Instável;
* Ruim;
* Reconectando.

---

# 21. Matchmaking

Implemente uma fila de matchmaking funcional.

Inicialmente, considere:

* região;
* classificação competitiva;
* tempo na fila;
* disponibilidade;
* estado de conexão.

A busca pode começar procurando jogadores de classificação próxima e ampliar gradualmente a faixa.

Fluxo:

1. Jogador seleciona “1v1 Online”.
2. O servidor verifica autenticação e e-mail.
3. O jogador entra na fila.
4. A interface exibe o tempo de busca.
5. O servidor encontra outro jogador compatível.
6. Uma sala é criada.
7. Os dois jogadores recebem a confirmação.
8. Os recursos essenciais da arena são carregados.
9. A contagem regressiva começa.
10. A partida é iniciada pelo servidor.

Não permita que o mesmo usuário entre várias vezes na fila.

---

# 22. Sistema competitivo

Crie uma classificação competitiva persistente.

Possíveis divisões:

1. Sem Presença
2. Ego Frágil
3. Aura Questionável
4. Farmer de Aura
5. Six Seven Certificado
6. Presença Dominante
7. Ego Inabalável
8. Aura Lendária

Os nomes podem ser refinados, desde que mantenham a identidade do jogo.

A classificação deve considerar:

* vitórias;
* derrotas;
* nível dos adversários;
* partidas abandonadas;
* desempenho;
* consistência.

Utilize um sistema semelhante a Elo ou MMR.

Não exponha regras que facilitem exploração artificial.

Após a partida, exiba:

* mudança de classificação;
* aura conquistada;
* maior combo;
* precisão;
* dano de ego causado;
* erros;
* spam detectado;
* eventos perfeitos;
* resultado;
* tempo da partida.

---

# 23. Condição de vitória

A partida pode utilizar rodadas ou duração fixa.

Sugestão inicial:

* melhor de três rodadas;
* cada rodada possui duração limitada;
* vence a rodada quem terminar com mais aura;
* ego zerado pode conceder uma vantagem temporária ao adversário, mas não necessariamente finalizar a partida imediatamente;
* empate deve ativar um evento decisivo de morte súbita.

A morte súbita deve apresentar:

* mesma oportunidade para os dois jogadores;
* janela curta;
* alto risco;
* resultado validado pelo servidor.

Centralize as regras em configurações compartilhadas pelo backend e frontend.

---

# 24. Reconexão e abandono

Quando um jogador perde a conexão:

1. Pause apenas o necessário ou continue em estado controlado.
2. Inicie uma janela curta de reconexão.
3. Exiba ao adversário que o jogador está reconectando.
4. Permita retornar à mesma sala com uma sessão válida.
5. Sincronize novamente o estado completo.
6. Caso o tempo expire, registre abandono.
7. Conceda vitória ao adversário quando aplicável.

Diferencie:

* queda temporária;
* fechamento voluntário;
* abandono;
* erro do servidor;
* cancelamento antes da partida.

Não aplique penalidade competitiva injusta quando o erro for claramente causado pelo servidor.

---

# 25. Interface durante a partida

Exiba somente as informações necessárias:

* nome dos jogadores;
* avatar ou personagem;
* aura;
* ego;
* combo;
* multiplicador;
* tempo da rodada;
* número da rodada;
* qualidade da conexão;
* avaliação da ação;
* evento atual;
* estado de reconexão.

A interface não pode bloquear a visão da arena.

Ela deve reagir visualmente aos acontecimentos:

* aura aumenta com impacto;
* ego recebe deformação ou rachadura visual;
* combos ganham intensidade;
* erros quebram o ritmo;
* eventos perfeitos ativam animação especial;
* o adversário reage ao receber dano;
* o cenário responde a grandes jogadas.

Não dependa apenas de textos para comunicar ações importantes.

---

# 26. Câmera 3D

Utilize uma câmera adequada para uma disputa 1v1.

A câmera deve:

* mostrar os dois personagens;
* destacar quem está agindo;
* aproximar em momentos importantes;
* manter a leitura da arena;
* evitar movimentos que causem enjoo;
* retornar suavemente à posição principal;
* respeitar a preferência de movimento reduzido.

Não permita que a câmera esconda informações importantes.

Evite tremores excessivos.

Crie uma opção para desativar completamente o camera shake.

---

# 27. Som

Crie uma identidade sonora própria.

Inclua:

* som para o comando 6;
* som para o comando 7;
* som de sequência correta;
* som de erro;
* som de combo;
* som de ego quebrado;
* som de vitória;
* som de derrota;
* reações da plateia;
* sons ambientes;
* música original ou livre para uso.

Não utilize a música original relacionada ao meme.

Implemente:

* volume geral;
* volume da música;
* volume dos efeitos;
* opção para silenciar;
* salvamento das preferências;
* carregamento progressivo;
* funcionamento completo do jogo sem áudio.

---

# 28. Personalização

Permita personalizar o personagem sem criar vantagens competitivas.

Opções possíveis:

* roupas;
* cores;
* penteados;
* poses;
* animações de vitória;
* provocações;
* efeitos discretos de aura;
* cartões de perfil.

Itens cosméticos não podem:

* alterar hitbox;
* aumentar a pontuação;
* modificar o timing;
* esconder animações;
* atrapalhar a leitura do adversário;
* conceder vantagem.

Não implemente compras reais na primeira versão, salvo se já houver uma estrutura claramente solicitada para isso.

---

# 29. Banco de dados

Crie migrations e modelos organizados.

Estruturas mínimas sugeridas:

## Usuários

* id;
* username;
* email;
* passwordHash;
* emailVerifiedAt;
* createdAt;
* updatedAt;
* lastLoginAt;
* status.

## Tokens de verificação

* id;
* userId;
* tokenHash;
* expiresAt;
* usedAt;
* createdAt.

## Tokens de recuperação

* id;
* userId;
* tokenHash;
* expiresAt;
* usedAt;
* createdAt.

## Sessões

* id;
* userId;
* refreshTokenHash;
* userAgent;
* ipHash ou informação segura equivalente;
* expiresAt;
* revokedAt;
* createdAt.

## Perfis dos jogadores

* userId;
* level;
* experience;
* totalAura;
* currentRank;
* mmr;
* wins;
* losses;
* winStreak;
* tutorialCompleted;
* selectedCosmetics.

## Partidas

* id;
* mode;
* status;
* seed;
* startedAt;
* endedAt;
* winnerId;
* finishReason;
* serverVersion.

## Participantes da partida

* matchId;
* userId;
* score;
* aura;
* remainingEgo;
* highestCombo;
* accuracy;
* perfectActions;
* mistakes;
* spamViolations;
* mmrBefore;
* mmrAfter;
* disconnectedAt;
* result.

## Histórico de eventos

Registre apenas os dados necessários para auditoria e análise, evitando armazenar volumes desnecessários indefinidamente.

Crie índices e restrições para:

* e-mail único;
* username único;
* busca de partidas;
* ranking;
* sessões;
* tokens;
* matchmaking.

---

# 30. API

Organize endpoints semelhantes a:

```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/verify-email
POST /auth/resend-verification
POST /auth/forgot-password
POST /auth/reset-password

GET /users/me
PATCH /users/me
GET /users/me/stats
GET /users/me/matches

GET /rankings
GET /matches/:id

POST /training/start
POST /training/:id/finish
```

As partidas online devem utilizar eventos WebSocket semelhantes a:

```text
matchmaking:join
matchmaking:leave
matchmaking:status
match:found
match:ready
match:start
match:input
match:state
match:event
match:round_end
match:end
match:reconnect
match:opponent_disconnected
match:error
```

Documente os contratos de entrada e saída.

---

# 31. Segurança

Implemente obrigatoriamente:

* hash seguro de senhas;
* tokens aleatórios;
* expiração de tokens;
* tokens de uso único;
* rate limiting;
* Helmet ou proteção equivalente;
* CORS restrito;
* validação de payloads;
* sanitização;
* queries parametrizadas ou ORM;
* tratamento centralizado de erros;
* logs sem informações sensíveis;
* autenticação de WebSocket;
* autorização por usuário;
* proteção contra enumeração de contas;
* limite de tamanho das requisições;
* prevenção contra mass assignment;
* invalidação de sessão;
* validação autoritativa do multiplayer.

Nunca armazene:

* senha em texto puro;
* token sensível em texto puro quando um hash for suficiente;
* segredo no frontend;
* credenciais SMTP no repositório.

---

# 32. Arquitetura do projeto

Organize o código em módulos claros.

## Frontend

* autenticação;
* telas públicas;
* telas protegidas;
* menu principal;
* cena 3D;
* personagens;
* arenas;
* animações;
* controles;
* áudio;
* matchmaking;
* estado da partida;
* comunicação WebSocket;
* perfil;
* ranking;
* configurações;
* componentes compartilhados;
* serviços de API;
* tipos;
* validações.

## Backend

* configuração;
* banco de dados;
* autenticação;
* usuários;
* e-mails;
* sessões;
* matchmaking;
* salas;
* partidas;
* bots;
* ranking;
* WebSockets;
* segurança;
* logs;
* métricas;
* testes.

Não coloque toda a aplicação em:

* um único componente React;
* um único arquivo do servidor;
* um único serviço;
* um único controlador;
* um único arquivo de estilos.

---

# 33. Estado da partida

Modele a partida utilizando uma máquina de estados.

Estados sugeridos:

```text
WAITING_FOR_PLAYERS
LOADING
READY_CHECK
COUNTDOWN
ROUND_STARTING
ROUND_ACTIVE
ROUND_ENDING
INTERMISSION
MATCH_ENDING
FINISHED
CANCELLED
```

Toda transição deve ser validada.

Não permita inputs em estados incompatíveis.

---

# 34. Desempenho

O jogo deve funcionar em navegadores modernos sem exigir um computador de alto desempenho.

Implemente:

* carregamento sob demanda;
* compressão de modelos;
* texturas otimizadas;
* limitação de luzes dinâmicas;
* reutilização de materiais;
* object pooling;
* redução de partículas;
* qualidade gráfica configurável;
* limite de pixel ratio;
* suspensão de animações fora de foco;
* descarte correto de geometrias e texturas;
* redução automática de qualidade;
* tela de carregamento real;
* fallback para hardware fraco.

Crie configurações:

* Baixa;
* Média;
* Alta;
* Automática.

Não sacrifique a legibilidade competitiva por efeitos visuais.

---

# 35. Responsividade

A aplicação deve funcionar em:

* desktop;
* notebook;
* tablet;
* celular.

No celular:

* crie controles grandes;
* respeite safe areas;
* evite zoom acidental;
* impeça seleção involuntária de texto;
* use orientação adequada;
* reorganize a HUD;
* reduza efeitos pesados;
* mantenha os dois jogadores visíveis;
* forneça feedback de toque.

Caso a experiência fique significativamente melhor na horizontal, informe claramente e ofereça uma tela solicitando a rotação do dispositivo.

---

# 36. Acessibilidade

Implemente:

* foco visível;
* navegação por teclado nos menus;
* contraste adequado;
* labels em formulários;
* mensagens associadas aos campos;
* suporte básico a leitores de tela fora do canvas;
* opção de reduzir movimento;
* opção de desativar tremores;
* legendas para informações importantes;
* feedback que não dependa exclusivamente de cor;
* remapeamento de controles;
* ajuste de volume;
* tratamento correto de foco em modais.

---

# 37. Tratamento de erros

Crie estados claros para:

* banco indisponível;
* falha no envio de e-mail;
* link expirado;
* login inválido;
* sessão expirada;
* servidor offline;
* WebSocket desconectado;
* matchmaking indisponível;
* adversário desconectado;
* modelo 3D não carregado;
* erro inesperado;
* manutenção.

Não mostre stack traces ou mensagens internas ao usuário.

Registre detalhes técnicos somente no servidor.

---

# 38. Testes obrigatórios

Crie testes para os seguintes cenários.

## Autenticação

* cadastro válido;
* e-mail duplicado;
* username duplicado;
* senha inválida;
* login correto;
* login incorreto;
* refresh token;
* logout;
* sessão revogada;
* rota protegida;
* recuperação de senha.

## Verificação de e-mail

* token válido;
* token expirado;
* token inválido;
* token já utilizado;
* reenvio;
* limite de reenvio;
* bloqueio do multiplayer sem verificação.

## Jogo

* sequência 6 e 7 correta;
* ordem invertida;
* apenas uma tecla;
* spam;
* combo;
* perda de ego;
* evento falso;
* empate;
* morte súbita;
* encerramento da partida.

## Multiplayer

* dois jogadores entrando na fila;
* criação de sala;
* contagem regressiva;
* sincronização;
* pacote duplicado;
* input fora de ordem;
* input impossível;
* desconexão;
* reconexão;
* abandono;
* vitória por desistência;
* encerramento da sala;
* persistência do resultado;
* alteração de MMR.

## Bot

* dificuldades diferentes;
* atraso mínimo;
* erros naturais;
* mudança de estratégia;
* ausência de leitura de ações futuras.

## Interface

* desktop;
* celular;
* navegação por teclado;
* movimento reduzido;
* áudio desativado;
* qualidade gráfica baixa;
* recarregamento da página;
* sessão expirada.

---

# 39. Critérios de conclusão

O projeto somente pode ser considerado concluído quando possuir:

* cadastro real;
* backend próprio;
* banco de dados real;
* configuração pela `.env`;
* hash de senha;
* login;
* logout;
* refresh token;
* recuperação de senha;
* envio real de e-mail;
* verificação de e-mail;
* proteção das rotas;
* menu principal 3D;
* personagem 3D;
* arena 3D;
* animação Six Seven;
* sistema de aura;
* sistema de ego;
* combos;
* eventos;
* detecção de spam;
* modo Treino;
* bots funcionais;
* níveis de dificuldade;
* tutorial;
* 1v1 entre jogadores reais;
* matchmaking;
* WebSocket;
* servidor autoritativo;
* sincronização;
* reconexão;
* ranking;
* MMR;
* histórico de partidas;
* resultado persistido;
* interface responsiva;
* acessibilidade básica;
* tratamento de erros;
* testes principais;
* migrations;
* `.env.example`;
* documentação de instalação;
* build de produção funcionando.

---

# 40. Ordem de implementação

Siga esta ordem:

1. Analise a estrutura atual do repositório.
2. Documente a arquitetura encontrada.
3. Configure frontend e backend.
4. Configure banco e migrations.
5. Implemente cadastro e login.
6. Implemente verificação de e-mail.
7. Implemente recuperação de senha.
8. Crie as rotas protegidas.
9. Crie o menu principal.
10. Implemente a cena 3D básica.
11. Implemente personagens e animações.
12. Implemente a mecânica Six Seven.
13. Implemente aura, ego e combos.
14. Implemente eventos.
15. Implemente o modo Treino.
16. Implemente os bots.
17. Implemente WebSocket.
18. Implemente salas e servidor autoritativo.
19. Implemente matchmaking.
20. Implemente reconexão.
21. Implemente ranking e MMR.
22. Finalize a identidade visual.
23. Otimize desempenho.
24. Execute testes.
25. Corrija erros de TypeScript, lint, console e build.
26. Documente a execução local e em produção.

Não tente implementar tudo em um único arquivo ou em uma única etapa sem validação.

---

# 41. Entrega final do Codex

Ao concluir, apresente:

* resumo do que foi implementado;
* arquitetura utilizada;
* estrutura das pastas;
* tecnologias escolhidas;
* migrations criadas;
* variáveis necessárias na `.env`;
* instruções para configurar PostgreSQL;
* instruções para configurar SMTP;
* instruções para executar frontend e backend;
* instruções para rodar testes;
* instruções para gerar o build;
* limitações conhecidas;
* próximos passos recomendados.

Também execute e informe o resultado dos comandos equivalentes a:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Caso frontend e backend possuam projetos separados, execute os comandos em ambos.

Não afirme que uma funcionalidade está concluída sem testá-la.

---

# Objetivo final

O resultado deve ser um jogo 3D competitivo para navegador com identidade própria, chamado **Aura & Ego**, no qual usuários criam uma conta, verificam o e-mail, entram no menu principal e escolhem entre:

* treinar contra bots;
* disputar partidas 1v1 em tempo real contra jogadores reais.

O jogo deve transformar Six Seven e aura farming em uma mecânica competitiva real, baseada em timing, estratégia, blefe, ritmo, leitura do adversário, gerenciamento de ego e domínio de aura.

Não simplifique o projeto para:

* contador de cliques;
* animação sem gameplay;
* jogo offline fingindo ser multiplayer;
* adversário aleatório apresentado como jogador real;
* formulário sem backend;
* e-mail de verificação simulado;
* cenário 3D vazio;
* template futurista genérico.

Priorize, nesta ordem:

1. funcionamento real;
2. segurança;
3. qualidade do multiplayer;
4. resposta dos controles;
5. jogabilidade;
6. clareza competitiva;
7. personalidade visual;
8. animações;
9. desempenho;
10. responsividade.
