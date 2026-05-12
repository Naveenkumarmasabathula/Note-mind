import { describe, expect, it } from "vitest";
import {
  asObject,
  parseBoolean,
  parseDifficulty,
  parseInteger,
  parseJsonArray,
  parseOptionalString,
  parseRequiredString,
  parseUuidOrNull,
} from "@/lib/validation";

// ─── asObject ───────────────────────────────────────────────────────────────

describe("asObject", () => {
  it("returns the object when given a plain object", () => {
    expect(asObject({ a: 1 })).toEqual({ a: 1 });
  });

  it("returns null for arrays", () => {
    expect(asObject([1, 2])).toBeNull();
  });

  it("returns null for null", () => {
    expect(asObject(null)).toBeNull();
  });

  it("returns null for primitives", () => {
    expect(asObject("string")).toBeNull();
    expect(asObject(42)).toBeNull();
    expect(asObject(true)).toBeNull();
  });
});

// ─── parseJsonArray ──────────────────────────────────────────────────────────

describe("parseJsonArray", () => {
  it("returns empty array for empty input", () => {
    expect(parseJsonArray([], 10, 50)).toEqual([]);
  });

  it("trims whitespace from items", () => {
    expect(parseJsonArray(["  hello  ", "world"], 10, 50)).toEqual(["hello", "world"]);
  });

  it("returns null when item count exceeds maxItems", () => {
    expect(parseJsonArray(["a", "b", "c"], 2, 50)).toBeNull();
  });

  it("returns null when an item exceeds maxItemLength", () => {
    expect(parseJsonArray(["toolong"], 10, 3)).toBeNull();
  });

  it("returns null for non-array input", () => {
    expect(parseJsonArray("not array", 10, 50)).toBeNull();
    expect(parseJsonArray(null, 10, 50)).toBeNull();
  });

  it("returns null when an item is not a string", () => {
    expect(parseJsonArray([1, 2], 10, 50)).toBeNull();
  });

  it("returns null when an item is empty after trimming", () => {
    expect(parseJsonArray(["   "], 10, 50)).toBeNull();
  });
});

// ─── parseOptionalString ─────────────────────────────────────────────────────

describe("parseOptionalString", () => {
  it("returns null for undefined/null", () => {
    expect(parseOptionalString(undefined, 100)).toBeNull();
    expect(parseOptionalString(null, 100)).toBeNull();
  });

  it("returns trimmed value for a valid string", () => {
    expect(parseOptionalString("  hello  ", 100)).toBe("hello");
  });

  it("returns null for an empty string (default)", () => {
    expect(parseOptionalString("", 100)).toBeNull();
    expect(parseOptionalString("   ", 100)).toBeNull();
  });

  it("returns empty string when allowEmpty is true", () => {
    expect(parseOptionalString("", 100, { allowEmpty: true })).toBe("");
    expect(parseOptionalString("  ", 100, { allowEmpty: true })).toBe("");
  });

  it("returns null when string exceeds maxLength", () => {
    expect(parseOptionalString("hello", 3)).toBeNull();
  });

  it("returns null for non-string types", () => {
    expect(parseOptionalString(42, 100)).toBeNull();
    expect(parseOptionalString(true, 100)).toBeNull();
  });
});

// ─── parseRequiredString ──────────────────────────────────────────────────────

describe("parseRequiredString", () => {
  it("returns trimmed value for a valid string", () => {
    expect(parseRequiredString(" hello ", 100)).toBe("hello");
  });

  it("returns null for empty string", () => {
    expect(parseRequiredString("", 100)).toBeNull();
    expect(parseRequiredString("   ", 100)).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(parseRequiredString(null, 100)).toBeNull();
    expect(parseRequiredString(undefined, 100)).toBeNull();
  });

  it("returns null when string exceeds maxLength", () => {
    expect(parseRequiredString("hello", 3)).toBeNull();
  });
});

// ─── parseDifficulty ─────────────────────────────────────────────────────────

describe("parseDifficulty", () => {
  it("accepts valid difficulty values", () => {
    expect(parseDifficulty("easy")).toBe("easy");
    expect(parseDifficulty("medium")).toBe("medium");
    expect(parseDifficulty("hard")).toBe("hard");
  });

  it("returns null for invalid difficulty", () => {
    expect(parseDifficulty("extreme")).toBeNull();
    expect(parseDifficulty("")).toBeNull();
  });

  it("returns null for non-string types", () => {
    expect(parseDifficulty(1)).toBeNull();
    expect(parseDifficulty(null)).toBeNull();
    expect(parseDifficulty(undefined)).toBeNull();
  });
});

// ─── parseBoolean ─────────────────────────────────────────────────────────────

describe("parseBoolean", () => {
  it("returns true/false for booleans", () => {
    expect(parseBoolean(true)).toBe(true);
    expect(parseBoolean(false)).toBe(false);
  });

  it("returns null for non-booleans", () => {
    expect(parseBoolean(1)).toBeNull();
    expect(parseBoolean("true")).toBeNull();
    expect(parseBoolean(null)).toBeNull();
  });
});

// ─── parseUuidOrNull ──────────────────────────────────────────────────────────

describe("parseUuidOrNull", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("returns a valid UUID as-is", () => {
    expect(parseUuidOrNull(validUuid)).toBe(validUuid);
  });

  it("returns null for explicit null", () => {
    expect(parseUuidOrNull(null)).toBeNull();
  });

  it("returns null for an invalid UUID string", () => {
    expect(parseUuidOrNull("not-a-uuid")).toBeNull();
    expect(parseUuidOrNull("")).toBeNull();
  });

  it("returns null for non-string types", () => {
    expect(parseUuidOrNull(123)).toBeNull();
    expect(parseUuidOrNull(true)).toBeNull();
  });

  it("handles uppercase UUIDs", () => {
    expect(parseUuidOrNull(validUuid.toUpperCase())).toBe(validUuid.toUpperCase());
  });
});

// ─── parseInteger ─────────────────────────────────────────────────────────────

describe("parseInteger", () => {
  it("returns integer within range", () => {
    expect(parseInteger(5, 0, 10)).toBe(5);
    expect(parseInteger(0, 0, 10)).toBe(0);
    expect(parseInteger(10, 0, 10)).toBe(10);
  });

  it("returns null when out of range", () => {
    expect(parseInteger(-1, 0, 10)).toBeNull();
    expect(parseInteger(11, 0, 10)).toBeNull();
  });

  it("returns null for floats", () => {
    expect(parseInteger(1.5, 0, 10)).toBeNull();
  });

  it("returns null for non-numbers", () => {
    expect(parseInteger("5", 0, 10)).toBeNull();
    expect(parseInteger(null, 0, 10)).toBeNull();
  });
});
