import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { logger } from "./logger";

// Map from roomId → Set of connected clients
const roomClients = new Map<number, Set<WebSocket>>();

export function broadcast(roomId: number, payload: unknown): void {
  const clients = roomClients.get(roomId);
  if (!clients) return;
  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    let currentRoomId: number | null = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "join" && typeof msg.roomId === "number") {
          // Leave previous room if any
          if (currentRoomId !== null) {
            roomClients.get(currentRoomId)?.delete(ws);
          }

          const roomId = msg.roomId as number;
          currentRoomId = roomId;

          if (!roomClients.has(roomId)) {
            roomClients.set(roomId, new Set());
          }
          roomClients.get(roomId)!.add(ws);

          logger.info({ roomId: currentRoomId }, "WS client joined room");
          ws.send(JSON.stringify({ type: "joined", roomId: currentRoomId }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      if (currentRoomId !== null) {
        roomClients.get(currentRoomId)?.delete(ws);
      }
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "WS client error");
    });
  });

  logger.info("WebSocket server attached at /ws");
  return wss;
}
