import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";
let socket: Socket | null = null;
export const gameSocket = () => {
  if (!socket) socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { auth: { token: getToken(), region: "sa-east" }, autoConnect: false, reconnection: true, reconnectionDelay: 700, reconnectionAttempts: 20 });
  socket.auth = { token: getToken(), region: "sa-east" };
  return socket;
};
