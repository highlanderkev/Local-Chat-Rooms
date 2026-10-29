import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateUserBody,
  CreateUserResponse,
  GetUserParams,
  GetUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const COLORS = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c",
  "#3498db", "#9b59b6", "#e91e63", "#00bcd4", "#ff5722",
  "#795548", "#607d8b", "#ff6b6b", "#48dbfb", "#ff9ff3",
];

const ADJECTIVES = ["Swift", "Calm", "Bold", "Bright", "Quiet", "Wild", "Steady", "Keen", "Warm", "Sharp"];
const NOUNS = ["Fox", "Owl", "Finch", "Hawk", "Wren", "Sparrow", "Robin", "Crane", "Heron", "Lark"];

function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${noun}${num}`;
}

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = parsed.data.username?.trim() || generateUsername();
  const color = randomColor();

  const [user] = await db.insert(usersTable).values({ username, color }).returning();
  res.status(201).json(CreateUserResponse.parse(user));
});

router.get("/users/:userId", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetUserResponse.parse(user));
});

export default router;
