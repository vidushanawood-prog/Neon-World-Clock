import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  Gift,
  Globe2,
  Info,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';
import type { PaymentMethodType } from '../lib/firebase';
import {
  detectLocalizedProPrice,
  getInstantLocalizedProPrice,
  type LocalizedProPrice,
} from '../services/currencyDetection';
import {
  calculatePayHereCheckoutPricing,
  ensurePayHereSdkLoaded,
  getPayHerePaymentMethodTag,
  PAYHERE_CONFIG,
  startPayHereCheckout,
} from '../services/payhere';
import {
  buildWhatsAppPaymentMessage,
  buildWhatsAppPaymentUrl,
  generateRotatingReceiptCode,
  getReceiptWindowInfo,
  markReceiptCodeSubmitted,
  recordGeneratedReceiptCode,
  sanitizeOptionalPhone,
  type ReceiptCodeStatus,
  type ReceiptWindowInfo,
} from '../services/paymentReceiptCode';
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
  const [priceInfo, setPriceInfo] = useState<LocalizedProPrice>(() =>
    getInstantLocalizedProPrice(liveUsdRates)
  );
  const [paymentTab, setPaymentTab] = useState<'whatsapp' | 'payhere'>('whatsapp');
  const [receiptEmailInput, setReceiptEmailInput] = useState(userEmail || '');
  const [phoneInput, setPhoneInput] = useState('');

  // 30-Minute Rotating Unique Receipt Code State
  const [windowInfo, setWindowInfo] = useState<ReceiptWindowInfo>(() => getReceiptWindowInfo());
  const [rotationNonce, setRotationNonce] = useState(0);
  const [receiptCode, setReceiptCode] = useState('');
  const [codeSyncState, setCodeSyncState] = useState<'idle' | 'syncing' | 'recorded' | 'submitted' | 'local'>('idle');
  const [codeStatusNotice, setCodeStatusNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // PayHere Checkout State
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [isLaunchingPayHere, setIsLaunchingPayHere] = useState(false);
  const [isActivatingPro, setIsActivatingPro] = useState(false);

  // Redeem Code State (preserved completely intact)
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Autofill currently signed-in user's email address
  useEffect(() => {
    if (userEmail) {
      setReceiptEmailInput(userEmail);
    }
  }, [userEmail]);

  // Reset transient notices & detect localized country/currency/total whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setRedeemError(null);
    setPaymentError(null);
    setPaymentNotice(null);
    setCodeStatusNotice(null);
    setIsLaunchingPayHere(false);
    setIsActivatingPro(false);
    setCopiedCode(false);
    setCopiedMessage(false);

    // Instant browser locale/timezone pricing (zero loading flicker)
    setPriceInfo(getInstantLocalizedProPrice(liveUsdRates));
    setWindowInfo(getReceiptWindowInfo());

    // Async geo refinement if available
    void detectLocalizedProPrice(liveUsdRates).then((info) => {
      if (!cancelled) setPriceInfo(info);
    });

    // Warm up PayHere JS SDK in the background
    void ensurePayHereSdkLoaded().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isOpen, liveUsdRates]);

  // Live 1-second countdown timer that auto-rotates the receipt code every 30-minute window
  useEffect(() => {
    if (!isOpen) return;
    const tick = () => {
      const next = getReceiptWindowInfo(Date.now());
      setWindowInfo((prev) => {
        if (prev.windowIndex !== next.windowIndex) {
          setRotationNonce(0);
          setCodeStatusNotice(null);
        }
        return next;
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  const effectiveEmail = (userEmail || receiptEmailInput).trim().toLowerCase();
  const pricing = useMemo(() => calculatePayHereCheckoutPricing(priceInfo), [priceInfo]);

  // Generate per-user unique 30-minute rotating receipt code and record in Firestore (anti-reuse)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const run = async () => {
      const generated = await generateRotatingReceiptCode({
        uid: userUid,
        email: effectiveEmail,
        windowIndex: windowInfo.windowIndex,
        nonce: rotationNonce,
      });
      if (cancelled) return;
      setReceiptCode(generated);

      if (!isSignedIn || !userUid || !effectiveEmail) {
        setCodeSyncState('local');
        return;
      }

      setCodeSyncState('syncing');
      try {
        const result = await recordGeneratedReceiptCode({
          code: generated,
          uid: userUid,
          email: effectiveEmail,
          phone: phoneInput,
          countryName: priceInfo.countryName,
          countryCode: priceInfo.countryCode,
          currencyCode: priceInfo.currencyCode,
          localTotalDisplay: priceInfo.formattedLocalAmount,
          windowIndex: windowInfo.windowIndex,
          windowExpiresAt: windowInfo.windowExpiresAt,
        });
        if (cancelled) return;
        if (result.alreadyUsed && rotationNonce < 5) {
          // Rotate automatically if this code was already marked used/expired or collided
          setRotationNonce((n) => n + 1);
          return;
        }
        setCodeSyncState(result.status === 'submitted' ? 'submitted' : 'recorded');
      } catch {
        if (!cancelled) {
          setCodeSyncState('local');
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    userUid,
    isSignedIn,
    effectiveEmail,
    windowInfo.windowIndex,
    windowInfo.windowExpiresAt,
    rotationNonce,
    priceInfo.countryCode,
    priceInfo.countryName,
    priceInfo.currencyCode,
    priceInfo.formattedLocalAmount,
  ]);

  const whatsappMessageParams = useMemo(
    () => ({
      countryName: priceInfo.countryName,
      countryCode: priceInfo.countryCode,
      currencyCode: priceInfo.currencyCode,
      localTotalDisplay: priceInfo.formattedLocalAmount,
      email: effectiveEmail || 'Not provided',
      phone: phoneInput,
      receiptCode: receiptCode || 'GENERATING...',
    }),
    [
      priceInfo.countryName,
      priceInfo.countryCode,
      priceInfo.currencyCode,
      priceInfo.formattedLocalAmount,
      effectiveEmail,
      phoneInput,
      receiptCode,
    ]
  );

  const whatsappUrl = useMemo(
    () => buildWhatsAppPaymentUrl(whatsappMessageParams),
    [whatsappMessageParams]
  );

  const whatsappPreviewText = useMemo(
    () => buildWhatsAppPaymentMessage(whatsappMessageParams),
    [whatsappMessageParams]
  );

  if (!isOpen) return null;

  const formattedLocalPrice = priceInfo.formattedLocalPrice || `LKR ${PRO_BASE_PRICE_LKR} / month`;
  const isBusy = isLaunchingPayHere || isActivatingPro || isRedeeming;

  const handleCopyCode = async () => {
    if (!receiptCode) return;
    try {
      await navigator.clipboard.writeText(receiptCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopyWhatsAppMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappPreviewText);
      setCopiedMessage(true);
      window.setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleWhatsAppSubmitClick = () => {
    if (!receiptCode) return;

    if (isSignedIn && userUid && effectiveEmail) {
      void markReceiptCodeSubmitted({
        code: receiptCode,
        uid: userUid,
        email: effectiveEmail,
        phone: sanitizeOptionalPhone(phoneInput),
        countryName: priceInfo.countryName,
        countryCode: priceInfo.countryCode,
        currencyCode: priceInfo.currencyCode,
        localTotalDisplay: priceInfo.formattedLocalAmount,
        windowIndex: windowInfo.windowIndex,
        windowExpiresAt: windowInfo.windowExpiresAt,
      })
        .then((status: ReceiptCodeStatus) => {
          if (status === 'used' || status === 'expired') {
            setCodeStatusNotice(
              'That code was already used or expired — generating a fresh 30-minute receipt code now.'
            );
            setRotationNonce((n) => n + 1);
            return;
          }
          setCodeSyncState('submitted');
          setCodeStatusNotice(
            `Code ${receiptCode} recorded in Firestore. Be sure to include this exact code on your payment receipt.`
          );
        })
        .catch(() => {
          setCodeStatusNotice(
            `WhatsApp message opened with code ${receiptCode}. Include this exact code on your payment receipt.`
          );
        });
    } else {
      setCodeStatusNotice(
        `WhatsApp message opened with code ${receiptCode}. Sign in so your code is also logged in Firestore.`
      );
    }
  };

  const handleStartPayHerePayment = async () => {
    setPaymentError(null);
    setPaymentNotice(null);

    if (!isSignedIn || !userUid) {
      setPaymentError(
        'Please sign in with your verified account before checking out with PayHere so your 30-day Pro plan syncs immediately.'
      );
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

  // Existing Redeem Code handler — preserved completely intact and unchanged
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
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              <Globe2 className="h-3 w-3" />
              {priceInfo.countryName} · {priceInfo.currencyCode}
            </span>
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

          {/* Auto-Detected Country, Local Currency & Calculated Total Card */}
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-cyan-400/30 bg-slate-950/85 px-4 py-3.5 sm:grid-cols-3 sm:items-center">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Detected Country
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-white">
                <Globe2 className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                <span className="truncate">{priceInfo.countryName}</span>
                <span className="text-[11px] font-mono text-slate-400">({priceInfo.countryCode})</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Local Currency
              </div>
              <div className="mt-0.5 font-mono text-sm font-bold text-cyan-200">
                {priceInfo.currencyCode}{' '}
                <span className="text-xs text-slate-400">
                  ({priceInfo.currencySymbol.trim()})
                </span>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Calculated Total (30 Days)
              </div>
              <div className="mt-0.5 text-2xl font-black tracking-tight text-white">
                {priceInfo.formattedLocalAmount}
              </div>
              {!priceInfo.isSriLanka && (
                <div className="text-[10px] font-medium text-slate-400">
                  {priceInfo.basePriceLabel}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-[68vh] space-y-5 overflow-y-auto px-6 py-5">
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
              <span>Sign in to autofill your verified email and lock your 30-min receipt code in Firestore.</span>
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

          {/* Payment Method Switcher */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => setPaymentTab('whatsapp')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                paymentTab === 'whatsapp'
                  ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/45 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Payment
            </button>
            <button
              type="button"
              onClick={() => setPaymentTab('payhere')}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                paymentTab === 'payhere'
                  ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/45 shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              PayHere {PAYHERE_CONFIG.sandbox ? 'Sandbox' : 'Card'}
            </button>
          </div>

          {paymentTab === 'whatsapp' ? (
            /* WhatsApp Payment Request + 30-Minute Rotating Unique Receipt Code */
            <div className="space-y-4 rounded-2xl border border-emerald-400/30 bg-slate-900/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    WhatsApp Payment Request
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-200">
                  <Clock className="h-3 w-3" />
                  Rotates in {windowInfo.formattedCountdown}
                </span>
              </div>

              {/* Autofilled Email + Optional Phone Number */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3 text-cyan-400" />
                      Account Email
                    </span>
                    {userEmail && (
                      <span className="text-[10px] font-medium text-emerald-300">Autofilled</span>
                    )}
                  </label>
                  <input
                    type="email"
                    value={userEmail || receiptEmailInput}
                    readOnly={Boolean(userEmail)}
                    onChange={(e) => {
                      if (!userEmail) setReceiptEmailInput(e.target.value);
                    }}
                    placeholder="you@example.com"
                    className={`w-full rounded-xl border px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none ${
                      userEmail
                        ? 'border-emerald-400/30 bg-slate-950/90 text-emerald-100'
                        : 'border-white/15 bg-slate-950/90 focus:border-cyan-400/60'
                    }`}
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3 text-cyan-400" />
                      Phone Number
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">Optional</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.slice(0, 30))}
                    placeholder="Optional — e.g. +94 77 123 4567"
                    className="w-full rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
                  />
                </div>
              </div>

              {/* 30-Minute Rotating Unique Receipt Code Box */}
              <div className="space-y-2.5 rounded-2xl border border-cyan-400/35 bg-slate-950/90 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                    Active 30-Min Unique Receipt Code
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                      codeSyncState === 'submitted'
                        ? 'border border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                        : codeSyncState === 'recorded'
                          ? 'border border-cyan-400/35 bg-cyan-500/15 text-cyan-200'
                          : codeSyncState === 'syncing'
                            ? 'border border-white/15 bg-slate-900 text-slate-300'
                            : 'border border-amber-400/30 bg-amber-500/10 text-amber-200'
                    }`}
                  >
                    {codeSyncState === 'syncing' ? (
                      <>
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        Logging to Firestore...
                      </>
                    ) : codeSyncState === 'submitted' ? (
                      <>
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Submitted · Anti-Reuse Logged
                      </>
                    ) : codeSyncState === 'recorded' ? (
                      <>
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Logged in Firestore · Unique
                      </>
                    ) : (
                      <>
                        <Info className="h-2.5 w-2.5" />
                        Sign in to lock in Firestore
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-400/30 bg-cyan-950/25 px-3.5 py-2.5">
                  <code className="font-mono text-base font-black tracking-widest text-cyan-200 sm:text-lg">
                    {receiptCode || 'NWC-••••-••••-••'}
                  </code>
                  <button
                    type="button"
                    onClick={() => void handleCopyCode()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-bold text-cyan-200 transition hover:bg-cyan-500/25"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>

                {/* Mandatory Receipt Reference Notice */}
                <div className="flex items-start gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  <span>
                    <strong className="text-amber-200">Required on Payment Receipt:</strong> This
                    exact unique code (<span className="font-mono font-bold">{receiptCode}</span>)
                    MUST appear in your payment receipt / transfer reference. Codes rotate
                    automatically every 30 minutes and are recorded in Firestore to prevent
                    duplicate receipt reuse.
                  </span>
                </div>
              </div>

              {codeStatusNotice && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  <span>{codeStatusNotice}</span>
                </div>
              )}

              {/* Auto-Typed WhatsApp Button (wa.me anchor — no window.open) */}
              <div className="space-y-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppSubmitClick}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_0_26px_rgba(16,185,129,0.4)] transition hover:brightness-110"
                >
                  <MessageCircle className="h-4 w-4" />
                  Continue on WhatsApp ({priceInfo.formattedLocalAmount})
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <span>
                    Opens WhatsApp (+94 78 437 4948) with your country, total, email, phone &amp; unique code pre-filled.
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyWhatsAppMessage()}
                    className="shrink-0 font-semibold text-cyan-300 underline-offset-2 hover:underline"
                  >
                    {copiedMessage ? 'Message Copied!' : 'Copy Text'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* PayHere Checkout Panel (preserved intact) */
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
                    {!priceInfo.isSriLanka && (
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
                    {!priceInfo.isSriLanka && (
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
                {!priceInfo.isSriLanka && pricing.isChargedInLkr && (
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
          )}

          {/* Redeem Code Section — kept completely intact and unchanged */}
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
