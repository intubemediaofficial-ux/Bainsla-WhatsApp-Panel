"use client";
import { useState } from "react";
import { api, Field, inr, Modal, toast } from "./ui";

export type Billing = { wallet: string | number; plan?: { id: string; name: string } | null; planExpiresAt?: string; plans: { id: string; name: string; price: number; durationDays: number; description?: string; features: string[]; limits: Record<string, number> }[]; requests: { id: string; purpose: string; amount: number; utr?: string; status: string; adminNote?: string; createdAt: string }[]; payment: { upiId: string; payeeName: string; qrUrl: string; instructions: string; gstPercent: number } };

export function PayModal({ b, open, onClose, planId, done }: { b: Billing; open: boolean; onClose: () => void; planId?: string; done: () => void }) {
  const [amount, setAmount] = useState(500);
  const [utr, setUtr] = useState("");
  const [coupon, setCoupon] = useState("");
  const plan = b.plans.find((p) => p.id === planId);
  const amt = plan ? plan.price : amount;
  const upi = b.payment.upiId ? `upi://pay?pa=${encodeURIComponent(b.payment.upiId)}&pn=${encodeURIComponent(b.payment.payeeName)}&am=${amt}&cu=INR` : "";
  return (
    <Modal open={open} onClose={onClose} title={plan ? `Buy ${plan.name}` : "Recharge wallet"}>
      <div className="space-y-4">
        {!plan && <Field label="Amount (₹)"><input type="number" className="input" value={amount} min={100} onChange={(e) => setAmount(Number(e.target.value))} /></Field>}
        {plan && <Field label="Coupon (optional)"><input className="input uppercase" value={coupon} onChange={(e) => setCoupon(e.target.value)} /></Field>}
        <div className="rounded-xl bg-emerald-50 p-4 text-sm">
          {b.payment.upiId ? <><div>Pay <b>{inr(amt)}</b>{plan && coupon ? " (coupon applied on approval)" : ""} to UPI <b>{b.payment.upiId}</b> ({b.payment.payeeName})</div>{b.payment.qrUrl && <img src={b.payment.qrUrl} alt="UPI QR" className="mx-auto mt-3 h-44 w-44 rounded-lg bg-white p-2" />}<a href={upi} className="btn-primary mt-3 w-full md:hidden">Open UPI app</a></> : <div className="text-amber-700">Admin hasn&apos;t set up UPI yet — contact support.</div>}
          <div className="mt-2 text-xs text-slate-500">{b.payment.instructions}</div>
        </div>
        <Field label="UPI transaction ID / UTR *"><input className="input font-mono" value={utr} onChange={(e) => setUtr(e.target.value)} /></Field>
        <button onClick={async () => { try { await api("/api/billing/pay", { method: "POST", json: { purpose: plan ? "PLAN" : "WALLET", planId, amount, utr, coupon } }); toast("Submitted — admin will approve shortly"); onClose(); done(); } catch (e) { toast((e as Error).message, "err"); } }} className="btn-primary w-full">Submit payment</button>
      </div>
    </Modal>
  );
}

