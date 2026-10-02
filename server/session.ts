import crypto from 'crypto';

export const SESSION_COOKIE = 'wt_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set (min 16 chars) in production');
  }
  return 'wonderteam-insecure-dev-secret';
}

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function hmac(payload: string): Buffer {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest();
}

export function signSession(userId: string): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${base64url(Buffer.from(userId))}.${expiresAt}`;
  return `${payload}.${base64url(hmac(payload))}`;
}

export interface SessionUser {
  id: string;
}

export function verifySession(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [userIdB64, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  const expected = hmac(`${userIdB64}.${expiresAtRaw}`);
  const provided = Buffer.from(signature, 'base64');
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  let userId: string;
  try {
    userId = Buffer.from(userIdB64, 'base64').toString('utf8');
  } catch {
    return null;
  }
  if (!userId) return null;

  return { id: userId };
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    // Disabled outside production so the PWA can be tested over a LAN IP
    // (http://192.168.x.x), where Secure cookies are rejected by browsers.
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

/**
 * Reads a userId/role out of the request payload and rejects the request when it
 * contradicts the verified session cookie. Identity is always taken from the
 * cookie; these payload fields are treated as untrusted client hints.
 */
export function identityMismatch(
  req: any,
  session: { id: string; role: string }
): string | null {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const query = req.query && typeof req.query === 'object' ? req.query : {};

  const identityClaims: string[] = [];
  if (typeof body.userId === 'string') identityClaims.push(body.userId);
  if (typeof query.userId === 'string') identityClaims.push(query.userId);
  if (identityClaims.some((id) => id !== session.id)) {
    return 'Request identity does not match the active session';
  }

  // adminId is an administrator self-assertion: it must be the session holder and
  // that holder must genuinely be an admin per the database.
  const adminClaims: string[] = [];
  if (typeof body.adminId === 'string') adminClaims.push(body.adminId);
  if (typeof query.adminId === 'string') adminClaims.push(query.adminId);
  if (adminClaims.length > 0) {
    if (session.role !== 'admin') {
      return 'Administrator privileges cannot be claimed by this session';
    }
    if (adminClaims.some((id) => id !== session.id)) {
      return 'Administrator identity does not match the active session';
    }
  }

  const requestedRole = query.role ?? body.role;
  if (typeof requestedRole === 'string' && requestedRole !== session.role) {
    return 'Requested role does not match the active session';
  }

  return null;
}
