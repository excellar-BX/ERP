import { revalidatePath } from "next/cache";

// Shared by the server action files. Lives outside them because a "use server" file may only export actions.

export type FormState = { error?: string; ok?: string };

// Errors meant for the person using the form (as opposed to bugs).
export class UserError extends Error {}

export const refresh = () => revalidatePath("/", "layout");

export function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

export function amount(fd: FormData, key: string, label: string, { allowNegative = false } = {}) {
  const raw = text(fd, key);
  const value = raw === "" ? 0 : Number(raw);
  if (!Number.isFinite(value) || (!allowNegative && value < 0)) throw new UserError(`${label} must be a valid number.`);
  return value;
}

export async function handle(fn: () => Promise<string>): Promise<FormState> {
  try {
    const ok = await fn();
    refresh();
    return { ok };
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    throw error;
  }
}

export function phoneFrom(fd: FormData) {
  const phone = text(fd, "phone");
  const digits = phone.replace(/\D/g, "");
  if (phone && (digits.length < 10 || digits.length > 13)) throw new UserError("Enter a valid phone number (10 digits).");
  return phone || null;
}
