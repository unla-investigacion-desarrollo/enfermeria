/**
 * Rate limit simple en memoria para el MVP.
 * Ventana fija de 15 minutos, 5 intentos fallidos por clave (email + IP).
 * No sirve para múltiples instancias; ver DECISIONS.md.
 */

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_ATTEMPTS = 5;

type Entry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Entry>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function checkRateLimit(
  key: string,
  now: number = Date.now(),
): RateLimitResult {
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    if (entry) attempts.delete(key);
    return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS, retryAfterMs: 0 };
  }

  return {
    allowed: entry.count < LOGIN_MAX_ATTEMPTS,
    remaining: Math.max(0, LOGIN_MAX_ATTEMPTS - entry.count),
    retryAfterMs: entry.resetAt - now,
  };
}

export function registerFailedAttempt(key: string, now: number = Date.now()): void {
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  entry.count += 1;
}

export function resetAttempts(key: string): void {
  attempts.delete(key);
}

/** Solo para tests. */
export function clearAllAttempts(): void {
  attempts.clear();
}
