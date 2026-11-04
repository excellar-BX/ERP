"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { FormState } from "./actions";
import { createSession, deleteSession, hashPassword, requireOwner, verifyPassword } from "./auth";
import { get, run } from "./db";

const MIN_PASSWORD = 8;

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

const normalizeUsername = (value: string) => value.trim().toLowerCase();

function validateNewUser(fd: FormData) {
  const name = text(fd, "name");
  const username = normalizeUsername(text(fd, "username"));
  const password = String(fd.get("password") ?? "");
  if (!name) return { error: "Name is required." };
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return { error: "Username must be 3–32 characters: letters, numbers, dots, dashes or underscores." };
  }
  if (password.length < MIN_PASSWORD) return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  return { name, username, password };
}

// Only allow redirects back into this app (never to another site).
function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

// Compared against when the username doesn't exist, so a wrong username takes as long as a wrong password.
let dummyHash: Promise<string> | undefined;

// Password guessing limits, per 15 minutes: 5 wrong tries on one username, or 20 from one network.
const LOCKOUT_MINUTES = 15;
const MAX_PER_USERNAME = 5;
const MAX_PER_IP = 20;

async function clientIp() {
  // On Vercel the first x-forwarded-for entry is the real client address.
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0].trim() || "unknown";
}

async function isLockedOut(username: string, ip: string) {
  const counts = await get<{ by_user: number; by_ip: number }>(
    `SELECT count(*) FILTER (WHERE username = ?)::int AS by_user,
            count(*) FILTER (WHERE ip = ?)::int AS by_ip
     FROM login_failures WHERE created_at > now() - make_interval(mins => ?)`,
    username,
    ip,
    LOCKOUT_MINUTES,
  );
  return (counts?.by_user ?? 0) >= MAX_PER_USERNAME || (counts?.by_ip ?? 0) >= MAX_PER_IP;
}

async function recordFailure(username: string, ip: string) {
  await run("DELETE FROM login_failures WHERE created_at < now() - interval '1 day'");
  await run("INSERT INTO login_failures (username, ip) VALUES (?, ?)", username, ip);
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const username = normalizeUsername(text(fd, "username"));
  const password = String(fd.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password." };

  const ip = await clientIp();
  if (await isLockedOut(username, ip)) {
    return { error: `Too many wrong attempts. Try again in ${LOCKOUT_MINUTES} minutes.` };
  }

  const user = await get<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE username = ? AND active",
    username,
  );
  dummyHash ??= hashPassword("timing-placeholder");
  const valid = await verifyPassword(password, user?.password_hash ?? (await dummyHash));
  if (!user || !valid) {
    await recordFailure(username, ip);
    return { error: "Wrong username or password." };
  }

  await run("DELETE FROM login_failures WHERE username = ?", username);
  await createSession(user.id);
  redirect(safeNext(text(fd, "next")));
}

// First run only: creates the owner account when no users exist yet.
export async function setupOwner(_: FormState, fd: FormData): Promise<FormState> {
  const input = validateNewUser(fd);
  if ("error" in input) return input;
  if (String(fd.get("password")) !== String(fd.get("confirm"))) return { error: "Passwords don't match." };

  // The WHERE NOT EXISTS makes this safe even if two people submit the setup form at once.
  const { id } = await run(
    `INSERT INTO users (name, username, password_hash, role)
     SELECT ?, ?, ?, 'owner' WHERE NOT EXISTS (SELECT 1 FROM users)
     RETURNING id`,
    input.name,
    input.username,
    await hashPassword(input.password),
  );
  if (!id) return { error: "An owner account already exists. Please log in." };

  await createSession(id);
  redirect("/settings");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

// ---------- User management (owner only) ----------

export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  await requireOwner();
  const input = validateNewUser(fd);
  if ("error" in input) return input;
  const role = text(fd, "role") === "owner" ? "owner" : "staff";
  const { id } = await run(
    `INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)
     ON CONFLICT (username) DO NOTHING RETURNING id`,
    input.name,
    input.username,
    await hashPassword(input.password),
    role,
  );
  if (!id) return { error: `The username "${input.username}" is already taken.` };
  revalidatePath("/settings");
  return { ok: `Added ${input.name}. They can log in as "${input.username}".` };
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  await requireOwner();
  const password = String(fd.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  const userId = Number(fd.get("id"));
  await run("UPDATE users SET password_hash = ? WHERE id = ?", await hashPassword(password), userId);
  await run("DELETE FROM sessions WHERE user_id = ?", userId); // log them out everywhere
  return { ok: "Password changed." };
}

export async function removeUser(fd: FormData) {
  const owner = await requireOwner();
  const userId = Number(fd.get("id"));
  if (userId !== owner.id) {
    await run("UPDATE users SET active = FALSE WHERE id = ?", userId);
    await run("DELETE FROM sessions WHERE user_id = ?", userId);
  }
  revalidatePath("/settings");
}
