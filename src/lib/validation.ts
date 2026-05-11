import type { Difficulty } from "@/lib/types";

const DIFFICULTY_VALUES = new Set<Difficulty>(["easy", "medium", "hard"]);

export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseJsonArray(value: unknown, maxItems: number, maxItemLength: number): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > maxItems) return null;
  const output: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > maxItemLength) return null;
    output.push(trimmed);
  }
  return output;
}

export function parseOptionalString(
  value: unknown,
  maxLength: number,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!allowEmpty && !trimmed) return null;
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

export function parseRequiredString(value: unknown, maxLength: number): string | null {
  const parsed = parseOptionalString(value, maxLength);
  return parsed && parsed.length > 0 ? parsed : null;
}

export function parseDifficulty(value: unknown): Difficulty | null {
  if (typeof value !== "string") return null;
  return DIFFICULTY_VALUES.has(value as Difficulty) ? (value as Difficulty) : null;
}

export function parseBoolean(value: unknown): boolean | null {
  if (typeof value !== "boolean") return null;
  return value;
}

export function parseUuidOrNull(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : null;
}

export function parseInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}
