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

export function extensionOf(key: string): string {
  const base = key.split('/').pop() ?? key;
  const dot = base.lastIndexOf('.');
  return dot === -1 ? '' : base.slice(dot + 1).toLowerCase();
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json',
  csv: 'text/csv',
};

export function contentTypeForKey(key: string): string {
  return CONTENT_TYPES[extensionOf(key)] ?? 'application/octet-stream';
}

export function isImageKey(key: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extensionOf(key));
}
