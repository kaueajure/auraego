# Contratos da API

Todas as respostas de erro usam:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Confira os campos informados.", "fields": {} } }
```

## HTTP

| Método e rota | Autenticação | Entrada | Saída principal |
|---|---|---|---|
| `POST /auth/register` | não | `username,email,password,confirmPassword` | `201 {message}` |
| `POST /auth/login` | não | `email,password` | `{accessToken,user}` + cookie refresh |
| `POST /auth/refresh` | cookie | — | novo `{accessToken,user}` + cookie rotacionado |
| `POST /auth/logout` | cookie | — | `204`, sessão revogada |
| `POST /auth/verify-email` | não | `token` | `{message}` |
| `POST /auth/resend-verification` | não | `email` | resposta neutra |
| `POST /auth/forgot-password` | não | `email` | resposta neutra |
| `POST /auth/reset-password` | não | `token,password` | `{message}`, sessões revogadas |
| `GET /users/me` | Bearer | — | usuário e perfil |
| `PATCH /users/me` | Bearer | preferências permitidas | perfil |
| `GET /users/me/matches` | Bearer | — | últimos 20 resultados |
| `GET /users/rankings` | Bearer | — | top 100 por MMR |
| `POST /training/start` | Bearer/verificado | `difficulty` | instrução de transporte WebSocket |

Campos desconhecidos no update do perfil são rejeitados. Senha e hashes nunca são serializados.

Todos os dados persistentes são armazenados no MySQL 8 por queries parametrizadas. Nenhum valor fornecido pelo cliente é interpolado diretamente em SQL.

## WebSocket

Handshake:

```json
{ "auth": { "token": "ACCESS_JWT", "region": "sa-east" } }
```

Cliente → servidor:

- `matchmaking:join`, `matchmaking:leave`
- `training:start {difficulty}`
- `match:ready`
- `match:input {input:"SIX"|"SEVEN",clientTimestamp,sequence}`
- `match:reconnect`
- `match:leave`
- `ping:measure(sentAt, ack)`
- `latency:report(roundTripMs)`

Servidor → cliente:

- `clock:sync {serverTime}`
- `matchmaking:status {status,joinedAt,range}`
- `match:found {roomId,players,seed,training?,difficulty?}`
- `match:start {roomId,serverTime,state}`
- `match:event {event,serverTime,suddenDeath?}`
- `match:action {playerId,result,serverTime}`
- `match:state {roomId,serverTime,state,connection}`
- `match:round_end {round,winnerId,state}`
- `match:opponent_disconnected {playerId,reconnectUntil}`
- `match:reconnect {playerId,state}`
- `match:end {winnerId,reason,state,mmrChanges?}`
- `match:error {code,message}`

`sequence` é inteiro estritamente crescente por jogador. `clientTimestamp` só serve para compensação limitada e nunca substitui o relógio do servidor.
