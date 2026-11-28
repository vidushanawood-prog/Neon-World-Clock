import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Crown,
  Gift,
  Globe2,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';
import type { PaymentMethodType } from '../lib/firebase';
import { detectLocalizedProPrice, type LocalizedProPrice } from '../services/currencyDetection';
import {
  calculatePayHereCheckoutPricing,
  ensurePayHereSdkLoaded,
  getPayHerePaymentMethodTag,
  PAYHERE_CONFIG,
  startPayHereCheckout,
} from '../services/payhere';
import { PRO_BASE_PRICE_LKR, PRO_REDEEM_CODE } from '../services/subscription';

interface UpgradeProModalProps {
  isOpen: boolean;
  reason?: string | null;
  liveUsdRates?: Record<string, number>;
  userUid?: string | null;
  userDisplayName?: string;
  userEmail: string | null;
  isSignedIn: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
  onCompleteActivation: (params: {
    method: 'payment' | 'redeem';
    paymentMethod?: PaymentMethodType;
    orderId?: string | null;
    amountPaidDisplay?: string;
    localPriceDisplay: string;
    receiptEmail: string;
  }) => Promise<void>;
}

export const UpgradeProModal: React.FC<UpgradeProModalProps> = ({
  isOpen,
  reason,
  liveUsdRates,
  userUid,
  userDisplayName,
  userEmail,
  isSignedIn,
  onClose,
  onOpenAuth,
  onCompleteActivation,
}) => {
  const [priceInfo, setPriceInfo] = useState<LocalizedProPrice | null>(null);
  const [receiptEmailInput, setReceiptEmailInput] = useState(userEmail || '');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [isLaunchingPayHere, setIsLaunchingPayHere] = useState(false);
  const [isActivatingPro, setIsActivatingPro] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    if (userEmail) {
      setReceiptEmailInput(userEmail);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setRedeemError(null);
    setPaymentError(null);
    setPaymentNotice(null);
    setIsLaunchingPayHere(false);
    setIsActivatingPro(false);

    void detectLocalizedProPrice(liveUsdRates).then((info) => {
      if (!cancelled) setPriceInfo(info);
    });

    // Warm up PayHere JS SDK in the background while modal is open
    void ensurePayHereSdkLoaded().catch(() => {
      // Errors will be surfaced cleanly if the user clicks Pay with PayHere
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, liveUsdRates]);

  const pricing = useMemo(() => calculatePayHereCheckoutPricing(priceInfo), [priceInfo]);

  if (!isOpen) return null;

  const formattedLocalPrice = priceInfo?.formattedLocalPrice || `LKR ${PRO_BASE_PRICE_LKR} / month`;
  const effectiveEmail = (userEmail || receiptEmailInput).trim().toLowerCase();
  const isBusy = isLaunchingPayHere || isActivatingPro || isRedeeming;

  const handleStartPayHerePayment = async () => {
    setPaymentError(null);
    setPaymentNotice(null);

    if (!isSignedIn || !userUid) {
      setPaymentError('Please sign in with your verified account before checking out with PayHere so your 30-day Pro plan syncs immediately.');
      return;
    }

    if (!effectiveEmail || !effectiveEmail.includes('@')) {
      setPaymentError('A valid email address is required for PayHere Checkout and your Pro receipt.');
      return;
    }

    setIsLaunchingPayHere(true);
    try {
      await startPayHereCheckout({
        uid: userUid,
        email: effectiveEmail,
        displayName: userDisplayName || effectiveEmail.split('@')[0] || 'Neon Member',
        priceInfo,
        onCompleted: async (orderId, usedPricing) => {
          setIsLaunchingPayHere(false);
          setIsActivatingPro(true);
          const gatewayLabel = PAYHERE_CONFIG.sandbox ? 'PayHere Sandbox' : 'PayHere';
          const amountPaidDisplay = `${usedPricing.formattedChargeTotal} (incl. fee · ${gatewayLabel})`;
          try {
            await onCompleteActivation({
              method: 'payment',
              paymentMethod: getPayHerePaymentMethodTag(),
              orderId,
              amountPaidDisplay,
              localPriceDisplay: `${usedPricing.formattedLocalTotal} / 30 days`,
              receiptEmail: effectiveEmail,
            });
          } catch (err) {
            setPaymentError(
              err instanceof Error
                ? err.message
                : 'Payment completed, but upgrading your profile failed. Please refresh the page.'
            );
          } finally {
            setIsActivatingPro(false);
          }
        },
        onDismissed: () => {
          setIsLaunchingPayHere(false);
          setIsActivatingPro(false);
          setPaymentNotice('PayHere payment window was closed before completion. You can try again anytime.');
        },
        onError: (errMsg) => {
          setIsLaunchingPayHere(false);
          setIsActivatingPro(false);
          setPaymentError(errMsg);
        },
      });
    } catch (err) {
      setIsLaunchingPayHere(false);
      setIsActivatingPro(false);
      setPaymentError(
        err instanceof Error
          ? err.message
          : 'Unable to initialize PayHere Checkout. Please try again.'
      );
    }
  };

  const handleRedeemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError(null);
    const entered = redeemCode.trim();
    if (!entered) {
      setRedeemError('Please enter a redeem code.');
      return;
    }
    if (entered !== PRO_REDEEM_CODE) {
      setRedeemError('Invalid redeem code. Codes are case-sensitive — please check and try again.');
      return;
    }

    const emailToUse = effectiveEmail || 'member@neonworldclock.app';
    setIsRedeeming(true);
    try {
      await onCompleteActivation({
        method: 'redeem',
        paymentMethod: 'redeem',
        orderId: null,
        localPriceDisplay: formattedLocalPrice,
        receiptEmail: emailToUse,
      });
      setRedeemCode('');
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Could not apply redeem code.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Neon Pro"
    >
      <div className="relative my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-cyan-400/35 bg-slate-950 shadow-[0_0_60px_rgba(34,211,238,0.22)]">
        {/* Glow header accent */}
        <div className="relative border-b border-white/10 bg-gradient-to-br from-cyan-500/20 via-slate-950 to-fuchsia-500/20 px-6 pb-5 pt-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upgrade modal"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-slate-900/80 text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              Neon Pro · 30-Day Full Access
            </div>
            {PAYHERE_CONFIG.sandbox && (
              <span className="inline-flex items-center rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                PayHere Sandbox
              </span>
            )}
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
            Upgrade to Neon Pro
          </h2>
          {reason ? (
            <p className="mt-1 text-xs font-medium text-cyan-200">{reason}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-300">
              Unlock all 215 countries, every country Live TV &amp; Radio station, Entertainment categories &amp; Movies.
            </p>
          )}

          {/* Auto-detected Currency Price Card */}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-slate-950/85 px-4 py-3.5">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                <Globe2 className="h-3.5 w-3.5" />
                {priceInfo
                  ? `Detected: ${priceInfo.countryName} (${priceInfo.currencyCode})`
                  : 'Detecting local currency...'}
              </div>
              <div className="mt-1 text-2xl font-black text-white sm:text-3xl">
                {formattedLocalPrice}
              </div>
              {!priceInfo?.isSriLanka && (
                <div className="text-xs font-medium text-slate-400">
                  {priceInfo?.basePriceLabel || `(Base: LKR ${PRO_BASE_PRICE_LKR} / 30 Days)`}
                </div>
              )}
            </div>
            <div className="text-right text-[11px] text-emerald-300">
              <div className="font-bold">30 Days Validity</div>
              <div className="text-slate-400">Auto-reverts to Free</div>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Pro Benefits */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { icon: Globe2, label: 'All 215 World Clocks' },
              { icon: Tv, label: 'All Country Live TV' },
              { icon: Sparkles, label: 'All Entertainment Categories' },
              { icon: CheckCircle2, label: 'All Radio & Ad-Free Movies' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-slate-200"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span className="truncate font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          {!isSignedIn && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-400/35 bg-sky-500/12 px-3.5 py-2.5 text-xs text-sky-100">
              <span>Sign in to your verified account to pay via PayHere and sync Pro across devices.</span>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="rounded-lg bg-sky-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-sky-300"
                >
                  Sign In
                </button>
              )}
            </div>
          )}

          {/* PayHere Checkout Panel */}
          <div className="space-y-3.5 rounded-2xl border border-cyan-400/25 bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cyan-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  PayHere Checkout
                </span>
              </div>
              <span className="rounded-md border border-white/10 bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                {PAYHERE_CONFIG.sandbox ? 'SANDBOX' : 'LIVE'} · ID {PAYHERE_CONFIG.merchantId}
              </span>
            </div>

            {/* Transparent Pass-Through Fee Breakdown */}
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Neon Pro Base Plan (30 Days)</span>
                <span className="font-mono font-semibold text-white">
                  LKR {pricing.baseLkr.toFixed(2)}
                  {!priceInfo?.isSriLanka && priceInfo && (
                    <span className="ml-1.5 text-[11px] text-slate-400">
                      (≈ {pricing.formattedLocalBase})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Gateway Convenience Fee ({pricing.feeRatePercent}%)</span>
                <span className="font-mono text-slate-300">
                  LKR {pricing.feeLkr.toFixed(2)}
                  {!priceInfo?.isSriLanka && priceInfo && (
                    <span className="ml-1.5 text-[11px] text-slate-500">
                      (≈ {pricing.formattedLocalFee})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm font-extrabold text-white">
                <span>Total Charged via PayHere</span>
                <span className="font-mono text-cyan-300">
                  {pricing.formattedChargeTotal}
                </span>
              </div>
              {!priceInfo?.isSriLanka && priceInfo && pricing.isChargedInLkr && (
                <p className="text-[11px] text-slate-400">
                  Approx. {pricing.formattedLocalTotal} in {priceInfo.currencyCode} · Billed in LKR via PayHere.
                </p>
              )}
            </div>

            {!userEmail && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">
                  Receipt Email Address
                </label>
                <input
                  type="email"
                  value={receiptEmailInput}
                  onChange={(e) => setReceiptEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              {['Visa', 'Mastercard', 'Amex', 'FriMi', 'eZ Cash', 'mCash', 'Genie', 'HelaPay'].map(
                (methodLabel) => (
                  <span
                    key={methodLabel}
                    className="rounded-md border border-white/10 bg-slate-950/75 px-2 py-0.5 text-slate-300"
                  >
                    {methodLabel}
                  </span>
                )
              )}
            </div>

            {paymentNotice && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span>{paymentNotice}</span>
              </div>
            )}

            {paymentError && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {paymentError}
              </p>
            )}

            {isSignedIn && userUid ? (
              <button
                type="button"
                onClick={() => void handleStartPayHerePayment()}
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-fuchsia-500 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.4)] transition hover:brightness-110 disabled:opacity-60"
              >
                {isActivatingPro ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Activating Neon Pro...
                  </>
                ) : isLaunchingPayHere ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening PayHere Checkout...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Pay {pricing.formattedChargeTotal} via PayHere
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-fuchsia-500 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.4)] transition hover:brightness-110"
              >
                <ShieldCheck className="h-4 w-4" />
                Sign In to Pay {pricing.formattedChargeTotal} via PayHere
              </button>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
              <Lock className="h-3 w-3" />
              Secure PayHere Checkout · Instant Pro unlock &amp; receipt · No card data stored here
            </div>
          </div>

          {/* Redeem Code Section */}
          <form
            onSubmit={handleRedeemSubmit}
            className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-950/15 p-4"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-fuchsia-200">
              <Gift className="h-4 w-4 text-fuchsia-400" />
              Have a Redeem Code?
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Enter your Neon Pro promo code below to unlock 30 days instantly for free.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => {
                  setRedeemCode(e.target.value);
                  if (redeemError) setRedeemError(null);
                }}
                placeholder="Enter redeem code..."
                className="flex-1 rounded-xl border border-fuchsia-400/30 bg-slate-950/90 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-[0_0_18px_rgba(232,121,249,0.35)] transition hover:brightness-110 disabled:opacity-60"
              >
                {isRedeeming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Redeem'}
              </button>
            </div>
            {redeemError && (
              <p className="mt-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">
                {redeemError}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
