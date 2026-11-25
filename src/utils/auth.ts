/**
 * Client-side Email & Password Authentication (localStorage + Web Crypto SHA-256).
 * Designed for static deployment (GitHub Pages / Netlify) with zero external backend dependency.
 * Passwords are never stored in plaintext; each account uses a unique 16-byte random salt
 * combined with SHA-256 hashing via crypto.subtle.digest('SHA-256').
 */

export interface StoredUserRecord {
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthSession {
  email: string;
  loggedInAt: string;
  uid?: string;
  displayName?: string;
  emailVerified?: boolean;
  provider?: 'firebase' | 'local';
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Empty' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  hint: string;
}

const USERS_KEY = 'meridian_auth_users_v1';
const SESSION_KEY = 'meridian_auth_session_v1';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= 254 && EMAIL_REGEX.test(normalized);
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Empty', hint: 'Use at least 8 characters with letters and numbers.' };
  }

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  if (password.length < 6) {
    return { score: 1, label: 'Weak', hint: 'Password must be at least 6 characters long.' };
  }
  if (points <= 2) {
    return { score: 2, label: 'Fair', hint: 'Add uppercase letters, numbers, or symbols to strengthen.' };
  }
  if (points === 3 || points === 4) {
    return { score: 3, label: 'Good', hint: 'Solid password. Adding a symbol or extra length makes it stronger.' };
  }
  return { score: 4, label: 'Strong', hint: 'Strong operator credential ready for SHA-256 sealing.' };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSaltHex(byteLength = 16): string {
  const arr = new Uint8Array(byteLength);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < byteLength; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(arr);
}

/**
 * Pure TypeScript SHA-256 fallback used ONLY if window.crypto.subtle is unavailable
 * (e.g., plain HTTP non-localhost preview). Primary path always uses Web Crypto API.
 */
function sha256FallbackHex(ascii: string): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const maxWord = Math.pow(2, 32);
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let padded = ascii + '\x80';
  while ((padded.length % 64) - 56) padded += '\x00';

  for (let i = 0; i < padded.length; i++) {
    const j = padded.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export async function sha256Hex(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(message);
    const buffer = await window.crypto.subtle.digest('SHA-256', encoded);
    return bytesToHex(new Uint8Array(buffer));
  }
  return sha256FallbackHex(message);
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function loadUsers(): StoredUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (u): u is StoredUserRecord =>
        Boolean(u) &&
        typeof u.email === 'string' &&
        typeof u.salt === 'string' &&
        typeof u.passwordHash === 'string' &&
        typeof u.createdAt === 'string'
    );
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUserRecord[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // Ignore quota errors cleanly
  }
}

export function getActiveSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.email === 'string' &&
      isValidEmail(parsed.email) &&
      typeof parsed.loggedInAt === 'string'
    ) {
      return {
        email: normalizeEmail(parsed.email),
        loggedInAt: parsed.loggedInAt,
        uid: typeof parsed.uid === 'string' ? parsed.uid : undefined,
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName : undefined,
        emailVerified: typeof parsed.emailVerified === 'boolean' ? parsed.emailVerified : undefined,
        provider: parsed.provider === 'firebase' || parsed.provider === 'local' ? parsed.provider : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getRegisteredAccountCount(): number {
  return loadUsers().length;
}

export async function createAccount(
  rawEmail: string,
  password: string
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string; code?: 'EXISTS' }> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters long.' };
  }

  const users = loadUsers();
  if (users.some((u) => u.email === email)) {
    return {
      ok: false,
      code: 'EXISTS',
      error: 'An operator account with this email already exists. Please sign in instead.',
    };
  }

  const salt = generateSaltHex(16);
  const passwordHash = await sha256Hex(`${salt}:${password}`);
  const nowIso = new Date().toISOString();

  const updated: StoredUserRecord[] = [
    ...users,
    {
      email,
      salt,
      passwordHash,
      createdAt: nowIso,
    },
  ];
  saveUsers(updated);

  const session: AuthSession = { email, loggedInAt: nowIso };
  saveActiveSession(session);
  return { ok: true, session };
}

export async function signInAccount(
  rawEmail: string,
  password: string
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string; code?: 'NOT_FOUND' }> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (!password) {
    return { ok: false, error: 'Please enter your password.' };
  }

  const users = loadUsers();
  const matched = users.find((u) => u.email === email);
  if (!matched) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      error: 'No account found for this email on this browser. Switch to Create Account to register.',
    };
  }

  const candidateHash = await sha256Hex(`${matched.salt}:${password}`);
  if (!constantTimeEquals(candidateHash, matched.passwordHash)) {
    return { ok: false, error: 'Incorrect password. Please check your credentials and try again.' };
  }

  const session: AuthSession = { email, loggedInAt: new Date().toISOString() };
  saveActiveSession(session);
  return { ok: true, session };
}
