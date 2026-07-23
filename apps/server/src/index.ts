import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { env } from "./config.js";
import { attachRealtime } from "./realtime.js";
import { prisma } from "./db.js";

const http = createServer(app);
const io = new Server(http, { cors: { origin: env.SOCKET_CORS_ORIGIN, credentials: true }, transports: ["websocket", "polling"], maxHttpBufferSize: 32_000, pingInterval: 10_000, pingTimeout: 7_000 });
attachRealtime(io);
http.listen(env.PORT, () => console.log(`Aura & Ego server listening on :${env.PORT}`));
const shutdown = async () => { io.close(); http.close(); await prisma.$disconnect(); process.exit(0); };
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
