import type { LocalizedProPrice } from './currencyDetection';
import { PRO_BASE_PRICE_LKR } from './subscription';

/**
 * PayHere Checkout Configuration
 *
 * Swap `sandbox` to `false` and update `merchantId` (or provide
 * VITE_PAYHERE_SANDBOX="false" and VITE_PAYHERE_MERCHANT_ID in env)
 * to switch from Sandbox to Live without touching UI or Firestore logic.
 */
export const PAYHERE_CONFIG = {
  sandbox: (import.meta.env.VITE_PAYHERE_SANDBOX || 'true').trim().toLowerCase() !== 'false',
  merchantId: (import.meta.env.VITE_PAYHERE_MERCHANT_ID || '').trim() || '1239621',
  sdkUrl: 'https://www.payhere.lk/lib/payhere.js',
  /**
   * Transparent pass-through convenience/processing fee rate (3.5%).
   * Base LKR 500.00 + LKR 17.50 fee = LKR 517.50 total.
   */
  passThroughFeeRate: 0.035,
  /**
   * Currencies enabled on the PayHere merchant account.
   * Sri Lanka Sandbox accounts always have 'LKR' enabled by default;
   * expand to ['LKR', 'USD', 'GBP', 'EUR', 'AUD'] once multi-currency is enabled on Live.
   */
  enabledCurrencies: ['LKR'] as readonly string[],
  returnUrl: (import.meta.env.VITE_PAYHERE_RETURN_URL || '').trim() || '',
  cancelUrl: (import.meta.env.VITE_PAYHERE_CANCEL_URL || '').trim() || '',
  notifyUrl: (import.meta.env.VITE_PAYHERE_NOTIFY_URL || '').trim() || '',
} as const;

export type PayHerePaymentMethodTag = 'payhere_sandbox' | 'payhere_live';

export function getPayHerePaymentMethodTag(): PayHerePaymentMethodTag {
  return PAYHERE_CONFIG.sandbox ? 'payhere_sandbox' : 'payhere_live';
}

export interface PayHerePaymentPayload {
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  custom_1?: string;
  custom_2?: string;
}

interface PayHereSdk {
  startPayment: (payment: PayHerePaymentPayload) => void;
  onCompleted?: (orderId: string) => void;
  onDismissed?: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    payhere?: PayHereSdk;
  }
}

export interface PayHerePricingBreakdown {
  baseLkr: number;
  feeLkr: number;
  totalLkr: number;
  feeRatePercent: number;
  chargeCurrency: string;
  chargeAmountString: string;
  formattedChargeTotal: string;
  formattedLocalBase: string;
  formattedLocalFee: string;
  formattedLocalTotal: string;
  isChargedInLkr: boolean;
}

function roundCurrency(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatMoney(amount: number, currencyCode: string, decimals = 2): string {
  if (currencyCode === 'LKR') {
    return `LKR ${amount.toFixed(decimals)}`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(decimals)}`;
  }
}

/**
 * Compute base plan price (LKR 500) + pass-through convenience/processing fee
 * along with localized equivalents and the exact PayHere charge payload amount.
 */
export function calculatePayHereCheckoutPricing(
  priceInfo: LocalizedProPrice | null
): PayHerePricingBreakdown {
  const baseLkr = PRO_BASE_PRICE_LKR;
  const feeLkr = roundCurrency(baseLkr * PAYHERE_CONFIG.passThroughFeeRate, 2);
  const totalLkr = roundCurrency(baseLkr + feeLkr, 2);
  const feeRatePercent = roundCurrency(PAYHERE_CONFIG.passThroughFeeRate * 100, 1);

  if (!priceInfo || priceInfo.isSriLanka || priceInfo.currencyCode === 'LKR') {
    return {
      baseLkr,
      feeLkr,
      totalLkr,
      feeRatePercent,
      chargeCurrency: 'LKR',
      chargeAmountString: totalLkr.toFixed(2),
      formattedChargeTotal: formatMoney(totalLkr, 'LKR', 2),
      formattedLocalBase: formatMoney(baseLkr, 'LKR', 2),
      formattedLocalFee: formatMoney(feeLkr, 'LKR', 2),
      formattedLocalTotal: formatMoney(totalLkr, 'LKR', 2),
      isChargedInLkr: true,
    };
  }

  const localBase = priceInfo.localAmount;
  const localFee = roundCurrency(localBase * PAYHERE_CONFIG.passThroughFeeRate, 2);
  const localTotal = roundCurrency(localBase + localFee, 2);

  const canChargeLocal = PAYHERE_CONFIG.enabledCurrencies.includes(priceInfo.currencyCode);
  const chargeCurrency = canChargeLocal ? priceInfo.currencyCode : 'LKR';
  const chargeAmount = canChargeLocal ? localTotal : totalLkr;

  return {
    baseLkr,
    feeLkr,
    totalLkr,
    feeRatePercent,
    chargeCurrency,
    chargeAmountString: chargeAmount.toFixed(2),
    formattedChargeTotal: formatMoney(chargeAmount, chargeCurrency, 2),
    formattedLocalBase: formatMoney(localBase, priceInfo.currencyCode, 2),
    formattedLocalFee: formatMoney(localFee, priceInfo.currencyCode, 2),
    formattedLocalTotal: formatMoney(localTotal, priceInfo.currencyCode, 2),
    isChargedInLkr: chargeCurrency === 'LKR',
  };
}

/**
 * Generates a unique, Firestore-rules-safe order ID matching ^[a-zA-Z0-9_\-]+$.
 */
export function generatePayHereOrderId(uid?: string | null): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const uidTail = (uid || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-4)
    .toUpperCase();
  return uidTail ? `NWC-PH-${ts}-${uidTail}-${rand}` : `NWC-PH-${ts}-${rand}`;
}

/**
 * Sanitizes an order ID returned by PayHere's callback so it always satisfies
 * Firestore ID constraints (1..128 chars, ^[a-zA-Z0-9_\-]+$).
 */
export function sanitizePayHereOrderId(rawOrderId: unknown, fallbackOrderId: string): string {
  if (typeof rawOrderId === 'string') {
    const cleaned = rawOrderId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    if (cleaned.length >= 4) {
      return cleaned;
    }
  }
  return fallbackOrderId;
}

let sdkLoadPromise: Promise<PayHereSdk> | null = null;

/**
 * Ensures https://www.payhere.lk/lib/payhere.js is loaded and window.payhere is ready.
 */
export function ensurePayHereSdkLoaded(timeoutMs = 10000): Promise<PayHereSdk> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('PayHere checkout is only available in the browser.'));
  }

  if (window.payhere && typeof window.payhere.startPayment === 'function') {
    return Promise.resolve(window.payhere);
  }

  if (sdkLoadPromise) {
    return sdkLoadPromise;
  }

  sdkLoadPromise = new Promise<PayHereSdk>((resolve, reject) => {
    let settled = false;

    const finishOk = (sdk: PayHereSdk) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      resolve(sdk);
    };

    const finishErr = (msg: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      sdkLoadPromise = null;
      reject(new Error(msg));
    };

    const timer = window.setTimeout(() => {
      finishErr(
        'Unable to load PayHere Checkout SDK. Please check your internet connection or ad-blocker and try again.'
      );
    }, timeoutMs);

    const poll = window.setInterval(() => {
      if (window.payhere && typeof window.payhere.startPayment === 'function') {
        finishOk(window.payhere);
      }
    }, 120);

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PAYHERE_CONFIG.sdkUrl}"]`
    );

    if (existingScript) {
      existingScript.addEventListener('error', () => {
        finishErr('PayHere Checkout SDK failed to load. Please retry or use a Redeem Code.');
      });
    } else {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = PAYHERE_CONFIG.sdkUrl;
      script.async = true;
      script.onload = () => {
        if (window.payhere && typeof window.payhere.startPayment === 'function') {
          finishOk(window.payhere);
        }
      };
      script.onerror = () => {
        finishErr('PayHere Checkout SDK failed to load. Please retry or use a Redeem Code.');
      };
      document.head.appendChild(script);
    }
  });

  return sdkLoadPromise;
}

function splitCustomerName(displayName: string, email: string): { firstName: string; lastName: string } {
  const cleaned = displayName.replace(/\s+/g, ' ').trim();
  if (cleaned) {
    const parts = cleaned.split(' ');
    const first = parts[0].slice(0, 40) || 'Neon';
    const last = parts.slice(1).join(' ').slice(0, 40) || 'Member';
    return { firstName: first, lastName: last };
  }
  const emailLocal = (email.split('@')[0] || 'Neon').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
  return {
    firstName: emailLocal.slice(0, 40) || 'Neon',
    lastName: 'Member',
  };
}

export interface StartPayHereCheckoutParams {
  uid: string;
  email: string;
  displayName: string;
  priceInfo: LocalizedProPrice | null;
  onCompleted: (orderId: string, pricing: PayHerePricingBreakdown) => void | Promise<void>;
  onDismissed: () => void;
  onError: (errorMessage: string) => void;
}

/**
 * Initializes the PayHere JS SDK, constructs the Sandbox/Live checkout payload with
 * base price + pass-through processing fee and a unique order_id, wires lifecycle callbacks,
 * and opens PayHere Checkout via payhere.startPayment(payment).
 */
export async function startPayHereCheckout(
  params: StartPayHereCheckoutParams
): Promise<{ orderId: string; pricing: PayHerePricingBreakdown }> {
  const sdk = await ensurePayHereSdkLoaded();
  const pricing = calculatePayHereCheckoutPricing(params.priceInfo);
  const generatedOrderId = generatePayHereOrderId(params.uid);
  const { firstName, lastName } = splitCustomerName(params.displayName, params.email);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const payment: PayHerePaymentPayload = {
    sandbox: PAYHERE_CONFIG.sandbox,
    merchant_id: PAYHERE_CONFIG.merchantId,
    return_url: PAYHERE_CONFIG.returnUrl || `${origin}/#/account`,
    cancel_url: PAYHERE_CONFIG.cancelUrl || `${origin}/#/account`,
    notify_url: PAYHERE_CONFIG.notifyUrl || `${origin}/api/payhere-notify`,
    order_id: generatedOrderId,
    items: 'Neon World Clock Pro (30 Days)',
    amount: pricing.chargeAmountString,
    currency: pricing.chargeCurrency,
    first_name: firstName,
    last_name: lastName,
    email: params.email.trim().toLowerCase(),
    phone: '0770000000',
    address: 'Neon World Clock Digital Subscription',
    city: params.priceInfo?.isSriLanka ? 'Colombo' : 'Colombo',
    country: params.priceInfo?.countryName || 'Sri Lanka',
    custom_1: params.uid.slice(0, 64),
    custom_2: 'neon_world_clock_pro_30d',
  };

  let handledTerminalEvent = false;

  sdk.onCompleted = (returnedOrderId: string) => {
    if (handledTerminalEvent) return;
    handledTerminalEvent = true;
    const safeOrderId = sanitizePayHereOrderId(returnedOrderId, generatedOrderId);
    console.info('[PayHere] Payment completed. Order ID:', safeOrderId);
    void Promise.resolve(params.onCompleted(safeOrderId, pricing)).catch((err) => {
      console.error('[PayHere] Post-payment activation error:', err);
      params.onError(
        err instanceof Error
          ? err.message
          : 'Payment succeeded, but Pro activation encountered an error. Please refresh or contact support.'
      );
    });
  };

  sdk.onDismissed = () => {
    if (handledTerminalEvent) return;
    handledTerminalEvent = true;
    console.info('[PayHere] Payment modal dismissed by user. Order ID:', generatedOrderId);
    params.onDismissed();
  };

  sdk.onError = (error: string) => {
    if (handledTerminalEvent) return;
    handledTerminalEvent = true;
    const message =
      typeof error === 'string' && error.trim()
        ? error.trim()
        : 'PayHere checkout reported a payment error. Please try again.';
    console.error('[PayHere] Payment error:', message);
    params.onError(message);
  };

  try {
    sdk.startPayment(payment);
  } catch (err) {
    handledTerminalEvent = true;
    const msg =
      err instanceof Error ? err.message : 'Unable to launch PayHere Checkout popup.';
    console.error('[PayHere] startPayment exception:', err);
    params.onError(msg);
  }

  return { orderId: generatedOrderId, pricing };
}
