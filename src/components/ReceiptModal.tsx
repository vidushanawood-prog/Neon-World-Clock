import React, { useState } from 'react';
import { Check, CheckCircle2, Copy, Download, Mail, Receipt, X } from 'lucide-react';
import { downloadReceiptHtml, type ProActivationReceipt } from '../services/emailReceipt';

interface ReceiptModalProps {
  receipt: ProActivationReceipt | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receipt.textBody);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Pro Plan Activation Receipt"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-400/35 bg-slate-950 shadow-[0_0_60px_rgba(34,211,238,0.22)]">
        <div className="border-b border-white/10 bg-gradient-to-r from-cyan-500/15 via-slate-950 to-emerald-500/15 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-slate-900 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">
                Digital Activation Receipt
              </div>
              <h2 className="text-base font-extrabold text-white">{receipt.subject}</h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Email Dispatch Badge */}
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
            <Mail className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              {receipt.emailJsDispatched || receipt.firestoreMailQueued
                ? `Automated receipt dispatched to ${receipt.userEmail}`
                : `Digital receipt generated for ${receipt.userEmail}`}
            </span>
          </div>

          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">User Email</span>
              <span className="font-mono font-medium text-white">{receipt.userEmail}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">Plan Name</span>
              <span className="font-bold text-cyan-300">{receipt.planName}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">Amount Paid</span>
              <span className="font-bold text-emerald-300">{receipt.amountPaid}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">Activation Date</span>
              <span className="text-slate-200">{receipt.activationDate}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">Expiry Date (+30 Days)</span>
              <span className="font-semibold text-amber-300">{receipt.expiryDate}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-slate-400">Transaction ID</span>
              <span className="font-mono font-bold text-fuchsia-300">{receipt.transactionId}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => downloadReceiptHtml(receipt)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)] transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </button>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25"
            >
              <CheckCircle2 className="h-4 w-4" />
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
