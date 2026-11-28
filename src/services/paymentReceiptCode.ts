import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export const RECEIPT_CODE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
export const WHATSAPP_PAYMENT_PHONE = '94784374948';
export const RECEIPT_CODE_REGEX = /^NWC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/;

// Unambiguous 32-character alphabet (omits 0/O and 1/I so users never mistype on payment slips)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type ReceiptCodeStatus = 'generated' | 'submitted' | 'used' | 'expired';

export interface FirestorePaymentReceiptCode {
  code: string;
  uid: string;
  email: string;
  phone: string;
  countryName: string;
  countryCode: string;
  currencyCode: string;
  localTotalDisplay: string;
  windowIndex: number;
  windowExpiresAt: number;
  status: ReceiptCodeStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  submittedAt?: Timestamp | null;
}

export interface ReceiptWindowInfo {
  windowIndex: number;
  windowStartsAt: number;
  windowExpiresAt: number;
  remainingMs: number;
  formattedCountdown: string;
}

export function getReceiptWindowInfo(nowMs: number = Date.now()): ReceiptWindowInfo {
  const windowIndex = Math.floor(nowMs / RECEIPT_CODE_WINDOW_MS);
  const windowStartsAt = windowIndex * RECEIPT_CODE_WINDOW_MS;
  const windowExpiresAt = (windowIndex + 1) * RECEIPT_CODE_WINDOW_MS;
  const remainingMs = Math.max(0, windowExpiresAt - nowMs);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    windowIndex,
    windowStartsAt,
    windowExpiresAt,
    remainingMs,
    formattedCountdown,
  };
}

function getOrCreateUserReceiptSalt(actorKey: string): string {
  const storageKey = `nwc_receipt_salt_v1_${actorKey.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)}`;
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing && existing.length >= 16) {
      return existing;
    }
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(storageKey, hex);
    return hex;
  } catch {
    // Fallback ephemeral salt if localStorage is restricted
    return `${actorKey.slice(0, 12)}-${Date.now().toString(36)}`;
  }
}

function getOrCreateGuestActorKey(): string {
  const key = 'nwc_guest_receipt_actor_v1';
  try {
    const existing = localStorage.getItem(key);
    if (existing && existing.length >= 12) return existing;
    const bytes = new Uint8Array(12);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    const created = `guest_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
    localStorage.setItem(key, created);
    return created;
  } catch {
    return `guest_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function fallbackDeterministicBytes(input: string, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  let state = (h1 ^ h2) >>> 0;
  for (let i = 0; i < length; i += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    out[i] = (state >>> 0) & 0xff;
  }
  return out;
}

/**
 * Generates a cryptographically hashed, per-user unique receipt code that rotates every 30 minutes.
 * Format: NWC-XXXX-XXXX-XX (10 chars from 32-char unambiguous alphabet = 50 bits of entropy).
 */
export async function generateRotatingReceiptCode(params: {
  uid: string | null | undefined;
  email?: string | null;
  windowIndex: number;
  nonce?: number;
}): Promise<string> {
  const actorKey =
    params.uid && params.uid.trim().length > 0
      ? params.uid.trim()
      : getOrCreateGuestActorKey();
  const normalizedEmail = (params.email || '').trim().toLowerCase();
  const salt = getOrCreateUserReceiptSalt(actorKey);
  const nonce = params.nonce ?? 0;

  const material = `NWC-PRO-RECEIPT-V1|${actorKey}|${normalizedEmail}|${params.windowIndex}|${salt}|${nonce}`;

  let hashBytes: Uint8Array;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const encoded = new TextEncoder().encode(material);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      hashBytes = new Uint8Array(digest);
    } else {
      hashBytes = fallbackDeterministicBytes(material, 16);
    }
  } catch {
    hashBytes = fallbackDeterministicBytes(material, 16);
  }

  let chars = '';
  for (let i = 0; i < 10; i += 1) {
    const idx = hashBytes[i] % CODE_ALPHABET.length;
    chars += CODE_ALPHABET[idx];
  }

  return `NWC-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 10)}`;
}

export function sanitizeOptionalPhone(raw: string): string {
  return raw.replace(/[^\d+\-()\s]/g, '').trim().slice(0, 30);
}

export interface RecordReceiptCodeParams {
  code: string;
  uid: string;
  email: string;
  phone?: string;
  countryName: string;
  countryCode: string;
  currencyCode: string;
  localTotalDisplay: string;
  windowIndex: number;
  windowExpiresAt: number;
}

/**
 * Records a newly generated 30-minute receipt code in Firestore at paymentReceiptCodes/{code}.
 * Returns alreadyUsed=true if the code was already marked used/expired or belongs to another user,
 * so the caller can rotate with a fresh nonce immediately.
 */
export async function recordGeneratedReceiptCode(
  params: RecordReceiptCodeParams
): Promise<{ status: ReceiptCodeStatus | 'collision'; alreadyUsed: boolean }> {
  if (!db || !params.uid || !RECEIPT_CODE_REGEX.test(params.code)) {
    return { status: 'generated', alreadyUsed: false };
  }

  const codeRef = doc(db, 'paymentReceiptCodes', params.code);
  const path = `paymentReceiptCodes/${params.code}`;

  try {
    const existingSnap = await getDoc(codeRef);
    if (existingSnap.exists()) {
      const existing = existingSnap.data() as Partial<FirestorePaymentReceiptCode>;
      const status: ReceiptCodeStatus =
        existing.status === 'submitted' ||
        existing.status === 'used' ||
        existing.status === 'expired'
          ? existing.status
          : 'generated';
      const alreadyUsed = status === 'used' || status === 'expired';
      return { status, alreadyUsed };
    }
  } catch (err) {
    // If another user owns this code document, getDoc throws permission-denied -> rotate code
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('permission')) {
      return { status: 'collision', alreadyUsed: true };
    }
    throw err;
  }

  try {
    await setDoc(codeRef, {
      code: params.code,
      uid: params.uid.trim(),
      email: params.email.trim().toLowerCase().slice(0, 254),
      phone: sanitizeOptionalPhone(params.phone || ''),
      countryName: (params.countryName || 'Sri Lanka').trim().slice(0, 80),
      countryCode: (params.countryCode || 'LK').trim().toUpperCase().slice(0, 4),
      currencyCode: (params.currencyCode || 'LKR').trim().toUpperCase().slice(0, 6),
      localTotalDisplay: (params.localTotalDisplay || 'LKR 500').trim().slice(0, 60),
      windowIndex: params.windowIndex,
      windowExpiresAt: params.windowExpiresAt,
      status: 'generated' as ReceiptCodeStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      submittedAt: null,
    });
    return { status: 'generated', alreadyUsed: false };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Records/updates the receipt code in Firestore as 'submitted' when the user clicks the WhatsApp CTA,
 * capturing the optional phone number and current localized pricing for verification & anti-reuse.
 */
export async function markReceiptCodeSubmitted(
  params: RecordReceiptCodeParams
): Promise<ReceiptCodeStatus> {
  if (!db || !params.uid || !RECEIPT_CODE_REGEX.test(params.code)) {
    return 'submitted';
  }

  const codeRef = doc(db, 'paymentReceiptCodes', params.code);
  const path = `paymentReceiptCodes/${params.code}`;
  const cleanPhone = sanitizeOptionalPhone(params.phone || '');
  const cleanCountryName = (params.countryName || 'Sri Lanka').trim().slice(0, 80);
  const cleanCountryCode = (params.countryCode || 'LK').trim().toUpperCase().slice(0, 4);
  const cleanCurrencyCode = (params.currencyCode || 'LKR').trim().toUpperCase().slice(0, 6);
  const cleanLocalTotal = (params.localTotalDisplay || 'LKR 500').trim().slice(0, 60);

  let existingSnap;
  try {
    existingSnap = await getDoc(codeRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!existingSnap.exists()) {
    try {
      await setDoc(codeRef, {
        code: params.code,
        uid: params.uid.trim(),
        email: params.email.trim().toLowerCase().slice(0, 254),
        phone: cleanPhone,
        countryName: cleanCountryName,
        countryCode: cleanCountryCode,
        currencyCode: cleanCurrencyCode,
        localTotalDisplay: cleanLocalTotal,
        windowIndex: params.windowIndex,
        windowExpiresAt: params.windowExpiresAt,
        status: 'submitted' as ReceiptCodeStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
      });
      return 'submitted';
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  const existingData = existingSnap.data() as Partial<FirestorePaymentReceiptCode>;
  if (existingData.status === 'used' || existingData.status === 'expired') {
    return existingData.status;
  }

  try {
    await setDoc(
      codeRef,
      {
        phone: cleanPhone,
        countryName: cleanCountryName,
        countryCode: cleanCountryCode,
        currencyCode: cleanCurrencyCode,
        localTotalDisplay: cleanLocalTotal,
        status: 'submitted' as ReceiptCodeStatus,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return 'submitted';
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToAllReceiptCodes(
  onCodes: (codes: FirestorePaymentReceiptCode[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  const colRef = collection(db, 'paymentReceiptCodes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FirestorePaymentReceiptCode[] = snapshot.docs.map((d) => {
        const raw = d.data() as Partial<FirestorePaymentReceiptCode>;
        return {
          code: raw.code || d.id,
          uid: raw.uid || '',
          email: raw.email || '',
          phone: raw.phone || '',
          countryName: raw.countryName || 'Unknown',
          countryCode: raw.countryCode || '--',
          currencyCode: raw.currencyCode || 'LKR',
          localTotalDisplay: raw.localTotalDisplay || 'LKR 500',
          windowIndex: typeof raw.windowIndex === 'number' ? raw.windowIndex : 0,
          windowExpiresAt: typeof raw.windowExpiresAt === 'number' ? raw.windowExpiresAt : 0,
          status:
            raw.status === 'submitted' || raw.status === 'used' || raw.status === 'expired'
              ? raw.status
              : 'generated',
          createdAt: raw.createdAt ?? null,
          updatedAt: raw.updatedAt ?? null,
          submittedAt: raw.submittedAt ?? null,
        };
      });
      items.sort((a, b) => {
        const aMs = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? a.windowExpiresAt ?? 0;
        const bMs = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? b.windowExpiresAt ?? 0;
        return bMs - aMs;
      });
      onCodes(items);
    },
    (error) => {
      console.error('Firestore paymentReceiptCodes snapshot error:', error);
      onError?.(error);
    }
  );
}

export async function adminUpdateReceiptCodeStatus(
  codeId: string,
  status: ReceiptCodeStatus
): Promise<void> {
  if (!db || !RECEIPT_CODE_REGEX.test(codeId)) return;
  const path = `paymentReceiptCodes/${codeId}`;
  try {
    await setDoc(
      doc(db, 'paymentReceiptCodes', codeId),
      {
        status,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export interface WhatsAppPaymentMessageParams {
  countryName: string;
  countryCode: string;
  currencyCode: string;
  localTotalDisplay: string;
  email: string;
  phone?: string;
  receiptCode: string;
}

export function buildWhatsAppPaymentMessage(params: WhatsAppPaymentMessageParams): string {
  const cleanPhone = sanitizeOptionalPhone(params.phone || '');
  const phoneDisplay = cleanPhone.length > 0 ? cleanPhone : 'Not provided';
  const emailDisplay = params.email.trim() || 'Not provided';

  return [
    'Hello Neon World Clock Team,',
    '',
    'I would like to upgrade to Neon Pro (30 Days):',
    `• Country: ${params.countryName} (${params.countryCode})`,
    `• Local Currency Total: ${params.localTotalDisplay} (${params.currencyCode})`,
    `• Account Email: ${emailDisplay}`,
    `• Phone Number: ${phoneDisplay}`,
    `• Active 30-Min Unique Receipt Code: ${params.receiptCode}`,
    '',
    `Note: I will include this exact unique code (${params.receiptCode}) on my payment receipt / transfer reference for verification.`,
  ].join('\n');
}

export function buildWhatsAppPaymentUrl(params: WhatsAppPaymentMessageParams): string {
  const text = buildWhatsAppPaymentMessage(params);
  return `https://wa.me/${WHATSAPP_PAYMENT_PHONE}?text=${encodeURIComponent(text)}`;
}
