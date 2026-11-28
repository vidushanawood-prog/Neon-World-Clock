import { queueReceiptEmailDocument, type ActivationMethod } from '../lib/firebase';
import { formatReceiptDateTime, PRO_BASE_PRICE_LKR } from './subscription';

/**
 * EmailJS Configuration (Client-side public identifiers only — never embed secret private keys).
 * Replace these placeholders or set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and
 * VITE_EMAILJS_PUBLIC_KEY in your environment to enable live EmailJS delivery alongside
 * the Firebase Trigger Email (`mail` collection) integration.
 */
export const EMAILJS_SERVICE_ID =
  (import.meta.env.VITE_EMAILJS_SERVICE_ID || '').trim() || 'YOUR_EMAILJS_SERVICE_ID';
export const EMAILJS_TEMPLATE_ID =
  (import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '').trim() || 'YOUR_EMAILJS_TEMPLATE_ID';
export const EMAILJS_PUBLIC_KEY =
  (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '').trim() || 'YOUR_EMAILJS_PUBLIC_KEY';

export interface ProActivationReceipt {
  transactionId: string;
  userEmail: string;
  userName: string;
  planName: string;
  amountPaid: string;
  localPriceDisplay: string;
  activationMethod: Exclude<ActivationMethod, 'none'>;
  activationDate: string;
  expiryDate: string;
  activatedAtMs: number;
  expiresAtMs: number;
  subject: string;
  emailJsDispatched: boolean;
  firestoreMailQueued: boolean;
  htmlBody: string;
  textBody: string;
}

const LAST_RECEIPT_KEY = 'neon_world_clock_last_receipt_v1';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateTransactionId(method: 'payment' | 'redeem' | 'admin'): string {
  const prefix = method === 'redeem' ? 'NWC-RDM' : method === 'admin' ? 'NWC-ADM' : 'NWC-PRO';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export function buildReceiptContent(params: {
  transactionId: string;
  userEmail: string;
  userName: string;
  activationMethod: 'payment' | 'redeem' | 'admin';
  activatedAtMs: number;
  expiresAtMs: number;
  localPriceDisplay?: string;
}): {
  subject: string;
  planName: string;
  amountPaid: string;
  activationDate: string;
  expiryDate: string;
  textBody: string;
  htmlBody: string;
} {
  const subject = 'Your Neon World Clock Pro Plan is Activated!';
  const planName = 'Neon World Clock Pro (30 Days)';
  const amountPaid =
    params.activationMethod === 'redeem'
      ? `LKR 0.00 - Redeem Code Applied (Value: LKR ${PRO_BASE_PRICE_LKR}.00)`
      : params.activationMethod === 'admin'
        ? `LKR 0.00 - Admin Grant (Value: LKR ${PRO_BASE_PRICE_LKR}.00)`
        : `LKR ${PRO_BASE_PRICE_LKR}.00`;

  const activationDate = formatReceiptDateTime(params.activatedAtMs);
  const expiryDate = formatReceiptDateTime(params.expiresAtMs);

  const textBody = [
    subject,
    '==========================================',
    `Account Holder: ${params.userName}`,
    `User Email: ${params.userEmail}`,
    `Plan Name: ${planName}`,
    `Amount Paid: ${amountPaid}`,
    params.localPriceDisplay ? `Localized Equivalent: ${params.localPriceDisplay}` : '',
    `Activation Date: ${activationDate}`,
    `Expiry Date (+30 Days): ${expiryDate}`,
    `Transaction ID: ${params.transactionId}`,
    '',
    'All 215 Countries, Live TV, Live Radio, Entertainment Live, and Movies are now unlocked for 30 days.',
    'Thank you for upgrading to Neon World Clock Pro!',
  ]
    .filter(Boolean)
    .join('\n');

  const safeName = escapeHtml(params.userName);
  const safeEmail = escapeHtml(params.userEmail);
  const safePlan = escapeHtml(planName);
  const safeAmount = escapeHtml(amountPaid);
  const safeLocal = params.localPriceDisplay ? escapeHtml(params.localPriceDisplay) : '';
  const safeActDate = escapeHtml(activationDate);
  const safeExpDate = escapeHtml(expiryDate);
  const safeTxId = escapeHtml(params.transactionId);

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px;background:#020617;color:#e2e8f0;font-family:Inter,system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#0f172a;border:1px solid #38bdf8;border-radius:16px;padding:28px;">
    <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#38bdf8;font-weight:700;">NEON WORLD CLOCK PRO</div>
    <h1 style="margin:10px 0 6px;font-size:22px;color:#ffffff;">Your Pro Plan is Activated!</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;">Hi ${safeName}, all 215 Countries, Live TV, Live Radio, Entertainment &amp; Movies are unlocked for 30 days.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b;">User Email</td><td style="padding:8px 0;color:#f8fafc;text-align:right;border-bottom:1px solid #1e293b;">${safeEmail}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b;">Plan Name</td><td style="padding:8px 0;color:#38bdf8;font-weight:700;text-align:right;border-bottom:1px solid #1e293b;">${safePlan}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b;">Amount Paid</td><td style="padding:8px 0;color:#34d399;font-weight:700;text-align:right;border-bottom:1px solid #1e293b;">${safeAmount}</td></tr>
      ${safeLocal ? `<tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b;">Local Equivalent</td><td style="padding:8px 0;color:#f8fafc;text-align:right;border-bottom:1px solid #1e293b;">${safeLocal}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b;">Activation Date</td><td style="padding:8px 0;color:#f8fafc;text-align:right;border-bottom:1px solid #1e293b;">${safeActDate}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;border-bottom:1px solid #1e293b;">Expiry Date</td><td style="padding:8px 0;color:#f8fafc;text-align:right;border-bottom:1px solid #1e293b;">${safeExpDate}</td></tr>
      <tr><td style="padding:8px 0;color:#94a3b8;">Transaction ID</td><td style="padding:8px 0;color:#e879f9;font-family:monospace;text-align:right;">${safeTxId}</td></tr>
    </table>
    <p style="margin:22px 0 0;font-size:12px;color:#64748b;">Keep this receipt for your records. Your Pro access automatically reverts to Free after 30 days.</p>
  </div>
</body>
</html>`;

  return {
    subject,
    planName,
    amountPaid,
    activationDate,
    expiryDate,
    textBody,
    htmlBody,
  };
}

function isEmailJsConfigured(): boolean {
  return (
    Boolean(EMAILJS_SERVICE_ID) &&
    Boolean(EMAILJS_TEMPLATE_ID) &&
    Boolean(EMAILJS_PUBLIC_KEY) &&
    !EMAILJS_SERVICE_ID.startsWith('YOUR_') &&
    !EMAILJS_TEMPLATE_ID.startsWith('YOUR_') &&
    !EMAILJS_PUBLIC_KEY.startsWith('YOUR_')
  );
}

/**
 * Dispatch an automated activation receipt via:
 * 1) EmailJS REST API (when configured via VITE_EMAILJS_* or placeholder constants)
 * 2) Firebase Trigger Email Firestore `mail/{transactionId}` document (when signed in)
 * Always returns a complete ProActivationReceipt for immediate on-screen viewing & download.
 */
export async function sendProActivationReceipt(params: {
  uid?: string | null;
  userEmail: string;
  userName: string;
  activationMethod: 'payment' | 'redeem' | 'admin';
  activatedAtMs: number;
  expiresAtMs: number;
  localPriceDisplay?: string;
}): Promise<ProActivationReceipt> {
  const transactionId = generateTransactionId(params.activationMethod);
  const content = buildReceiptContent({
    transactionId,
    userEmail: params.userEmail,
    userName: params.userName,
    activationMethod: params.activationMethod,
    activatedAtMs: params.activatedAtMs,
    expiresAtMs: params.expiresAtMs,
    localPriceDisplay: params.localPriceDisplay,
  });

  let emailJsDispatched = false;
  let firestoreMailQueued = false;

  // 1. EmailJS REST API dispatch (non-blocking failure)
  if (isEmailJsConfigured() && params.userEmail.includes('@')) {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: params.userEmail,
            to_name: params.userName,
            subject: content.subject,
            plan_name: content.planName,
            amount_paid: content.amountPaid,
            activation_date: content.activationDate,
            expiry_date: content.expiryDate,
            transaction_id: transactionId,
            message: content.textBody,
          },
        }),
      });
      emailJsDispatched = response.ok;
    } catch (err) {
      console.warn('EmailJS dispatch skipped or failed:', err);
    }
  }

  // 2. Firebase Trigger Email (`mail` collection) dispatch
  if (params.uid && params.userEmail.includes('@')) {
    try {
      await queueReceiptEmailDocument({
        uid: params.uid,
        to: params.userEmail,
        transactionId,
        planName: content.planName,
        amountPaid: content.amountPaid,
        activationMethod: params.activationMethod,
        activationDate: content.activationDate,
        expiryDate: content.expiryDate,
        subject: content.subject,
        text: content.textBody,
        html: content.htmlBody,
      });
      firestoreMailQueued = true;
    } catch (err) {
      console.warn('Firestore mail queue skipped or failed:', err);
    }
  }

  const receipt: ProActivationReceipt = {
    transactionId,
    userEmail: params.userEmail,
    userName: params.userName,
    planName: content.planName,
    amountPaid: content.amountPaid,
    localPriceDisplay: params.localPriceDisplay || `LKR ${PRO_BASE_PRICE_LKR} / month`,
    activationMethod: params.activationMethod,
    activationDate: content.activationDate,
    expiryDate: content.expiryDate,
    activatedAtMs: params.activatedAtMs,
    expiresAtMs: params.expiresAtMs,
    subject: content.subject,
    emailJsDispatched,
    firestoreMailQueued,
    htmlBody: content.htmlBody,
    textBody: content.textBody,
  };

  try {
    localStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(receipt));
  } catch {
    // ignore localStorage failure
  }

  return receipt;
}

export function loadLastReceipt(): ProActivationReceipt | null {
  try {
    const raw = localStorage.getItem(LAST_RECEIPT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProActivationReceipt;
  } catch {
    return null;
  }
}

export function downloadReceiptHtml(receipt: ProActivationReceipt): void {
  const blob = new Blob([receipt.htmlBody], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Neon-World-Clock-Receipt-${receipt.transactionId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
