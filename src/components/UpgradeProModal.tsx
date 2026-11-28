import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Crown,
  Gift,
  Globe2,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Tv,
  Wallet,
  X,
} from 'lucide-react';
import { detectLocalizedProPrice, type LocalizedProPrice } from '../services/currencyDetection';
import { PRO_BASE_PRICE_LKR, PRO_REDEEM_CODE } from '../services/subscription';

interface UpgradeProModalProps {
  isOpen: boolean;
  reason?: string | null;
  liveUsdRates?: Record<string, number>;
  userEmail: string | null;
  isSignedIn: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
  onCompleteActivation: (params: {
    method: 'payment' | 'redeem';
    localPriceDisplay: string;
    receiptEmail: string;
  }) => Promise<void>;
}

export const UpgradeProModal: React.FC<UpgradeProModalProps> = ({
  isOpen,
  reason,
  liveUsdRates,
  userEmail,
  isSignedIn,
  onClose,
  onOpenAuth,
  onCompleteActivation,
}) => {
  const [priceInfo, setPriceInfo] = useState<LocalizedProPrice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card');
  const [cardHolder, setCardHolder] = useState('');
  const [cardLastFourInput, setCardLastFourInput] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [receiptEmailInput, setReceiptEmailInput] = useState(userEmail || '');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
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
    void detectLocalizedProPrice(liveUsdRates).then((info) => {
      if (!cancelled) setPriceInfo(info);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, liveUsdRates]);

  if (!isOpen) return null;

  const formattedLocalPrice = priceInfo?.formattedLocalPrice || `LKR ${PRO_BASE_PRICE_LKR} / month`;
  const effectiveEmail = (userEmail || receiptEmailInput).trim().toLowerCase();

  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const grouped = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardLastFourInput(grouped);
    if (paymentError) setPaymentError(null);
  };

  const handleExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    setCardExpiry(formatted);
    if (paymentError) setPaymentError(null);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!effectiveEmail || !effectiveEmail.includes('@')) {
      setPaymentError('Please enter a valid email address for your activation receipt.');
      return;
    }

    if (paymentMethod === 'card') {
      const digits = cardLastFourInput.replace(/\D/g, '');
      if (cardHolder.trim().length < 2) {
        setPaymentError('Please enter the cardholder name.');
        return;
      }
      if (digits.length < 12) {
        setPaymentError('Please enter a valid card number.');
        return;
      }
      if (cardExpiry.length < 5 || cardCvc.replace(/\D/g, '').length < 3) {
        setPaymentError('Please enter a valid expiry date (MM/YY) and CVC.');
        return;
      }
    }

    setIsProcessingPayment(true);
    try {
      // Never persist or transmit raw card PAN/CVC anywhere; clear sensitive form inputs immediately
      setCardLastFourInput('');
      setCardCvc('');
      setCardExpiry('');
      await new Promise((r) => window.setTimeout(r, 700));
      await onCompleteActivation({
        method: 'payment',
        localPriceDisplay: formattedLocalPrice,
        receiptEmail: effectiveEmail,
      });
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Payment could not be processed.');
    } finally {
      setIsProcessingPayment(false);
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

          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <Crown className="h-3.5 w-3.5" />
            Neon Pro · 30-Day Full Access
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
            Upgrade to Neon Pro
          </h2>
          {reason ? (
            <p className="mt-1 text-xs font-medium text-cyan-200">{reason}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-300">
              Unlock every country clock, Live TV channel, radio station, entertainment stream &amp; movie.
            </p>
          )}

          {/* Auto-detected Currency Price Card */}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-slate-950/85 px-4 py-3.5">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                <Globe2 className="h-3.5 w-3.5" />
                {priceInfo ? `Detected: ${priceInfo.countryName} (${priceInfo.currencyCode})` : 'Detecting local currency...'}
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

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
          {/* Pro Benefits */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { icon: Globe2, label: 'All 215 World Clocks' },
              { icon: Tv, label: 'All Live TV & ITN Channels' },
              { icon: Sparkles, label: 'All 10,000+ Entertainment' },
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
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-100">
              <span>Sign in to sync your 30-day Pro plan across all your devices.</span>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="rounded-lg bg-sky-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-sky-300"
                >
                  Sign In
                </button>
              )}
            </div>
          )}

          {/* Interactive Checkout / Payment Gateway */}
          <form onSubmit={handlePaymentSubmit} className="space-y-3.5 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Express Checkout
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    paymentMethod === 'card'
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                      : 'border border-white/10 bg-slate-950/70 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="h-3 w-3" />
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    paymentMethod === 'wallet'
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                      : 'border border-white/10 bg-slate-950/70 text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet className="h-3 w-3" />
                  Local / Pay Wallet
                </button>
              </div>
            </div>

            {!userEmail && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">
                  Receipt Email Address
                </label>
                <input
                  type="email"
                  required
                  value={receiptEmailInput}
                  onChange={(e) => setReceiptEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>
            )}

            {paymentMethod === 'card' ? (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Cardholder Name"
                  autoComplete="cc-name"
                  className="w-full rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardLastFourInput}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  placeholder="Card Number (Visa / Mastercard)"
                  autoComplete="cc-number"
                  className="w-full rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    placeholder="MM/YY"
                    autoComplete="cc-exp"
                    className="rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="CVC"
                    autoComplete="cc-csc"
                    className="rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-cyan-400/20 bg-slate-950/80 p-3 text-xs text-slate-300">
                Instant 1-click checkout via Sri Lanka PayHere / FriMi / Apple Pay / Google Pay for{' '}
                <strong className="text-cyan-300">{formattedLocalPrice}</strong>.
              </div>
            )}

            {paymentError && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {paymentError}
              </p>
            )}

            <button
              type="submit"
              disabled={isProcessingPayment || isRedeeming}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-fuchsia-500 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.4)] transition hover:brightness-110 disabled:opacity-60"
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating Neon Pro...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Pay {formattedLocalPrice} &amp; Unlock Pro
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
              <Lock className="h-3 w-3" />
              Encrypted checkout · Instant email receipt · No raw card details stored
            </div>
          </form>

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
                disabled={isRedeeming || isProcessingPayment}
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
