// Tiny runtime narrowing helpers so we parse Neon API responses with type
// guards / assertions instead of casting `unknown` to a shape we never checked.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown, ctx: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Expected an object at ${ctx}`);
  }
  return value;
}

export function asArray(value: unknown, ctx: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected an array at ${ctx}`);
  }
  return value;
}

export function asString(value: unknown, ctx: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected a string at ${ctx}`);
  }
  return value;
}

export function optString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function asNumber(value: unknown, ctx: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Expected a number at ${ctx}`);
  }
  return value;
}
