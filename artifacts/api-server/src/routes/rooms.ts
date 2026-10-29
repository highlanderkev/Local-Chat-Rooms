import { Router, type IRouter } from "express";
import { db, roomsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and, sql, desc, count, max } from "drizzle-orm";
import {
  ListRoomsQueryParams,
  ListRoomsResponse,
  CreateRoomBody,
  CreateRoomResponse,
  GetTrendingRoomsQueryParams,
  GetTrendingRoomsResponse,
  GetRoomParams,
  GetRoomResponse,
  GetRoomStatsParams,
  GetRoomStatsResponse,
  GetRoomActivityParams,
  GetRoomActivityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Haversine distance in km between two lat/lng points
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /rooms?lat=&lng=&radiusKm=
router.get("/rooms", async (req, res): Promise<void> => {
  const params = ListRoomsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { lat, lng, radiusKm } = params.data;
  const radius = radiusKm ?? 5;

  const rooms = await db.select().from(roomsTable);

  const messageCounts = await db
    .select({ roomId: messagesTable.roomId, count: count() })
    .from(messagesTable)
    .groupBy(messagesTable.roomId);

  const countMap = new Map(messageCounts.map((r) => [r.roomId, r.count]));

  const memberCounts = await db
    .select({ roomId: messagesTable.roomId, memberCount: sql<number>`count(distinct ${messagesTable.userId})` })
    .from(messagesTable)
    .groupBy(messagesTable.roomId);
  const memberMap = new Map(memberCounts.map((r) => [r.roomId, Number(r.memberCount)]));

  const nearby = rooms
    .map((room) => {
      const distanceKm = haversineKm(lat, lng, room.lat, room.lng);
      return {
        ...room,
        distanceKm,
        messageCount: countMap.get(room.id) ?? 0,
        memberCount: memberMap.get(room.id) ?? 0,
      };
    })
    .filter((room) => room.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(ListRoomsResponse.parse(nearby));
});

// GET /rooms/trending
router.get("/rooms/trending", async (req, res): Promise<void> => {
  const params = GetTrendingRoomsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { lat, lng, radiusKm, limit } = params.data;
  const radius = radiusKm ?? 20;
  const limitNum = limit ?? 10;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rooms = await db.select().from(roomsTable);

  const recentActivity = await db
    .select({
      roomId: messagesTable.roomId,
      recentMessages: sql<number>`count(*) filter (where ${messagesTable.createdAt} > ${oneDayAgo})`,
    })
    .from(messagesTable)
    .groupBy(messagesTable.roomId);

  const activityMap = new Map(recentActivity.map((r) => [r.roomId, Number(r.recentMessages)]));

  const allCounts = await db
    .select({ roomId: messagesTable.roomId, count: count() })
    .from(messagesTable)
    .groupBy(messagesTable.roomId);
  const countMap = new Map(allCounts.map((r) => [r.roomId, r.count]));

  const memberCounts = await db
    .select({ roomId: messagesTable.roomId, memberCount: sql<number>`count(distinct ${messagesTable.userId})` })
    .from(messagesTable)
    .groupBy(messagesTable.roomId);
  const memberMap = new Map(memberCounts.map((r) => [r.roomId, Number(r.memberCount)]));

  const result = rooms
    .map((room) => {
      const distanceKm = haversineKm(lat, lng, room.lat, room.lng);
      return {
        ...room,
        distanceKm,
        messageCount: countMap.get(room.id) ?? 0,
        memberCount: memberMap.get(room.id) ?? 0,
        _recentActivity: activityMap.get(room.id) ?? 0,
      };
    })
    .filter((room) => room.distanceKm <= radius)
    .sort((a, b) => b._recentActivity - a._recentActivity)
    .slice(0, limitNum);

  res.json(GetTrendingRoomsResponse.parse(result));
});

// GET /rooms/:roomId
router.get("/rooms/:roomId", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.roomId));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const [msgCount] = await db
    .select({ count: count() })
    .from(messagesTable)
    .where(eq(messagesTable.roomId, room.id));

  const [memberCount] = await db
    .select({ count: sql<number>`count(distinct ${messagesTable.userId})` })
    .from(messagesTable)
    .where(eq(messagesTable.roomId, room.id));

  res.json(
    GetRoomResponse.parse({
      ...room,
      messageCount: msgCount?.count ?? 0,
      memberCount: Number(memberCount?.count ?? 0),
      distanceKm: null,
    }),
  );
});

// GET /rooms/:roomId/stats
router.get("/rooms/:roomId/stats", async (req, res): Promise<void> => {
  const params = GetRoomStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.roomId));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [msgCount] = await db
    .select({ count: count() })
    .from(messagesTable)
    .where(eq(messagesTable.roomId, room.id));

  const [memberCount] = await db
    .select({ count: sql<number>`count(distinct ${messagesTable.userId})` })
    .from(messagesTable)
    .where(eq(messagesTable.roomId, room.id));

  const [activeUsers] = await db
    .select({ count: sql<number>`count(distinct ${messagesTable.userId})` })
    .from(messagesTable)
    .where(and(eq(messagesTable.roomId, room.id), sql`${messagesTable.createdAt} > ${oneDayAgo}`));

  const [recentMsgs] = await db
    .select({ count: count() })
    .from(messagesTable)
    .where(and(eq(messagesTable.roomId, room.id), sql`${messagesTable.createdAt} > ${oneDayAgo}`));

  const [lastMsg] = await db
    .select({ createdAt: max(messagesTable.createdAt) })
    .from(messagesTable)
    .where(eq(messagesTable.roomId, room.id));

  res.json(
    GetRoomStatsResponse.parse({
      roomId: room.id,
      messageCount: msgCount?.count ?? 0,
      memberCount: Number(memberCount?.count ?? 0),
      activeUsersLast24h: Number(activeUsers?.count ?? 0),
      messagesLast24h: recentMsgs?.count ?? 0,
      lastActivity: lastMsg?.createdAt ?? null,
    }),
  );
});

// GET /rooms/:roomId/activity
router.get("/rooms/:roomId/activity", async (req, res): Promise<void> => {
  const params = GetRoomActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.roomId));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentMessages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.roomId, room.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(10);

  const activeUserIds = await db
    .selectDistinct({ userId: messagesTable.userId })
    .from(messagesTable)
    .where(and(eq(messagesTable.roomId, room.id), sql`${messagesTable.createdAt} > ${oneHourAgo}`));

  const activeUsers = activeUserIds.length > 0
    ? await db.select().from(usersTable).where(
        sql`${usersTable.id} = ANY(ARRAY[${sql.join(activeUserIds.map((r) => sql`${r.userId}`), sql`, `)}]::int[])`,
      )
    : [];

  const [msgCount] = await db
    .select({ count: count() })
    .from(messagesTable)
    .where(and(eq(messagesTable.roomId, room.id), sql`${messagesTable.createdAt} > ${oneHourAgo}`));

  res.json(
    GetRoomActivityResponse.parse({
      roomId: room.id,
      recentMessages: recentMessages.reverse(),
      activeUsers,
      messagesLast1h: msgCount?.count ?? 0,
    }),
  );
});

// POST /rooms
router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, description, lat, lng, radiusKm } = parsed.data;

  const [room] = await db
    .insert(roomsTable)
    .values({ name, description: description ?? null, lat, lng, radiusKm: radiusKm ?? 5 })
    .returning();

  res.status(201).json(
    CreateRoomResponse.parse({
      ...room,
      messageCount: 0,
      memberCount: 0,
      distanceKm: null,
    }),
  );
});

export default router;
