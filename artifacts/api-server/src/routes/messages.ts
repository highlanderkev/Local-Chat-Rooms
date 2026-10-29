import { Router, type IRouter } from "express";
import { db, messagesTable, roomsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import {
  GetRoomMessagesParams,
  GetRoomMessagesQueryParams,
  GetRoomMessagesResponse,
  PostMessageParams,
  PostMessageBody,
  PostMessageResponse,
} from "@workspace/api-zod";
import { broadcast } from "../lib/ws";

const router: IRouter = Router();

// GET /rooms/:roomId/messages
router.get("/rooms/:roomId/messages", async (req, res): Promise<void> => {
  const params = GetRoomMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = GetRoomMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { roomId } = params.data;
  const limit = query.data.limit ?? 50;
  const before = query.data.before;

  const conditions = [eq(messagesTable.roomId, roomId)];
  if (before != null) {
    conditions.push(lt(messagesTable.id, before));
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(and(...conditions))
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit);

  res.json(GetRoomMessagesResponse.parse(messages.reverse()));
});

// POST /rooms/:roomId/messages
router.post("/rooms/:roomId/messages", async (req, res): Promise<void> => {
  const params = PostMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = PostMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { roomId } = params.data;
  const { content, userId } = parsed.data;

  // Verify room exists
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  // Verify user exists
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      roomId,
      userId,
      username: user.username,
      userColor: user.color,
      content,
    })
    .returning();

  // Update room lastActivity
  await db
    .update(roomsTable)
    .set({ lastActivity: new Date() })
    .where(eq(roomsTable.id, roomId));

  const responseMessage = PostMessageResponse.parse(message);

  // Broadcast to all WebSocket clients in this room
  broadcast(roomId, { type: "message", data: responseMessage });

  res.status(201).json(responseMessage);
});

export default router;
