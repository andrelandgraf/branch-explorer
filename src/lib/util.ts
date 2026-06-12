export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) {
    throw new Error('pick() called with an empty array');
  }
  return item;
}

export function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}
