type CachedKey = {
  key: string;
  expiresAt: number;
};

const PENDING_KEY_TTL_MS = 2 * 60_000;
const SUCCESS_REPLAY_TTL_MS = 60_000;
const keyCache = new Map<string, CachedKey>();

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableNormalize(nestedValue)])
    );
  }

  return value;
}

function fingerprint(operation: string, payload: unknown): string {
  return `${operation}:${JSON.stringify(stableNormalize(payload))}`;
}

function randomKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `dashai-${crypto.randomUUID()}`;
  }

  return `dashai-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function removeExpiredKeys(now: number) {
  keyCache.forEach((entry, cacheKey) => {
    if (entry.expiresAt <= now) {
      keyCache.delete(cacheKey);
    }
  });
}

export function getOrCreateIdempotencyKey(
  operation: string,
  payload: unknown
): string {
  const now = Date.now();
  removeExpiredKeys(now);

  const cacheKey = fingerprint(operation, payload);
  const existing = keyCache.get(cacheKey);

  if (existing && existing.expiresAt > now) {
    return existing.key;
  }

  const key = randomKey();
  keyCache.set(cacheKey, {
    key,
    expiresAt: now + PENDING_KEY_TTL_MS,
  });

  return key;
}

export function retainIdempotencyKey(
  operation: string,
  payload: unknown,
  key: string
) {
  const now = Date.now();
  const cacheKey = fingerprint(operation, payload);
  const existing = keyCache.get(cacheKey);

  if (existing && existing.key !== key) {
    return;
  }

  keyCache.set(cacheKey, {
    key,
    expiresAt: now + SUCCESS_REPLAY_TTL_MS,
  });
}

export function clearIdempotencyKey(
  operation: string,
  payload: unknown,
  key?: string
) {
  const cacheKey = fingerprint(operation, payload);
  const existing = keyCache.get(cacheKey);

  if (!existing) return;
  if (key && existing.key !== key) return;

  keyCache.delete(cacheKey);
}

export function idempotencyHeaders(
  operation: string,
  payload: unknown
): {
  key: string;
  headers: Record<string, string>;
} {
  const key = getOrCreateIdempotencyKey(operation, payload);

  return {
    key,
    headers: {
      "Idempotency-Key": key,
    },
  };
}
